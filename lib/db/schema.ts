import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "doctor"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "booked",
  "cancelled",
]);

// "blocked" = doctor is NOT available (vacation, leave, etc.)
// "open"    = extra availability added on top of the recurring schedule
export const overrideTypeEnum = pgEnum("override_type", ["blocked", "open"]);

// ---------------------------------------------------------------------------
// Users & doctors
// ---------------------------------------------------------------------------
// `users` holds login credentials for staff (doctors + admins). Patients never
// get accounts - they're identified only by the info captured on their
// appointment row plus a one-off cancellation token.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 1:1 profile extension of `users` for role = 'doctor'.
export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  specialty: text("specialty").notNull(),
  bio: text("bio"),
  phone: text("phone"),
  color: text("color"), // hex color used to tint this doctor's calendar/timeline
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Services (per-doctor bookable appointment types)
// ---------------------------------------------------------------------------

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("services_doctor_id_idx").on(table.doctorId)],
);

// ---------------------------------------------------------------------------
// Availability: recurring weekly rules + one-off date overrides
// ---------------------------------------------------------------------------
// Bookable slots are never materialized into rows - they're computed on the
// fly (see lib/availability.ts) from rules + overrides, minus existing
// appointments. This keeps variable service durations and schedule edits
// simple, since there's no pre-generated slot table to keep in sync.

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(), // 0 = Sunday ... 6 = Saturday
    startTime: time("start_time").notNull(), // doctor's local wall-clock time
    endTime: time("end_time").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("availability_rules_doctor_id_idx").on(table.doctorId)],
);

export const availabilityOverrides = pgTable(
  "availability_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    // null start/end + type=blocked means the whole day is blocked
    startTime: time("start_time"),
    endTime: time("end_time"),
    type: overrideTypeEnum("type").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("availability_overrides_doctor_date_idx").on(
      table.doctorId,
      table.date,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
// serviceName/durationMinutes are snapshotted at booking time so editing or
// deleting a service later never rewrites history.
//
// Migration drizzle/0001_add_appointment_overlap_guard.sql hand-adds a
// generated `during` tstzrange column + a GiST EXCLUDE constraint so
// Postgres itself rejects overlapping "booked" appointments for the same
// doctor. That column/constraint are intentionally not modeled below -
// they're DB-only invariants, never read or written from app code.

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    serviceName: text("service_name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    patientName: text("patient_name").notNull(),
    patientPhone: text("patient_phone").notNull(),
    patientEmail: text("patient_email"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("booked"),
    cancellationToken: text("cancellation_token").notNull().unique(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    rescheduledAt: timestamp("rescheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("appointments_doctor_start_idx").on(table.doctorId, table.startAt),
    index("appointments_token_idx").on(table.cancellationToken),
  ],
);

// ---------------------------------------------------------------------------
// Relations (enables Drizzle's relational query API, e.g. db.query.doctors.findMany({ with: { services: true } }))
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one }) => ({
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  services: many(services),
  availabilityRules: many(availabilityRules),
  availabilityOverrides: many(availabilityOverrides),
  appointments: many(appointments),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  doctor: one(doctors, { fields: [services.doctorId], references: [doctors.id] }),
}));

export const availabilityRulesRelations = relations(
  availabilityRules,
  ({ one }) => ({
    doctor: one(doctors, {
      fields: [availabilityRules.doctorId],
      references: [doctors.id],
    }),
  }),
);

export const availabilityOverridesRelations = relations(
  availabilityOverrides,
  ({ one }) => ({
    doctor: one(doctors, {
      fields: [availabilityOverrides.doctorId],
      references: [doctors.id],
    }),
  }),
);

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));
