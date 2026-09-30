import { Headset } from "lucide-react";
import { getCategoriesCached } from "@/lib/data";
import { catalogHrefForSection, getDmedTreeSections } from "@/lib/dmed-tree";
import { sectionSticker } from "@/lib/section-stickers";
import { Callout } from "@/components/notion-list";
import { CatalogBrowse } from "@/components/catalog-browse";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const categories = await getCategoriesCached();
  const treeBySlug = new Map(
    getDmedTreeSections().map((section) => [section.slug, section]),
  );

  const items = categories.map((category) => {
    const node = treeBySlug.get(category.slug);
    return {
      href: node ? catalogHrefForSection(node) : `/b/${category.slug}`,
      title: category.title,
      description: category.description,
      icon: category.icon,
      image: sectionSticker(category.slug),
    };
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        <div className="page-enter space-y-6">
          <header className="catalog-hero relative z-0 rounded-3xl p-5 sm:p-7">
            <p className="relative z-10 inline-flex rounded-full bg-[#1a6fd4]/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#0b4fa8] uppercase">
              Humoyun Mirzo
            </p>
            <h1 className="relative z-10 mt-3 font-heading text-[clamp(2.15rem,6.5vw,3.15rem)] leading-[1.05] font-semibold tracking-tight text-[#071a38]">
              O‘quv materiallari
            </h1>
            <p className="relative z-10 mt-2 max-w-xl text-base font-medium leading-relaxed text-[#12315f] sm:text-lg">
              DMED o‘quv materiallari kasb va vazifa bo‘yicha.
            </p>
          </header>

          <Callout className="flex gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fb] text-[#1a6fd4]">
              <Headset className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-[#071a38]">Yordam</p>
              <p>
                <a
                  className="font-medium text-[#0b4fa8] underline underline-offset-2"
                  href="https://t.me/nazarov_07_09"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://t.me/nazarov_07_09
                </a>
              </p>
            </div>
          </Callout>

          <CatalogBrowse
            heading="Bo‘limlar"
            searchLabel="Bo‘lim yoki kasbni qidirish"
            empty="Mos bo‘lim topilmadi. Qidiruvni o‘zgartiring."
            items={items}
          />
        </div>
      </main>
    </>
  );
}
