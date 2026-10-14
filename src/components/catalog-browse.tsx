"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { NotionLinkList, type NotionListItem } from "@/components/notion-list";
import { Input } from "@/components/ui/input";
import { formatPublicCount, withLang, type Locale } from "@/lib/locale";
import { learnCopy } from "@/lib/learn-copy";

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
  locale = "uz",
}: {
  items: NotionListItem[];
  heading: string;
  empty: string;
  searchLabel: string;
  locale?: Locale;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Array<{ slug: string; title: string; category: string; snippet: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => filterTree(items, q), [items, q]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setHits([]);
      setSearched("");
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data: { hits?: Array<{ slug: string; title: string; category: string; snippet: string }> }) => {
          setHits(Array.isArray(data?.hits) ? data.hits : []);
        })
        .catch(() => setHits([]))
        .finally(() => {
          setSearching(false);
          setSearched(q);
        });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

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
      <div className="catalog-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-[#071428]">
          <UiText>{heading}</UiText>
        </h2>
        <p className="rounded-full bg-[#e7f1ff] px-3 py-1 text-sm font-semibold text-[#083a8a]">
          <UiText>{formatPublicCount(filtered.length, locale)}</UiText>
        </p>
      </div>
      <label className="relative block">
        <span className="sr-only"><UiText>{searchLabel}</UiText></span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#0a5ad4]" />
        <Input
          ref={inputRef}
          value={query}
          data-catalog-search
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchLabel}
          className="catalog-search pl-11 text-[15px]"
        />
      </label>
      {q.length >= 2 ? (
        <div className="catalog-panel space-y-2 rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-[#0b4fa8] uppercase">
            <UiText>{learnCopy(locale).searchLessons}</UiText>
          </p>
          {searching || searched !== q ? null : hits.length === 0 ? (
            <p className="text-sm text-[#163056]"><UiText>{learnCopy(locale).searchEmpty}</UiText></p>
          ) : (
            <ul className="space-y-2">
              {hits.map((hit) => (
                <li key={hit.slug}>
                  <Link href={withLang(`/m/${hit.slug}`, locale)} className="block rounded-xl px-2 py-1 hover:bg-[#f3f8ff]">
                    <span className="block text-base font-semibold text-[#071428]"><UiText>{hit.title}</UiText></span>
                    <span className="block text-sm text-[#163056]"><UiText>{hit.category}</UiText></span>
                    {hit.snippet ? (
                      <span className="block text-sm text-[#163056]"><UiText>{hit.snippet}</UiText></span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <div className="catalog-panel rounded-2xl px-4 py-10 text-center text-sm text-[#4a6288]">
          <UiText>{empty}</UiText>
        </div>
      ) : (
        <NotionLinkList items={filtered} />
      )}
    </section>
  );
}
