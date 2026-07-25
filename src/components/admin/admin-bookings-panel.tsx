"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { BookingSnapshotCard } from "@/components/bookings/booking-snapshot-card";

const FILTERS = [
  "all",
  "RESERVED",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "disputed",
] as const;

type Booking = {
  id: string;
  status: string;
  eventDate: string;
  totalAmount: number;
  depositAmount: number;
  eventType?: string;
  guestCount?: number;
  bookingSnapshot?: unknown;
  customer: { fullName?: string; email: string; phone?: string };
  vendor: { businessName: string; slug: string };
  listing: { title: string; type: string; city: string };
  payments: { amount: number; status: string; escrowStatus: string; paystackRef?: string }[];
  dispute?: { status: string; reason: string } | null;
  payout?: { amount: number; status: string; reference: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/20 text-emerald-300",
  COMPLETED: "bg-emerald-500/20 text-emerald-300",
  RESERVED: "bg-amber-500/20 text-amber-300",
  PENDING_PAYMENT: "bg-amber-500/20 text-amber-300",
  CANCELLED: "bg-red-500/20 text-red-300",
  EXPIRED: "bg-white/10 text-[#E5DFD9]/40",
  IN_PROGRESS: "bg-blue-500/20 text-blue-300",
};

export function AdminBookingsPanel() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings", filter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/bookings?${params}`);
      return (await res.json()).data as Booking[];
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bookings"
        subtitle="Search, filter, and resolve booking issues across the platform."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E5DFD9]/30" />
          <input
            className="w-full rounded-xl border border-white/10 bg-[#1a1215]/60 py-2.5 pl-10 pr-4 text-sm text-[#E5DFD9] placeholder:text-[#E5DFD9]/30 focus:outline-none focus:ring-2 focus:ring-[#7A2E3D]/50"
            placeholder="Search by customer, vendor, or listing…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-[#7A2E3D]/30 text-[#E5DFD9]"
                : "text-[#E5DFD9]/40 hover:bg-white/5"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-white/5" />}

      <div className="space-y-2">
        {(data ?? []).map((b) => (
          <div
            key={b.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1215]/60"
          >
            <button
              className="flex w-full items-center gap-4 p-4 text-left hover:bg-white/[0.03]"
              onClick={() => setExpanded(expanded === b.id ? null : b.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[#E5DFD9]">{b.listing.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[b.status] ?? "bg-white/10"}`}>
                    {b.status.replace("_", " ")}
                  </span>
                  {b.dispute && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                      DISPUTED
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#E5DFD9]/40">
                  {b.customer.fullName ?? b.customer.email} · {b.vendor.businessName} ·{" "}
                  {format(new Date(b.eventDate), "MMM d, yyyy")}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-[#E5DFD9]/80">{formatCurrency(b.totalAmount)}</p>
            </button>

            {expanded === b.id && (
              <div className="border-t border-white/5 px-4 pb-4 pt-3">
                <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E5DFD9]/30">Customer</p>
                    <p className="text-[#E5DFD9]/80">{b.customer.fullName ?? "—"}</p>
                    <p className="text-xs text-[#E5DFD9]/40">{b.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E5DFD9]/30">Payment</p>
                    <p className="text-[#E5DFD9]/80">
                      Deposit: {formatCurrency(b.depositAmount)} · {b.payments[0]?.status ?? "—"}
                    </p>
                    <p className="text-xs text-[#E5DFD9]/40">Escrow: {b.payments[0]?.escrowStatus ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E5DFD9]/30">Payout</p>
                    <p className="text-[#E5DFD9]/80">
                      {b.payout ? `${formatCurrency(b.payout.amount)} · ${b.payout.status}` : "Not released"}
                    </p>
                  </div>
                  {b.dispute && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E5DFD9]/30">Dispute</p>
                      <p className="text-amber-300">{b.dispute.reason}</p>
                    </div>
                  )}
                  {b.bookingSnapshot != null && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <BookingSnapshotCard snapshot={b.bookingSnapshot} className="border-white/10 bg-[#1a1215]/60" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {!isLoading && !data?.length && (
          <p className="py-12 text-center text-sm text-[#E5DFD9]/40">No bookings match your filters.</p>
        )}
      </div>
    </div>
  );
}
