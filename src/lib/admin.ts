import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db";
import { categories, materials } from "@/db/schema";
import { isAdminRole } from "@/lib/admin-area";
import { getSession } from "@/lib/auth";
import {
  getCategories,
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
import {
  extractMediaFromContent,
  parseMediaPlan,
  serializeLessonContent,
} from "@/lib/media-blocks";

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

async function collectFiles(form: FormData, key: string) {
  const files: File[] = [];
  for (const value of form.getAll(key)) {
    if (value instanceof File && value.size > 0) files.push(value);
  }
  return files;
}

async function applyMediaPlanToContent(
  content: string,
  form: FormData,
  previousContent = "",
) {
  const parsed = extractMediaFromContent(content);
  const rawPlan = form.get("mediaPlan");
  const hasPlan = typeof rawPlan === "string";
  const plan = parseMediaPlan(rawPlan);
  const videoFiles = await collectFiles(form, "videos");
  const imageFiles = await collectFiles(form, "images");
  const savedVideos: string[] = [];
  const savedImages: string[] = [];
  for (const file of videoFiles) {
    const url = await saveUploadedVideo(file);
    if (url) savedVideos.push(url);
  }
  for (const file of imageFiles) {
    const url = await saveUploadedImage(file);
    if (url) savedImages.push(url);
  }

  const media: { kind: "image" | "video"; src: string }[] = [];
  if (hasPlan) {
    for (const item of plan) {
      if ("src" in item) {
        media.push(item);
        continue;
      }
      const url =
        item.kind === "video"
          ? savedVideos[item.newIndex]
          : savedImages[item.newIndex];
      if (url) media.push({ kind: item.kind, src: url });
    }
  } else {
    media.push(...parsed.media);
    for (const url of savedVideos) media.push({ kind: "video", src: url });
    for (const url of savedImages) media.push({ kind: "image", src: url });
  }

  const next = serializeLessonContent(media, parsed.text);
  const keep = new Set(media.map((item) => item.src));
  for (const old of mediaUrlsFromContent(previousContent)) {
    if (!keep.has(old)) removeUploadedMedia(old);
  }
  return next;
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
  if (!session || !isAdminRole(session.role)) {
    return {
      ok: false,
      error: "Faqat admin ma’lumot kiritishi mumkin.",
      status: 401,
    };
  }
  return null;
}

export async function requireChatOperator(): Promise<AdminResult | null> {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return { ok: false, error: "Unauthorized", status: 401 };
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
    return { ok: true, id: Number(row.lastInsertRowid), slug };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Bo‘lim saqlanmadi. Qayta urinib ko‘ring." };
  }
}

export async function updateCategoryFromForm(
  form: FormData,
): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = Number(clean(form.get("id")));
  const title = clean(form.get("title"));
  const description = clean(form.get("description"));
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Bo‘lim topilmadi." };
  }
  if (!title) return { ok: false, error: "Bo‘lim nomi majburiy." };

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1)
    .all()[0];
  if (!category) return { ok: false, error: "Bo‘lim topilmadi." };

  db.update(categories)
    .set({ title, description })
    .where(eq(categories.id, id))
    .run();
  refreshCatalog("/", "/admin", "/materials");
  revalidatePath(`/b/${category.slug}`);
  return { ok: true, id, slug: category.slug };
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
    content = await applyMediaPlanToContent(content, form, "");

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
      if (videoUrl) content = withVideoMarker(content, videoUrl);
    }
    content = await applyMediaPlanToContent(content, form, existing.content || "");

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

export async function reorderMaterials(
  categoryId: number,
  orderedIds: number[],
): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { ok: false, error: "Bo‘lim topilmadi." };
  }
  const ids = orderedIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length < 2) return { ok: true };

  const siblings = getMaterialLinksByCategory(categoryId);
  const allowed = new Set(siblings.map((row) => row.id));
  if (ids.some((id) => !allowed.has(id))) {
    return { ok: false, error: "Tartib noto‘g‘ri." };
  }

  ids.forEach((id, index) => {
    db.update(materials)
      .set({ sortOrder: index + 1, updatedAt: new Date().toISOString() })
      .where(eq(materials.id, id))
      .run();
  });

  const leftover = siblings.filter((row) => !ids.includes(row.id));
  leftover.forEach((row, index) => {
    db.update(materials)
      .set({
        sortOrder: ids.length + index + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(materials.id, row.id))
      .run();
  });

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)
    .all()[0];
  refreshCatalog("/", "/admin", "/materials");
  if (category) revalidatePath(`/b/${category.slug}`);
  return { ok: true };
}

export async function reorderCategories(orderedIds: number[]): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ids = orderedIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length < 2) return { ok: true };

  const siblings = getCategories();
  const allowed = new Set(siblings.map((row) => row.id));
  if (ids.some((id) => !allowed.has(id))) {
    return { ok: false, error: "Tartib noto‘g‘ri." };
  }

  ids.forEach((id, index) => {
    db.update(categories)
      .set({ sortOrder: index + 1 })
      .where(eq(categories.id, id))
      .run();
  });
  const leftover = siblings.filter((row) => !ids.includes(row.id));
  leftover.forEach((row, index) => {
    db.update(categories)
      .set({ sortOrder: ids.length + index + 1 })
      .where(eq(categories.id, row.id))
      .run();
  });
  refreshCatalog("/", "/admin", "/materials");
  return { ok: true };
}
