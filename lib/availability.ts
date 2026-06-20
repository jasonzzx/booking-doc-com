import { and, eq, gte, lte, lt, gt, ne } from "drizzle-orm";
import { fromZonedTime } from "date-fns-tz";
import { addMinutes, addDays, format } from "date-fns";
import { getDb } from "@/lib/db";
import { appointments, availabilityOverrides, availabilityRules } from "@/lib/db/schema";
import { CLINIC_TIMEZONE, SLOT_STEP_MINUTES } from "@/lib/constants";

export interface SlotInterval {
  start: Date;
  end: Date;
}

interface MinuteWindow {
  start: number; // minutes since local midnight
  end: number;
}

interface RuleLike {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface OverrideLike {
  startTime: string | null;
  endTime: string | null;
  type: "blocked" | "open";
}

function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeString(total: number): string {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function mergeWindows(windows: MinuteWindow[]): MinuteWindow[] {
  if (windows.length === 0) return [];
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const merged: MinuteWindow[] = [{ ...sorted[0] }];
  for (const w of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (w.start <= last.end) {
      last.end = Math.max(last.end, w.end);
    } else {
      merged.push({ ...w });
    }
  }
  return merged;
}

function subtractWindow(windows: MinuteWindow[], block: MinuteWindow): MinuteWindow[] {
  const result: MinuteWindow[] = [];
  for (const w of windows) {
    if (block.end <= w.start || block.start >= w.end) {
      result.push(w);
      continue;
    }
    if (block.start > w.start) {
      result.push({ start: w.start, end: Math.min(block.start, w.end) });
    }
    if (block.end < w.end) {
      result.push({ start: Math.max(block.end, w.start), end: w.end });
    }
  }
  return result.filter((w) => w.end > w.start);
}

/** Day-of-week (0=Sun..6=Sat) for a 'YYYY-MM-DD' calendar date, independent of any timezone. */
export function dayOfWeekForDate(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Merge recurring rules + that date's overrides into open local-time windows (minutes since midnight). */
export function computeOpenWindowsForDate(
  dayOfWeek: number,
  rules: RuleLike[],
  overridesForDate: OverrideLike[],
): MinuteWindow[] {
  const wholeDayBlocked = overridesForDate.some(
    (o) => o.type === "blocked" && !o.startTime && !o.endTime,
  );
  if (wholeDayBlocked) return [];

  let windows: MinuteWindow[] = rules
    .filter((r) => r.isActive && r.dayOfWeek === dayOfWeek)
    .map((r) => ({
      start: timeStringToMinutes(r.startTime),
      end: timeStringToMinutes(r.endTime),
    }));

  for (const o of overridesForDate) {
    if (o.type === "open" && o.startTime && o.endTime) {
      windows.push({
        start: timeStringToMinutes(o.startTime),
        end: timeStringToMinutes(o.endTime),
      });
    }
  }

  windows = mergeWindows(windows);

  for (const o of overridesForDate) {
    if (o.type === "blocked" && o.startTime && o.endTime) {
      windows = subtractWindow(windows, {
        start: timeStringToMinutes(o.startTime),
        end: timeStringToMinutes(o.endTime),
      });
    }
  }

  return windows;
}

/** Generate bookable slots for one date from its open windows, minus busy intervals and the past. */
export function computeSlotsFromWindows(
  date: string,
  windows: MinuteWindow[],
  durationMinutes: number,
  busy: SlotInterval[],
  now: Date,
  timezone: string = CLINIC_TIMEZONE,
): SlotInterval[] {
  const slots: SlotInterval[] = [];
  for (const w of windows) {
    for (let m = w.start; m + durationMinutes <= w.end; m += SLOT_STEP_MINUTES) {
      const startLocal = `${date}T${minutesToTimeString(m)}:00`;
      const start = fromZonedTime(startLocal, timezone);
      if (start <= now) continue;
      const end = addMinutes(start, durationMinutes);
      const conflicts = busy.some((b) => start < b.end && end > b.start);
      if (conflicts) continue;
      slots.push({ start, end });
    }
  }
  return slots;
}

/**
 * Compute bookable slots for every date in [rangeStart, rangeEnd] (inclusive,
 * 'YYYY-MM-DD' strings) for one doctor + service duration. Fetches rules,
 * overrides, and existing bookings once, then computes in memory.
 */
export async function getAvailableSlotsForRange(
  doctorId: string,
  durationMinutes: number,
  rangeStart: string,
  rangeEnd: string,
): Promise<Map<string, SlotInterval[]>> {
  const db = getDb();
  const now = new Date();

  const rangeStartUtc = fromZonedTime(`${rangeStart}T00:00:00`, CLINIC_TIMEZONE);
  const rangeEndUtc = fromZonedTime(`${rangeEnd}T23:59:59`, CLINIC_TIMEZONE);

  const [rules, overrides, busyAppointments] = await Promise.all([
    db.query.availabilityRules.findMany({
      where: eq(availabilityRules.doctorId, doctorId),
    }),
    db.query.availabilityOverrides.findMany({
      where: and(
        eq(availabilityOverrides.doctorId, doctorId),
        gte(availabilityOverrides.date, rangeStart),
        lte(availabilityOverrides.date, rangeEnd),
      ),
    }),
    db.query.appointments.findMany({
      where: and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.status, "booked"),
        lt(appointments.startAt, rangeEndUtc),
        gt(appointments.endAt, rangeStartUtc),
      ),
    }),
  ]);

  const busy: SlotInterval[] = busyAppointments.map((a) => ({
    start: a.startAt,
    end: a.endAt,
  }));

  const result = new Map<string, SlotInterval[]>();
  let cursor = new Date(`${rangeStart}T00:00:00Z`);
  const end = new Date(`${rangeEnd}T00:00:00Z`);

  while (cursor <= end) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    const dow = dayOfWeekForDate(dateStr);
    const overridesForDate = overrides.filter((o) => o.date === dateStr);
    const windows = computeOpenWindowsForDate(dow, rules, overridesForDate);
    const slots = computeSlotsFromWindows(dateStr, windows, durationMinutes, busy, now);
    if (slots.length > 0) result.set(dateStr, slots);
    cursor = addDays(cursor, 1);
  }

  return result;
}

/** Defense-in-depth pre-check before attempting an insert/update (the real guarantee is the DB exclusion constraint). */
export async function isSlotStillAvailable(
  doctorId: string,
  start: Date,
  end: Date,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const db = getDb();
  const conflicts = await db.query.appointments.findMany({
    where: and(
      eq(appointments.doctorId, doctorId),
      eq(appointments.status, "booked"),
      lt(appointments.startAt, end),
      gt(appointments.endAt, start),
      excludeAppointmentId ? ne(appointments.id, excludeAppointmentId) : undefined,
    ),
    limit: 1,
  });
  return conflicts.length === 0;
}
