import { unstable_cache } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, materials } from "@/db/schema";

/** Read helpers live outside `"use server"` so list pages stay light. */

export function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder)).all();
}

export const getCategoriesCached = unstable_cache(
  async () => getCategories(),
  ["categories"],
  { revalidate: 180, tags: ["catalog"] },
);

export function getCategoryBySlug(slug: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)
    .all()[0];
}

export const getCategoryBySlugCached = (slug: string) =>
  unstable_cache(
    async () => getCategoryBySlug(slug),
    ["category", slug],
    { revalidate: 180, tags: ["catalog"] },
  )();

/** Full rows — admin / edit flows only (includes heavy `content`). */
export function getMaterialsByCategory(categoryId: number) {
  return db
    .select()
    .from(materials)
    .where(eq(materials.categoryId, categoryId))
    .orderBy(asc(materials.sortOrder))
    .all();
}

/** Lean rows for client/admin lists — skips `content` blobs. */
export function getMaterialLinksByCategory(categoryId: number) {
  return db
    .select({
      id: materials.id,
      title: materials.title,
      slug: materials.slug,
      summary: materials.summary,
      icon: materials.icon,
      sortOrder: materials.sortOrder,
      imageUrl: materials.imageUrl,
      sourceUrl: materials.sourceUrl,
      updatedAt: materials.updatedAt,
      hasVideo: sql<number>`instr(${materials.content}, 'VIDEO::')`.as(
        "hasVideo",
      ),
    })
    .from(materials)
    .where(eq(materials.categoryId, categoryId))
    .orderBy(asc(materials.sortOrder))
    .all();
}

export const getMaterialLinksByCategoryCached = (categoryId: number) =>
  unstable_cache(
    async () => getMaterialLinksByCategory(categoryId),
    ["material-links", String(categoryId)],
    { revalidate: 180, tags: ["catalog"] },
  )();

export function getMaterialBySlug(slug: string) {
  return db
    .select()
    .from(materials)
    .where(eq(materials.slug, slug))
    .limit(1)
    .all()[0];
}

export const getMaterialBySlugCached = (slug: string) =>
  unstable_cache(
    async () => getMaterialBySlug(slug),
    ["material", slug],
    { revalidate: 180, tags: ["catalog"] },
  )();

export function getAllCategorySlugs() {
  return db.select({ slug: categories.slug }).from(categories).all();
}

export function getAllMaterialSlugs() {
  return db.select({ slug: materials.slug }).from(materials).all();
}

export function getMaterialById(id: number) {
  return db
    .select()
    .from(materials)
    .where(eq(materials.id, id))
    .limit(1)
    .all()[0];
}

export function getMaterialSourceLinkMap() {
  return db
    .select({
      slug: materials.slug,
      sourceUrl: materials.sourceUrl,
    })
    .from(materials)
    .all();
}

export const getMaterialSourceLinkMapCached = unstable_cache(
  async () => getMaterialSourceLinkMap(),
  ["material-source-map"],
  { revalidate: 180, tags: ["catalog"] },
);

export function getMaterialCardMap() {
  const rows = db
    .select({
      slug: materials.slug,
      title: materials.title,
      summary: materials.summary,
      icon: materials.icon,
    })
    .from(materials)
    .all();
  return new Map(rows.map((row) => [row.slug, row]));
}
