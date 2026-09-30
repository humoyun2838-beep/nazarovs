"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { NotionLinkList, type NotionListItem } from "@/components/notion-list";
import { Input } from "@/components/ui/input";

function matches(item: NotionListItem, q: string) {
  return (
    item.title.toLowerCase().includes(q) ||
    (item.description || "").toLowerCase().includes(q)
  );
}

function filterTree(items: NotionListItem[], q: string): NotionListItem[] {
  if (!q) return items;
  return items.flatMap((item) => {
    const children = item.children ? filterTree(item.children, q) : [];
    if (matches(item, q)) return [item];
    if (children.length) return [{ ...item, children }];
    return [];
  });
}

export function CatalogBrowse({
  items,
  heading,
  empty,
  searchLabel,
}: {
  items: NotionListItem[];
  heading: string;
  empty: string;
  searchLabel: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => filterTree(items, q), [items, q]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="list-enter space-y-3" aria-label={heading}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-base font-semibold tracking-wide text-[#071a38]">
          {heading}
        </h2>
        <p className="text-sm font-medium text-[#4a6288]">
          {filtered.length} ta
        </p>
      </div>
      <label className="relative block">
        <span className="sr-only">{searchLabel}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#1a6fd4]" />
        <Input
          ref={inputRef}
          value={query}
          data-catalog-search
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchLabel}
          className="h-11 rounded-xl border-[#c5d8f5] bg-white/95 pl-10 text-[15px] shadow-sm"
        />
      </label>
      {filtered.length === 0 ? (
        <div className="catalog-panel rounded-2xl px-4 py-10 text-center text-sm text-[#4a6288]">
          {empty}
        </div>
      ) : (
        <NotionLinkList items={filtered} />
      )}
    </section>
  );
}
