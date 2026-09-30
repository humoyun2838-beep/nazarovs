import tree from "@/data/dmed-tree.json";

export type DmedTreeNode = {
  title: string;
  slug: string;
  children?: DmedTreeNode[];
};

export type DmedTreeSection = {
  title: string;
  slug: string;
  icon: string;
  leaf?: boolean;
  leafSlug?: string;
  children: DmedTreeNode[];
};

const sections = (tree as { sections: DmedTreeSection[] }).sections || [];

export function getDmedTreeSections(): DmedTreeSection[] {
  return sections;
}

export function getDmedSectionTree(slug: string): DmedTreeSection | undefined {
  return sections.find((section) => section.slug === slug);
}

export function catalogHrefForSection(section: {
  slug: string;
  leaf?: boolean;
  leafSlug?: string;
}) {
  if (section.leaf && section.leafSlug) return `/m/${section.leafSlug}`;
  return `/b/${section.slug}`;
}
