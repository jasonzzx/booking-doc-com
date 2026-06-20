// Single clinic-wide timezone used to interpret doctors' recurring schedules
// (start_time/end_time) and override dates. All instants are still stored in
// UTC in the database; this is only used to convert local wall-clock times
// to/from UTC. Must be NEXT_PUBLIC_ so server and client agree on the same
// value (client components format dates with this too).
export const CLINIC_TIMEZONE =
  process.env.NEXT_PUBLIC_CLINIC_TIMEZONE || "America/New_York";

// Granularity (in minutes) used when generating candidate slot start times
// within a doctor's open windows. Slots always start on a multiple of this.
export const SLOT_STEP_MINUTES = 15;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
