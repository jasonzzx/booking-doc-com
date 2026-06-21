"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { appointments, doctors, services } from "@/lib/db/schema";
import { getAvailableSlotsForRange, isSlotStillAvailable } from "@/lib/availability";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { isOverlapViolation, isValidEmail, monthDateRange } from "@/lib/server-utils";
import { getDictionary } from "@/lib/i18n/get-locale";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export interface DoctorSummary {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  color: string | null;
  services: { id: string; name: string; durationMinutes: number; description: string | null }[];
}

export async function getActiveDoctors(): Promise<DoctorSummary[]> {
  const db = getDb();
  const rows = await db.query.doctors.findMany({
    where: eq(doctors.isActive, true),
    with: {
      user: true,
      services: { where: eq(services.isActive, true) },
    },
  });
  return rows
    .filter((d) => d.services.length > 0)
    .map((d) => ({
      id: d.id,
      name: d.user.name,
      specialty: d.specialty,
      bio: d.bio,
      color: d.color,
      services: d.services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        description: s.description,
      })),
    }));
}

export type SlotsByDate = Record<string, { start: string; end: string }[]>;

export async function getMonthAvailability(
  doctorId: string,
  serviceId: string,
  year: number,
  month: number,
): Promise<SlotsByDate> {
  const db = getDb();
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, serviceId),
      eq(services.doctorId, doctorId),
      eq(services.isActive, true),
    ),
  });
  if (!service) return {};

  const { start, end } = monthDateRange(year, month);
  const slotsByDate = await getAvailableSlotsForRange(doctorId, service.durationMinutes, start, end);

  const result: SlotsByDate = {};
  for (const [date, slots] of slotsByDate) {
    result[date] = slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
  }
  return result;
}

function bookingInputSchema(errors: Dictionary["errors"]) {
  return z.object({
    doctorId: z.string().min(1),
    serviceId: z.string().min(1),
    start: z.string().min(1),
    patientName: z.string().trim().min(1, errors.nameRequired).max(200),
    patientPhone: z.string().trim().min(1, errors.phoneRequired).max(50),
    patientEmail: z.string().trim().max(320).optional(),
  });
}

export type CreateBookingInput = z.infer<ReturnType<typeof bookingInputSchema>>;
export type CreateBookingResult =
  | { success: true; cancellationToken: string }
  | { success: false; error: string };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const { dict } = await getDictionary();
  const parsed = bookingInputSchema(dict.errors).safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? dict.errors.invalidForm };
  }
  const { doctorId, serviceId, start, patientName, patientPhone } = parsed.data;
  const patientEmail = parsed.data.patientEmail?.trim() || undefined;
  if (patientEmail && !isValidEmail(patientEmail)) {
    return { success: false, error: dict.errors.invalidEmail };
  }

  const startAt = new Date(start);
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() < Date.now()) {
    return { success: false, error: dict.errors.slotNoLongerAvailable };
  }

  const db = getDb();
  const [doctor, service] = await Promise.all([
    db.query.doctors.findFirst({
      where: and(eq(doctors.id, doctorId), eq(doctors.isActive, true)),
      with: { user: true },
    }),
    db.query.services.findFirst({
      where: and(
        eq(services.id, serviceId),
        eq(services.doctorId, doctorId),
        eq(services.isActive, true),
      ),
    }),
  ]);
  if (!doctor || !service) {
    return { success: false, error: dict.errors.doctorOrServiceUnavailable };
  }

  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  const stillAvailable = await isSlotStillAvailable(doctorId, startAt, endAt);
  if (!stillAvailable) {
    return { success: false, error: dict.errors.slotTaken };
  }

  const cancellationToken = crypto.randomUUID();

  try {
    await db.insert(appointments).values({
      doctorId,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      patientName,
      patientPhone,
      patientEmail,
      startAt,
      endAt,
      cancellationToken,
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      return { success: false, error: dict.errors.slotTaken };
    }
    throw err;
  }

  if (patientEmail) {
    await sendBookingConfirmationEmail({
      to: patientEmail,
      patientName,
      doctorName: doctor.user.name,
      serviceName: service.name,
      startAt,
      manageToken: cancellationToken,
    });
  }

  return { success: true, cancellationToken };
}
