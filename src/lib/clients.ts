import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { db } from "@/db";
import { clientRequests, clientVisits, users } from "@/db/schema";
import { formatUzPhoneInput, isValidUzPhone, formatTelegramUsername, isValidTelegramUsername } from "@/lib/uz-phone";
import { parseExpiresAt } from "@/lib/access-time";

export type ClientRequestRow = typeof clientRequests.$inferSelect;

function clean(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function registerClient(input: {
  name: unknown;
  phone: unknown;
  telegram?: unknown;
  workplace?: unknown;
}) {
  const name = clean(input.name, 80);
  const phoneRaw = clean(input.phone, 24);
  const phone = formatUzPhoneInput(phoneRaw);
  const workplaceRaw = formatTelegramUsername(
    clean(input.telegram ?? input.workplace, 40),
  );
  const workplace = workplaceRaw === "@" ? "" : workplaceRaw;
  const errors: Record<string, string> = {};

  if (name.length < 2) errors.name = "Ismni kiriting.";
  if (!isValidUzPhone(phoneRaw)) {
    errors.phone = "Raqam: +998 va 9 ta raqam kiriting.";
  }
  if (workplace && !isValidTelegramUsername(workplace)) {
    errors.telegram = "Telegram username noto‘g‘ri. Bo‘sh qoldirish mumkin.";
  }
  if (Object.keys(errors).length) {
    return { ok: false as const, errors };
  }

  const existing = db
    .select()
    .from(clientRequests)
    .where(eq(clientRequests.phone, phone))
    .limit(1)
    .all()[0];

  if (existing?.status === "approved" && existing.username) {
    return {
      ok: false as const,
      errors: {
        phone: "Bu raqamga login berilgan. Kirish bo‘limidan foydalaning.",
      },
    };
  }

  const now = new Date().toISOString();
  if (existing) {
    db.update(clientRequests)
      .set({
        name,
        workplace,
        status: "pending",
        decidedAt: "",
      })
      .where(eq(clientRequests.id, existing.id))
      .run();
    return { ok: true as const, status: "pending" as const };
  }

  db.insert(clientRequests)
    .values({
      name,
      phone,
      workplace,
      status: "pending",
      userId: 0,
      username: "",
      createdAt: now,
      decidedAt: "",
    })
    .run();

  return { ok: true as const, status: "pending" as const };
}

export function listClientRequests() {
  return db
    .select()
    .from(clientRequests)
    .orderBy(desc(clientRequests.createdAt))
    .all()
    .map((row) => ({ ...row, issuedPassword: "" }));
}

export function pendingClientCount() {
  return db
    .select()
    .from(clientRequests)
    .where(eq(clientRequests.status, "pending"))
    .all().length;
}

function loginFields(usernameRaw: unknown, passwordRaw: unknown) {
  const username = clean(usernameRaw, 32).toLowerCase();
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return {
      ok: false as const,
      error: "Login: 3–32 belgi, lotin harf, raqam, nuqta yoki chiziq.",
    };
  }
  if (password.length < 1) {
    return { ok: false as const, error: "Parolni kiriting." };
  }
  return { ok: true as const, username, password };
}

export function createClientDirect(input: {
  name: unknown;
  phone?: unknown;
  telegram?: unknown;
  username: unknown;
  password: unknown;
  expiresAt?: unknown;
}) {
  const name = clean(input.name, 80) || clean(input.username, 80);
  const phoneRaw = clean(input.phone, 24);
  const localDigits = phoneRaw.replace(/\D/g, "").replace(/^998/, "");
  const phone = localDigits.length ? formatUzPhoneInput(phoneRaw) : "";
  const telegramRaw = formatTelegramUsername(clean(input.telegram, 40));
  const workplace = telegramRaw === "@" ? "" : telegramRaw;
  const fields = loginFields(input.username, input.password);
  if (!fields.ok) return fields;
  if (name.length < 2) {
    return { ok: false as const, error: "Ism yoki login yozing." };
  }
  if (phoneRaw && !isValidUzPhone(phoneRaw)) {
    return { ok: false as const, error: "Telefon: +998 va 9 ta raqam, yoki bo‘sh." };
  }
  if (workplace && !isValidTelegramUsername(workplace)) {
    return { ok: false as const, error: "Telegram username noto‘g‘ri." };
  }

  const taken = db
    .select()
    .from(users)
    .where(eq(users.username, fields.username))
    .limit(1)
    .all()[0];
  if (taken) {
    return { ok: false as const, error: "Bu login band. Boshqasini yozing." };
  }

  const expiry = parseExpiresAt(input.expiresAt);
  if (!expiry.ok) {
    return { ok: false as const, error: "Muddat noto‘g‘ri." };
  }

  const hash = hashSync(fields.password, 8);
  const now = new Date().toISOString();
  const inserted = db
    .insert(users)
    .values({
      username: fields.username,
      passwordHash: hash,
      role: "client",
      fullName: name,
      phone,
    })
    .run();
  const userId = Number(inserted.lastInsertRowid);

  db.insert(clientRequests)
    .values({
      name,
      phone,
      workplace,
      status: "approved",
      userId,
      username: fields.username,
      createdAt: now,
      decidedAt: now,
      issuedPassword: "",
      expiresAt: expiry.value,
    })
    .run();

  return { ok: true as const, username: fields.username, password: fields.password };
}

export function issueClientLogin(input: {
  requestId: unknown;
  username: unknown;
  password: unknown;
  expiresAt?: unknown;
}) {
  const requestId = Number(input.requestId);
  const fields = loginFields(input.username, input.password);

  if (!Number.isFinite(requestId) || requestId <= 0) {
    return { ok: false as const, error: "Ariza topilmadi." };
  }
  if (!fields.ok) return fields;

  const row = db
    .select()
    .from(clientRequests)
    .where(eq(clientRequests.id, requestId))
    .limit(1)
    .all()[0];
  if (!row) return { ok: false as const, error: "Ariza topilmadi." };

  const taken = db
    .select()
    .from(users)
    .where(eq(users.username, fields.username))
    .limit(1)
    .all()[0];
  if (taken && taken.id !== row.userId) {
    return { ok: false as const, error: "Bu login band. Boshqasini yozing." };
  }

  const expiry = parseExpiresAt(input.expiresAt);
  if (!expiry.ok) {
    return { ok: false as const, error: "Muddat noto‘g‘ri." };
  }

  const hash = hashSync(fields.password, 8);
  const now = new Date().toISOString();
  let userId = row.userId;

  if (userId) {
    db.update(users)
      .set({
        username: fields.username,
        passwordHash: hash,
        fullName: row.name,
        phone: row.phone,
        role: "client",
      })
      .where(eq(users.id, userId))
      .run();
  } else {
    const inserted = db
      .insert(users)
      .values({
        username: fields.username,
        passwordHash: hash,
        role: "client",
        fullName: row.name,
        phone: row.phone,
      })
      .run();
    userId = Number(inserted.lastInsertRowid);
  }

  db.update(clientRequests)
    .set({
      status: "approved",
      userId,
      username: fields.username,
      decidedAt: now,
      issuedPassword: "",
      expiresAt: expiry.value,
    })
    .where(eq(clientRequests.id, requestId))
    .run();

  return { ok: true as const, username: fields.username, password: fields.password };
}

export function rejectClientRequest(requestId: unknown) {
  const id = Number(requestId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false as const, error: "Ariza topilmadi." };
  }
  db.update(clientRequests)
    .set({ status: "rejected", decidedAt: new Date().toISOString() })
    .where(eq(clientRequests.id, id))
    .run();
  return { ok: true as const };
}

export function deleteIssuedLogin(requestId: unknown) {
  const id = Number(requestId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false as const, error: "Yozuv topilmadi." };
  }
  const row = db
    .select()
    .from(clientRequests)
    .where(eq(clientRequests.id, id))
    .limit(1)
    .all()[0];
  if (!row) return { ok: false as const, error: "Yozuv topilmadi." };

  const user =
    row.userId > 0
      ? db.select().from(users).where(eq(users.id, row.userId)).limit(1).all()[0]
      : row.username
        ? db
            .select()
            .from(users)
            .where(eq(users.username, row.username))
            .limit(1)
            .all()[0]
        : undefined;

  if (user?.role === "admin") {
    return { ok: false as const, error: "Admin loginini o‘chirib bo‘lmaydi." };
  }

  if (user) {
    db.delete(clientVisits).where(eq(clientVisits.userId, user.id)).run();
    db.delete(users).where(eq(users.id, user.id)).run();
  }

  db.delete(clientRequests).where(eq(clientRequests.id, id)).run();
  return { ok: true as const };
}

export function setClientExpiry(requestId: unknown, expiresAtRaw: unknown) {
  const id = Number(requestId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false as const, error: "Yozuv topilmadi." };
  }
  const expiry = parseExpiresAt(expiresAtRaw);
  if (!expiry.ok) {
    return { ok: false as const, error: "Muddat noto‘g‘ri." };
  }
  const row = db
    .select()
    .from(clientRequests)
    .where(eq(clientRequests.id, id))
    .limit(1)
    .all()[0];
  if (!row || row.status !== "approved") {
    return { ok: false as const, error: "Yozuv topilmadi." };
  }
  db.update(clientRequests)
    .set({ expiresAt: expiry.value })
    .where(eq(clientRequests.id, id))
    .run();
  return { ok: true as const, expiresAt: expiry.value };
}

export function resetClientPassword(requestId: unknown) {
  const id = Number(requestId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false as const, error: "Yozuv topilmadi." };
  }
  const row = db
    .select()
    .from(clientRequests)
    .where(eq(clientRequests.id, id))
    .limit(1)
    .all()[0];
  if (!row || row.status !== "approved" || !row.userId) {
    return { ok: false as const, error: "Login topilmadi." };
  }
  const password = randomBytes(9).toString("base64url");
  db.update(users)
    .set({ passwordHash: hashSync(password, 8) })
    .where(eq(users.id, row.userId))
    .run();
  db.update(clientRequests)
    .set({ issuedPassword: "" })
    .where(eq(clientRequests.id, id))
    .run();
  return { ok: true as const, username: row.username, password };
}
