"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MessageSquare,
  FileText,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { formatCurrency } from "@/lib/utils";
import { parsePaginatedApiResponse } from "@/lib/parse-paginated-api-response";
import { VendorPageHeader, BOOKING_STATUS_STYLES } from "@/components/vendor/vendor-ui";
import { VendorBookingsListSkeleton } from "@/components/loading/vendor-bookings-skeleton";
import type { VendorBookingFilter } from "@/lib/booking-list-filters";

type Booking = {
  id: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  eventType?: string;
  guestCount?: number;
  totalAmount: number;
  status: string;
  reservationExpiresAt?: string;
  notes?: string;
  customer: { fullName?: string; email: string; phone?: string; avatarUrl?: string };
  listing: { title: string };
  payments: { status: string; escrowStatus?: string }[];
  dispute?: { id: string; status: string } | null;
};

const FILTERS: VendorBookingFilter[] = [
  "all",
  "pending",
  "reserved",
  "confirmed",
  "upcoming",
  "today",
  "completed",
  "cancelled",
  "disputed",
];

const FILTER_LABELS: Record<VendorBookingFilter, string> = {
  all: "All",
  pending: "New Request",
  reserved: "Reserved",
  confirmed: "Confirmed",
  upcoming: "Upcoming",
  today: "Today",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const PAGE_SIZE = 20;

export default function VendorBookingsPage() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") as VendorBookingFilter) ?? "all";
  const [filter, setFilter] = useState<VendorBookingFilter>(
    FILTERS.includes(initialFilter) ? initialFilter : "all"
  );
  const [expandedId, setExpandedId] = useState<string | null>(
    searchParams.get("highlight") ?? null
  );
  const queryClient = useQueryClient();

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["vendor-bookings", filter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `/api/bookings?scope=vendor&filter=${filter}&page=${pageParam}&limit=${PAGE_SIZE}`
      );
      const parsed = await parsePaginatedApiResponse<Booking>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return { items: parsed.data, meta: parsed.meta! };
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Update failed");
      return json.data as { escrowMessage?: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-bookings"] }),
  });

  const bookings = data?.pages.flatMap((page) => page.items) ?? [];
  const filterCounts = data?.pages[0]?.meta?.filterCounts;
  const lastMeta = data?.pages[data.pages.length - 1]?.meta;

  return (
    <div className="space-y-6">
      <VendorPageHeader
        title="Bookings Center"
        subtitle="Manage requests, confirmed events, and completed jobs."
      />

      <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted/80 p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
              filter === f
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {FILTER_LABELS[f]}
            {f !== "all" && filterCounts && (
              <span className="ml-1 opacity-60">({filterCounts[f] ?? 0})</span>
            )}
          </button>
        ))}
      </div>

      {updateStatus.data?.escrowMessage && (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {updateStatus.data.escrowMessage}
        </p>
      )}
      {updateStatus.error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">
          {(updateStatus.error as Error).message}
        </p>
      )}

      {isLoading && <VendorBookingsListSkeleton />}

      {!isLoading && bookings.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No bookings found</p>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const isExpanded = expandedId === b.id;
          const isPending = ["RESERVED", "PENDING_PAYMENT"].includes(b.status);
          const isConfirmed = ["CONFIRMED", "IN_PROGRESS"].includes(b.status);
          const paymentStatus = b.payments[0]?.status ?? "PENDING";
          const escrowStatus = b.payments[0]?.escrowStatus;

          return (
            <div
              key={b.id}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm"
            >
              <button
                className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-muted/30"
                onClick={() => setExpandedId(isExpanded ? null : b.id)}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                  {(b.customer.fullName ?? b.customer.email).charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{b.customer.fullName ?? b.customer.email}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${BOOKING_STATUS_STYLES[b.status] ?? "bg-muted"}`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                    {b.dispute?.status === "OPEN" && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Disputed
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(b.eventDate), "EEE, MMM d yyyy")}
                    </span>
                    {b.startTime && b.endTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(b.startTime), "h:mm a")} – {format(new Date(b.endTime), "h:mm a")}
                      </span>
                    )}
                    {b.eventType && <span>{b.eventType}</span>}
                    {b.guestCount && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {b.guestCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold text-primary">{formatCurrency(b.totalAmount)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {paymentStatus === "SUCCESS" ? "Paid" : "Payment pending"}
                    {escrowStatus === "HELD" ? " · Escrow" : ""}
                  </p>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-4 border-t border-border bg-muted/20 px-4 pb-4 pt-3">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Service
                      </p>
                      <p>{b.listing.title}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Amount
                      </p>
                      <p>
                        {formatCurrency(b.totalAmount)}{" "}
                        {paymentStatus === "SUCCESS" ? "✓ Paid" : "· Pending"}
                      </p>
                    </div>
                    {b.notes && (
                      <div className="sm:col-span-2">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Notes
                        </p>
                        <p className="text-muted-foreground">{b.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={() => updateStatus.mutate({ id: b.id, status: "CONFIRMED" })}
                          disabled={updateStatus.isPending}
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: b.id, status: "DECLINED" })}
                          disabled={updateStatus.isPending}
                          className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Decline
                        </Button>
                      </>
                    )}
                    {isConfirmed && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: b.id, status: "IN_PROGRESS" })}
                          disabled={updateStatus.isPending || b.status === "IN_PROGRESS"}
                          className="gap-1.5"
                        >
                          <MapPin className="h-3.5 w-3.5" /> Mark Arrived
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: b.id, status: "COMPLETED" })}
                          disabled={updateStatus.isPending}
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
                        </Button>
                      </>
                    )}
                    <Link href={`/vendor/bookings/${b.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/vendor/bookings/${b.id}`}>
                      <Button size="sm" variant="ghost" className="gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" /> Message
                      </Button>
                    </Link>
                    {b.dispute && (
                      <Link href="/vendor/disputes">
                        <Button size="sm" variant="ghost" className="gap-1.5 text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> View Dispute
                        </Button>
                      </Link>
                    )}
                    <Link href={`/api/bookings/${b.id}/invoice`} target="_blank">
                      <Button size="sm" variant="ghost" className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Invoice
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <LoadMoreButton
        meta={hasNextPage ? lastMeta : null}
        onLoadMore={() => fetchNextPage()}
        loading={isFetchingNextPage}
      />
    </div>
  );
}
