import { type NextRequest } from "next/server";
import {
  authenticate,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { OPERATOR_COOKIE } from "@/lib/operator-cookie";
import { COOKIE_NAME } from "@/lib/session";
import { redirectTo, visitorIp } from "@/lib/http";
import { startClientVisit } from "@/lib/client-visits";
import { getClientAccess } from "@/lib/client-access";
import { routes } from "@/lib/site";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = clean(form.get("username"));
  const passwordField = form.get("password");
  const password = typeof passwordField === "string" ? passwordField : "";
  const next = clean(form.get("next"));

  const roleHint = clean(form.get("role"));
  const failPath =
    roleHint === "admin"
      ? routes.adminLogin
      : roleHint === "operator"
        ? routes.operator
        : routes.catalog;

  const fail = (code: string) => {
    const params = new URLSearchParams({ error: code });
    if (next.startsWith("/") && roleHint !== "operator") params.set("next", next);
    if (roleHint === "client") params.set("tab", "kirish");
    return redirectTo(request, `${failPath}?${params.toString()}`, 303);
  };

  if (!username || !password) return fail("empty");

  const user = await authenticate(username, password);
  if (!user) return fail("invalid");
  if (user.blocked) return fail("blocked");
  if (roleHint === "admin" && user.role !== "admin") return fail("admin");
  if (roleHint === "operator" && user.role === "admin") return fail("desk");
  if (roleHint === "operator" && user.role === "client") return fail("client");
  if (roleHint === "operator" && user.role !== "operator") return fail("invalid");
  if (roleHint !== "admin" && roleHint !== "operator" && user.role !== "client") {
    return fail("invalid");
  }
  if (user.role === "client") {
    const access = getClientAccess(user.id, user.username);
    if (access.expired) return fail("expired");
  }

  const dest =
    user.role === "admin"
      ? next.startsWith("/admin") && !next.startsWith("//")
        ? next
        : "/admin"
      : user.role === "operator"
        ? routes.operator
        : next.startsWith(routes.catalog) && !next.startsWith("//")
          ? next
          : routes.catalog;

  let vid: string | undefined;
  if (user.role === "client") {
    try {
      vid = await startClientVisit({
        userId: user.id,
        username: user.username,
        ip: visitorIp(request),
        userAgent: request.headers.get("user-agent") || "",
        page: dest,
      });
    } catch {
      vid = undefined;
    }
  }

  const token = await createSessionToken({
    sub: String(user.id),
    username: user.username,
    role: user.role,
    vid,
  });
  const res = redirectTo(request, dest, 303);
  res.headers.set("Cache-Control", "no-store");
  if (user.role === "operator") {
    res.cookies.set(OPERATOR_COOKIE, token, sessionCookieOptions());
  } else {
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  }
  return res;
}
