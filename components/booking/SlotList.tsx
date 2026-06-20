"use client";

import { formatClinicTime } from "@/lib/format";

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
  if (slots.length === 0) {
    return <p className="text-sm text-gray-500">No times available on this day.</p>;
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
          {formatClinicTime(new Date(slot.start))}
        </button>
      ))}
    </div>
  );
}
