import { OfflineLibrary } from "@/components/offline-library";

import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { catalogViewer } from "@/lib/client-access";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import {
  getCategoryBySlugCached,
  getMaterialLinksByCategoryCached,
} from "@/lib/data";
import { getDmedSectionTree, type DmedTreeNode } from "@/lib/dmed-tree";
import { CatalogBrowse } from "@/components/catalog-browse";
import type { NotionListItem } from "@/components/notion-list";
import { SiteHeader } from "@/components/site-header";
import { TopicBackdrop } from "@/components/topic-backdrop";
import { TopicIcon } from "@/components/topic-icon";
import { lessonSticker } from "@/lib/lesson-stickers";
import { sectionSticker } from "@/lib/section-stickers";
import { sectionWash } from "@/lib/section-washes";
import { FaqBoard } from "@/components/faq-board";
import { FAQ_CATEGORY_ART, isFaqCategory } from "@/lib/faq-dmed";
import { getLocale } from "@/lib/locale-server";
import { publicCopy } from "@/lib/public-copy";
import { withLang, type Locale } from "@/lib/locale";
import { localizedFaqGroups } from "@/lib/faq-locale";
import {
  localizeCatalogDescription,
  localizeCatalogTitle,
} from "@/lib/catalog-locale";
import { localizeLessonSummary } from "@/lib/lesson-locale";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlugCached(slug);
  if (!category) notFound();
  const locale = await getLocale();
  return { title: localizeCatalogTitle(category.slug, category.title, locale) };
}

function treeItems(
  nodes: DmedTreeNode[],
  cards: Map<string, { summary: string; icon: string }>,
  fallbackIcon: string,
  innerLessons: (n: number) => string,
  locale: Locale,
): NotionListItem[] {
  return nodes.map((node) => {
    const card = cards.get(node.slug);
    const children = node.children?.length
      ? treeItems(node.children, cards, fallbackIcon, innerLessons, locale)
      : undefined;
    return {
      href: withLang(`/m/${node.slug}`, locale),
      title: localizeCatalogTitle(node.slug, node.title, locale),
      description: children?.length
        ? innerLessons(children.length)
        : localizeLessonSummary(card?.summary || "", locale) || card?.summary,
      icon: card?.icon || fallbackIcon,
      image: lessonSticker(node.slug, node.title),
      children,
    };
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const { session } = await catalogViewer();
  const locale = await getLocale();
  const t = publicCopy(locale);
  const category = await getCategoryBySlugCached(slug);
  if (!category) notFound();

  const faq = isFaqCategory(category.slug);
  const materials = faq
    ? []
    : await getMaterialLinksByCategoryCached(category.id);
  const tree = faq ? undefined : getDmedSectionTree(category.slug);
  const cards = new Map(
    materials.map((material) => [
      material.slug,
      { summary: material.summary, icon: material.icon },
    ]),
  );
  const items = faq
    ? []
    : tree && tree.children.length > 0
      ? treeItems(tree.children, cards, category.icon, t.innerLessons, locale)
      : materials.map((material) => ({
          href: withLang(`/m/${material.slug}`, locale),
          title: localizeCatalogTitle(material.slug, material.title, locale),
          description: localizeLessonSummary(material.summary, locale),
          icon: material.icon,
          image: lessonSticker(material.slug, material.title),
        }));

  const art = faq ? FAQ_CATEGORY_ART : sectionSticker(category.slug);

  return (
    <>
      <TopicBackdrop wash={sectionWash(category.slug)} mark={art} />
      <SiteHeader username={session?.username} role={session?.role} locale={locale} />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <OfflineLibrary />
        <div className="page-enter space-y-6">
          <div className="catalog-hero space-y-4 rounded-[1.85rem] p-5 sm:p-7">
            {art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art} alt="" className="catalog-hero-art" fetchPriority="high" />
            ) : null}
            <Link
              href={withLang("/nazarov", locale)}
              className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-[#3d5a84] transition hover:text-[#071428]"
            >
              <ArrowLeft className="size-4" />
              <UiText>{t.allSections}</UiText>
            </Link>
            <div className="relative z-10 flex items-start gap-3 pr-24 sm:pr-28">
              <TopicIcon
                name={category.icon}
                size="lg"
                image={art || sectionSticker(category.slug)}
              />
              <div className="space-y-1">
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#071a38] sm:text-4xl">
                  <UiText>{localizeCatalogTitle(category.slug, category.title, locale)}</UiText>
                </h1>
                {category.description ? (
                  <p className="font-medium text-[#2d4a73]">
                    <UiText>{localizeCatalogDescription(
                      category.slug,
                      category.description,
                      locale,
                    )}</UiText>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {faq ? (
            <FaqBoard
              groups={localizedFaqGroups(locale)}
              heading={t.faqHeading}
              searchLabel={t.faqSearch}
              empty={t.faqEmpty}
              openLabel={t.faqOpen}
              locale={locale}
            />
          ) : (
            <CatalogBrowse
              heading={t.lessons}
              searchLabel={t.searchLessons}
              empty={t.emptyLessons}
              locale={locale}
              items={items}
            />
          )}
        </div>
      </main>
    </>
  );
}
