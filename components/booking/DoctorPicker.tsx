"use client";

import type { DoctorSummary } from "@/lib/actions/booking";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DoctorPicker({
  doctors,
  selectedId,
  onSelect,
}: {
  doctors: DoctorSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (doctors.length === 0) {
    return <p className="text-sm text-gray-500">No doctors are available for booking right now.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {doctors.map((doc) => {
        const selected = doc.id === selectedId;
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelect(doc.id)}
            className={[
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
              selected
                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                : "border-gray-200 bg-white hover:border-gray-300",
            ].join(" ")}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: doc.color || "#2563eb" }}
            >
              {initials(doc.name)}
            </span>
            <span>
              <span className="block font-medium text-gray-900">{doc.name}</span>
              <span className="block text-xs text-gray-500">{doc.specialty}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
