import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, parseLocale, type Locale } from "@/lib/locale";

export async function getLocale(): Promise<Locale> {
  const headerLang = (await headers()).get("x-nazarov-lang");
  if (isLocale(headerLang)) {
    return headerLang;
  }
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}
