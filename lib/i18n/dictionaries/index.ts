import type { Locale } from "../config";
import en, { type Dictionary } from "./en";
import zhCN from "./zh-CN";

export type { Dictionary };

export const dictionaries: Record<Locale, Dictionary> = {
  en,
  "zh-CN": zhCN,
};
