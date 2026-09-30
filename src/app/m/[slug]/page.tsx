import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import {
  getMaterialBySlugCached,
  getMaterialSourceLinkMapCached,
} from "@/lib/data";
import { MaterialBody } from "@/components/material-body";
import { SiteHeader } from "@/components/site-header";
import { TopicIcon } from "@/components/topic-icon";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const material = await getMaterialBySlugCached(slug);
  if (!material) notFound();
  return { title: material.title };
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

  const linkMap: Record<string, string> = {};
  for (const row of allMaterials) {
    for (const key of notionKeys(row.sourceUrl || "")) {
      linkMap[key] = row.slug;
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <article className="page-enter space-y-6">
          <div className="catalog-hero space-y-4 rounded-3xl p-5 sm:p-6">
            <Link
              href={`/b/${category.slug}`}
              className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-[#4a6288] transition hover:text-[#071a38]"
            >
              <ArrowLeft className="size-4" />
              {category.title}
            </Link>
            <div className="relative z-10 flex items-start gap-3">
              <TopicIcon name={material.icon} size="lg" />
              <div className="space-y-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#071a38] sm:text-4xl">
                  {material.title}
                </h1>
                {material.summary ? (
                  <p className="font-medium text-[#2d4a73]">{material.summary}</p>
                ) : null}
              </div>
            </div>
            {material.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={material.imageUrl}
                alt={material.title}
                className="mt-4 max-h-[28rem] w-full rounded-xl bg-[#f4f8ff] object-contain"
              />
            ) : null}
          </div>

          <MaterialBody
            title={material.title}
            content={material.content}
            linkMap={linkMap}
          />
        </article>
      </main>
    </>
  );
}
