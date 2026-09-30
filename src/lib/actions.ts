"use server";

import { redirect } from "next/navigation";
import {
  authenticate,
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
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
  if (!user) {
    return { ok: false, error: "Login yoki parol noto‘g‘ri." };
  }

  if (expectedRole === "admin" && user.role !== "admin") {
    return { ok: false, error: "Bu sahifa faqat admin uchun." };
  }

  const token = await createSessionToken({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  });
  await setSessionCookie(token);

  const fallback = user.role === "admin" ? "/admin" : "/nazarov";
  const dest =
    next.startsWith("/") &&
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
