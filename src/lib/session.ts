import { errors, SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "nazarov_session";
export { OPERATOR_COOKIE } from "@/lib/operator-cookie";
export const SESSION_DAYS = 14;

export type SessionPayload = {
  sub: string;
  username: string;
  role: "client" | "admin" | "operator";
  vid?: string;
};

function getSecret() {
  const secret =
    process.env.AUTH_SECRET || "nazarov-uz-local-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

const secretKey = getSecret();

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey);
}

function payloadSession(payload: Record<string, unknown>): SessionPayload | null {
  if (typeof payload.sub !== "string" || typeof payload.username !== "string") {
    return null;
  }
  const role =
    payload.role === "admin"
      ? "admin"
      : payload.role === "operator"
        ? "operator"
        : "client";
  const vid = typeof payload.vid === "string" ? payload.vid : undefined;
  return { sub: payload.sub, username: payload.username, role, vid };
}

export async function verifySessionToken(token: string) {
  const inspected = await inspectSessionToken(token);
  return inspected.session;
}

/** Distinguishes an expired operator token from a missing one. */
export async function inspectSessionToken(token: string) {
  if (!token) return { session: null, expired: false };
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return { session: payloadSession(payload), expired: false };
  } catch (error) {
    const expired = error instanceof errors.JWTExpired;
    return { session: null, expired };
  }
}
