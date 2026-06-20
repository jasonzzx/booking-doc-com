"use client";

import { useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { cancelMyAppointment, type DoctorDayView } from "@/lib/actions/doctor";
import { formatClinicTime, minutesOfDayInClinicTz } from "@/lib/format";

function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(`${date}T00:00:00`), days), "yyyy-MM-dd");
}

const PIXELS_PER_HOUR = 64;

export default function DayTimeline({
  date,
  initialDayView,
}: {
  date: string;
  initialDayView: DoctorDayView;
}) {
  const [dayView, setDayView] = useState(initialDayView);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { windows, dayStartMinutes, dayEndMinutes, appointments } = dayView;
  const totalMinutes = Math.max(60, dayEndMinutes - dayStartMinutes);
  const totalHeight = (totalMinutes / 60) * PIXELS_PER_HOUR;

  const hourMarks: number[] = [];
  for (let m = Math.ceil(dayStartMinutes / 60) * 60; m <= dayEndMinutes; m += 60) {
    hourMarks.push(m);
  }

  function topFor(minutes: number) {
    return ((minutes - dayStartMinutes) / 60) * PIXELS_PER_HOUR;
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    setError(null);
    const result = await cancelMyAppointment(id);
    setCancellingId(null);
    if (result.success) {
      setDayView((dv) => ({
        ...dv,
        appointments: dv.appointments.map((a) =>
          a.id === id ? { ...a, status: "cancelled" as const } : a,
        ),
      }));
    } else {
      setError(result.error);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/dashboard?date=${shiftDate(date, -1)}`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ‹ Previous day
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">
          {format(parseISO(`${date}T00:00:00`), "EEEE, MMMM d, yyyy")}
        </h1>
        <Link
          href={`/dashboard?date=${shiftDate(date, 1)}`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Next day ›
        </Link>
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative mr-3 w-12 shrink-0" style={{ height: totalHeight }}>
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute right-2 -translate-y-1/2 text-xs text-gray-400"
              style={{ top: topFor(m) }}
            >
              {format(new Date(2000, 0, 1, Math.floor(m / 60), m % 60), "h a")}
            </div>
          ))}
        </div>

        <div className="relative flex-1 border-l border-gray-100" style={{ height: totalHeight }}>
          {hourMarks.map((m) => (
            <div key={m} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: topFor(m) }} />
          ))}

          {windows.map((w, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 bg-blue-50"
              style={{ top: topFor(w.start), height: ((w.end - w.start) / 60) * PIXELS_PER_HOUR }}
            />
          ))}

          {appointments.length === 0 && (
            <p className="absolute inset-x-0 top-4 text-center text-sm text-gray-400">No appointments today.</p>
          )}

          {appointments.map((a) => {
            const start = minutesOfDayInClinicTz(new Date(a.startAt));
            const end = minutesOfDayInClinicTz(new Date(a.endAt));
            const top = topFor(start);
            const height = Math.max(28, ((end - start) / 60) * PIXELS_PER_HOUR);
            const cancelled = a.status === "cancelled";

            return (
              <div
                key={a.id}
                className={[
                  "absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-xs",
                  cancelled
                    ? "border-gray-200 bg-gray-50 text-gray-400 line-through"
                    : "border-blue-300 bg-blue-100 text-blue-900",
                ].join(" ")}
                style={{ top, height }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {formatClinicTime(new Date(a.startAt))} &middot; {a.patientName}
                  </span>
                  {!cancelled && (
                    <button
                      type="button"
                      disabled={cancellingId === a.id}
                      onClick={() => handleCancel(a.id)}
                      className="shrink-0 rounded border border-red-200 px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingId === a.id ? "…" : "Cancel"}
                    </button>
                  )}
                </div>
                <div className="truncate text-[11px] opacity-80">
                  {a.serviceName} &middot; {a.patientPhone}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
