
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { catalogViewer } from "@/lib/client-access";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, materials } from "@/db/schema";

import {
  getMaterialBySlugCached,
  getMaterialSourceLinkMapCached,
} from "@/lib/data";
import { LessonContent } from "@/components/lesson-content";
import { SiteHeader } from "@/components/site-header";
import { TopicBackdrop } from "@/components/topic-backdrop";
import { TopicIcon } from "@/components/topic-icon";
import { lessonSticker } from "@/lib/lesson-stickers";
import { sectionWash } from "@/lib/section-washes";
import { getLocale } from "@/lib/locale-server";
import { publicCopy } from "@/lib/public-copy";
import { withLang } from "@/lib/locale";
import { localizeCatalogTitle } from "@/lib/catalog-locale";
import {
  localizedFaqBySlug,
  localizedFaqLessonContent,
} from "@/lib/faq-locale";
import { localizeLessonSummary } from "@/lib/lesson-locale";
import { cachedMaterialContent } from "@/lib/material-translation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const material = await getMaterialBySlugCached(slug);
  if (!material) notFound();
  const locale = await getLocale();
  const faq = localizedFaqBySlug(slug, locale);
  return {
    title: faq?.title || localizeCatalogTitle(slug, material.title, locale),
  };
}

function notionKeys(url: string): string[] {
  if (!url) return [];
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "").toLowerCase();
    const keys = new Set<string>();
    const idMatch = path.match(/([0-9a-f]{32})$/i);
    if (idMatch) keys.add(idMatch[1].toLowerCase());
    const leaf = path.split("/").filter(Boolean).pop() || "";
    if (leaf) {
      keys.add(leaf);
      keys.add(leaf.replace(/-[0-9a-f]{32}$/i, ""));
    }
    return [...keys].filter(Boolean);
  } catch {
    return [];
  }
}

export default async function MaterialPage({ params }: PageProps) {
  const { slug } = await params;
  const { session } = await catalogViewer();
  const locale = await getLocale();
  const t = publicCopy(locale);
  const material = await getMaterialBySlugCached(slug);
  if (!material) notFound();

  const [category, allMaterials] = [
    db
      .select()
      .from(categories)
      .where(eq(categories.id, material.categoryId))
      .limit(1)
      .all()[0],
    await getMaterialSourceLinkMapCached(),
  ];

  if (!category) notFound();

  const art = lessonSticker(material.slug, material.title);
  const faq = localizedFaqBySlug(material.slug, locale);
  const title = faq
    ? faq.title
    : localizeCatalogTitle(material.slug, material.title, locale);
  const summary = faq
    ? faq.summary
    : localizeLessonSummary(material.summary, locale);
  const localized = faq ? { content: "", translated: true } : cachedMaterialContent(material, locale) || {content:material.content,translated:false};
  const content = faq
    ? localizedFaqLessonContent(faq, locale)
    : localized.content;
  const categoryTitle = localizeCatalogTitle(
    category.slug,
    category.title,
    locale,
  );

  const linkMap: Record<string, string> = {};
  const linkedContent = `${material.content}\n${content}`.toLowerCase();
  for (const row of allMaterials) {
    for (const key of notionKeys(row.sourceUrl || "")) {
      if (linkedContent.includes(key)) linkMap[key] = row.slug;
    }
  }

  const siblings = db
    .select({
      slug: materials.slug,
      title: materials.title,
      sortOrder: materials.sortOrder,
    })
    .from(materials)
    .where(eq(materials.categoryId, material.categoryId))
    .orderBy(asc(materials.sortOrder), asc(materials.id))
    .all();
  const index = siblings.findIndex((row) => row.slug === material.slug);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  return (
    <>
      <TopicBackdrop wash={sectionWash(category.slug)} mark={art} />
      <SiteHeader username={session?.username} role={session?.role} locale={locale} />
      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-28 sm:px-6 sm:pt-12">
        <article className="page-enter space-y-6" data-lesson-slug={material.slug}>

          <div className="catalog-hero space-y-4 rounded-[1.85rem] p-5 sm:p-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art} alt="" className="catalog-hero-art catalog-hero-art-soft" fetchPriority="high" />
            <Link
              href={withLang(`/b/${category.slug}`, locale)}
              className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-[#3d5a84] transition hover:text-[#071428]"
            >
              <ArrowLeft className="size-4" />
              <UiText>{categoryTitle}</UiText>
            </Link>
            <div className="relative z-10 flex items-start gap-3 pr-24 sm:pr-28">
              <TopicIcon name={material.icon} size="lg" image={art} />
              <div className="space-y-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#071a38] sm:text-4xl">
                  <UiText>{title}</UiText>
                </h1>
                {summary ? (
                  <p className="font-medium text-[#2d4a73]"><UiText>{summary}</UiText></p>
                ) : null}
                {t.contentNote && !faq ? (
                  <p className="text-sm font-medium text-[#4a6288]">{t.contentNote}</p>
                ) : null}
              </div>
            </div>
            {material.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={material.imageUrl}
                alt={title}
                className="mt-4 max-h-[28rem] w-full rounded-xl bg-[#f4f8ff] object-contain"
              />
            ) : null}
          </div>

          <LessonContent
            needsTranslation={!localized.translated}
            tools={{slug:material.slug,title,locale,signedIn:Boolean(session),
              prev:prev?{slug:prev.slug,title:localizeCatalogTitle(prev.slug,prev.title,locale)}:null,
              next:next?{slug:next.slug,title:localizeCatalogTitle(next.slug,next.title,locale)}:null}}
            body={{title,content,linkMap,locale,localized:localized.translated}}
          />
          {t.screenNote ? (
            <p className="text-center text-xs font-medium text-[#4a6288]"><UiText>{t.screenNote}</UiText></p>
          ) : null}
        </article>
      </main>
    </>
  );
}
