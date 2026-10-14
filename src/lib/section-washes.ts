import { SECTION_STICKERS } from "@/lib/section-stickers";

/** Each profession has a dedicated AI scene; new sections use the shared scene. */
export function sectionWash(slug: string) {
  if (["violation-report", "electron-queue", "tech-settings"].includes(slug)) {
    return `/art/ai-notion-v6/${slug}.webp`;
  }
  if (SECTION_STICKERS[slug] || slug === "eng-kop-beriladigan-savollarga-qisqa-javoblar") {
    return `/art/ai-color-v4/${slug}.webp`;
  }
  return "/art/dmed-client-color-v4.webp";
}
