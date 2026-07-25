export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WorkingHoursDay = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WorkingHours = Record<DayKey, WorkingHoursDay>;

export type VacationPeriod = {
  id: string;
  start: string;
  end: string;
  label?: string;
};

export type VendorAvailabilitySettings = {
  workingHours: WorkingHours;
  vacations: VacationPeriod[];
  vacationMode: boolean;
  unavailableDates: string[];
};

const DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { enabled: true, start: "09:00", end: "18:00" },
  tuesday: { enabled: true, start: "09:00", end: "18:00" },
  wednesday: { enabled: true, start: "09:00", end: "18:00" },
  thursday: { enabled: true, start: "09:00", end: "18:00" },
  friday: { enabled: true, start: "09:00", end: "18:00" },
  saturday: { enabled: true, start: "10:00", end: "16:00" },
  sunday: { enabled: false, start: "10:00", end: "16:00" },
};

export function parseAvailabilitySettings(raw: unknown): VendorAvailabilitySettings {
  const base = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const wh = base.workingHours && typeof base.workingHours === "object"
    ? (base.workingHours as Record<string, WorkingHoursDay>)
    : {};

  const workingHours = { ...DEFAULT_WORKING_HOURS };
  for (const day of DAY_KEYS) {
    if (wh[day]) {
      workingHours[day] = {
        enabled: wh[day].enabled !== false,
        start: String(wh[day].start ?? workingHours[day].start),
        end: String(wh[day].end ?? workingHours[day].end),
      };
    }
  }

  const vacations = Array.isArray(base.vacations)
    ? base.vacations
        .filter((v): v is VacationPeriod => !!v && typeof v === "object" && "start" in v && "end" in v)
        .map((v, i) => ({
          id: String((v as VacationPeriod).id ?? `vac-${i}`),
          start: String((v as VacationPeriod).start),
          end: String((v as VacationPeriod).end),
          label: (v as VacationPeriod).label ? String((v as VacationPeriod).label) : undefined,
        }))
    : [];

  const vacationMode = base.vacationMode === true;
  const unavailableDates = Array.isArray(base.unavailableDates)
    ? base.unavailableDates.map((d) => String(d).slice(0, 10)).filter(Boolean)
    : [];

  return { workingHours, vacations, vacationMode, unavailableDates };
}

const DAY_BY_UTC_INDEX: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Pure check against vendor calendar settings (not BlockedDate rows).
 * `eventDay` is YYYY-MM-DD in the same UTC calendar the booking engine uses.
 */
export function reasonVendorClosedOnDay(
  settings: VendorAvailabilitySettings,
  eventDay: string
): string | null {
  if (settings.vacationMode && settings.unavailableDates.includes(eventDay)) {
    return "Vendor is unavailable on this date.";
  }

  for (const vac of settings.vacations) {
    const start = vac.start.slice(0, 10);
    const end = vac.end.slice(0, 10);
    if (eventDay >= start && eventDay <= end) {
      return vac.label
        ? `Vendor is on leave (${vac.label}).`
        : "Vendor is on leave for this date.";
    }
  }

  const day = DAY_BY_UTC_INDEX[new Date(`${eventDay}T00:00:00.000Z`).getUTCDay()];
  if (day && settings.workingHours[day] && !settings.workingHours[day].enabled) {
    return "Vendor is closed on this day of the week.";
  }

  return null;
}

export function eachDayInRange(start: string, end: string): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};
