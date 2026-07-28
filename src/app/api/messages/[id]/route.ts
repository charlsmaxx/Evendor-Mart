import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  canAccessConversation,
  getConversationPeerAvatar,
  getConversationPeerName,
  serializeMessage,
  MESSAGE_PAGE_SIZE,
} from "@/lib/messages-access";
import { getCustomerBookingActions } from "@/lib/booking-customer-actions";
import { getEnabledPackages } from "@/lib/vendor-packages";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? MESSAGE_PAGE_SIZE),
    MESSAGE_PAGE_SIZE
  );
  const before = req.nextUrl.searchParams.get("before");

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      vendor: true,
      customer: { select: { fullName: true, email: true, avatarUrl: true } },
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          priceMin: true,
          priceMax: true,
          type: true,
          status: true,
        },
      },
    },
  });

  if (!conversation) return jsonError("Conversation not found", 404);
  if (!canAccessConversation(user, conversation)) return jsonError("Forbidden", 403);

  const cursorMessage = before
    ? await prisma.message.findFirst({
        where: { id: before, conversationId: id },
        select: { createdAt: true },
      })
    : null;

  if (before && !cursorMessage) return jsonError("Invalid cursor", 400);

  const isCustomer = conversation.customerId === user.id;

  const [messageRows, relatedBooking, fallbackListing] = await Promise.all([
    prisma.message.findMany({
      where: {
        conversationId: id,
        ...(cursorMessage ? { createdAt: { lt: cursorMessage.createdAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        sender: { select: { fullName: true, role: true, avatarUrl: true } },
      },
    }),
    prisma.booking.findFirst({
      where: {
        customerId: conversation.customerId,
        vendorId: conversation.vendorId,
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "RESERVED"] },
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        eventDate: true,
        vendorCompletedAt: true,
        completionConfirmedAt: true,
        listing: { select: { title: true } },
        payments: { select: { status: true }, take: 5 },
        dispute: { select: { status: true } },
      },
    }),
    isCustomer && (!conversation.listing || conversation.listing.status !== "PUBLISHED")
      ? prisma.listing.findFirst({
          where: { vendorId: conversation.vendorId, status: "PUBLISHED" },
          select: {
            id: true,
            title: true,
            slug: true,
            priceMin: true,
            priceMax: true,
            type: true,
            status: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve(null),
  ]);

  const hasMore = messageRows.length > limit;
  const page = hasMore ? messageRows.slice(0, limit) : messageRows;
  const serialized = page.reverse().map(serializeMessage);
  const oldestId = serialized[0]?.id ?? null;

  const actions = relatedBooking
    ? getCustomerBookingActions(relatedBooking)
    : null;

  const bookListing =
    conversation.listing?.status === "PUBLISHED"
      ? conversation.listing
      : fallbackListing;

  const bookHref = isCustomer
    ? bookListing?.slug
      ? `/listings/${bookListing.slug}`
      : `/vendors/${conversation.vendor.slug}`
    : null;

  return jsonOk({
    id: conversation.id,
    peerName: getConversationPeerName(user, conversation),
    peerAvatar: getConversationPeerAvatar(user, conversation),
    listing: bookListing
      ? {
          id: bookListing.id,
          title: bookListing.title,
          slug: bookListing.slug,
          priceMin: bookListing.priceMin,
          priceMax: bookListing.priceMax,
          type: bookListing.type,
        }
      : conversation.listing
        ? {
            id: conversation.listing.id,
            title: conversation.listing.title,
            slug: conversation.listing.slug,
            priceMin: conversation.listing.priceMin,
            priceMax: conversation.listing.priceMax,
            type: conversation.listing.type,
          }
        : null,
    vendor: {
      id: conversation.vendor.id,
      businessName: conversation.vendor.businessName,
      slug: conversation.vendor.slug,
    },
    customer: {
      fullName: conversation.customer.fullName,
      avatarUrl: conversation.customer.avatarUrl,
    },
    messages: serialized,
    hasMore,
    nextCursor: oldestId,
    viewerIsCustomer: isCustomer,
    bookHref,
    bookListing: isCustomer && bookListing
      ? {
          id: bookListing.id,
          title: bookListing.title,
          slug: bookListing.slug,
          priceMin: bookListing.priceMin,
          priceMax: bookListing.priceMax,
          isVenue: bookListing.type === "VENUE",
          vendorCategory: conversation.vendor.category,
          packages: getEnabledPackages(conversation.vendor.metadata),
        }
      : null,
    relatedBooking:
      relatedBooking && isCustomer
        ? {
            id: relatedBooking.id,
            status: relatedBooking.status,
            listingTitle: relatedBooking.listing.title,
            eventDate: relatedBooking.eventDate.toISOString(),
            canConfirm: actions!.canConfirm,
            canDispute: actions!.canDispute,
            hasReceipt:
              relatedBooking.payments.some((p) => p.status === "SUCCESS") ||
              ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(relatedBooking.status),
          }
        : null,
  });
}
