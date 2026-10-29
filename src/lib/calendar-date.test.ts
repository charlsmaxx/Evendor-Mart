import assert from "node:assert/strict";
import test from "node:test";
import { calendarDateKey, parseCalendarDate } from "./calendar-date";

test("date-only values stay on the selected calendar day in UTC", () => {
  const date = parseCalendarDate("2026-10-30");
  assert.ok(date);
  assert.equal(date.toISOString(), "2026-10-30T00:00:00.000Z");
  assert.equal(calendarDateKey(date), "2026-10-30");
});

test("invalid date-only values are rejected instead of rolling into another day", () => {
  assert.equal(parseCalendarDate("2026-02-30"), null);
  assert.equal(parseCalendarDate("not-a-date"), null);
});

test("legacy ISO timestamps normalize to their UTC calendar day", () => {
  const date = parseCalendarDate("2026-10-29T23:00:00.000Z");
  assert.ok(date);
  assert.equal(calendarDateKey(date), "2026-10-29");
});
