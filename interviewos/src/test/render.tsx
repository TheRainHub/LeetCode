import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

/** Renders a component inside the app's i18n provider (English unless a locale is given). */
export function renderWithI18n(
  ui: ReactElement,
  { locale = "en", ...options }: { locale?: Locale } & RenderOptions = {},
) {
  return render(<I18nProvider locale={locale}>{ui}</I18nProvider>, options);
}
