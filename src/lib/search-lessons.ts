import { sqlite } from "@/db";
import { extractMediaFromContent } from "@/lib/media-blocks";
import type { Locale } from './locale';
import { localizeCatalogTitle } from './catalog-locale';
import { translateCatalog } from './ui-translation';
import { getCatalogRevision } from './app-version';

export type LessonHit = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  snippet: string;
};

let translatedIndex: {revision:string;locales:Map<Locale,LessonHit[]>}|undefined;
function localizedIndex(locale:Locale) {
  const revision=getCatalogRevision();
  if(!translatedIndex||translatedIndex.revision!==revision)translatedIndex={revision,locales:new Map()};
  let hits=translatedIndex.locales.get(locale);
  if(!hits){
    const rows=sqlite.prepare('SELECT m.slug,m.title,m.summary,c.title AS category,c.slug AS categorySlug FROM materials m JOIN categories c ON c.id=m.category_id ORDER BY c.sort_order,m.sort_order,m.id').all() as Array<LessonHit & {summary:string}>;
    hits=rows.map(r=>({slug:r.slug,title:localizeCatalogTitle(r.slug,r.title,locale),category:localizeCatalogTitle(r.categorySlug,r.category,locale),categorySlug:r.categorySlug,snippet:translateCatalog(r.summary,locale)||(locale==='uz'&&!r.slug.startsWith('notion-ru-')?r.summary:'')}));
    translatedIndex.locales.set(locale,hits);
  }
  return hits;
}
export function searchLessons(query: string, limit = 8, locale?:Locale): LessonHit[] {
  const q = query.trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return [];
  if(locale){
    const index=localizedIndex(locale);
    const matches=index.map(hit=>({hit,score:hit.title.toLocaleLowerCase().includes(q)?3:hit.category.toLocaleLowerCase().includes(q)?2:hit.snippet.toLocaleLowerCase().includes(q)?1:0})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(r=>r.hit);
    if(matches.length<limit){for(const native of searchLessons(query,limit)){if(matches.some(h=>h.slug===native.slug))continue;const translated=index.find(h=>h.slug===native.slug);if(translated)matches.push(translated);if(matches.length>=limit)break;}}
    return matches;
  }
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
