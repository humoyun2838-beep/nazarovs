
import { UiText } from "@/components/ui-locale";
import { Headset } from "lucide-react";
import { getCategoriesCached } from "@/lib/data";
import { catalogHrefForSection, getDmedTreeSections } from "@/lib/dmed-tree";
import { sectionSticker } from "@/lib/section-stickers";
import { sectionWash } from "@/lib/section-washes";
import { Callout } from "@/components/notion-list";
import { CatalogBrowse } from "@/components/catalog-browse";
import { ContinueLearning } from "@/components/lesson-tools";
import { SiteHeader } from "@/components/site-header";
import { catalogViewer } from "@/lib/client-access";
import { isFaqCategory, FAQ_CATEGORY_ART } from "@/lib/faq-dmed";
import { getLocale } from "@/lib/locale-server";
import { publicCopy } from "@/lib/public-copy";
import { withLang } from "@/lib/locale";
import {
  localizeCatalogDescription,
  localizeCatalogTitle,
} from "@/lib/catalog-locale";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const { session } = await catalogViewer();
  const locale = await getLocale();
  const t = publicCopy(locale);

  const categories = await getCategoriesCached();
  const treeBySlug = new Map(
    getDmedTreeSections().map((section) => [section.slug, section]),
  );

  const items = categories.map((category, index) => {
    const node = treeBySlug.get(category.slug);
    return {
      href: withLang(
        node ? catalogHrefForSection(node) : `/b/${category.slug}`,
        locale,
      ),
      title: localizeCatalogTitle(category.slug, category.title, locale),
      description: localizeCatalogDescription(
        category.slug,
        category.description,
        locale,
      ),
      icon: category.icon,
      cover: sectionWash(category.slug),
      order: index + 1,
      image: isFaqCategory(category.slug)
        ? FAQ_CATEGORY_ART
        : sectionSticker(category.slug),
    };
  });

  return (
    <>
      <SiteHeader username={session?.username} role={session?.role} locale={locale} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-7 pb-28 sm:px-6 sm:pt-10">
        <div className="page-enter space-y-6">
          <header className="catalog-hero relative z-0 rounded-[1.85rem] p-5 sm:p-8">
            <p className="relative z-10 inline-flex rounded-full bg-[#0a5ad4]/10 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-[#0a5ad4] uppercase"><UiText>{" DMED "}</UiText></p>
            <h1 className="relative z-10 mt-3 font-heading text-[clamp(2.2rem,6.5vw,3.25rem)] leading-[1.04] font-semibold tracking-tight text-[#071428]">
              <UiText>{t.materialsTitle}</UiText>
            </h1>
            <p className="relative z-10 mt-3 max-w-xl text-base font-medium leading-relaxed text-[#12315f] sm:text-lg">
              <UiText>{t.materialsLead}</UiText>
            </p>
          </header>

          <ContinueLearning locale={locale} />

          <Callout className="flex gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fb] text-[#1a6fd4]">
              <Headset className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-[#071a38]"><UiText>{t.help}</UiText></p>
              <p><UiText>{t.helpBody}</UiText></p>
            </div>
          </Callout>

          <CatalogBrowse
            heading={t.sections}
            searchLabel={t.searchSections}
            empty={t.emptySections}
            locale={locale}
            items={items}
          />
        </div>
      </main>
    </>
  );
}
