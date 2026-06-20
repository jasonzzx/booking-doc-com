"use client";

import { useState } from "react";
import {
  createAvailabilityRule,
  deleteAvailabilityRule,
  toggleAvailabilityRule,
  createAvailabilityOverride,
  deleteAvailabilityOverride,
  type AvailabilityRuleDTO,
  type AvailabilityOverrideDTO,
} from "@/lib/actions/doctor";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityManager({
  initialRules,
  initialOverrides,
}: {
  initialRules: AvailabilityRuleDTO[];
  initialOverrides: AvailabilityOverrideDTO[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [overrides, setOverrides] = useState(initialOverrides);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Weekly schedule</h2>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {DAY_NAMES.map((name, dayOfWeek) => (
            <DayRow
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              name={name}
              rules={rules.filter((r) => r.dayOfWeek === dayOfWeek)}
              onCreated={(rule) => setRules((rs) => [...rs, rule])}
              onToggled={(id, isActive) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, isActive } : r)))}
              onDeleted={(id) => setRules((rs) => rs.filter((r) => r.id !== id))}
            />
          ))}
        </div>
      </section>

      <OverridesSection
        overrides={overrides}
        onCreated={(o) => setOverrides((os) => [...os, o].sort((a, b) => a.date.localeCompare(b.date)))}
        onDeleted={(id) => setOverrides((os) => os.filter((o) => o.id !== id))}
      />
    </div>
  );
}

function DayRow({
  dayOfWeek,
  name,
  rules,
  onCreated,
  onToggled,
  onDeleted,
}: {
  dayOfWeek: number;
  name: string;
  rules: AvailabilityRuleDTO[];
  onCreated: (rule: AvailabilityRuleDTO) => void;
  onToggled: (id: string, isActive: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setBusy(true);
    setError(null);
    const result = await createAvailabilityRule({ dayOfWeek, startTime: start, endTime: end });
    setBusy(false);
    if (result.success) {
      onCreated(result.rule);
      setAdding(false);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3 p-3">
      <div className="w-24 shrink-0 pt-1.5 text-sm font-medium text-gray-700">{name}</div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {rules.length === 0 && !adding && <span className="text-sm text-gray-400">Unavailable</span>}
        {rules.map((r) => (
          <span
            key={r.id}
            className={[
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              r.isActive ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-400",
            ].join(" ")}
          >
            {r.startTime.slice(0, 5)}&ndash;{r.endTime.slice(0, 5)}
            <button
              type="button"
              onClick={() => {
                onToggled(r.id, !r.isActive);
                toggleAvailabilityRule(r.id, !r.isActive);
              }}
              className="underline"
            >
              {r.isActive ? "pause" : "resume"}
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleted(r.id);
                deleteAvailabilityRule(r.id);
              }}
              className="text-red-500"
              aria-label="Remove"
            >
              ×
            </button>
          </span>
        ))}

        {adding ? (
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <span className="text-gray-400">to</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleAdd}
              className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Save
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-gray-500">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:underline">
            + Add hours
          </button>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function OverridesSection({
  overrides,
  onCreated,
  onDeleted,
}: {
  overrides: AvailabilityOverrideDTO[];
  onCreated: (o: AvailabilityOverrideDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const [date, setDate] = useState("");
  const [type, setType] = useState<"blocked" | "open">("blocked");
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!date) {
      setError("Pick a date.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createAvailabilityOverride({
      date,
      type,
      startTime: type === "open" || !allDay ? start : undefined,
      endTime: type === "open" || !allDay ? end : undefined,
      reason: reason || undefined,
    });
    setBusy(false);
    if (result.success) {
      onCreated(result.override);
      setDate("");
      setReason("");
    } else {
      setError(result.error);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Date overrides (time off / extra hours)
      </h2>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "blocked" | "open")}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="blocked">Block time off</option>
              <option value="open">Add extra hours</option>
            </select>
          </div>

          {type === "blocked" && (
            <label className="flex items-center gap-2 pb-1.5 text-sm text-gray-600">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              All day
            </label>
          )}

          {(type === "open" || !allDay) && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600">From</label>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">To</label>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </>
          )}

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Vacation"
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleAdd}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <ul className="mt-3 space-y-2">
        {overrides.length === 0 && <li className="text-sm text-gray-400">No upcoming overrides.</li>}
        {overrides.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium text-gray-800">{o.date}</span>{" "}
              <span className={o.type === "blocked" ? "text-red-600" : "text-green-600"}>
                {o.type === "blocked" ? "Blocked" : "Extra hours"}
              </span>{" "}
              <span className="text-gray-500">
                {o.startTime && o.endTime ? `${o.startTime.slice(0, 5)}–${o.endTime.slice(0, 5)}` : "All day"}
              </span>
              {o.reason && <span className="text-gray-400"> &middot; {o.reason}</span>}
            </span>
            <button
              type="button"
              onClick={() => {
                onDeleted(o.id);
                deleteAvailabilityOverride(o.id);
              }}
              className="text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
