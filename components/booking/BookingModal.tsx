"use client";

import { useState, useTransition } from "react";
import { createBooking } from "@/lib/actions/booking";
import { formatClinicDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/interpolate";

interface Slot {
  start: string;
  end: string;
}

export default function BookingModal({
  doctorId,
  doctorName,
  serviceId,
  serviceName,
  slot,
  onClose,
  onBooked,
}: {
  doctorId: string;
  doctorName: string;
  serviceId: string;
  serviceName: string;
  slot: Slot;
  onClose: () => void;
  onBooked: () => void;
}) {
  const { dict, locale } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        doctorId,
        serviceId,
        start: slot.start,
        patientName: name,
        patientPhone: phone,
        patientEmail: email || undefined,
      });
      if (result.success) {
        setToken(result.cancellationToken);
        onBooked();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {token ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{dict.booking.modalBookedHeading}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {interpolate(dict.booking.modalBookedWith, {
                service: serviceName,
                doctor: doctorName,
                datetime: formatClinicDateTime(new Date(slot.start), locale),
              })}
            </p>
            <p className="mt-3 text-sm text-gray-600">
              {dict.booking.modalSaveLink}{" "}
              <a className="break-all text-blue-600 underline" href={`/manage/${token}`}>
                {window.location.origin}/manage/{token}
              </a>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {dict.booking.modalDone}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-gray-900">{dict.booking.modalConfirmHeading}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {interpolate(dict.booking.modalConfirmWith, { service: serviceName, doctor: doctorName })}
              <br />
              {formatClinicDateTime(new Date(slot.start), locale)}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="patientName">
                  {dict.booking.modalNameLabel}
                </label>
                <input
                  id="patientName"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="patientPhone">
                  {dict.booking.modalPhoneLabel}
                </label>
                <input
                  id="patientPhone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="patientEmail">
                  {dict.booking.modalEmailLabel}
                </label>
                <input
                  id="patientEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {dict.booking.modalCancel}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? dict.booking.modalBooking : dict.booking.modalConfirmBooking}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
