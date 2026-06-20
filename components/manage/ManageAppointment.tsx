"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { startOfMonth } from "date-fns";
import {
  cancelAppointmentByToken,
  getRescheduleAvailability,
  rescheduleAppointmentByToken,
  type ManagedAppointment,
} from "@/lib/actions/manage";
import { formatClinicDateTime } from "@/lib/format";
import MonthCalendar from "@/components/booking/MonthCalendar";
import SlotList from "@/components/booking/SlotList";

type Slot = { start: string; end: string };

export default function ManageAppointment({
  token,
  appointment,
}: {
  token: string;
  appointment: ManagedAppointment;
}) {
  const [appt, setAppt] = useState(appointment);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [availability, setAvailability] = useState<Record<string, Slot[]>>({});
  const [isLoadingAvailability, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const isPast = new Date(appt.startAt).getTime() < now;
  const canAct = appt.status === "booked" && !isPast;

  useEffect(() => {
    if (mode !== "reschedule") return;
    startTransition(async () => {
      const data = await getRescheduleAvailability(token, monthCursor.getFullYear(), monthCursor.getMonth() + 1);
      setAvailability(data);
    });
  }, [mode, monthCursor, token, startTransition]);

  const availableDates = useMemo(() => new Set(Object.keys(availability)), [availability]);

  async function handleCancel() {
    setBusy(true);
    setError(null);
    const result = await cancelAppointmentByToken(token);
    setBusy(false);
    if (result.success) {
      setAppt((a) => ({ ...a, status: "cancelled" }));
      setMessage("Your appointment has been cancelled.");
    } else {
      setError(result.error);
    }
  }

  async function handlePickSlot(slot: Slot) {
    setBusy(true);
    setError(null);
    const result = await rescheduleAppointmentByToken(token, slot.start);
    setBusy(false);
    if (result.success) {
      setAppt((a) => ({ ...a, startAt: slot.start, endAt: slot.end }));
      setMode("view");
      setSelectedDate(null);
      setMessage("Your appointment has been rescheduled.");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-gray-900">Your appointment</h1>

      <dl className="mt-4 space-y-1 text-sm text-gray-700">
        <div>
          <dt className="inline font-medium">Patient:</dt> <dd className="inline">{appt.patientName}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Doctor:</dt> <dd className="inline">{appt.doctorName}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Service:</dt> <dd className="inline">{appt.serviceName}</dd>
        </div>
        <div>
          <dt className="inline font-medium">When:</dt>{" "}
          <dd className="inline">{formatClinicDateTime(new Date(appt.startAt))}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Status:</dt> <dd className="inline capitalize">{appt.status}</dd>
        </div>
      </dl>

      {message && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {appt.status === "cancelled" && (
        <p className="mt-4 text-sm text-gray-500">This appointment has been cancelled.</p>
      )}
      {appt.status === "booked" && isPast && (
        <p className="mt-4 text-sm text-gray-500">This appointment time has already passed.</p>
      )}

      {canAct && mode === "view" && (
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reschedule
          </button>
          {!confirmingCancel ? (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="flex-1 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancel appointment
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={handleCancel}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Cancelling…" : "Confirm cancel"}
            </button>
          )}
        </div>
      )}

      {canAct && mode === "reschedule" && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Pick a new time
            </h2>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <MonthCalendar
              monthCursor={monthCursor}
              availableDates={availableDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onMonthChange={(d) => setMonthCursor(startOfMonth(d))}
              loading={isLoadingAvailability}
              disabled={false}
            />
            <div>
              {selectedDate ? (
                busy ? (
                  <p className="text-sm text-gray-500">Rescheduling…</p>
                ) : (
                  <SlotList slots={availability[selectedDate] ?? []} onSelectSlot={handlePickSlot} />
                )
              ) : (
                <p className="text-sm text-gray-500">Select a day on the calendar.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
