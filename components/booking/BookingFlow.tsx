"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { startOfMonth } from "date-fns";
import { getMonthAvailability, type DoctorSummary, type SlotsByDate } from "@/lib/actions/booking";
import DoctorPicker from "./DoctorPicker";
import ServicePicker from "./ServicePicker";
import MonthCalendar from "./MonthCalendar";
import SlotList from "./SlotList";
import BookingModal from "./BookingModal";

interface Slot {
  start: string;
  end: string;
}

export default function BookingFlow({ doctors }: { doctors: DoctorSummary[] }) {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [availability, setAvailability] = useState<SlotsByDate>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, startTransition] = useTransition();

  // Adjust state during render when the selection changes, instead of resetting it
  // from an effect - see https://react.dev/learn/you-might-not-need-an-effect
  const selectionKey = `${doctorId ?? ""}|${serviceId ?? ""}|${monthCursor.getTime()}|${reloadKey}`;
  const [loadedKey, setLoadedKey] = useState(selectionKey);
  if (selectionKey !== loadedKey) {
    setLoadedKey(selectionKey);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailability({});
  }

  useEffect(() => {
    if (!doctorId || !serviceId) return;
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth() + 1;
    startTransition(async () => {
      const data = await getMonthAvailability(doctorId, serviceId, year, month);
      setAvailability(data);
    });
  }, [doctorId, serviceId, monthCursor, reloadKey, startTransition]);

  const availableDates = useMemo(() => new Set(Object.keys(availability)), [availability]);
  const doctor = doctors.find((d) => d.id === doctorId) ?? null;
  const service = doctor?.services.find((s) => s.id === serviceId) ?? null;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          1. Choose a doctor
        </h2>
        <DoctorPicker
          doctors={doctors}
          selectedId={doctorId}
          onSelect={(id) => {
            setDoctorId(id);
            setServiceId(null);
          }}
        />
      </section>

      {doctor && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            2. Choose a service
          </h2>
          <ServicePicker services={doctor.services} selectedId={serviceId} onSelect={setServiceId} />
        </section>
      )}

      {doctor && service && (
        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              3. Pick a day
            </h2>
            <MonthCalendar
              monthCursor={monthCursor}
              availableDates={availableDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onMonthChange={(d) => setMonthCursor(startOfMonth(d))}
              loading={isLoading}
              disabled={false}
            />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              4. Pick a time
            </h2>
            {selectedDate ? (
              <SlotList slots={availability[selectedDate] ?? []} onSelectSlot={setSelectedSlot} />
            ) : (
              <p className="text-sm text-gray-500">Select an available day on the calendar.</p>
            )}
          </div>
        </section>
      )}

      {doctor && service && selectedSlot && (
        <BookingModal
          doctorId={doctor.id}
          doctorName={doctor.name}
          serviceId={service.id}
          serviceName={service.name}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onBooked={() => {
            setSelectedSlot(null);
            setSelectedDate(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
