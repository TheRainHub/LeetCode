export type Locale = "en" | "ru";
export const LOCALES: readonly Locale[] = ["en", "ru"] as const;

/** Russian messages must have exactly the same shape as English ones (checked at compile time). */
export function defineMessages<T>(en: T, ru: NoInfer<T>): { en: T; ru: T } {
  return { en, ru };
}

export function plural(locale: Locale, n: number, forms: { one: string; few?: string; many: string }): string {
  if (locale === "ru") {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms.one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few ?? forms.many;
    return forms.many;
  }
  return n === 1 ? forms.one : forms.many;
}
