import Link from "next/link";
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
import { TopicIcon } from "@/components/topic-icon";
import { sectionSticker } from "@/lib/section-stickers";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlugCached(slug);
  if (!category) notFound();
  return { title: category.title };
}

function treeItems(
  nodes: DmedTreeNode[],
  cards: Map<string, { summary: string; icon: string }>,
  fallbackIcon: string,
): NotionListItem[] {
  return nodes.map((node) => {
    const card = cards.get(node.slug);
    const children = node.children?.length
      ? treeItems(node.children, cards, fallbackIcon)
      : undefined;
    return {
      href: `/m/${node.slug}`,
      title: node.title,
      description: children?.length
        ? `${children.length} ta ichki dars`
        : card?.summary,
      icon: card?.icon || fallbackIcon,
      children,
    };
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlugCached(slug);
  if (!category) notFound();

  const materials = await getMaterialLinksByCategoryCached(category.id);
  const tree = getDmedSectionTree(category.slug);
  const cards = new Map(
    materials.map((material) => [
      material.slug,
      { summary: material.summary, icon: material.icon },
    ]),
  );
  const items =
    tree && tree.children.length > 0
      ? treeItems(tree.children, cards, category.icon)
      : materials.map((material) => ({
          href: `/m/${material.slug}`,
          title: material.title,
          description: material.summary,
          icon: material.icon,
        }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="page-enter space-y-6">
          <div className="catalog-hero space-y-4 rounded-3xl p-5 sm:p-6">
            <Link
              href="/nazarov"
              className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-[#4a6288] transition hover:text-[#071a38]"
            >
              <ArrowLeft className="size-4" />
              Barcha bo‘limlar
            </Link>
            <div className="relative z-10 flex items-start gap-3">
              <TopicIcon
                name={category.icon}
                size="lg"
                image={sectionSticker(category.slug)}
              />
              <div className="space-y-1">
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#071a38] sm:text-4xl">
                  {category.title}
                </h1>
                {category.description ? (
                  <p className="font-medium text-[#2d4a73]">{category.description}</p>
                ) : null}
              </div>
            </div>
          </div>

          <CatalogBrowse
            heading="Materiallar"
            searchLabel="Dars nomini qidirish"
            empty="Bu bo‘limda mos dars topilmadi."
            items={items}
          />
        </div>
      </main>
    </>
  );
}
