import { desc, eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
export type OperatorPublic = {
  id: number;
  username: string;
  fullName: string;
  status: "active" | "blocked";
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function operatorAccess(userId: number): "active" | "blocked" | "none" {
  if (!Number.isFinite(userId) || userId <= 0) return "none";
  const row = db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .all()[0];
  if (!row || row.role !== "operator") return "none";
  return row.status === "blocked" ? "blocked" : "active";
}

export function listOperators(): OperatorPublic[] {
  return db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      status: users.status,
    })
    .from(users)
    .where(eq(users.role, "operator"))
    .orderBy(desc(users.id))
    .all()
    .map((row) => ({
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      status: row.status === "blocked" ? "blocked" : "active",
    }));
}

export function createOperator(input: {
  fullName: unknown;
  username: unknown;
  password: unknown;
}) {
  const fullName = clean(input.fullName, 80);
  const username = clean(input.username, 32).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";

  if (fullName.length < 2) {
    return { ok: false as const, error: "Ism kamida 2 ta belgi bo‘lsin." };
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    return {
      ok: false as const,
      error: "Login: 3–32 belgi, lotin harf, raqam, nuqta, tire yoki pastki chiziq.",
    };
  }
  if (password.length < 1 || password.length > 72) {
    return { ok: false as const, error: "Parolni kiriting." };
  }

  const taken = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)
    .all()[0];
  if (taken) {
    return { ok: false as const, error: "Bu login band. Boshqa login yozing." };
  }

  db.insert(users)
    .values({
      username,
      passwordHash: hashSync(password, 10),
      role: "operator",
      fullName,
      phone: "",
      status: "active",
    })
    .run();
  const row = db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      status: users.status,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)
    .all()[0];

  if (!row) return { ok: false as const, error: "Saqlanmadi." };
  return {
    ok: true as const,
    operator: {
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      status: row.status === "blocked" ? "blocked" : "active",
    } satisfies OperatorPublic,
  };
}

export function setOperatorStatus(id: number, status: "active" | "blocked") {
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false as const, error: "Operator topilmadi." };
  }
  const existing = db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .all()[0];
  if (!existing || existing.role !== "operator") {
    return { ok: false as const, error: "Operator topilmadi." };
  }
  db.update(users).set({ status }).where(eq(users.id, id)).run();
  return { ok: true as const, id, status };
}
