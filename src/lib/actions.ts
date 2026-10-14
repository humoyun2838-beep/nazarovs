"use server";

import { redirect } from "next/navigation";
import {
  authenticate,
  clearSessionCookie,
  createSessionToken,
  setOperatorCookie,
  setSessionCookie,
} from "@/lib/auth";
import { getClientAccess } from "@/lib/client-access";
import {
  clean,
  createCategoryFromForm,
  createMaterialFromForm,
  deleteCategoryById,
  deleteMaterialById,
  updateMaterialFromForm,
  type AdminResult,
} from "@/lib/admin";

export type ActionResult = AdminResult;

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const username = clean(formData.get("username"));
  const password = clean(formData.get("password"));
  const expectedRole = clean(formData.get("role")) || "client";
  const next = clean(formData.get("next"));

  if (!username || !password) {
    return { ok: false, error: "Login va parolni kiriting." };
  }

  const user = await authenticate(username, password);
  if (!user || user.blocked) {
    return {
      ok: false,
      error: user?.blocked
        ? "Bu operator hisobi bloklangan."
        : "Login yoki parol noto‘g‘ri.",
    };
  }

  if (expectedRole === "admin" && user.role !== "admin") {
    return { ok: false, error: "Bu sahifa faqat admin uchun." };
  }
  if (expectedRole === "operator" && user.role === "admin") {
    return { ok: false, error: "Bu admin logini. Chat uchun admin bergan login kerak." };
  }
  if (expectedRole === "operator" && user.role === "client") {
    return { ok: false, error: "Bu mijoz logini. Operator chatiga alohida operator logini yozing." };
  }
  if (expectedRole === "operator" && user.role !== "operator") {
    return { ok: false, error: "Login yoki parol noto‘g‘ri." };
  }

  if (user.role === "client") {
    const access = getClientAccess(user.id, user.username);
    if (access.expired) {
      return { ok: false, error: "Login muddati tugagan. Admin qayta faollashtirsin." };
    }
  }

  const token = await createSessionToken({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  });
  if (user.role === "operator") await setOperatorCookie(token);
  else await setSessionCookie(token);

  const fallback =
    user.role === "admin" ? "/admin" : user.role === "operator" ? "/operator" : "/nazarov";
  const dest =
    user.role === "operator"
      ? "/operator"
      : next.startsWith("/") &&
          !next.startsWith("//") &&
          !(user.role !== "admin" && next.startsWith("/admin"))
        ? next
        : fallback;
  redirect(dest);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/nazarov");
}

export async function createCategoryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return createCategoryFromForm(formData);
}

export async function createMaterialAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return createMaterialFromForm(formData);
}

export async function updateMaterialAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return updateMaterialFromForm(formData);
}

export async function deleteMaterialAction(formData: FormData) {
  const id = Number(clean(formData.get("id")));
  await deleteMaterialById(id);
}

export async function deleteCategoryAction(formData: FormData) {
  const id = Number(clean(formData.get("id")));
  await deleteCategoryById(id);
}
