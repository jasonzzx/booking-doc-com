import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { availabilityRules, doctors, services, users } from "../lib/db/schema";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
const DOCTOR_EMAIL = process.env.SEED_DOCTOR_EMAIL || "doctor@example.com";
const DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD || "ChangeMe123!";

async function main() {
  const db = getDb();

  // --- Admin user -----------------------------------------------------
  let admin = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) });
  if (!admin) {
    const [created] = await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        role: "admin",
        name: "Admin",
      })
      .returning();
    admin = created;
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  } else {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  }

  // --- Demo doctor user + profile --------------------------------------
  let doctorUser = await db.query.users.findFirst({ where: eq(users.email, DOCTOR_EMAIL) });
  if (!doctorUser) {
    const [created] = await db
      .insert(users)
      .values({
        email: DOCTOR_EMAIL,
        passwordHash: await bcrypt.hash(DOCTOR_PASSWORD, 10),
        role: "doctor",
        name: "Dr. Jane Smith",
      })
      .returning();
    doctorUser = created;
    console.log(`Created doctor user: ${DOCTOR_EMAIL}`);
  } else {
    console.log(`Doctor user already exists: ${DOCTOR_EMAIL}`);
  }

  let doctor = await db.query.doctors.findFirst({ where: eq(doctors.userId, doctorUser.id) });
  if (!doctor) {
    const [created] = await db
      .insert(doctors)
      .values({
        userId: doctorUser.id,
        specialty: "General Practice",
        bio: "Demo doctor account created by the seed script.",
        color: "#2563eb",
      })
      .returning();
    doctor = created;
    console.log("Created doctor profile");
  } else {
    console.log("Doctor profile already exists");
  }

  // --- Services ---------------------------------------------------------
  const existingServices = await db.query.services.findMany({
    where: eq(services.doctorId, doctor.id),
  });
  if (existingServices.length === 0) {
    await db.insert(services).values([
      { doctorId: doctor.id, name: "General Checkup", durationMinutes: 30 },
      { doctorId: doctor.id, name: "Follow-up", durationMinutes: 15 },
      { doctorId: doctor.id, name: "Consultation", durationMinutes: 45 },
    ]);
    console.log("Created demo services");
  } else {
    console.log("Services already exist");
  }

  // --- Recurring availability: Mon-Fri, 9-12 and 13-17 -------------------
  const existingRules = await db.query.availabilityRules.findMany({
    where: eq(availabilityRules.doctorId, doctor.id),
  });
  if (existingRules.length === 0) {
    const weekdayRules = [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
      { doctorId: doctor.id, dayOfWeek, startTime: "09:00", endTime: "12:00" },
      { doctorId: doctor.id, dayOfWeek, startTime: "13:00", endTime: "17:00" },
    ]);
    await db.insert(availabilityRules).values(weekdayRules);
    console.log("Created demo weekly availability (Mon-Fri, 9-12 & 1-5)");
  } else {
    console.log("Availability rules already exist");
  }

  console.log("\nSeed complete. Login credentials:");
  console.log(`  Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Doctor: ${DOCTOR_EMAIL} / ${DOCTOR_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
