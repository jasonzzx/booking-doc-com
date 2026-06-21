# BookingDocCom - doctor appointment booking

A small booking app for a clinic with multiple doctors. Patients pick a doctor and a service, see a month calendar of bookable times, and book with just name/phone/email. Doctors sign in to see a day timeline of their bookings and manage their availability and services. An admin can create/manage doctor accounts.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Drizzle ORM + Neon serverless Postgres (`drizzle-orm/neon-http`)
- Auth.js v5 (NextAuth) - Credentials provider, JWT sessions (doctors + admin only; patients never get accounts)
- Resend for confirmation/cancellation emails (optional - logs instead of sending if unset)

## Database schema

Defined in [`lib/db/schema.ts`](lib/db/schema.ts):

- **users** - login credentials for staff (`role`: `admin` | `doctor`)
- **doctors** - 1:1 profile extension of `users` (specialty, bio, color, `is_active`)
- **services** - per-doctor bookable appointment types + duration
- **availability_rules** - recurring weekly hours per doctor (day of week + time window)
- **availability_overrides** - one-off date exceptions: block time off, or add extra hours
- **appointments** - the bookings themselves; `service_name`/`duration_minutes` are snapshotted at booking time so later edits to a service don't rewrite history. Each row has a random `cancellation_token` used for the patient's no-account manage/cancel/reschedule link.

Bookable slots are never pre-generated/stored - they're computed on the fly (see [`lib/availability.ts`](lib/availability.ts)) from rules + overrides, minus existing bookings. A hand-written migration ([`drizzle/0001_add_appointment_overlap_guard.sql`](drizzle/0001_add_appointment_overlap_guard.sql)) adds a Postgres `EXCLUDE` constraint so the database itself rejects two overlapping bookings for the same doctor, even under concurrent requests.

## Local setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET` at minimum (see Neon setup below; generate the secret with `npx auth secret`).
2. `npm install`
3. `npm run db:migrate` - applies both migrations to your database.
4. `npm run db:seed` - creates an admin login and a demo doctor (with services + a Mon-Fri schedule) so there's something to click around. Prints the generated credentials.
5. `npm run dev` - patient view at `/`, doctor/admin sign-in at `/login`.

Other useful scripts: `npm run db:generate` (after changing `lib/db/schema.ts`, generates a new migration), `npm run db:studio` (Drizzle's DB browser GUI), `npm run db:verify` (exercises the full booking lifecycle - list doctors, compute availability, book, double-book rejection, cancel - against your real database; cleans up its own test appointment).

## Setting up Neon (free Postgres)

1. Go to [neon.com](https://neon.com) and sign up (GitHub/Google/email all work) - the free plan is plenty for this app.
2. Create a project (pick any name/region - pick a region close to where your Vercel functions will run, e.g. `us-east-1` if Vercel is on AWS us-east).
3. On the project's **Dashboard**, find the **Connect** button/panel. Copy the connection string shown there - it looks like `postgresql://<user>:<password>@<host>/<database>?sslmode=require`. Make sure **"Pooled connection"** is selected (the host will contain `-pooler`) - that's the one to use from a serverless app like this one.
4. Paste that as `DATABASE_URL` in your local `.env`, then run `npm run db:migrate` and `npm run db:seed` against it.
5. Add the same `DATABASE_URL` to Vercel: Project -> Settings -> Environment Variables -> add `DATABASE_URL` for Production (and Preview/Development if you want preview deploys to share the same DB, or create a second Neon project/branch for those).
6. Also add `AUTH_SECRET` (and optionally `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_CLINIC_TIMEZONE`, `NEXT_PUBLIC_APP_URL` set to your real deployed URL) to Vercel's env vars, then redeploy.

Neon's free tier autosuspends the database when idle and wakes it up on the next query (the first request after idle is a bit slower) - normal and fine for this kind of app.

## Deploying

Push to the Git remote connected to your Vercel project, or `vercel deploy`. Migrations are not run automatically on deploy - after schema changes, run `npm run db:migrate` locally (with `DATABASE_URL` pointed at the Neon database Vercel uses) before/after deploying.
