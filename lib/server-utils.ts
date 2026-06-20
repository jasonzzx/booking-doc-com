import { format } from "date-fns";
import { CLINIC_TIMEZONE } from "@/lib/constants";

export function formatDateOnly(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Today's date as 'YYYY-MM-DD' in the clinic's timezone (not the server's). */
export function clinicTodayString(timezone: string = CLINIC_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** First/last day of a calendar month as 'YYYY-MM-DD' strings. */
export function monthDateRange(year: number, month1to12: number): { start: string; end: string } {
  const firstDay = new Date(year, month1to12 - 1, 1);
  const lastDay = new Date(year, month1to12, 0);
  return { start: formatDateOnly(firstDay), end: formatDateOnly(lastDay) };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** True if `err` looks like a violation of the appointments_no_overlap DB constraint. */
export function isOverlapViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "23P01" || e.code === "23505") return true;
  const msg = e.message?.toLowerCase() ?? "";
  return (
    msg.includes("appointments_no_overlap") ||
    msg.includes("exclusion") ||
    msg.includes("conflicting key value")
  );
}
