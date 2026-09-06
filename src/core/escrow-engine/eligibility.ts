/**
 * Server-side booking completion eligibility — whether held customer funds
 * may be marked complete and a vendor payout record created (status PENDING).
 *
 * This does NOT pay the vendor. The vendor must request payout; an authorised
 * admin reviews and records a manual business payment before status becomes PAID.
 *
 * Never trust the frontend for these checks.
 */
import { prisma } from "@/core/infrastructure/prisma";
import { AUTO_RELEASE_HOURS, vendorShareAmount } from "@/core/shared/config";

export type PayoutReleaseSource =
  | "customer_confirm"
  | "auto_release"
  | "admin"
  | "dispute_resolve";

export type BookingPayoutEligibility = {
  eligible: boolean;
  reason: string;
  /** Vendor payable in whole NGN (server-calculated). */
  vendorPayableAmount: number;
  /** Commission retained by Evendor in whole NGN. */
  commissionAmount: number;
  bookingId: string;
  vendorId: string;
  status:
    | "NOT_ELIGIBLE"
    | "ELIGIBLE"
    | "ALREADY_RELEASED"
    | "ON_HOLD"
    | "CANCELLED"
    | "REFUNDED";
};

function completionSignalAt(booking: {
  vendorCompletedAt: Date | null;
  eventDate: Date;
}): Date {
  return booking.vendorCompletedAt ?? booking.eventDate;
}

function hasCompletionSignal(booking: {
  vendorCompletedAt: Date | null;
  eventDate: Date;
  dispute: { status: string } | null;
}): boolean {
  const now = Date.now();
  if (booking.vendorCompletedAt) return true;
  if (booking.eventDate.getTime() <= now) return true;
  // Customer withdrew a dispute — allow confirm without waiting for event date.
  if (booking.dispute?.status === "CLOSED") return true;
  return false;
}

/**
 * Evaluates whether a booking's held payment may be released to the vendor ledger.
 * Callers (customer confirm, admin, auto-release cron) must still perform the
 * release transaction atomically — this function is the shared rule set.
 */
export async function isBookingPayoutEligible(
  bookingId: string,
  options?: { source?: PayoutReleaseSource }
): Promise<BookingPayoutEligibility> {
  const source = options?.source ?? "admin";

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payments: true,
      payout: true,
      dispute: true,
    },
  });

  if (!booking) {
    return {
      eligible: false,
      reason: "Booking not found.",
      vendorPayableAmount: 0,
      commissionAmount: 0,
      bookingId,
      vendorId: "",
      status: "NOT_ELIGIBLE",
    };
  }

  const gross = booking.totalAmount;
  const vendorPayableAmount = vendorShareAmount(gross);
  const commissionAmount = Math.max(0, gross - vendorPayableAmount);

  const base = {
    vendorPayableAmount,
    commissionAmount,
    bookingId: booking.id,
    vendorId: booking.vendorId,
  };

  if (["CANCELLED", "DECLINED", "EXPIRED"].includes(booking.status)) {
    return {
      ...base,
      eligible: false,
      reason: "Booking is cancelled or no longer active.",
      status: "CANCELLED",
    };
  }

  if (booking.payout) {
    return {
      ...base,
      eligible: false,
      reason: "A payout record already exists for this booking.",
      status: "ALREADY_RELEASED",
    };
  }

  if (booking.dispute && ["OPEN", "UNDER_REVIEW"].includes(booking.dispute.status)) {
    return {
      ...base,
      eligible: false,
      reason: "Funds are on hold while a dispute is open.",
      status: "ON_HOLD",
    };
  }

  const successfulHeld = booking.payments.filter(
    (p) => p.status === "SUCCESS" && p.escrowStatus === "HELD"
  );
  const refunded = booking.payments.some(
    (p) => p.status === "REFUNDED" || p.escrowStatus === "REFUNDED"
  );

  if (refunded && successfulHeld.length === 0) {
    return {
      ...base,
      eligible: false,
      reason: "Payment was refunded; no payout is due.",
      status: "REFUNDED",
    };
  }

  if (successfulHeld.length === 0) {
    return {
      ...base,
      eligible: false,
      reason: "No successful held payment is available to release.",
      status: "NOT_ELIGIBLE",
    };
  }

  if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
    return {
      ...base,
      eligible: false,
      reason: "Booking is not in a releasable state.",
      status: "NOT_ELIGIBLE",
    };
  }

  if (vendorPayableAmount <= 0) {
    return {
      ...base,
      eligible: false,
      reason: "Vendor payable amount is not positive.",
      status: "NOT_ELIGIBLE",
    };
  }

  // Dispute resolution has its own ledger path; when it does call here, skip
  // the normal completion-signal window.
  if (source !== "dispute_resolve") {
    if (!hasCompletionSignal(booking)) {
      return {
        ...base,
        eligible: false,
        reason:
          "Payout becomes available after the service is successfully completed (or the event date has passed).",
        status: "NOT_ELIGIBLE",
      };
    }

    if (source === "auto_release") {
      const signalAt = completionSignalAt(booking);
      const eligibleAt = new Date(
        signalAt.getTime() + AUTO_RELEASE_HOURS * 60 * 60 * 1000
      );
      if (eligibleAt.getTime() > Date.now()) {
        return {
          ...base,
          eligible: false,
          reason: `Automatic release requires ${AUTO_RELEASE_HOURS} hours after delivery/event without a dispute.`,
          status: "NOT_ELIGIBLE",
        };
      }
    }
  }

  return {
    ...base,
    eligible: true,
    reason: "Booking is eligible for vendor payout after completion checks.",
    status: "ELIGIBLE",
  };
}
