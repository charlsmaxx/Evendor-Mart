/** Customer-facing confirm / dispute gates for a paid marketplace booking. */

const OPEN_DISPUTE_STATUSES = new Set(["OPEN", "UNDER_REVIEW"]);

export type CustomerBookingActionSource = {
  status: string;
  eventDate: Date | string;
  vendorCompletedAt?: Date | string | null;
  completionConfirmedAt?: Date | string | null;
  dispute?: { status: string } | null;
};

export function isOpenDispute(dispute?: { status: string } | null) {
  return !!dispute && OPEN_DISPUTE_STATUSES.has(dispute.status);
}

export function getCustomerBookingActions(booking: CustomerBookingActionSource) {
  const eventDate = new Date(booking.eventDate);
  const isPastEvent = eventDate.getTime() < Date.now();
  const vendorMarkedDone = !!booking.vendorCompletedAt;
  const active = ["CONFIRMED", "IN_PROGRESS"].includes(booking.status);
  const noOpenDispute = !isOpenDispute(booking.dispute);
  const notConfirmed = !booking.completionConfirmedAt;
  // After the customer withdraws a dispute, they should be able to approve payout
  // even if the event date has not passed yet (escrow is already HELD again).
  const disputeWithdrawn = booking.dispute?.status === "CLOSED";

  // Confirm after vendor marks delivered, event date passed, or a dispute was cancelled.
  const awaitingDecision =
    (vendorMarkedDone || isPastEvent || disputeWithdrawn) && active && notConfirmed;

  return {
    awaitingDecision,
    vendorMarkedDone,
    isPastEvent,
    /** Release escrow — only after delivery signal (or after withdrawing a dispute). */
    canConfirm: awaitingDecision && noOpenDispute,
    /**
     * Open a dispute while funds are still held.
     * Available for any confirmed/in-progress booking (not only post-event),
     * so customers can escalate from chat/booking before the auto-release window.
     */
    canDispute: active && noOpenDispute && notConfirmed,
  };
}
