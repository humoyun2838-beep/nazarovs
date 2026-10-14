import { sqlite } from "@/db";
import { extractMediaFromContent } from "@/lib/media-blocks";

export type LessonHit = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  snippet: string;
};

export function searchLessons(query: string, limit = 8): LessonHit[] {
  const q = query.trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return [];
  const rows = sqlite
    .prepare(
      `
      SELECT m.title, m.slug, m.summary,
             substr(m.content, MAX(1, instr(lower(m.content), ?) - 80), 240) AS content,
             c.title AS category, c.slug AS category_slug
      FROM materials m
      JOIN categories c ON c.id = m.category_id
      WHERE instr(lower(m.title), ?)
         OR instr(lower(m.summary), ?)
         OR instr(lower(c.title), ?)
         OR instr(lower(m.content), ?)
      LIMIT 40
      `,
    )
    .all(q, q, q, q, q) as Array<{
    title: string;
    slug: string;
    summary: string;
    content: string;
    category: string;
    category_slug: string;
  }>;

  return rows
    .map((row) => {
      const text = extractMediaFromContent(row.content || "").text.replace(/\s+/g, " ");
      const body = text.toLowerCase();
      const summary = (row.summary || "").toLowerCase();
      const title = row.title.toLowerCase();
      const at = body.indexOf(q);
      const snippet =
        at >= 0
          ? text.slice(Math.max(0, at - 40), at + 120).trim()
          : summary.includes(q)
            ? row.summary.slice(0, 140).trim()
            : (row.summary || text).slice(0, 140).trim();
      const score = title.includes(q) ? 3 : at >= 0 ? 2 : summary.includes(q) ? 1 : 0;
      return {
        slug: row.slug,
        title: row.title,
        category: row.category,
        categorySlug: row.category_slug,
        snippet,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => ({
      slug: hit.slug,
      title: hit.title,
      category: hit.category,
      categorySlug: hit.categorySlug,
      snippet: hit.snippet,
    }));
}
