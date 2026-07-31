"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  parseAvailabilitySettings,
  reasonVendorClosedOnDay,
} from "@/lib/vendor-availability";

type AvailabilityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  availability?: unknown;
  onBook?: () => void;
};

type DayStatus = "available" | "unavailable" | "past_or_blocked";

function parseDateList(availability: unknown, keys: string[]): Set<string> {
  const out = new Set<string>();
  if (!availability || typeof availability !== "object") return out;
  const a = availability as Record<string, unknown>;
  for (const key of keys) {
    const list = a[key];
    if (!Array.isArray(list)) continue;
    for (const d of list) {
      const date = new Date(String(d));
      if (!Number.isNaN(date.getTime())) out.add(format(date, "yyyy-MM-dd"));
    }
  }
  return out;
}

function dayStatus(
  day: Date,
  today: Date,
  settings: ReturnType<typeof parseAvailabilitySettings>,
  blockedDates: Set<string>,
  bookedDates: Set<string>
): DayStatus {
  const key = format(day, "yyyy-MM-dd");
  if (isBefore(day, today) || blockedDates.has(key)) return "past_or_blocked";
  if (bookedDates.has(key) || reasonVendorClosedOnDay(settings, key)) return "unavailable";
  return "available";
}

export function AvailabilityDialog({
  open,
  onOpenChange,
  availability,
  onBook,
}: AvailabilityDialogProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  const settings = useMemo(() => parseAvailabilitySettings(availability), [availability]);
  const blockedDates = useMemo(
    () => parseDateList(availability, ["blockedDates"]),
    [availability]
  );
  const bookedDates = useMemo(
    () => parseDateList(availability, ["bookedDates"]),
    [availability]
  );
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-3 p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Check availability</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold">{format(month, "MMMM yyyy")}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[280px]">
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="py-0.5 font-medium">
                  {d}
                </span>
              ))}
            </div>

            <div className="mt-0.5 grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const outside = !isSameMonth(day, month);
                const status = dayStatus(day, today, settings, blockedDates, bookedDates);
                const isSelected = selected ? isSameDay(day, selected) : false;
                const selectable = status === "available" && !outside;
                const statusLabel =
                  status === "available"
                    ? "available"
                    : status === "unavailable"
                      ? "not available"
                      : "past or blocked";

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!selectable}
                    onClick={() => setSelected(day)}
                    aria-label={`${format(day, "d MMMM yyyy")}: ${statusLabel}`}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-md text-xs font-medium transition",
                      outside && "opacity-35",
                      status === "available" &&
                        !outside &&
                        "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                      status === "unavailable" &&
                        !outside &&
                        "bg-red-100 text-red-700",
                      status === "past_or_blocked" &&
                        !outside &&
                        "bg-stone-200 text-stone-500",
                      outside && status === "available" && "bg-emerald-50 text-emerald-700/70",
                      outside && status === "unavailable" && "bg-red-50 text-red-600/70",
                      outside && status === "past_or_blocked" && "bg-stone-100 text-stone-400",
                      isSelected &&
                        "ring-2 ring-primary ring-offset-1 ring-offset-background bg-emerald-500 text-white hover:bg-emerald-600"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <ul
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground"
          aria-label="Availability legend"
        >
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Green</span> — Available
            </span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-red-500" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Red</span> — Not available
            </span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-stone-400" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Grey</span> — Past / blocked
            </span>
          </li>
        </ul>

        {selected && (
          <p className="text-xs font-medium">
            Selected: {format(selected, "EEEE, d MMMM yyyy")}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant="gradient"
            disabled={!selected}
            onClick={() => onBook?.()}
          >
            Continue to book
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
