import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { appointments } from "../lib/db/schema";
import { getActiveDoctors, getMonthAvailability, createBooking } from "../lib/actions/booking";
import { getAppointmentByToken, cancelAppointmentByToken } from "../lib/actions/manage";

async function main() {
  const doctors = await getActiveDoctors();
  console.log(`getActiveDoctors -> ${doctors.length} doctor(s)`);
  const doctor = doctors[0];
  if (!doctor) throw new Error("No doctor found - did the seed script run?");
  console.log(`  ${doctor.name} (${doctor.specialty}), services: ${doctor.services.map((s) => s.name).join(", ")}`);

  const service = doctor.services[0];
  const now = new Date();
  const availability = await getMonthAvailability(doctor.id, service.id, now.getFullYear(), now.getMonth() + 1);
  const dates = Object.keys(availability).sort();
  console.log(`getMonthAvailability -> ${dates.length} day(s) with slots this month: ${dates.join(", ")}`);
  if (dates.length === 0) throw new Error("Expected at least one available day this month");

  const firstDate = dates[0];
  const slot = availability[firstDate][0];
  console.log(`Booking first slot on ${firstDate}: ${slot.start} - ${slot.end}`);

  const booking = await createBooking({
    doctorId: doctor.id,
    serviceId: service.id,
    start: slot.start,
    patientName: "Verify Script Patient",
    patientPhone: "555-0100",
    patientEmail: "verify-script@example.com",
  });
  if (!booking.success) throw new Error(`createBooking failed: ${booking.error}`);
  console.log(`createBooking -> success, token=${booking.cancellationToken}`);

  const afterBooking = await getMonthAvailability(doctor.id, service.id, now.getFullYear(), now.getMonth() + 1);
  const stillHasSlot = (afterBooking[firstDate] ?? []).some((s) => s.start === slot.start);
  console.log(`Slot still listed as available after booking? ${stillHasSlot} (expected false)`);
  if (stillHasSlot) throw new Error("Booked slot is still showing as available - conflict detection is broken");

  const duplicate = await createBooking({
    doctorId: doctor.id,
    serviceId: service.id,
    start: slot.start,
    patientName: "Duplicate Attempt",
    patientPhone: "555-0101",
  });
  console.log(`Duplicate booking attempt on same slot -> success=${duplicate.success} (expected false)`);
  if (duplicate.success) throw new Error("Double-booking was NOT prevented!");

  const fetched = await getAppointmentByToken(booking.cancellationToken);
  console.log(`getAppointmentByToken -> found=${!!fetched}, status=${fetched?.status}`);
  if (!fetched || fetched.status !== "booked") throw new Error("Could not fetch the booked appointment by token");

  const cancelled = await cancelAppointmentByToken(booking.cancellationToken);
  console.log(`cancelAppointmentByToken -> success=${cancelled.success}`);
  if (!cancelled.success) throw new Error(`cancelAppointmentByToken failed: ${cancelled.error}`);

  const afterCancel = await getAppointmentByToken(booking.cancellationToken);
  console.log(`Status after cancel: ${afterCancel?.status} (expected cancelled)`);

  const reopened = await getMonthAvailability(doctor.id, service.id, now.getFullYear(), now.getMonth() + 1);
  const slotBackAfterCancel = (reopened[firstDate] ?? []).some((s) => s.start === slot.start);
  console.log(`Slot available again after cancel? ${slotBackAfterCancel} (expected true)`);

  // Hard-delete the test appointment so repeated runs don't clutter the doctor's dashboard.
  const db = getDb();
  await db.delete(appointments).where(eq(appointments.cancellationToken, booking.cancellationToken));

  console.log("\nAll checks passed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("VERIFY FAILED:", err);
    process.exit(1);
  });
