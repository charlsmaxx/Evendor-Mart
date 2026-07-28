"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPriceRange, cn } from "@/lib/utils";
import { calcCashback } from "@/lib/rewards-utils";
import { reportClientError } from "@/lib/client-error";
import {
  calcPackageTotal,
  formatCancellationPolicyLines,
  packageBasePrice,
  PACKAGE_BADGE_LABELS,
  type VendorPackage,
} from "@/lib/vendor-packages";
import {
  getCategoryBookingFields,
  type CategoryBookingField,
} from "@/lib/category-booking-fields";

interface RewardsPreview {
  availableBalance: number;
  redeemable: number;
  balanceAfterRedeem: number;
  cashbackToEarn: number;
  finalAmountIfRedeemed: number;
}

export type BookingFormProps = {
  listingId: string;
  priceMin: number;
  priceMax: number;
  isVenue?: boolean;
  packages?: VendorPackage[];
  vendorCategory?: string | null;
  onSuccess?: () => void;
};

export function BookingForm({
  listingId,
  priceMin,
  priceMax,
  isVenue = false,
  packages = [],
  vendorCategory,
  onSuccess,
}: BookingFormProps) {
  const router = useRouter();
  const enabledPackages = packages.filter((p) => p.enabled && p.price > 0);
  const [packageId, setPackageId] = useState(enabledPackages[0]?.id ?? "");
  const selectedPkg = enabledPackages.find((p) => p.id === packageId) ?? null;

  const [addOnQty, setAddOnQty] = useState<Record<string, number>>({});
  const [categoryAnswers, setCategoryAnswers] = useState<Record<string, unknown>>({});
  const [acceptPolicy, setAcceptPolicy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [totalInput, setTotalInput] = useState(priceMin);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [eventTypeInput, setEventTypeInput] = useState("");
  const [guestCountInput, setGuestCountInput] = useState("");
  const [applyRewards, setApplyRewards] = useState(false);
  const [rewardsPreview, setRewardsPreview] = useState<RewardsPreview | null>(null);

  const categoryFields = useMemo(
    () => getCategoryBookingFields(vendorCategory),
    [vendorCategory]
  );

  const selectedAddOns = useMemo(
    () =>
      Object.entries(addOnQty)
        .filter(([, qty]) => qty > 0)
        .map(([addOnId, quantity]) => ({ addOnId, quantity })),
    [addOnQty]
  );

  const computedTotal = useMemo(() => {
    if (selectedPkg) return calcPackageTotal(selectedPkg, selectedAddOns);
    return totalInput;
  }, [selectedPkg, selectedAddOns, totalInput]);

  useEffect(() => {
    if (selectedPkg) {
      setTotalInput(calcPackageTotal(selectedPkg, selectedAddOns));
    }
  }, [selectedPkg, selectedAddOns]);

  useEffect(() => {
    setAddOnQty({});
    setAcceptPolicy(false);
  }, [packageId]);

  useEffect(() => {
    fetch(`/api/rewards/redeem?amount=${computedTotal}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setRewardsPreview(j.data);
      })
      .catch(() => {});
  }, [computedTotal]);

  const cashbackToEarn = calcCashback(computedTotal);
  const redeemable = rewardsPreview?.redeemable ?? 0;
  const finalAmount =
    applyRewards && redeemable > 0 ? computedTotal - redeemable : computedTotal;
  const listingPriceLabel = formatPriceRange(priceMin, priceMax);
  const policyLines = selectedPkg
    ? formatCancellationPolicyLines(selectedPkg.cancellationPolicy)
    : [
        "Free cancellation may apply depending on the vendor's default moderate policy until they configure package terms.",
      ];

  function setAnswer(field: CategoryBookingField, value: unknown) {
    setCategoryAnswers((prev) => ({ ...prev, [field.key]: value }));
    if (field.key === "guestCount" && typeof value === "number") {
      setGuestCountInput(String(value));
    }
  }

  async function createBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!acceptPolicy) {
      reportClientError("booking", "Please accept the cancellation policy to continue.");
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const total = computedTotal;
    const eventDateStr = String(fd.get("eventDate"));
    const startTimeStr = startTimeInput ? `${eventDateStr}T${startTimeInput}:00` : undefined;
    const endTimeStr = endTimeInput ? `${eventDateStr}T${endTimeInput}:00` : undefined;

    const guestFromCategory = categoryAnswers.guestCount;
    const guestCount =
      guestCountInput
        ? Number(guestCountInput)
        : typeof guestFromCategory === "number"
          ? guestFromCategory
          : undefined;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          eventDate: new Date(eventDateStr).toISOString(),
          startTime: startTimeStr ? new Date(startTimeStr).toISOString() : undefined,
          endTime: endTimeStr ? new Date(endTimeStr).toISOString() : undefined,
          eventType: eventTypeInput || undefined,
          guestCount,
          totalAmount: total,
          notes: fd.get("notes"),
          applyRewards,
          packageId: selectedPkg?.id,
          selectedAddOns,
          categoryAnswers,
          acceptCancellationPolicy: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { id: string };
        error?: { message?: string };
      } | null;
      if (!res.ok || !json?.data?.id) {
        reportClientError(
          "booking",
          json?.error?.message ??
            (res.status === 409
              ? "Booking Conflict Detected. This date/time is not available."
              : "Could not create booking. Please try again.")
        );
        return;
      }

      onSuccess?.();

      const payRes = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: json.data.id }),
      });
      const payJson = (await payRes.json().catch(() => null)) as {
        data?: { already_paid?: boolean; authorization_url?: string };
      } | null;
      if (payJson?.data?.already_paid) {
        router.push(`/bookings/${json.data.id}?payment=success`);
      } else if (payJson?.data?.authorization_url) {
        window.location.href = payJson.data.authorization_url;
      } else {
        router.push(`/bookings/${json.data.id}`);
      }
    } catch {
      reportClientError("booking", "Could not create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createBooking} className="space-y-4">
      <div
        className="space-y-4 rounded-2xl border border-border p-5"
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

        {enabledPackages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Choose a package</p>
            <div className="grid gap-2">
              {enabledPackages.map((pkg) => {
                const active = pkg.id === packageId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setPackageId(pkg.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{pkg.name}</p>
                        {pkg.shortDescription && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {pkg.shortDescription}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {pkg.badge && (
                          <span className="mb-1 block text-[10px] font-semibold uppercase text-primary">
                            {PACKAGE_BADGE_LABELS[pkg.badge]}
                          </span>
                        )}
                        <p className="font-semibold text-primary">
                          {formatCurrency(packageBasePrice(pkg))}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedPkg && selectedPkg.addOns.some((a) => a.active) && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium">Optional add-ons</p>
            {selectedPkg.addOns
              .filter((a) => a.active)
              .map((addOn) => {
                const qty = addOnQty[addOn.id] ?? 0;
                return (
                  <div
                    key={addOn.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{addOn.name}</p>
                      {addOn.description && (
                        <p className="text-xs text-muted-foreground">{addOn.description}</p>
                      )}
                      <p className="text-xs text-primary">{formatCurrency(addOn.price)}</p>
                    </div>
                    {addOn.quantityAllowed ? (
                      <Input
                        type="number"
                        min={0}
                        max={addOn.maxQuantity}
                        className="w-20"
                        value={qty}
                        onChange={(e) =>
                          setAddOnQty((prev) => ({
                            ...prev,
                            [addOn.id]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          qty > 0
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        )}
                        onClick={() =>
                          setAddOnQty((prev) => ({
                            ...prev,
                            [addOn.id]: qty > 0 ? 0 : 1,
                          }))
                        }
                      >
                        {qty > 0 ? "Added" : "Add"}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        <div className="space-y-3">
          <Input name="eventDate" type="date" required />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Start Time</label>
              <Input
                type="time"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Time</label>
              <Input
                type="time"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
              />
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

          {categoryFields.length > 0 && (
            <div className="space-y-2 rounded-xl border border-dashed border-border/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Event details
              </p>
              {categoryFields.map((field) => (
                <CategoryFieldInput
                  key={field.key}
                  field={field}
                  value={categoryAnswers[field.key]}
                  onChange={(v) => setAnswer(field, v)}
                />
              ))}
            </div>
          )}

          {!selectedPkg && (
            <Input
              name="totalAmount"
              type="number"
              placeholder={`Your total amount (from ${formatCurrency(priceMin)})`}
              min={priceMin}
              value={totalInput || ""}
              onChange={(e) => setTotalInput(Number(e.target.value))}
              required
            />
          )}
          <Textarea name="notes" placeholder="Notes (optional)" />
        </div>

        {computedTotal > 0 && (
          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{selectedPkg ? selectedPkg.name : isVenue ? "Your event total" : "Service total"}</span>
              <span className="font-medium text-foreground">
                {formatCurrency(selectedPkg ? packageBasePrice(selectedPkg) : computedTotal)}
              </span>
            </div>
            {selectedAddOns.length > 0 && selectedPkg && (
              <div className="flex justify-between text-muted-foreground">
                <span>Add-ons</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(computedTotal - packageBasePrice(selectedPkg))}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Booking total</span>
              <span>{formatCurrency(computedTotal)}</span>
            </div>

            {rewardsPreview && rewardsPreview.availableBalance > 0 && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">🎁 Available Rewards</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(rewardsPreview.availableBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="applyRewards" className="cursor-pointer text-muted-foreground">
                    Apply Rewards
                  </label>
                  <button
                    id="applyRewards"
                    type="button"
                    role="switch"
                    aria-checked={applyRewards}
                    disabled={redeemable <= 0}
                    onClick={() => setApplyRewards((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${applyRewards && redeemable > 0 ? "bg-primary" : "bg-border"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${applyRewards ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
                {applyRewards && redeemable > 0 && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Rewards Applied</span>
                    <span>−{formatCurrency(redeemable)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Amount to Pay</span>
              <span className="text-primary">{formatCurrency(finalAmount)}</span>
            </div>
            <p className="text-xs font-semibold text-primary/80">
              🎁 You&apos;ll earn {formatCurrency(cashbackToEarn)} in Evendor Rewards on this booking
            </p>
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
          <p className="text-sm font-semibold">Cancellation Policy</p>
          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
            {policyLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <label className="mt-2 flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptPolicy}
              onChange={(e) => setAcceptPolicy(e.target.checked)}
              required
            />
            <span>
              I agree to this cancellation policy, the vendor&apos;s terms,{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Evendor terms
              </Link>
              , Escrow policy and refund policy.
            </span>
          </label>
        </div>

        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          disabled={loading || !acceptPolicy}
        >
          {loading ? "Processing…" : "Confirm & Pay"}
        </Button>
      </div>
    </form>
  );
}

function CategoryFieldInput({
  field,
  value,
  onChange,
}: {
  field: CategoryBookingField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>{field.label}</span>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <Textarea
          rows={2}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "time") {
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <Input
          type="time"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{field.label}</label>
      <Input
        type={field.type === "number" ? "number" : "text"}
        min={field.min}
        max={field.max}
        placeholder={field.placeholder}
        value={value == null ? "" : String(value)}
        onChange={(e) =>
          onChange(field.type === "number" ? Number(e.target.value) || 0 : e.target.value)
        }
        required={field.required}
      />
    </div>
  );
}
