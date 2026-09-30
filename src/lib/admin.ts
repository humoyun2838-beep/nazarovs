import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, materials } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  getCategoryBySlug,
  getMaterialById,
  getMaterialBySlug,
  getMaterialLinksByCategory,
} from "@/lib/data";
import {
  mediaUrlsFromContent,
  removeUploadedMedia,
  saveUploadedImage,
  saveUploadedVideo,
} from "@/lib/uploads";
import { revalidatePath, revalidateTag } from "next/cache";

export type AdminResult =
  | { ok: true; id?: number; slug?: string }
  | { ok: false; error: string; status?: number };

export function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/['’ʻʼ`]/g, "")
    .replace(/[^a-z0-9\u0400-\u04FFа-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `yozuv-${Date.now()}`;
}

export function withVideoMarker(content: string, videoUrl: string) {
  const marker = `VIDEO::${videoUrl}`;
  const rest = (content || "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("VIDEO::"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return rest ? `${marker}\n\n${rest}` : marker;
}

export function adminStatus(result: AdminResult) {
  if (result.ok) return 200;
  return result.status ?? 400;
}

export function refreshCatalog(...paths: string[]) {
  revalidateTag("catalog", "max");
  const unique = new Set(["/nazarov", "/materials", ...paths]);
  for (const path of unique) revalidatePath(path);
}

export async function requireAdmin(): Promise<AdminResult | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return {
      ok: false,
      error: "Faqat admin ma’lumot kiritishi mumkin.",
      status: 401,
    };
  }
  return null;
}

export async function createCategoryFromForm(
  form: FormData,
): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const title = clean(form.get("title"));
    const description = clean(form.get("description"));
    const icon = clean(form.get("icon")) || "book-open";
    const slug = slugify(clean(form.get("slug")) || title);

    if (!title) return { ok: false, error: "Bo‘lim nomi majburiy." };

    if (getCategoryBySlug(slug)) {
      return {
        ok: false,
        error: "Bunday bo‘lim allaqachon bor. Boshqa nom yozing.",
      };
    }

    const count = db.select().from(categories).all().length;
    const row = db
      .insert(categories)
      .values({
        title,
        slug,
        description,
        icon,
        sortOrder: count + 1,
      })
      .run();

    refreshCatalog("/", "/admin", "/materials");
    return { ok: true, id: Number(row.lastInsertRowid) };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Bo‘lim saqlanmadi. Qayta urinib ko‘ring." };
  }
}

export async function createMaterialFromForm(
  form: FormData,
): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const title = clean(form.get("title"));
    const summary = clean(form.get("summary"));
    let content = typeof form.get("content") === "string"
      ? String(form.get("content")).replace(/\s+$/g, "").trim()
      : "";
    const icon = clean(form.get("icon")) || "file-text";
    const categoryId = Number(clean(form.get("categoryId")));
    const slug = slugify(clean(form.get("slug")) || title);
    const imageFile = form.get("image");
    const videoFile = form.get("video");

    if (!title) return { ok: false, error: "Sarlavha majburiy." };
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return { ok: false, error: "Bo‘limni tanlang." };
    }

    const category = db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1)
      .all()[0];
    if (!category) return { ok: false, error: "Tanlangan bo‘lim topilmadi." };

    let uniqueSlug = slug;
    let attempt = 1;
    while (getMaterialBySlug(uniqueSlug)) {
      attempt += 1;
      uniqueSlug = `${slug}-${attempt}`;
    }

    let imageUrl = "";
    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrl = (await saveUploadedImage(imageFile)) || "";
    }

    if (videoFile instanceof File && videoFile.size > 0) {
      const videoUrl = await saveUploadedVideo(videoFile);
      if (videoUrl) content = withVideoMarker(content, videoUrl);
    }

    if (!content && !imageUrl) {
      return {
        ok: false,
        error: "Matn, video yoki rasmning kamida bittasini kiriting.",
      };
    }

    const siblings = getMaterialLinksByCategory(categoryId);
    const now = new Date().toISOString();
    const row = db
      .insert(materials)
      .values({
        categoryId,
        title,
        slug: uniqueSlug,
        summary,
        content,
        imageUrl,
        icon,
        sortOrder: siblings.length + 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    refreshCatalog(
      "/",
      "/admin",
      "/materials",
      `/b/${category.slug}`,
      `/m/${uniqueSlug}`,
    );
    return {
      ok: true,
      id: Number(row.lastInsertRowid),
      slug: uniqueSlug,
    };
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Material saqlanmadi.";
    return { ok: false, error: message };
  }
}

export async function updateMaterialFromForm(
  form: FormData,
): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const id = Number(clean(form.get("id")));
    const title = clean(form.get("title"));
    const summary = clean(form.get("summary"));
    let content = typeof form.get("content") === "string"
      ? String(form.get("content")).replace(/\s+$/g, "").trim()
      : "";
    const icon = clean(form.get("icon")) || "file-text";
    const categoryId = Number(clean(form.get("categoryId")));
    const removeImage = clean(form.get("removeImage")) === "1";
    const imageFile = form.get("image");
    const videoFile = form.get("video");

    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, error: "Material topilmadi." };
    }
    if (!title) return { ok: false, error: "Sarlavha majburiy." };
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return { ok: false, error: "Bo‘limni tanlang." };
    }

    const existing = getMaterialById(id);
    if (!existing) return { ok: false, error: "Material topilmadi." };

    const category = db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1)
      .all()[0];
    if (!category) return { ok: false, error: "Tanlangan bo‘lim topilmadi." };

    let imageUrl = existing.imageUrl || "";
    if (removeImage) {
      removeUploadedMedia(imageUrl);
      imageUrl = "";
    }
    if (imageFile instanceof File && imageFile.size > 0) {
      const nextImage = await saveUploadedImage(imageFile);
      if (nextImage) {
        if (imageUrl && imageUrl !== nextImage) removeUploadedMedia(imageUrl);
        imageUrl = nextImage;
      }
    }

    if (videoFile instanceof File && videoFile.size > 0) {
      const videoUrl = await saveUploadedVideo(videoFile);
      if (videoUrl) {
        for (const old of mediaUrlsFromContent(existing.content || "")) {
          if (old !== videoUrl) removeUploadedMedia(old);
        }
        content = withVideoMarker(content, videoUrl);
      }
    }

    if (!content && !imageUrl) {
      return {
        ok: false,
        error: "Matn, video yoki rasmning kamida bittasini kiriting.",
      };
    }

    db.update(materials)
      .set({
        categoryId,
        title,
        summary,
        content,
        icon,
        imageUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(materials.id, id))
      .run();

    refreshCatalog(
      "/",
      "/admin",
      "/materials",
      `/admin/materials/${id}/edit`,
      `/b/${category.slug}`,
      `/m/${existing.slug}`,
    );
    return { ok: true, id, slug: existing.slug };
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Material saqlanmadi.";
    return { ok: false, error: message };
  }
}

export async function deleteMaterialById(id: number): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Material topilmadi." };
  }

  const material = db
    .select()
    .from(materials)
    .where(eq(materials.id, id))
    .limit(1)
    .all()[0];

  db.delete(materials).where(eq(materials.id, id)).run();
  if (material) {
    removeUploadedMedia(material.imageUrl);
    for (const url of mediaUrlsFromContent(material.content || "")) {
      removeUploadedMedia(url);
    }
  }
  refreshCatalog("/", "/admin", "/materials");
  if (material) {
    const category = db
      .select()
      .from(categories)
      .where(eq(categories.id, material.categoryId))
      .limit(1)
      .all()[0];
    if (category) revalidatePath(`/b/${category.slug}`);
    revalidatePath(`/m/${material.slug}`);
    revalidatePath("/m/[slug]", "page");
  }
  return { ok: true, id };
}

export async function deleteCategoryById(id: number): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Bo‘lim topilmadi." };
  }

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1)
    .all()[0];

  const children = db
    .select()
    .from(materials)
    .where(eq(materials.categoryId, id))
    .all();
  for (const material of children) {
    removeUploadedMedia(material.imageUrl);
    for (const url of mediaUrlsFromContent(material.content || "")) {
      removeUploadedMedia(url);
    }
    revalidatePath(`/m/${material.slug}`);
  }
  db.delete(materials).where(eq(materials.categoryId, id)).run();
  db.delete(categories).where(eq(categories.id, id)).run();
  refreshCatalog("/", "/admin", "/materials");
  if (category) revalidatePath(`/b/${category.slug}`);
  revalidatePath("/m/[slug]", "page");
  return { ok: true, id };
}
