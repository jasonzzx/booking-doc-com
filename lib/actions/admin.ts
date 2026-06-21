"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { doctors, users } from "@/lib/db/schema";
import { isValidEmail } from "@/lib/server-utils";
import { requireAdmin } from "@/lib/actions/guards";
import { getDictionary } from "@/lib/i18n/get-locale";

export interface AdminDoctorDTO {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  isActive: boolean;
}

export async function getAllDoctors(): Promise<AdminDoctorDTO[]> {
  await requireAdmin();
  const db = getDb();
  const rows = await db.query.doctors.findMany({ with: { user: true }, orderBy: doctors.createdAt });
  return rows.map((d) => ({
    id: d.id,
    userId: d.userId,
    name: d.user.name,
    email: d.user.email,
    specialty: d.specialty,
    isActive: d.isActive,
  }));
}

export async function createDoctor(input: {
  name: string;
  email: string;
  password: string;
  specialty: string;
}): Promise<{ success: true; doctor: AdminDoctorDTO } | { success: false; error: string }> {
  await requireAdmin();
  const { dict } = await getDictionary();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const specialty = input.specialty.trim();

  if (!name) return { success: false, error: dict.errors.nameRequired };
  if (!isValidEmail(email)) return { success: false, error: dict.errors.invalidEmail };
  if (!specialty) return { success: false, error: dict.errors.specialtyRequired };
  if (input.password.length < 8) return { success: false, error: dict.errors.passwordTooShort };

  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { success: false, error: dict.errors.emailAlreadyExists };

  const passwordHash = await bcrypt.hash(input.password, 10);
  const [user] = await db.insert(users).values({ email, passwordHash, role: "doctor", name }).returning();
  const [doctor] = await db.insert(doctors).values({ userId: user.id, specialty }).returning();

  return {
    success: true,
    doctor: {
      id: doctor.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      specialty: doctor.specialty,
      isActive: doctor.isActive,
    },
  };
}

export async function updateDoctor(
  doctorId: string,
  input: { name: string; specialty: string },
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin();
  const { dict } = await getDictionary();
  const name = input.name.trim();
  const specialty = input.specialty.trim();
  if (!name) return { success: false, error: dict.errors.nameRequired };
  if (!specialty) return { success: false, error: dict.errors.specialtyRequired };

  const db = getDb();
  const doctor = await db.query.doctors.findFirst({ where: eq(doctors.id, doctorId) });
  if (!doctor) return { success: false, error: dict.errors.doctorNotFound };

  await db.update(doctors).set({ specialty, updatedAt: new Date() }).where(eq(doctors.id, doctorId));
  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, doctor.userId));
  return { success: true };
}

export async function setDoctorActive(doctorId: string, isActive: boolean): Promise<{ success: true }> {
  await requireAdmin();
  const db = getDb();
  await db.update(doctors).set({ isActive, updatedAt: new Date() }).where(eq(doctors.id, doctorId));
  return { success: true };
}

export async function resetDoctorPassword(
  doctorId: string,
  newPassword: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin();
  const { dict } = await getDictionary();
  if (newPassword.length < 8) return { success: false, error: dict.errors.passwordTooShort };

  const db = getDb();
  const doctor = await db.query.doctors.findFirst({ where: eq(doctors.id, doctorId) });
  if (!doctor) return { success: false, error: dict.errors.doctorNotFound };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, doctor.userId));
  return { success: true };
}
