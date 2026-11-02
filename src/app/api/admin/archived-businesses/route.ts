import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/core/audit-engine";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonError, jsonOk } from "@/lib/api-response";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/pagination";
import { cacheDelete, cacheDeletePrefix } from "@/lib/redis";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  archiveAfterDatabaseUpdate,
  isRestorableListingSnapshot,
  PUBLIC_LISTING_CACHE_KEYS,
  PUBLIC_SEARCH_CACHE_PREFIX,
} from "@/core/admin-engine/archive";

const archiveActions = ["VENDOR_ARCHIVE", "VENDOR_RESTORE", "VENUE_ARCHIVE", "VENUE_RESTORE"];

async function authorizedUser() {
  const user = await requireAuth();
  if (!user) return { error: jsonError("Unauthorized", 401) } as const;
  try {
    await requireAdminSection(user, "vendors");
    return { user } as const;
  } catch {
    return { error: jsonError("Forbidden", 403) } as const;
  }
}

export async function GET(req: NextRequest) {
  const auth = await authorizedUser();
  if ("error" in auth) return auth.error;

  const { page, limit } = parsePaginationParams(req.nextUrl.searchParams, { limit: 25 });
  const type = req.nextUrl.searchParams.get("type") ?? "all";
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim().toLocaleLowerCase();
  const events = await prisma.auditLog.findMany({
    where: { action: { in: archiveActions } },
    orderBy: { createdAt: "desc" },
    select: { id: true, actorId: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true },
  });
  const latest = new Map<string, (typeof events)[number]>();
  for (const event of events) {
    const key = `${event.entityType}:${event.entityId}`;
    if (!latest.has(key)) latest.set(key, event);
  }

  const vendorIds = [...latest.values()]
    .filter((event) => event.entityType === "VendorProfile" && event.action === "VENDOR_ARCHIVE")
    .map((event) => event.entityId).filter((id): id is string => Boolean(id));
  const venueIds = [...latest.values()]
    .filter((event) => event.entityType === "Listing" && event.action === "VENUE_ARCHIVE")
    .map((event) => event.entityId).filter((id): id is string => Boolean(id));
  const [vendors, venues] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, businessName: true, category: true, city: true, country: true, featured: true, listings: { select: { status: true } } },
    }),
    prisma.listing.findMany({
      where: { id: { in: venueIds }, status: "ARCHIVED", type: "VENUE" },
      select: { id: true, title: true, city: true, status: true, vendorId: true, category: { select: { name: true } }, vendor: { select: { businessName: true } } },
    }),
  ]);
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  type ArchiveEntry = { id: string; entityType: "VENDOR" | "VENUE"; name: string; category: string; location: string; archivedAt: Date; status: string; canRestore: boolean; restoreUnavailableReason: string | null; featured: boolean };
  const entries: ArchiveEntry[] = [];
  for (const event of latest.values()) {
    if (event.entityType === "VendorProfile" && event.action === "VENDOR_ARCHIVE") {
      if (!event.entityId) continue;
      const vendor = vendorById.get(event.entityId);
      if (!vendor) continue;
      const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
      const snapshots = metadata.archivedListings;
      const canRestore = isRestorableListingSnapshot(snapshots);
      const archivedCount = vendor.listings.filter((listing) => listing.status === "ARCHIVED").length;
      const priorStatusSummary = canRestore
        ? Object.entries(snapshots.reduce<Record<string, number>>((counts, listing) => {
            counts[listing.status] = (counts[listing.status] ?? 0) + 1;
            return counts;
          }, {})).map(([status, count]) => `${status}: ${count}`).join(", ") || "No listings were changed"
        : "Prior listing states unavailable";
      entries.push({
        id: vendor.id, entityType: "VENDOR" as const, name: vendor.businessName,
        category: String(vendor.category).replaceAll("_", " "), location: [vendor.city, vendor.country].filter(Boolean).join(", "),
        archivedAt: event.createdAt, status: `${archivedCount} currently archived · Prior states: ${priorStatusSummary}`,
        canRestore, restoreUnavailableReason: canRestore ? null : "This business was archived before status snapshots were recorded. Prior listing states cannot be determined safely.",
        featured: vendor.featured,
      });
      continue;
    }
    if (event.entityType === "Listing" && event.action === "VENUE_ARCHIVE") {
      if (!event.entityId) continue;
      const listing = venues.find((venue) => venue.id === event.entityId);
      if (!listing || vendorById.has(listing.vendorId)) continue;
      const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
      const canRestore = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"].includes(String(metadata.previousStatus));
      entries.push({
        id: listing.id, entityType: "VENUE" as const, name: listing.title,
        category: listing.category?.name ?? "Event venue", location: listing.city,
        archivedAt: event.createdAt, status: `Archived · ${listing.vendor.businessName} · Prior state: ${canRestore ? metadata.previousStatus : "unknown"}`,
        canRestore, restoreUnavailableReason: canRestore ? null : "The listing’s prior publication status was not recorded, so it cannot be restored safely.",
        featured: false,
      });
    }
  }
  const filteredEntries = entries.filter((entry) => (type === "all" || entry.entityType.toLowerCase() === type) &&
    (!search || `${entry.name} ${entry.category} ${entry.location} ${entry.status}`.toLocaleLowerCase().includes(search)))
    .sort((a, b) => b.archivedAt.getTime() - a.archivedAt.getTime());

  const data = filteredEntries.slice((page - 1) * limit, page * limit);
  return jsonOk(data, 200, buildPaginationMeta(page, limit, filteredEntries.length));
}

export async function POST(req: NextRequest) {
  const auth = await authorizedUser();
  if ("error" in auth) return auth.error;
  const parsed = await req.json().catch(() => null) as { id?: unknown; entityType?: unknown } | null;
  if (!parsed || typeof parsed.id !== "string" || !["VENDOR", "VENUE"].includes(String(parsed.entityType))) {
    return jsonError("A valid archived business is required.", 400);
  }

  try {
    const result = await archiveAfterDatabaseUpdate(
      () => prisma.$transaction(async (tx) => {
      if (parsed.entityType === "VENDOR") {
        const vendor = await tx.vendorProfile.findUnique({ where: { id: parsed.id as string }, select: { id: true, slug: true, businessName: true, featured: true, metadata: true } });
        if (!vendor) return { error: "Archived vendor not found.", status: 404 } as const;
        const archive = await tx.auditLog.findFirst({ where: { entityType: "VendorProfile", entityId: vendor.id, action: "VENDOR_ARCHIVE" }, orderBy: { createdAt: "desc" } });
        const restore = await tx.auditLog.findFirst({ where: { entityType: "VendorProfile", entityId: vendor.id, action: "VENDOR_RESTORE" }, orderBy: { createdAt: "desc" } });
        if (!archive || (restore && restore.createdAt >= archive.createdAt)) return { error: "This vendor is not currently archived.", status: 409 } as const;
        const snapshot = (archive.metadata as Record<string, unknown> | null)?.archivedListings;
        if (!isRestorableListingSnapshot(snapshot)) return { error: "The prior listing states were not recorded. This vendor cannot be restored safely.", status: 409 } as const;
        for (const listing of snapshot) {
          await tx.listing.updateMany({ where: { id: listing.id, vendorId: vendor.id, status: "ARCHIVED" }, data: { status: listing.status, featured: false } });
        }
        const profileMetadata = vendor.metadata && typeof vendor.metadata === "object" && !Array.isArray(vendor.metadata) ? { ...vendor.metadata as Record<string, unknown> } : {};
        delete profileMetadata.adminArchivedAt;
        await tx.vendorProfile.update({ where: { id: vendor.id }, data: { featured: false, metadata: profileMetadata as Prisma.InputJsonObject } });
        await writeAuditLog({ actorId: auth.user.id, action: "VENDOR_RESTORE", entityType: "VendorProfile", entityId: vendor.id, metadata: { businessName: vendor.businessName, restoredListings: snapshot.length } }, tx);
        return { id: vendor.id, slug: vendor.slug } as const;
      }

      const listing = await tx.listing.findUnique({ where: { id: parsed.id as string }, select: { id: true, title: true, slug: true, type: true, vendorId: true, status: true } });
      if (!listing || listing.type !== "VENUE" || listing.status !== "ARCHIVED") return { error: "Archived venue not found.", status: 404 } as const;
      const vendorArchive = await tx.auditLog.findFirst({ where: { entityType: "VendorProfile", entityId: listing.vendorId, action: { in: ["VENDOR_ARCHIVE", "VENDOR_RESTORE"] } }, orderBy: { createdAt: "desc" }, select: { action: true } });
      if (vendorArchive?.action === "VENDOR_ARCHIVE") return { error: "Restore the archived business before restoring one of its venues.", status: 409 } as const;
      const archive = await tx.auditLog.findFirst({ where: { entityType: "Listing", entityId: listing.id, action: "VENUE_ARCHIVE" }, orderBy: { createdAt: "desc" } });
      const restore = await tx.auditLog.findFirst({ where: { entityType: "Listing", entityId: listing.id, action: "VENUE_RESTORE" }, orderBy: { createdAt: "desc" } });
      if (!archive || (restore && restore.createdAt >= archive.createdAt)) return { error: "This venue is not currently archived.", status: 409 } as const;
      const metadata = archive.metadata && typeof archive.metadata === "object" ? archive.metadata as Record<string, unknown> : {};
      const status = metadata.previousStatus;
      if (!["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"].includes(String(status))) return { error: "The prior publication state was not recorded. This venue cannot be restored safely.", status: 409 } as const;
      await tx.listing.update({ where: { id: listing.id }, data: { status: status as "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED", featured: false } });
      const restoredStatus = status as "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
      await writeAuditLog({ actorId: auth.user.id, action: "VENUE_RESTORE", entityType: "Listing", entityId: listing.id, metadata: { title: listing.title, restoredStatus } }, tx);
      return { id: listing.id, slug: listing.slug } as const;
      }, { isolationLevel: "Serializable" }),
      async (restored) => {
        await Promise.all([
          ...PUBLIC_LISTING_CACHE_KEYS.map((key) => cacheDelete(key)),
          cacheDeletePrefix(PUBLIC_SEARCH_CACHE_PREFIX),
        ]);
        revalidateTag("listings");
        revalidateTag("vendors");
        revalidatePath("/");
        revalidatePath("/marketplace");
        if (restored.slug) {
          revalidatePath(`/vendors/${restored.slug}`);
          revalidatePath(`/listings/${restored.slug}`);
        }
      },
      (restored) => !("error" in restored)
    );
    if ("error" in result && result.error) return jsonError(result.error, result.status);
    return jsonOk({ restored: true });
  } catch (error) {
    console.error("[admin:archived-businesses] Restore failed", error);
    return jsonError("The business could not be restored. Please retry.", 500);
  }
}
