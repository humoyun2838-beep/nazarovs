/** Stable local origin and routes. Public DNS is not assumed. */

export const SERVICE_NAME = "nazarov-uz";
export const LOCAL_PORT = 3847;

export const routes = {
  home: "/",
  catalog: "/nazarov",
  admin: "/admin",
  adminLogin: "/admin/login",
  adminChat: "/admin/chat",
  operator: "/operator",
  operatorLogin: "/operator/kirish",
} as const;

export function localOrigin() {
  const port = String(process.env.PORT || LOCAL_PORT).trim() || String(LOCAL_PORT);
  return `http://127.0.0.1:${port}`;
}

/**
 * Absolute public origin only after the operator sets SITE_PUBLIC_READY=1
 * and SITE_CANONICAL_ORIGIN to an https URL they actually control.
 */
export function canonicalOrigin() {
  if (process.env.SITE_PUBLIC_READY !== "1") return "";
  const raw = (process.env.SITE_CANONICAL_ORIGIN || "").trim().replace(/\/$/, "");
  if (!raw.startsWith("https://")) return "";
  try {
    const url = new URL(raw);
    if (!url.hostname || url.hostname === "localhost") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function publicOrigin() {
  return canonicalOrigin() || localOrigin();
}
