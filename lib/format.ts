import { toZonedTime } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "@/lib/constants";

/** Minutes since local midnight (in clinic tz) for a UTC instant. Safe to use on client or server. */
export function minutesOfDayInClinicTz(d: Date): number {
  const zoned = toZonedTime(d, CLINIC_TIMEZONE);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

export function formatClinicDateTime(d: Date, locale: string = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CLINIC_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatClinicTime(d: Date, locale: string = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CLINIC_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatClinicDateLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}
