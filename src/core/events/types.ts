export type DomainEventType =
  | "BookingCreated"
  | "BookingConfirmed"
  | "BookingCancelled"
  | "BookingStatusUpdated"
  | "BookingCompleted"
  | "PaymentReceived"
  | "EscrowReleased"
  | "RewardGranted"
  | "RewardAdjusted"
  | "VerificationApproved"
  | "VerificationStatusChanged"
  | "VerificationSubmitted"
  | "DisputeOpened"
  | "DisputeResolved"
  | "QuoteReceived"
  | "QuoteStatusChanged"
  | "MessageReceived"
  | "WithdrawalRequested"
  | "PayoutRequested"
  | "PayoutReviewed"
  | "PayoutPaid"
  | "RewardsExpired"
  | "RewardsExpiringSoon"
  | "VendorVerified";

export type DomainEvent = {
  type: DomainEventType;
  payload: Record<string, unknown>;
  occurredAt: Date;
};
