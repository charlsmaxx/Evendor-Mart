/** Platform health score helpers — pure functions, safe anywhere */

export type HealthInputs = {
  bookingSuccessRate: number; // 0–100
  disputeRate: number; // 0–100
  verificationRate: number; // 0–100
  revenueGrowth: number | null; // percent, null = no data
  avgRating: number; // 0–5
  uptimePercent?: number;
};

export function computePlatformHealthScore(input: HealthInputs): number {
  const uptime = input.uptimePercent ?? 99.5;

  const bookingPts = Math.min(25, (input.bookingSuccessRate / 100) * 25);
  const disputePts = Math.min(20, Math.max(0, (1 - input.disputeRate / 100) * 20));
  const verifyPts = Math.min(15, (input.verificationRate / 100) * 15);
  const uptimePts = Math.min(15, (uptime / 100) * 15);

  let growthPts = 7.5;
  if (input.revenueGrowth !== null) {
    if (input.revenueGrowth >= 10) growthPts = 15;
    else if (input.revenueGrowth >= 0) growthPts = 12;
    else if (input.revenueGrowth >= -10) growthPts = 8;
    else growthPts = 4;
  }

  const satisfactionPts = Math.min(10, (input.avgRating / 5) * 10);

  return Math.round(bookingPts + disputePts + verifyPts + uptimePts + growthPts + satisfactionPts);
}

export function healthLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Excellent", color: "text-emerald-500" };
  if (score >= 70) return { label: "Good", color: "text-primary" };
  if (score >= 50) return { label: "Fair", color: "text-amber-500" };
  return { label: "Needs Attention", color: "text-red-500" };
}

export const ACTIVITY_LABELS: Record<string, string> = {
  BOOKING_CREATED: "New Booking",
  BOOKING_STATUS_UPDATE: "Booking Updated",
  BOOKING_CONFIRMED: "Booking Confirmed",
  PAYMENT_RECEIVED: "Payment Received",
  ESCROW_RELEASED: "Payout Released",
  VERIFICATION_REQUESTED: "Verification Submitted",
  VERIFICATION_APPROVE: "Verification Approved",
  VERIFICATION_REJECT: "Verification Rejected",
  DISPUTE_CREATED: "Dispute Opened",
  DISPUTE_RESOLVED: "Dispute Resolved",
  REVIEW_CREATED: "Review Submitted",
  VENDOR_UPDATE: "Vendor Updated",
  VENDOR_REGISTERED: "Vendor Registered",
  REWARD_EARNED: "Reward Earned",
  REWARD_REDEEMED: "Reward Redeemed",
  ADMIN_ROLE_UPDATED: "Admin Role Updated",
  ADMIN_ACCESS_GRANTED: "Admin Access Granted",
  ADMIN_ACCESS_REVOKED: "Admin Access Revoked",
  RECONCILIATION_RUN: "Reconciliation Run",
};
