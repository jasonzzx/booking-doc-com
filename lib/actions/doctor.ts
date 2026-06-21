"use server";

import { and, eq, gte, lt, lte } from "drizzle-orm";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { getDb } from "@/lib/db";
import { appointments, availabilityOverrides, availabilityRules, services } from "@/lib/db/schema";
import { computeOpenWindowsForDate, dayOfWeekForDate } from "@/lib/availability";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { minutesOfDayInClinicTz } from "@/lib/format";
import { sendCancellationEmail } from "@/lib/email";
import { requireDoctor } from "@/lib/actions/guards";
import { getDictionary } from "@/lib/i18n/get-locale";

// ---------------------------------------------------------------------------
// Day view (dashboard timeline)
// ---------------------------------------------------------------------------

export interface DoctorDayAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  serviceName: string;
  startAt: string;
  endAt: string;
  status: "booked" | "cancelled";
}

export interface DoctorDayView {
  windows: { start: number; end: number }[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  appointments: DoctorDayAppointment[];
}

export async function getMyDayView(date: string): Promise<DoctorDayView> {
  const { doctorId } = await requireDoctor();
  const db = getDb();

  const dow = dayOfWeekForDate(date);
  const dayStartUtc = fromZonedTime(`${date}T00:00:00`, CLINIC_TIMEZONE);
  const dayEndUtc = addDays(dayStartUtc, 1);

  const [rules, overridesForDate, dayAppointments] = await Promise.all([
    db.query.availabilityRules.findMany({ where: eq(availabilityRules.doctorId, doctorId) }),
    db.query.availabilityOverrides.findMany({
      where: and(eq(availabilityOverrides.doctorId, doctorId), eq(availabilityOverrides.date, date)),
    }),
    db.query.appointments.findMany({
      where: and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startAt, dayStartUtc),
        lt(appointments.startAt, dayEndUtc),
      ),
    }),
  ]);

  const windows = computeOpenWindowsForDate(dow, rules, overridesForDate);

  let minMinutes = windows.length ? Math.min(...windows.map((w) => w.start)) : 8 * 60;
  let maxMinutes = windows.length ? Math.max(...windows.map((w) => w.end)) : 18 * 60;
  for (const a of dayAppointments) {
    minMinutes = Math.min(minMinutes, minutesOfDayInClinicTz(a.startAt));
    maxMinutes = Math.max(maxMinutes, minutesOfDayInClinicTz(a.endAt));
  }
  const dayStartMinutes = Math.max(0, Math.floor(minMinutes / 60) * 60);
  const dayEndMinutes = Math.min(24 * 60, Math.max(dayStartMinutes + 60, Math.ceil(maxMinutes / 60) * 60));

  const sorted = [...dayAppointments].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return {
    windows,
    dayStartMinutes,
    dayEndMinutes,
    appointments: sorted.map((a) => ({
      id: a.id,
      patientName: a.patientName,
      patientPhone: a.patientPhone,
      patientEmail: a.patientEmail,
      serviceName: a.serviceName,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status,
    })),
  };
}

export async function cancelMyAppointment(
  appointmentId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { doctorId } = await requireDoctor();
  const { dict } = await getDictionary();
  const db = getDb();
  const appt = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, appointmentId), eq(appointments.doctorId, doctorId)),
    with: { doctor: { with: { user: true } } },
  });
  if (!appt) return { success: false, error: dict.errors.appointmentNotFound };
  if (appt.status === "cancelled") return { success: false, error: dict.errors.alreadyCancelledShort };

  await db
    .update(appointments)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(appointments.id, appt.id));

  if (appt.patientEmail) {
    await sendCancellationEmail({
      to: appt.patientEmail,
      patientName: appt.patientName,
      doctorName: appt.doctor.user.name,
      serviceName: appt.serviceName,
      startAt: appt.startAt,
      manageToken: appt.cancellationToken,
    });
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Recurring availability rules
// ---------------------------------------------------------------------------

export interface AvailabilityRuleDTO {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export async function getMyAvailabilityRules(): Promise<AvailabilityRuleDTO[]> {
  const { doctorId } = await requireDoctor();
  const db = getDb();
  const rows = await db.query.availabilityRules.findMany({
    where: eq(availabilityRules.doctorId, doctorId),
    orderBy: [availabilityRules.dayOfWeek, availabilityRules.startTime],
  });
  return rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    isActive: r.isActive,
  }));
}

export async function createAvailabilityRule(input: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<{ success: true; rule: AvailabilityRuleDTO } | { success: false; error: string }> {
  const { doctorId } = await requireDoctor();
  if (input.startTime >= input.endTime) {
    const { dict } = await getDictionary();
    return { success: false, error: dict.errors.endTimeAfterStart };
  }
  const db = getDb();
  const [row] = await db
    .insert(availabilityRules)
    .values({
      doctorId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    })
    .returning();
  return {
    success: true,
    rule: { id: row.id, dayOfWeek: row.dayOfWeek, startTime: row.startTime, endTime: row.endTime, isActive: row.isActive },
  };
}

export async function toggleAvailabilityRule(id: string, isActive: boolean): Promise<{ success: true }> {
  const { doctorId } = await requireDoctor();
  const db = getDb();
  await db
    .update(availabilityRules)
    .set({ isActive })
    .where(and(eq(availabilityRules.id, id), eq(availabilityRules.doctorId, doctorId)));
  return { success: true };
}

export async function deleteAvailabilityRule(id: string): Promise<{ success: true }> {
  const { doctorId } = await requireDoctor();
  const db = getDb();
  await db
    .delete(availabilityRules)
    .where(and(eq(availabilityRules.id, id), eq(availabilityRules.doctorId, doctorId)));
  return { success: true };
}

// ---------------------------------------------------------------------------
// One-off availability overrides
// ---------------------------------------------------------------------------

export interface AvailabilityOverrideDTO {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  type: "blocked" | "open";
  reason: string | null;
}

export async function getMyAvailabilityOverrides(
  fromDate: string,
  toDate: string,
): Promise<AvailabilityOverrideDTO[]> {
  const { doctorId } = await requireDoctor();
  const db = getDb();
  const rows = await db.query.availabilityOverrides.findMany({
    where: and(
      eq(availabilityOverrides.doctorId, doctorId),
      gte(availabilityOverrides.date, fromDate),
      lte(availabilityOverrides.date, toDate),
    ),
    orderBy: availabilityOverrides.date,
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    type: r.type,
    reason: r.reason,
  }));
}

export async function createAvailabilityOverride(input: {
  date: string;
  startTime?: string;
  endTime?: string;
  type: "blocked" | "open";
  reason?: string;
}): Promise<{ success: true; override: AvailabilityOverrideDTO } | { success: false; error: string }> {
  const { doctorId } = await requireDoctor();
  if (input.type === "open" && (!input.startTime || !input.endTime)) {
    const { dict } = await getDictionary();
    return { success: false, error: dict.errors.extraHoursTimeRequired };
  }
  if (input.startTime && input.endTime && input.startTime >= input.endTime) {
    const { dict } = await getDictionary();
    return { success: false, error: dict.errors.endTimeAfterStart };
  }
  const db = getDb();
  const [row] = await db
    .insert(availabilityOverrides)
    .values({
      doctorId,
      date: input.date,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      type: input.type,
      reason: input.reason?.trim() || null,
    })
    .returning();
  return {
    success: true,
    override: { id: row.id, date: row.date, startTime: row.startTime, endTime: row.endTime, type: row.type, reason: row.reason },
  };
}

export async function deleteAvailabilityOverride(id: string): Promise<{ success: true }> {
  const { doctorId } = await requireDoctor();
  const db = getDb();
  await db
    .delete(availabilityOverrides)
    .where(and(eq(availabilityOverrides.id, id), eq(availabilityOverrides.doctorId, doctorId)));
  return { success: true };
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export interface ServiceDTO {
  id: string;
  name: string;
  durationMinutes: number;
  description: string | null;
  isActive: boolean;
}

export async function getMyServices(): Promise<ServiceDTO[]> {
  const { doctorId } = await requireDoctor();
  const db = getDb();
  const rows = await db.query.services.findMany({
    where: eq(services.doctorId, doctorId),
    orderBy: services.createdAt,
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    description: s.description,
    isActive: s.isActive,
  }));
}

export async function createService(input: {
  name: string;
  durationMinutes: number;
  description?: string;
}): Promise<{ success: true; service: ServiceDTO } | { success: false; error: string }> {
  const { doctorId } = await requireDoctor();
  const { dict } = await getDictionary();
  if (!input.name.trim()) return { success: false, error: dict.errors.nameRequired };
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return { success: false, error: dict.errors.durationPositive };
  }
  const db = getDb();
  const [row] = await db
    .insert(services)
    .values({
      doctorId,
      name: input.name.trim(),
      durationMinutes: Math.round(input.durationMinutes),
      description: input.description?.trim() || null,
    })
    .returning();
  return {
    success: true,
    service: {
      id: row.id,
      name: row.name,
      durationMinutes: row.durationMinutes,
      description: row.description,
      isActive: row.isActive,
    },
  };
}

export async function updateService(
  id: string,
  input: { name: string; durationMinutes: number; description?: string },
): Promise<{ success: true } | { success: false; error: string }> {
  const { doctorId } = await requireDoctor();
  const { dict } = await getDictionary();
  if (!input.name.trim()) return { success: false, error: dict.errors.nameRequired };
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return { success: false, error: dict.errors.durationPositive };
  }
  const db = getDb();
  await db
    .update(services)
    .set({
      name: input.name.trim(),
      durationMinutes: Math.round(input.durationMinutes),
      description: input.description?.trim() || null,
    })
    .where(and(eq(services.id, id), eq(services.doctorId, doctorId)));
  return { success: true };
}

export async function toggleService(id: string, isActive: boolean): Promise<{ success: true }> {
  const { doctorId } = await requireDoctor();
  const db = getDb();
  await db
    .update(services)
    .set({ isActive })
    .where(and(eq(services.id, id), eq(services.doctorId, doctorId)));
  return { success: true };
}
