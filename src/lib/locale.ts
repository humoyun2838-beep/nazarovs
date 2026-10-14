export const LOCALE_COOKIE = "nazarov_lang";
export const LOCALES = ["uz", "ru", "en", "kaa"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (LOCALES as readonly string[]).includes(raw);
}

export function parseLocale(value: unknown): Locale {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return isLocale(raw) ? raw : "uz";
}

export function withLang(href: string, locale: Locale) {
  try {
    const url = new URL(href, "http://nazarov.local");
    url.searchParams.set("lang", locale);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

export function htmlLang(locale: Locale) {
  if (locale === "ru") return "ru";
  if (locale === "en") return "en";
  if (locale === "kaa") return "kaa";
  return "uz";
}

export function formatPublicCount(n: number, locale: Locale) {
  if (locale === "ru") return `${n} шт.`;
  if (locale === "en") return String(n);
  if (locale === "kaa") return `${n} dana`;
  return `${n} ta`;
}

export function localeCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  };
}
