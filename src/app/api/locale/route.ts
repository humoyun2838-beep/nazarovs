import { NextResponse } from "next/server";
import {
  LOCALE_COOKIE,
  localeCookieOptions,
  parseLocale,
} from "@/lib/locale";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    locale?: unknown;
  } | null;
  const locale = parseLocale(body?.locale);
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions());
  return res;
}
