import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientRequests, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { isExpiredAt } from "@/lib/access-time";
import { formatUzPhoneInput, isValidUzPhone } from "@/lib/uz-phone";
import type { SessionPayload } from "@/lib/session";
import { routes } from "@/lib/site";

export function getClientAccess(userId: number, username?: string) {
  const byId =
    userId > 0
      ? db
          .select()
          .from(clientRequests)
          .where(eq(clientRequests.userId, userId))
          .limit(1)
          .all()[0]
      : undefined;
  const row =
    byId ||
    (username
      ? db
          .select()
          .from(clientRequests)
          .where(eq(clientRequests.username, username.toLowerCase()))
          .limit(1)
          .all()[0]
      : undefined);
  const expiresAt = row?.expiresAt || "";
  const expired = isExpiredAt(expiresAt);
  return {
    expiresAt,
    expired,
    active: !expired,
  };
}

function deskPhoneForUser(userId: number) {
  const tail = String(100000000 + (Math.abs(userId) % 800000000)).slice(-9);
  return `+998${tail}`;
}

export function getChatClientProfile(session: SessionPayload) {
  const userId = Number(session.sub) || 0;
  const user =
    userId > 0
      ? db.select().from(users).where(eq(users.id, userId)).limit(1).all()[0]
      : undefined;
  const requestRow =
    userId > 0
      ? db
          .select()
          .from(clientRequests)
          .where(eq(clientRequests.userId, userId))
          .limit(1)
          .all()[0]
      : undefined;
  const access = getClientAccess(userId, session.username);
  const rawName = (user?.fullName || requestRow?.name || "").trim();
  const name =
    rawName.length >= 2 ? rawName.slice(0, 80) : session.username.slice(0, 80);
  const phoneRaw = (user?.phone || requestRow?.phone || "").trim();
  const phone = isValidUzPhone(phoneRaw)
    ? formatUzPhoneInput(phoneRaw)
    : deskPhoneForUser(userId || 1);
  return {
    userId,
    name,
    phone,
    expired: access.expired,
    expiresAt: access.expiresAt,
  };
}

export async function requireChatClient() {
  const session = await getSession();
  if (!session || session.role !== "client") {
    redirect(routes.operatorLogin);
  }
  const profile = getChatClientProfile(session);
  if (profile.expired) {
    redirect(`${routes.operatorLogin}?error=expired`);
  }
  return { session, profile };
}

export async function requireStaffChat() {
  const session = await getSession();
  if (!session) {
    redirect(`${routes.adminLogin}?next=${encodeURIComponent(routes.adminChat)}`);
  }
  if (session.role === "admin") {
    return { session, profile: null as ReturnType<typeof getChatClientProfile> | null, expiresAt: "" };
  }
  if (session.role === "operator") {
    redirect(routes.operator);
  }
  if (session.role === "client") {
    redirect(routes.catalog);
  }
  redirect(`${routes.adminLogin}?next=${encodeURIComponent(routes.adminChat)}`);
}

export async function catalogViewer() {
  const session = await getSession();
  if (!session) {
    return { session: null as Awaited<ReturnType<typeof getSession>>, expiresAt: "" };
  }
  if (session.role === "admin") {
    return { session, expiresAt: "" };
  }
  const access = getClientAccess(Number(session.sub), session.username);
  return { session, expiresAt: access.expiresAt };
}

/** @deprecated Catalog is public; kept for older imports. */
export async function requireCatalogSession() {
  return catalogViewer();
}
