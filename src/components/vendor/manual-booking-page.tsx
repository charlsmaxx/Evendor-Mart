"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VendorPageHeader, VendorSection } from "@/components/vendor/vendor-ui";
import { PremiumUpgradeModal } from "@/components/vendor/premium-upgrade-modal";
import { useVendorSubscription } from "@/hooks/use-vendor-subscription";
import { parseApiResponse } from "@/lib/parse-api-response";
import type { PremiumFeature } from "@/core/subscription-engine/types";

type Listing = { id: string; title: string; status: string };

export function ManualBookingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sub } = useVendorSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: listings } = useQuery({
    queryKey: ["vendor-listings-manual"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/profile", { credentials: "same-origin" });
      const parsed = await parseApiResponse<{ listings: Listing[] }>(res);
      if (!parsed.ok) return [];
      return parsed.data.listings.filter((l) => l.status === "PUBLISHED" || l.status === "DRAFT");
    },
  });

  const [form, setForm] = useState({
    listingId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    eventType: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    guestCount: "",
    totalAmount: "",
    depositReceived: "",
    outstandingBalance: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vendor/manual-bookings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: form.listingId,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail || undefined,
          eventType: form.eventType || undefined,
          eventDate: form.eventDate,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          guestCount: form.guestCount ? Number(form.guestCount) : undefined,
          totalAmount: Number(form.totalAmount),
          depositReceived: form.depositReceived ? Number(form.depositReceived) : undefined,
          outstandingBalance: form.outstandingBalance
            ? Number(form.outstandingBalance)
            : undefined,
          notes: form.notes || undefined,
          status: "CONFIRMED",
        }),
      });
      if (res.status === 402) {
        setUpgradeOpen(true);
        throw new Error("Premium required");
      }
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return parsed.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vendor-calendar"] });
      void queryClient.invalidateQueries({ queryKey: ["vendor-overview"] });
      router.push("/vendor/calendar");
    },
  });

  const isPremium = sub?.isPremium ?? false;

  return (
    <div className="space-y-6">
      <VendorPageHeader
        title="New Manual Booking"
        subtitle="Record walk-ins, phone, WhatsApp, and repeat clients — uses the same calendar & conflict checks as marketplace bookings."
      />

      {!isPremium && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Crown className="h-5 w-5 text-primary" />
          <p className="flex-1 text-sm">
            Manual bookings are a <strong>Premium</strong> feature. Upgrade to record offline clients.
          </p>
          <Button size="sm" variant="gradient" onClick={() => setUpgradeOpen(true)}>
            Upgrade
          </Button>
        </div>
      )}

      <VendorSection title="Booking details">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isPremium) {
              setUpgradeOpen(true);
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <Label>Venue / Service</Label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={form.listingId}
              onChange={(e) => setForm({ ...form, listingId: e.target.value })}
              required
            >
              <option value="">Select listing</option>
              {(listings ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Customer name</Label>
            <Input
              className="mt-1"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              className="mt-1"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Email (optional)</Label>
            <Input
              type="email"
              className="mt-1"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
          </div>
          <div>
            <Label>Event type</Label>
            <Input
              className="mt-1"
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              placeholder="Wedding, corporate…"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Start time</Label>
            <Input
              type="time"
              className="mt-1"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div>
            <Label>End time</Label>
            <Input
              type="time"
              className="mt-1"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <div>
            <Label>Guest count</Label>
            <Input
              type="number"
              min={1}
              className="mt-1"
              value={form.guestCount}
              onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
            />
          </div>
          <div>
            <Label>Agreed price (₦)</Label>
            <Input
              type="number"
              min={0}
              step="1"
              className="mt-1"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Deposit received (₦)</Label>
            <Input
              type="number"
              min={0}
              step="1"
              className="mt-1"
              value={form.depositReceived}
              onChange={(e) => setForm({ ...form, depositReceived: e.target.value })}
            />
          </div>
          <div>
            <Label>Outstanding balance (₦)</Label>
            <Input
              type="number"
              min={0}
              step="1"
              className="mt-1"
              value={form.outstandingBalance}
              onChange={(e) => setForm({ ...form, outstandingBalance: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              variant="gradient"
              className="gap-2"
              disabled={mutation.isPending}
            >
              <Plus className="h-4 w-4" />
              {mutation.isPending ? "Saving…" : "Save booking"}
            </Button>
            {mutation.isError && mutation.error.message !== "Premium required" && (
              <p className="mt-2 text-sm text-destructive">{mutation.error.message}</p>
            )}
          </div>
        </form>
      </VendorSection>

      <PremiumUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature={"manual_booking" as PremiumFeature}
      />
    </div>
  );
}
