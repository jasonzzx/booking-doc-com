"use client";

import { createContext, useContext } from "react";
import { enUS, zhCN } from "date-fns/locale";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const I18nContext = createContext<{ locale: Locale; dict: Dictionary } | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

// date-fns locale object matching the active UI locale, for formatting
// weekday/month names inside client components (e.g. the booking calendar).
export function useDateFnsLocale() {
  const { locale } = useI18n();
  return locale === "zh-CN" ? zhCN : enUS;
}
