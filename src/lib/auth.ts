import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type UserRole } from "@/db/schema";
import { OPERATOR_COOKIE } from "@/lib/operator-cookie";
import {
  COOKIE_NAME,
  SESSION_DAYS,
  createSessionToken,
  inspectSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Keep false so HTTP preview and HTTPS tunnels both keep the session.
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getOperatorSession() {
  const cookieStore = await cookies();
  const dedicated = cookieStore.get(OPERATOR_COOKIE)?.value;
  if (dedicated) {
    const inspected = await inspectSessionToken(dedicated);
    if (inspected.session?.role === "operator") return inspected.session;
    return null;
  }
  const legacy = await getSession();
  if (legacy?.role === "operator") return legacy;
  return null;
}

export async function setOperatorCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(OPERATOR_COOKIE, token, sessionCookieOptions());
}

export async function authenticate(username: string, password: string) {
  const name = username.trim();
  if (!name) return null;

  const user = db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = ${name.toLowerCase()}`)
    .limit(1)
    .all()[0];

  if (!user) return null;

  const ok = await compare(password, user.passwordHash);
  if (!ok) return null;

  const role: UserRole =
    user.role === "admin"
      ? "admin"
      : user.role === "operator"
        ? "operator"
        : "client";
  if (role === "operator" && user.status === "blocked") {
    return { blocked: true as const };
  }

  return {
    blocked: false as const,
    id: user.id,
    username: user.username,
    role,
  };
}

export { createSessionToken, verifySessionToken, COOKIE_NAME, OPERATOR_COOKIE };
export type { SessionPayload };
