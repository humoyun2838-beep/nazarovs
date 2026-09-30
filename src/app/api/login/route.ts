import { NextResponse, type NextRequest } from "next/server";
import {
  authenticate,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/session";
import { redirectTo } from "@/lib/http";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = clean(form.get("username"));
  const password = clean(form.get("password"));
  const next = clean(form.get("next"));

  const fail = (code: string) => {
    const params = new URLSearchParams({ error: code });
    if (next.startsWith("/")) params.set("next", next);
    return redirectTo(request, `/admin/login?${params.toString()}`, 303);
  };

  if (!username || !password) return fail("empty");

  const user = await authenticate(username, password);
  if (!user || user.role !== "admin") {
    return fail(user ? "admin" : "invalid");
  }

  const token = await createSessionToken({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  });

  const dest = next.startsWith("/admin") ? next : "/admin";
  const res = redirectTo(request, dest, 303);
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  return res;
}
