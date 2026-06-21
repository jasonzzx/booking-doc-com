"use client";

import { useState } from "react";
import { createService, updateService, toggleService, type ServiceDTO } from "@/lib/actions/doctor";
import { useI18n } from "@/lib/i18n/context";

export default function ServicesManager({ initialServices }: { initialServices: ServiceDTO[] }) {
  const { dict } = useI18n();
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {services.map((s) =>
          editingId === s.id ? (
            <ServiceForm
              key={s.id}
              initial={s}
              onSaved={(updated) => {
                setServices((ss) => ss.map((x) => (x.id === updated.id ? updated : x)));
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={["font-medium", s.isActive ? "text-gray-900" : "text-gray-400 line-through"].join(
                      " ",
                    )}
                  >
                    {s.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {s.durationMinutes} {dict.booking.serviceMin}
                  </span>
                </div>
                {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(s.id)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {dict.common.edit}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServices((ss) => ss.map((x) => (x.id === s.id ? { ...x, isActive: !x.isActive } : x)));
                    toggleService(s.id, !s.isActive);
                  }}
                  className="text-sm text-gray-500 hover:underline"
                >
                  {s.isActive ? dict.common.deactivate : dict.common.activate}
                </button>
              </div>
            </div>
          ),
        )}
        {services.length === 0 && <p className="p-3 text-sm text-gray-400">{dict.servicesPage.noServices}</p>}
      </div>

      <NewServiceForm onCreated={(svc) => setServices((ss) => [...ss, svc])} />
    </div>
  );
}

function ServiceForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: ServiceDTO;
  onSaved: (s: ServiceDTO) => void;
  onCancel: () => void;
}) {
  const { dict } = useI18n();
  const [name, setName] = useState(initial.name);
  const [duration, setDuration] = useState(String(initial.durationMinutes));
  const [description, setDescription] = useState(initial.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const result = await updateService(initial.id, { name, durationMinutes: Number(duration), description });
    setBusy(false);
    if (result.success) {
      onSaved({
        ...initial,
        name: name.trim(),
        durationMinutes: Math.round(Number(duration)),
        description: description.trim() || null,
      });
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        placeholder={dict.servicesPage.namePlaceholder}
      />
      <input
        type="number"
        min={1}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
        placeholder={dict.servicesPage.minutesPlaceholder}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
        placeholder={dict.common.descriptionOptional}
      />
      <button
        type="button"
        disabled={busy}
        onClick={handleSave}
        className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {dict.common.save}
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-gray-500">
        {dict.common.cancel}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function NewServiceForm({ onCreated }: { onCreated: (s: ServiceDTO) => void }) {
  const { dict } = useI18n();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const result = await createService({ name, durationMinutes: Number(duration), description });
    setBusy(false);
    if (result.success) {
      onCreated(result.service);
      setName("");
      setDuration("30");
      setDescription("");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {dict.servicesPage.addService}
      </h2>
      <div className="flex flex-wrap items-end gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={dict.servicesPage.followUpPlaceholder}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          placeholder={dict.servicesPage.minutesPlaceholder}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={dict.common.descriptionOptional}
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={handleCreate}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? dict.common.adding : dict.common.add}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
