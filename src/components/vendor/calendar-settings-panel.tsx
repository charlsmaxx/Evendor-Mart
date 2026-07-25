"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DAY_LABELS,
  DEFAULT_WORKING_HOURS,
  type DayKey,
  type VendorAvailabilitySettings,
} from "@/lib/vendor-availability";

export function CalendarSettingsPanel() {
  const qc = useQueryClient();
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [vacationLabel, setVacationLabel] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["calendar-settings"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/calendar/settings");
      const json = await res.json();
      return json.data as { settings: VendorAvailabilitySettings };
    },
  });

  const settings = data?.settings ?? {
    workingHours: DEFAULT_WORKING_HOURS,
    vacations: [],
  };

  const saveHours = useMutation({
    mutationFn: async (workingHours: VendorAvailabilitySettings["workingHours"]) => {
      const res = await fetch("/api/vendor/calendar/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-settings"] }),
  });

  const addVacation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vendor/calendar/vacation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: vacationStart,
          end: vacationEnd,
          label: vacationLabel || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-settings"] });
      qc.invalidateQueries({ queryKey: ["vendor-calendar"] });
      setVacationStart("");
      setVacationEnd("");
      setVacationLabel("");
    },
  });

  function updateDay(day: DayKey, patch: Partial<(typeof settings.workingHours)[DayKey]>) {
    saveHours.mutate({
      ...settings.workingHours,
      [day]: { ...settings.workingHours[day], ...patch },
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <CalendarDays className="h-4 w-4" /> Hours & vacation
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Working hours & vacation</h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Working hours</p>
        <div className="space-y-2">
          {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => {
            const row = settings.workingHours[day] ?? DEFAULT_WORKING_HOURS[day];
            return (
              <div key={day} className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex w-28 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                  />
                  {DAY_LABELS[day]}
                </label>
                <Input
                  type="time"
                  value={row.start}
                  disabled={!row.enabled}
                  className="h-8 w-28"
                  onChange={(e) => updateDay(day, { start: e.target.value })}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={row.end}
                  disabled={!row.enabled}
                  className="h-8 w-28"
                  onChange={(e) => updateDay(day, { end: e.target.value })}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Palmtree className="h-4 w-4" /> Add vacation / holiday
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Start date</Label>
            <Input type="date" value={vacationStart} onChange={(e) => setVacationStart(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">End date</Label>
            <Input type="date" value={vacationEnd} onChange={(e) => setVacationEnd(e.target.value)} />
          </div>
        </div>
        <Input
          placeholder="Label (optional)"
          value={vacationLabel}
          onChange={(e) => setVacationLabel(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!vacationStart || !vacationEnd || addVacation.isPending}
          onClick={() => addVacation.mutate()}
        >
          {addVacation.isPending ? "Blocking dates…" : "Block vacation dates"}
        </Button>
        {settings.vacations.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {settings.vacations.map((v) => (
              <li key={v.id}>
                {v.label ?? "Vacation"}: {v.start} → {v.end}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
