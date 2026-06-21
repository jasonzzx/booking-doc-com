"use client";

import { formatClinicTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/context";

interface Slot {
  start: string;
  end: string;
}

export default function SlotList({
  slots,
  onSelectSlot,
}: {
  slots: Slot[];
  onSelectSlot: (slot: Slot) => void;
}) {
  const { dict, locale } = useI18n();

  if (slots.length === 0) {
    return <p className="text-sm text-gray-500">{dict.booking.noTimesAvailable}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => (
        <button
          key={slot.start}
          type="button"
          onClick={() => onSelectSlot(slot)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600"
        >
          {formatClinicTime(new Date(slot.start), locale)}
        </button>
      ))}
    </div>
  );
}
