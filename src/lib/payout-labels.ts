/** Vendor-facing payout status copy. Internal enum names stay in the database. */
export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Available for Payout",
  REQUESTED: "Payout Requested",
  UNDER_REVIEW: "Payout Under Review",
  APPROVED: "Payout Approved — Awaiting Payment",
  PAID: "Payout Paid",
  REJECTED: "Payout Rejected",
  ON_HOLD: "Payout On Hold",
  PAYMENT_FAILED: "Payment Failed",
  PROCESSING: "Processing",
  FAILED: "Failed",
  REVERSED: "Reversed",
};

export function payoutStatusLabel(status: string) {
  return PAYOUT_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export const REQUESTABLE_PAYOUT_STATUSES = ["PENDING"] as const;
export const REVIEWABLE_PAYOUT_STATUSES = ["REQUESTED", "UNDER_REVIEW"] as const;
export const APPROVED_PAYOUT_STATUSES = ["APPROVED"] as const;
export const OPEN_PAYOUT_REQUEST_STATUSES = [
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "ON_HOLD",
] as const;

export function isBankPaidPayout(payout: { status: string; paidById?: string | null }) {
  return payout.status === "PAID" && !!payout.paidById;
}
