"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthCalendar({
  monthCursor,
  availableDates,
  selectedDate,
  onSelectDate,
  onMonthChange,
  loading,
  disabled,
}: {
  monthCursor: Date;
  availableDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onMonthChange: (date: Date) => void;
  loading: boolean;
  disabled: boolean;
}) {
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = startOfDay(new Date());

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(monthStart, 1))}
          className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="font-semibold text-gray-900">{format(monthStart, "MMMM yyyy")}</div>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(monthStart, 1))}
          className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthStart);
          const isPast = isBefore(day, today);
          const isAvailable = !disabled && inMonth && !isPast && availableDates.has(dateStr);
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!isAvailable}
              onClick={() => onSelectDate(dateStr)}
              className={[
                "aspect-square rounded-md text-sm transition",
                !inMonth ? "text-gray-300" : "text-gray-700",
                isAvailable ? "cursor-pointer hover:bg-blue-100" : "cursor-default",
                isAvailable && !isSelected ? "bg-blue-50 font-medium text-blue-700" : "",
                isSelected ? "bg-blue-600 font-semibold text-white hover:bg-blue-600" : "",
                isSameDay(day, today) && !isSelected ? "ring-1 ring-inset ring-blue-300" : "",
              ].join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-3 text-center text-sm text-gray-400">Loading availability…</p>}
      {disabled && !loading && (
        <p className="mt-3 text-center text-sm text-gray-400">Pick a doctor and service to see availability.</p>
      )}
      {!disabled && !loading && availableDates.size === 0 && (
        <p className="mt-3 text-center text-sm text-gray-400">No availability this month.</p>
      )}
    </div>
  );
}
