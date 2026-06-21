"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

const LABELS: Record<Locale, string> = {
  en: "EN",
  "zh-CN": "中文",
};

function setLocaleCookie(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher() {
  const { locale } = useI18n();
  const router = useRouter();

  function handleChange(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5 text-xs">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => handleChange(l)}
          aria-pressed={l === locale}
          className={[
            "rounded px-2 py-1 transition",
            l === locale ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100",
          ].join(" ")}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
