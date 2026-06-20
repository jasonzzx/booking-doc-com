"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { getAvailableSlotsForRange, isSlotStillAvailable } from "@/lib/availability";
import { sendCancellationEmail, sendRescheduledEmail } from "@/lib/email";
import { monthDateRange } from "@/lib/server-utils";
import { isOverlapViolation } from "@/lib/server-utils";

export interface ManagedAppointment {
  id: string;
  doctorName: string;
  serviceName: string;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  status: "booked" | "cancelled";
  patientName: string;
  doctorId: string;
}

export async function getAppointmentByToken(token: string): Promise<ManagedAppointment | null> {
  const db = getDb();
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.cancellationToken, token),
    with: { doctor: { with: { user: true } } },
  });
  if (!appt) return null;

  return {
    id: appt.id,
    doctorName: appt.doctor.user.name,
    serviceName: appt.serviceName,
    durationMinutes: appt.durationMinutes,
    startAt: appt.startAt.toISOString(),
    endAt: appt.endAt.toISOString(),
    status: appt.status,
    patientName: appt.patientName,
    doctorId: appt.doctorId,
  };
}

export async function cancelAppointmentByToken(
  token: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const db = getDb();
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.cancellationToken, token),
    with: { doctor: { with: { user: true } } },
  });
  if (!appt) return { success: false, error: "Appointment not found." };
  if (appt.status === "cancelled") {
    return { success: false, error: "This appointment is already cancelled." };
  }

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
      manageToken: token,
    });
  }

  return { success: true };
}

export async function getRescheduleAvailability(
  token: string,
  year: number,
  month: number,
): Promise<Record<string, { start: string; end: string }[]>> {
  const db = getDb();
  const appt = await db.query.appointments.findFirst({ where: eq(appointments.cancellationToken, token) });
  if (!appt || appt.status !== "booked") return {};

  const { start, end } = monthDateRange(year, month);
  const slotsByDate = await getAvailableSlotsForRange(appt.doctorId, appt.durationMinutes, start, end);

  const result: Record<string, { start: string; end: string }[]> = {};
  for (const [date, slots] of slotsByDate) {
    result[date] = slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
  }
  return result;
}

export async function rescheduleAppointmentByToken(
  token: string,
  newStartIso: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const db = getDb();
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.cancellationToken, token),
    with: { doctor: { with: { user: true } } },
  });
  if (!appt) return { success: false, error: "Appointment not found." };
  if (appt.status !== "booked") return { success: false, error: "This appointment can't be rescheduled." };

  const newStart = new Date(newStartIso);
  if (Number.isNaN(newStart.getTime()) || newStart.getTime() < Date.now()) {
    return { success: false, error: "Please pick a valid future time." };
  }
  const newEnd = new Date(newStart.getTime() + appt.durationMinutes * 60_000);

  const stillAvailable = await isSlotStillAvailable(appt.doctorId, newStart, newEnd, appt.id);
  if (!stillAvailable) {
    return { success: false, error: "That time was just booked by someone else. Please pick another slot." };
  }

  try {
    await db
      .update(appointments)
      .set({ startAt: newStart, endAt: newEnd, rescheduledAt: new Date(), updatedAt: new Date() })
      .where(eq(appointments.id, appt.id));
  } catch (err) {
    if (isOverlapViolation(err)) {
      return { success: false, error: "That time was just booked by someone else. Please pick another slot." };
    }
    throw err;
  }

  if (appt.patientEmail) {
    await sendRescheduledEmail({
      to: appt.patientEmail,
      patientName: appt.patientName,
      doctorName: appt.doctor.user.name,
      serviceName: appt.serviceName,
      startAt: newStart,
      manageToken: token,
    });
  }

  return { success: true };
}
