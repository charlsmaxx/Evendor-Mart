"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useCompareStore } from "@/stores/compare-store";
import { GitCompare, Heart, MessageSquare, Calendar } from "lucide-react";
import { startVendorConversation } from "@/lib/start-conversation";
import { formatCurrency, formatPriceRange } from "@/lib/utils";
import { calcCashback } from "@/lib/rewards-utils";
import { reportClientError } from "@/lib/client-error";
import { ShareListingButton } from "@/components/marketplace/share-listing-button";

interface ListingActionsProps {
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  vendorId: string;
  slug: string;
  priceMin: number;
  priceMax: number;
  isVenue?: boolean;
}

interface RewardsPreview {
  availableBalance: number;
  redeemable: number;
  balanceAfterRedeem: number;
  cashbackToEarn: number;
  finalAmountIfRedeemed: number;
}

export function ListingActions({
  listingId,
  listingSlug,
  listingTitle,
  vendorId,
  priceMin,
  priceMax,
  slug,
  isVenue = false,
}: ListingActionsProps) {
  const router = useRouter();
  const add = useCompareStore((s) => s.add);
  const compareItems = useCompareStore((s) => s.items);
  const [showBook, setShowBook] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compareAdded, setCompareAdded] = useState(false);

  const [totalInput, setTotalInput] = useState(priceMin);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [eventTypeInput, setEventTypeInput] = useState("");
  const [guestCountInput, setGuestCountInput] = useState("");
  const [applyRewards, setApplyRewards] = useState(false);
  const [rewardsPreview, setRewardsPreview] = useState<RewardsPreview | null>(null);

  const inCompare = compareItems.some((i) => i.listingId === listingId);
  const listingPriceLabel = formatPriceRange(priceMin, priceMax);

  useEffect(() => {
    if (!showBook) return;
    fetch(`/api/rewards/redeem?amount=${totalInput}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setRewardsPreview(j.data);
      })
      .catch(() => {});
  }, [showBook, totalInput]);

  const cashbackToEarn = calcCashback(totalInput);
  const redeemable = rewardsPreview?.redeemable ?? 0;
  const finalAmount = applyRewards && redeemable > 0 ? totalInput - redeemable : totalInput;

  async function toggleFavorite() {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
  }

  async function createBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const total = Number(fd.get("totalAmount"));
    const eventDateStr = String(fd.get("eventDate"));
    const startTimeStr = startTimeInput ? `${eventDateStr}T${startTimeInput}:00` : undefined;
    const endTimeStr = endTimeInput ? `${eventDateStr}T${endTimeInput}:00` : undefined;

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        eventDate: new Date(eventDateStr).toISOString(),
        startTime: startTimeStr ? new Date(startTimeStr).toISOString() : undefined,
        endTime: endTimeStr ? new Date(endTimeStr).toISOString() : undefined,
        eventType: eventTypeInput || undefined,
        guestCount: guestCountInput ? Number(guestCountInput) : undefined,
        totalAmount: total,
        notes: fd.get("notes"),
        applyRewards,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      reportClientError(
        "booking",
        json.error?.message ??
          (res.status === 409
            ? "Booking Conflict Detected. This date/time is not available."
            : "Could not create booking")
      );
      setLoading(false);
      return;
    }

    const payRes = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: json.data.id }),
    });
    const payJson = await payRes.json();
    if (payJson.data?.already_paid) {
      router.push(`/bookings/${json.data.id}?payment=success`);
    } else if (payJson.data?.authorization_url) {
      window.location.href = payJson.data.authorization_url;
    } else {
      router.push(`/bookings/${json.data.id}`);
    }
    setLoading(false);
  }

  async function startChat() {
    setLoading(true);
    const result = await startVendorConversation({ vendorId, listingId, vendorSlug: slug, router });
    setLoading(false);
    if (!result.ok && result.error) reportClientError("messages", result.error);
  }

  function handleCompare() {
    const result = add(listingId, vendorId, isVenue ? "VENUE" : "SERVICE");
    if (result === "same-vendor") {
      reportClientError(
        "compare",
        isVenue
          ? "Compare other event centers on the platform — you can't add another listing from the same venue."
          : "You can only compare listings from different vendors."
      );
      return;
    }
    if (result === "duplicate") return;
    setCompareAdded(true);
    setTimeout(() => setCompareAdded(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="gradient" onClick={() => setShowBook(!showBook)}>
          <Calendar className="h-4 w-4" /> Book now
        </Button>
        <Button variant="outline" onClick={startChat} disabled={loading}>
          <MessageSquare className="h-4 w-4" /> {loading ? "Opening…" : "Chat vendor"}
        </Button>
        <ShareListingButton
          title={listingTitle}
          url={typeof window !== "undefined" ? `${window.location.origin}/listings/${listingSlug}` : undefined}
        />
        <Button variant="ghost" onClick={toggleFavorite}>
          <Heart className="h-4 w-4" /> Save
        </Button>
        <Button variant="ghost" onClick={handleCompare}>
          <GitCompare className="h-4 w-4" />{" "}
          {inCompare || compareAdded ? "In compare" : isVenue ? "Compare venues" : "Compare"}
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        🎁 Book this listing and earn{" "}
        <span className="underline decoration-dotted">{formatCurrency(calcCashback(priceMin))}+</span> in Evendor
        Rewards
      </p>

      {showBook && (
        <form onSubmit={createBooking} className="space-y-4">
          <div
            className="rounded-2xl border border-border p-5 space-y-4"
            style={{
              background:
                "linear-gradient(135deg,rgba(122,46,61,0.04) 0%,rgba(229,223,217,0.10) 100%)",
            }}
          >
            <p className="font-display font-semibold">Booking Summary</p>
            <p className="text-xs text-muted-foreground">
              Listed from {listingPriceLabel}
              {isVenue ? " · enter your agreed event total below" : ""}
            </p>

            <div className="space-y-3">
              <Input name="eventDate" type="date" required />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Start Time</label>
                  <Input type="time" value={startTimeInput} onChange={(e) => setStartTimeInput(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Time</label>
                  <Input type="time" value={endTimeInput} onChange={(e) => setEndTimeInput(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Event type (Wedding…)"
                  value={eventTypeInput}
                  onChange={(e) => setEventTypeInput(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Guests"
                  min={1}
                  value={guestCountInput}
                  onChange={(e) => setGuestCountInput(e.target.value)}
                />
              </div>
              <Input
                name="totalAmount"
                type="number"
                placeholder={`Your total amount (from ${formatCurrency(priceMin)})`}
                min={priceMin}
                value={totalInput || ""}
                onChange={(e) => setTotalInput(Number(e.target.value))}
                required
              />
              <Textarea name="notes" placeholder="Notes (optional)" />
            </div>

            {totalInput > 0 && (
              <div className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{isVenue ? "Your event total" : "Service total"}</span>
                  <span className="font-medium text-foreground">{formatCurrency(totalInput)}</span>
                </div>

                {rewardsPreview && rewardsPreview.availableBalance > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-primary">🎁 Available Rewards</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(rewardsPreview.availableBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="applyRewards" className="text-muted-foreground cursor-pointer select-none">
                        Apply Rewards
                      </label>
                      <button
                        id="applyRewards"
                        type="button"
                        role="switch"
                        aria-checked={applyRewards}
                        disabled={redeemable <= 0}
                        onClick={() => setApplyRewards((v) => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${applyRewards && redeemable > 0 ? "bg-primary" : "bg-border"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${applyRewards ? "translate-x-6" : "translate-x-1"}`}
                        />
                      </button>
                    </div>
                    {redeemable > 0 ? (
                      applyRewards ? (
                        <>
                          <div className="flex justify-between font-medium text-emerald-700">
                            <span>Rewards Applied</span>
                            <span>−{formatCurrency(redeemable)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(rewardsPreview.balanceAfterRedeem)} stays in your
                            wallet for future bookings.
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(redeemable)} of your balance can go toward this
                          booking.
                        </p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Your balance can&apos;t be used on a booking this size yet.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between font-semibold border-t border-border pt-2">
                  <span>Amount to Pay</span>
                  <span className="text-primary">{formatCurrency(finalAmount)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-primary/80 font-semibold">
                  🎁 You&apos;ll earn{" "}
                  <span className="underline decoration-dotted">{formatCurrency(cashbackToEarn)} in Evendor Rewards</span>{" "}
                  on this booking
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Paid in full via Paystack and held in Evendor Escrow until you confirm the job
              is done.
            </p>
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? "Processing…" : "Confirm & Pay"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
