"use client";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  description: string | null;
}

export default function ServicePicker({
  services,
  selectedId,
  onSelect,
}: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => {
        const selected = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={[
              "rounded-full border px-4 py-2 text-sm transition",
              selected
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
            ].join(" ")}
          >
            {s.name} &middot; {s.durationMinutes} min
          </button>
        );
      })}
    </div>
  );
}
