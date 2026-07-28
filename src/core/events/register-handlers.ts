import { onDomainEvent } from "./bus";
import { notifyUser, notifyVendorByProfileId } from "@/core/notification-engine";
import { formatCurrency } from "@/lib/utils";

/** Wire domain events to side effects (notifications, future email/SMS). */
export function registerDomainEventHandlers(): void {
  onDomainEvent("BookingCreated", async (event) => {
    const vendorId = String(event.payload.vendorId ?? "");
    const bookingId = String(event.payload.bookingId ?? "");
    const listingTitle = String(event.payload.listingTitle ?? "your listing");
    const source = String(event.payload.source ?? "MARKETPLACE");
    if (!vendorId || !bookingId) return;
    await notifyVendorByProfileId(vendorId, {
      title: source === "MANUAL" ? "Manual booking added" : "New booking request",
      body:
        source === "MANUAL"
          ? `Manual booking recorded for ${listingTitle}.`
          : `You have a new booking for ${listingTitle}. Review it in your dashboard.`,
      link: `/vendor/bookings/${bookingId}`,
    });
  });

  onDomainEvent("EscrowReleased", async (event) => {
    const bookingId = String(event.payload.bookingId ?? "");
    const customerId = String(event.payload.customerId ?? "");
    const vendorId = String(event.payload.vendorId ?? "");
    if (!bookingId || !customerId || !vendorId) return;

    await notifyVendorByProfileId(vendorId, {
      title: "Booking completed",
      body: "Escrow has been released. Your payout is being processed.",
      link: `/vendor/bookings/${bookingId}`,
    });
    await notifyUser({
      userId: customerId,
      title: "Booking completed",
      body: "Thank you for confirming completion.",
      link: `/bookings/${bookingId}`,
    });
  });

  onDomainEvent("DisputeOpened", async (event) => {
    const vendorId = String(event.payload.vendorId ?? "");
    const customerId = String(event.payload.customerId ?? "");
    const bookingId = String(event.payload.bookingId ?? "");
    if (vendorId) {
      await notifyVendorByProfileId(vendorId, {
        title: "Dispute opened",
        body: "A customer opened a dispute on a booking. Funds stay locked in escrow. Review it in your dashboard.",
        link: "/vendor/disputes",
      });
    }
    if (customerId && bookingId) {
      await notifyUser({
        userId: customerId,
        title: "Dispute opened — upload evidence",
        body: "Your payment is locked in escrow until we resolve this. Upload evidence on your booking page and check your vendor chat for an Evendor Admin notice.",
        link: `/bookings/${bookingId}`,
      });
    }
  });

  onDomainEvent("DisputeResolved", async (event) => {
    const customerId = String(event.payload.customerId ?? "");
    const vendorId = String(event.payload.vendorId ?? "");
    const bookingId = String(event.payload.bookingId ?? "");
    const resolution = String(event.payload.resolution ?? "");
    const bodyByResolution: Record<string, string> = {
      FULL_REFUND: "The dispute was resolved with a full refund to the customer.",
      FULL_PAYOUT: "The dispute was resolved and escrow was released to the vendor.",
      PARTIAL: "The dispute was resolved with a partial refund and partial vendor payout.",
    };
    const body = bodyByResolution[resolution] ?? "The dispute on your booking has been resolved.";
    if (customerId) {
      await notifyUser({
        userId: customerId,
        title: "Dispute resolved",
        body,
        link: bookingId ? `/bookings/${bookingId}` : "/dashboard",
      });
    }
    if (vendorId) {
      await notifyVendorByProfileId(vendorId, {
        title: "Dispute resolved",
        body,
        link: bookingId ? `/vendor/bookings/${bookingId}` : "/vendor/disputes",
      });
    }
  });

  onDomainEvent("BookingConfirmed", async (event) => {
    const vendorId = String(event.payload.vendorId ?? "");
    const bookingId = String(event.payload.bookingId ?? "");
    if (!vendorId || !bookingId) return;
    await notifyVendorByProfileId(vendorId, {
      title: "New booking confirmed",
      body: "A customer confirmed their booking.",
      link: `/vendor/bookings/${bookingId}`,
    });
  });

  onDomainEvent("BookingCancelled", async (event) => {
    const vendorId = String(event.payload.vendorId ?? "");
    const customerId = String(event.payload.customerId ?? "");
    const bookingId = String(event.payload.bookingId ?? "");
    const refundAmount = Number(event.payload.refundAmount ?? 0);
    const listingTitle = String(event.payload.listingTitle ?? "your booking");
    const refundCopy =
      refundAmount > 0
        ? ` A refund of ${formatCurrency(refundAmount)} has been initiated.`
        : "";
    if (vendorId && bookingId) {
      await notifyVendorByProfileId(vendorId, {
        title: "Booking cancelled",
        body: `${listingTitle} was cancelled.${refundCopy}`,
        link: `/vendor/bookings/${bookingId}`,
      });
    }
    if (customerId && bookingId) {
      await notifyUser({
        userId: customerId,
        title: "Booking cancelled",
        body: `Your booking for ${listingTitle} was cancelled.${refundCopy}`,
        link: `/bookings/${bookingId}`,
      });
    }
  });

  onDomainEvent("BookingStatusUpdated", async (event) => {
    const recipientId = String(event.payload.recipientId ?? "");
    const status = String(event.payload.status ?? "");
    const link = String(event.payload.link ?? "/bookings");
    if (!recipientId) return;
    await notifyUser({
      userId: recipientId,
      title: "Booking updated",
      body: `Your booking status is now ${status.replace(/_/g, " ").toLowerCase()}.`,
      link,
    });
  });

  onDomainEvent("VerificationApproved", async (event) => {
    const vendorId = String(event.payload.vendorId ?? "");
    if (!vendorId) return;
    await notifyVendorByProfileId(vendorId, {
      title: "Verification approved",
      body: "Your business is now verified on Evendor.",
      link: "/vendor/verification",
    });
  });

  onDomainEvent("VerificationStatusChanged", async (event) => {
    const vendorId = String(event.payload.vendorId ?? "");
    const status = String(event.payload.status ?? "");
    const adminNotes = event.payload.adminNotes ? String(event.payload.adminNotes) : undefined;
    if (!vendorId || !status) return;

    if (status === "VERIFIED") return; // handled by VerificationApproved

    const messages: Record<string, { title: string; body: string }> = {
      REJECTED: {
        title: "Verification declined",
        body: adminNotes
          ? `Your verification was declined: ${adminNotes}`
          : "Your verification was declined. Please resubmit with updated documents.",
      },
      PENDING: {
        title: "More information needed",
        body: adminNotes
          ? `We need more information: ${adminNotes}`
          : "We need more information to complete your verification.",
      },
    };

    const msg = messages[status];
    if (!msg) return;
    await notifyVendorByProfileId(vendorId, { ...msg, link: "/vendor/verification" });
  });

  onDomainEvent("RewardGranted", async (event) => {
    const userId = String(event.payload.userId ?? "");
    const points = Number(event.payload.points ?? 0);
    if (!userId || points <= 0) return;
    await notifyUser({
      userId,
      title: "Rewards credited",
      body: `You earned ${points} reward points on your completed booking.`,
      link: "/rewards",
    });
  });

  onDomainEvent("RewardAdjusted", async (event) => {
    const userId = String(event.payload.userId ?? "");
    const amount = Number(event.payload.amount ?? 0);
    const reason = String(event.payload.reason ?? "");
    if (!userId || amount === 0) return;
    const absAmount = Math.abs(amount);
    const formatted = `₦${(absAmount / 100).toLocaleString("en-NG")}`;
    await notifyUser({
      userId,
      title: amount > 0 ? "Rewards credited" : "Rewards adjusted",
      body:
        amount > 0
          ? `${formatted} was added to your Evendor Rewards wallet. ${reason}`
          : `${formatted} was deducted from your rewards balance. ${reason}`,
      link: "/rewards",
    });
  });

  onDomainEvent("QuoteReceived", async (event) => {
    const vendorId = String(event.payload.vendorId ?? "");
    const customerName = String(event.payload.customerName ?? "A customer");
    if (!vendorId) return;
    await notifyVendorByProfileId(vendorId, {
      title: "New quote request",
      body: `${customerName} sent you a quote request.`,
      link: "/vendor/leads",
    });
  });

  onDomainEvent("MessageReceived", async (event) => {
    const recipientId = String(event.payload.recipientId ?? "");
    const senderName = String(event.payload.senderName ?? "Someone");
    const conversationId = String(event.payload.conversationId ?? "");
    const preview = String(event.payload.preview ?? "You received a new message.");
    if (!recipientId) return;
    await notifyUser({
      userId: recipientId,
      title: "New message",
      body: preview.startsWith(senderName) ? preview : `${senderName}: ${preview}`,
      link: conversationId ? `/messages?conversation=${conversationId}` : "/messages",
    });
  });

  onDomainEvent("PaymentReceived", async (event) => {
    const customerId = String(event.payload.customerId ?? "");
    const bookingId = String(event.payload.bookingId ?? "");
    const amount = Number(event.payload.amount ?? 0);
    if (!customerId || !bookingId) return;
    await notifyUser({
      userId: customerId,
      title: "Payment confirmed",
      body: `Your payment of ${formatCurrency(amount)} was successful. Your booking is confirmed.`,
      link: `/bookings/${bookingId}`,
    });
  });

  onDomainEvent("QuoteStatusChanged", async (event) => {
    const customerId = String(event.payload.customerId ?? "");
    const status = String(event.payload.status ?? "");
    const vendorName = String(event.payload.vendorName ?? "The vendor");
    const response = event.payload.response ? String(event.payload.response) : null;
    if (!customerId || !status) return;

    const statusLabel = status === "ACCEPTED" ? "accepted" : "declined";
    const body = response
      ? `${vendorName} ${statusLabel} your quote request: "${response}"`
      : `${vendorName} ${statusLabel} your quote request.`;

    await notifyUser({
      userId: customerId,
      title: `Quote ${statusLabel}`,
      body,
      link: "/messages",
    });
  });

  onDomainEvent("WithdrawalRequested", async (event) => {
    const userId = String(event.payload.userId ?? "");
    const amount = Number(event.payload.amount ?? 0);
    if (!userId || amount <= 0) return;
    await notifyUser({
      userId,
      title: "Withdrawal requested",
      body: `Your withdrawal of ${formatCurrency(amount)} is being processed.`,
      link: "/vendor/payouts",
    });
  });

  onDomainEvent("RewardsExpired", async (event) => {
    const userId = String(event.payload.userId ?? "");
    const total = Number(event.payload.total ?? 0);
    if (!userId || total <= 0) return;
    await notifyUser({
      userId,
      title: "Rewards expired",
      body: `${formatCurrency(total)} in unused rewards expired after 12 months. Book again to earn more cashback.`,
      link: "/rewards",
    });
  });

  onDomainEvent("RewardsExpiringSoon", async (event) => {
    const userId = String(event.payload.userId ?? "");
    const total = Number(event.payload.total ?? 0);
    const withinDays = Number(event.payload.withinDays ?? 30);
    if (!userId || total <= 0) return;
    await notifyUser({
      userId,
      title: "Rewards expiring soon",
      body: `You have ${formatCurrency(total)} in rewards expiring within ${withinDays} days. Use them on your next booking before they lapse.`,
      link: "/rewards",
    });
  });
}
