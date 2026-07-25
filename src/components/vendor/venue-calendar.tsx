"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, Lock, Unlock, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ConfirmModal } from "@/components/vendor/vendor-ui";
import { CalendarSettingsPanel } from "@/components/vendor/calendar-settings-panel";

type BookingEntry = {
  id: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  status: string;
  source?: string;
  eventType?: string;
  guestCount?: number;
  totalAmount: number;
  customer: { fullName?: string };
  businessCustomer?: { fullName?: string };
  listing: { title: string };
};

type BlockedEntry = { id: string; date: string; reason?: string };

type DayState = "available" | "marketplace" | "manual" | "pending" | "completed" | "blocked";
type ViewMode = "day" | "week" | "month";

function getDayState(date: Date, bookings: BookingEntry[], blocked: BlockedEntry[]): DayState {
  if (blocked.some((b) => isSameDay(new Date(b.date), date))) return "blocked";
  const dayBookings = bookings.filter((b) => isSameDay(new Date(b.eventDate), date));
  if (dayBookings.some((b) => b.status === "COMPLETED")) return "completed";
  if (
    dayBookings.some(
      (b) => b.source === "MANUAL" && ["CONFIRMED", "IN_PROGRESS"].includes(b.status)
    )
  )
    return "manual";
  if (dayBookings.some((b) => ["CONFIRMED", "IN_PROGRESS"].includes(b.status))) return "marketplace";
  if (dayBookings.some((b) => ["RESERVED", "PENDING_PAYMENT"].includes(b.status))) return "pending";
  return "available";
}

const STATE_STYLES: Record<DayState, string> = {
  available: "bg-emerald-50/80 text-emerald-900 border-emerald-100",
  marketplace: "bg-red-100 text-red-900 border-red-200",
  manual: "bg-violet-100 text-violet-900 border-violet-200",
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  completed: "bg-slate-200 text-slate-800 border-slate-300",
  blocked: "bg-gray-200 text-gray-600 border-gray-300",
};

const STATE_LABELS: Record<DayState, string> = {
  available: "Available",
  marketplace: "Marketplace",
  manual: "Manual",
  pending: "Reserved",
  completed: "Completed",
  blocked: "Blocked",
};

export function VenueCalendar() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<"block" | "unblock" | null>(null);
  const [listingFilter, setListingFilter] = useState("");
  const queryClient = useQueryClient();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-calendar", year, month, listingFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (listingFilter) params.set("listingId", listingFilter);
      const res = await fetch(`/api/vendor/calendar?${params}`);
      const json = await res.json();
      return json.data as { bookings: BookingEntry[]; blockedDates: BlockedEntry[] };
    },
  });

  const { data: settingsData } = useQuery({
    queryKey: ["calendar-settings"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/calendar/settings");
      const json = await res.json();
      return json.data as { listings: { id: string; title: string }[] };
    },
  });

  const bookings = data?.bookings ?? [];
  const blocked = data?.blockedDates ?? [];

  const blockMutation = useMutation({
    mutationFn: async (dates: string[]) => {
      const res = await fetch("/api/vendor/calendar/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates, reason: blockReason || undefined }),
      });
      if (!res.ok) throw new Error("Failed to block");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-calendar"] });
      setBlockReason("");
      setSelectedDates([]);
      setBulkMode(false);
      setConfirmAction(null);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/vendor/calendar/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to unblock");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-calendar"] });
      setConfirmAction(null);
    },
  });

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const toggleBulkDate = (day: Date) => {
    setSelectedDates((prev) =>
      prev.some((d) => isSameDay(d, day)) ? prev.filter((d) => !isSameDay(d, day)) : [...prev, day]
    );
  };

  const selectedDayBookings = selectedDate
    ? bookings.filter((b) => isSameDay(new Date(b.eventDate), selectedDate))
    : [];
  const selectedDayBlocked = selectedDate
    ? blocked.filter((b) => isSameDay(new Date(b.date), selectedDate))
    : [];
  const selectedState = selectedDate ? getDayState(selectedDate, bookings, blocked) : null;

  const headerTitle =
    view === "month"
      ? format(currentDate, "MMMM yyyy")
      : view === "week"
        ? `Week of ${format(startOfWeek(currentDate), "MMM d")}`
        : format(currentDate, "EEEE, MMMM d");

  const renderDayCell = (day: Date, compact?: boolean) => {
    const state = getDayState(day, bookings, blocked);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const inBulk = selectedDates.some((d) => isSameDay(d, day));
    const today = isToday(day);

    return (
      <button
        key={day.toISOString()}
        type="button"
        onClick={() => {
          if (bulkMode) toggleBulkDate(day);
          else setSelectedDate(day);
        }}
        className={[
          "relative flex flex-col items-center justify-center rounded-xl border text-sm transition-all",
          compact ? "h-10 w-full" : "min-h-[72px] p-1",
          STATE_STYLES[state],
          isSelected && !bulkMode ? "ring-2 ring-primary ring-offset-1" : "",
          inBulk ? "ring-2 ring-primary" : "",
          today ? "font-bold" : "",
          view === "month" && !isSameMonth(day, currentDate) ? "opacity-40" : "",
        ].join(" ")}
      >
        {bulkMode && (
          <span className="absolute right-1 top-1">
            {inBulk ? <CheckSquare className="h-3 w-3 text-primary" /> : <Square className="h-3 w-3 opacity-40" />}
          </span>
        )}
        <span>{format(day, compact ? "d" : "EEE d")}</span>
        {!compact && state !== "available" && (
          <span className="mt-1 text-[10px] font-medium">{STATE_LABELS[state]}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={listingFilter}
            onChange={(e) => setListingFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All listings</option>
            {(settingsData?.listings ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <CalendarSettingsPanel />
        </div>
        <div className="flex rounded-xl bg-muted p-1">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition",
                view === v ? "bg-background shadow-sm" : "text-muted-foreground",
              ].join(" ")}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={bulkMode ? "default" : "outline"}
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedDates([]);
            }}
          >
            Bulk Select
          </Button>
          {bulkMode && selectedDates.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => setConfirmAction("block")}>
                Block {selectedDates.length} date(s)
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedDates([])}>
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{headerTitle}</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading calendar…</div>
          ) : view === "month" ? (
            <>
              <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getDay(monthDays[0]) }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {monthDays.map((day) => renderDayCell(day, true))}
              </div>
            </>
          ) : view === "week" ? (
            <div className="grid grid-cols-7 gap-2">{weekDays.map((day) => renderDayCell(day))}</div>
          ) : (
            <div className="max-w-xs">{selectedDate && renderDayCell(selectedDate)}</div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
            {(["available", "pending", "confirmed", "blocked"] as DayState[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-full border ${STATE_STYLES[s]}`} />
                {STATE_LABELS[s]}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
          {!selectedDate ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Select a date to manage availability.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-display text-lg font-bold">{format(selectedDate, "EEEE, MMM d")}</p>
                <p className="text-xs capitalize text-muted-foreground">{selectedState}</p>
              </div>

              {selectedDayBookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-semibold">{b.customer.fullName ?? "Customer"}</p>
                  <p className="text-muted-foreground">{b.listing.title}</p>
                  <p className="mt-1 font-medium text-primary">{formatCurrency(b.totalAmount)}</p>
                </div>
              ))}

              {selectedDayBlocked.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
                  <span>Blocked{b.reason ? `: ${b.reason}` : ""}</span>
                  <button
                    type="button"
                    onClick={() => setConfirmAction("unblock")}
                    className="text-muted-foreground hover:text-primary"
                    title="Unblock"
                  >
                    <Unlock className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {selectedDayBlocked.length === 0 && selectedState === "available" && (
                <div className="space-y-2 border-t border-border pt-4">
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Reason (optional)"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setConfirmAction("block")}
                  >
                    <Lock className="h-3.5 w-3.5" /> Block Date
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmAction === "block"}
        title="Block selected date(s)?"
        message="Customers won't be able to book on these dates. You can unblock them anytime."
        confirmLabel="Block Dates"
        loading={blockMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const dates = bulkMode && selectedDates.length > 0
            ? selectedDates.map((d) => d.toISOString())
            : selectedDate ? [selectedDate.toISOString()] : [];
          if (dates.length) blockMutation.mutate(dates);
        }}
      />

      <ConfirmModal
        open={confirmAction === "unblock"}
        title="Unblock this date?"
        message="Are you sure you want to unblock this date? It will become available for bookings again."
        confirmLabel="Unblock Date"
        destructive
        loading={unblockMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (selectedDayBlocked.length) {
            unblockMutation.mutate(selectedDayBlocked.map((b) => b.id));
          }
        }}
      />
    </div>
  );
}
