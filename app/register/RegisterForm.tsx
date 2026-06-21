"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerDoctorAction } from "@/lib/actions/register";
import { useI18n } from "@/lib/i18n/context";

export default function RegisterForm() {
  const { dict } = useI18n();
  const [state, formAction, isPending] = useActionState(registerDoctorAction, {});

  if (state?.success) {
    return (
      <div>
        <p className="text-sm text-green-700">{dict.register.successMessage}</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          {dict.register.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          {dict.common.name}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          {dict.common.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
          {dict.register.specialtyLabel}
        </label>
        <input
          id="specialty"
          name="specialty"
          type="text"
          required
          placeholder={dict.register.specialtyPlaceholder}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          {dict.common.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? dict.register.submitting : dict.register.submit}
      </button>
      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="text-blue-600 hover:underline">
          {dict.register.backToLogin}
        </Link>
      </p>
    </form>
  );
}
