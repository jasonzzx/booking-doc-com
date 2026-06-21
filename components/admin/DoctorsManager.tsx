"use client";

import { useState } from "react";
import {
  createDoctor,
  updateDoctor,
  setDoctorActive,
  resetDoctorPassword,
  type AdminDoctorDTO,
} from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/context";

export default function DoctorsManager({ initialDoctors }: { initialDoctors: AdminDoctorDTO[] }) {
  const { dict } = useI18n();
  const [doctors, setDoctors] = useState(initialDoctors);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {doctors.map((d) => (
          <div key={d.id} className="p-3">
            {editingId === d.id ? (
              <EditDoctorForm
                doctor={d}
                onSaved={(updated) => {
                  setDoctors((ds) => ds.map((x) => (x.id === updated.id ? updated : x)));
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "font-medium",
                        d.isActive ? "text-gray-900" : "text-gray-400 line-through",
                      ].join(" ")}
                    >
                      {d.name}
                    </span>
                    <span className="text-xs text-gray-400">{d.specialty}</span>
                  </div>
                  <p className="text-sm text-gray-500">{d.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(d.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {dict.common.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResettingId(d.id)}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    {dict.adminPage.resetPassword}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDoctors((ds) => ds.map((x) => (x.id === d.id ? { ...x, isActive: !x.isActive } : x)));
                      setDoctorActive(d.id, !d.isActive);
                    }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    {d.isActive ? dict.common.deactivate : dict.common.activate}
                  </button>
                </div>
              </div>
            )}
            {resettingId === d.id && <ResetPasswordForm doctorId={d.id} onDone={() => setResettingId(null)} />}
          </div>
        ))}
        {doctors.length === 0 && <p className="p-3 text-sm text-gray-400">{dict.adminPage.noDoctors}</p>}
      </div>

      <NewDoctorForm onCreated={(doc) => setDoctors((ds) => [...ds, doc])} />
    </div>
  );
}

function EditDoctorForm({
  doctor,
  onSaved,
  onCancel,
}: {
  doctor: AdminDoctorDTO;
  onSaved: (d: AdminDoctorDTO) => void;
  onCancel: () => void;
}) {
  const { dict } = useI18n();
  const [name, setName] = useState(doctor.name);
  const [specialty, setSpecialty] = useState(doctor.specialty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const result = await updateDoctor(doctor.id, { name, specialty });
    setBusy(false);
    if (result.success) {
      onSaved({ ...doctor, name: name.trim(), specialty: specialty.trim() });
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        placeholder={dict.adminPage.namePlaceholder}
      />
      <input
        value={specialty}
        onChange={(e) => setSpecialty(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        placeholder={dict.adminPage.specialtyPlaceholder}
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

function ResetPasswordForm({ doctorId, onDone }: { doctorId: string; onDone: () => void }) {
  const { dict } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    setBusy(true);
    setError(null);
    const result = await resetDoctorPassword(doctorId, password);
    setBusy(false);
    if (result.success) {
      setDone(true);
    } else {
      setError(result.error);
    }
  }

  if (done) {
    return (
      <p className="mt-2 text-sm text-green-700">
        {dict.adminPage.passwordUpdated}{" "}
        <button type="button" onClick={onDone} className="underline">
          {dict.common.close}
        </button>
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-gray-50 p-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={dict.adminPage.newPasswordPlaceholder}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={busy}
        onClick={handleReset}
        className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {dict.adminPage.setPassword}
      </button>
      <button type="button" onClick={onDone} className="text-sm text-gray-500">
        {dict.common.cancel}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function NewDoctorForm({ onCreated }: { onCreated: (d: AdminDoctorDTO) => void }) {
  const { dict } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const result = await createDoctor({ name, email, specialty, password });
    setBusy(false);
    if (result.success) {
      onCreated(result.doctor);
      setName("");
      setEmail("");
      setSpecialty("");
      setPassword("");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {dict.adminPage.addDoctor}
      </h2>
      <div className="flex flex-wrap items-end gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={dict.adminPage.namePlaceholder}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.adminPage.emailPlaceholder}
          type="email"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder={dict.adminPage.specialtyPlaceholder}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={dict.adminPage.tempPasswordPlaceholder}
          type="password"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={handleCreate}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? dict.common.adding : dict.adminPage.addDoctor}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
