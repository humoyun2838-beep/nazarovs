import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "nazarov_session";
export const SESSION_DAYS = 14;

export type SessionPayload = {
  sub: string;
  username: string;
  role: "client" | "admin";
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

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string"
    ) {
      return null;
    }
    const role = payload.role === "admin" ? "admin" : "client";
    return {
      sub: payload.sub,
      username: payload.username,
      role,
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}
