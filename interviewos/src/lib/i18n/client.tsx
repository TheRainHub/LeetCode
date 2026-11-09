"use client";

import { createContext, useContext, useMemo } from "react";
import { getMessagesFor, type Locale, type Messages } from "./index";

const I18nContext = createContext<{ locale: Locale; m: Messages } | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, m: getMessagesFor(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
