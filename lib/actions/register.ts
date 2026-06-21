"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { doctors, users } from "@/lib/db/schema";
import { isValidEmail } from "@/lib/server-utils";
import { getDictionary } from "@/lib/i18n/get-locale";

export interface RegisterState {
  error?: string;
  success?: boolean;
}

// Public self-registration for doctors. New accounts are created inactive -
// they can't sign in (lib/auth.ts) or be booked (lib/actions/booking.ts)
// until an admin flips them on via the existing activate toggle in
// components/admin/DoctorsManager.tsx.
export async function registerDoctorAction(
  _prevState: RegisterState | undefined,
  formData: FormData,
): Promise<RegisterState> {
  const { dict } = await getDictionary();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const specialty = String(formData.get("specialty") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: dict.errors.nameRequired };
  if (!isValidEmail(email)) return { error: dict.errors.invalidEmail };
  if (!specialty) return { error: dict.errors.specialtyRequired };
  if (password.length < 8) return { error: dict.errors.passwordTooShort };

  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { error: dict.errors.emailAlreadyExists };

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ email, passwordHash, role: "doctor", name }).returning();
  await db.insert(doctors).values({ userId: user.id, specialty, isActive: false });

  return { success: true };
}
