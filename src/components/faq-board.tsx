"use client";
import { UiText } from "@/components/ui-locale";


import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FaqGroup, FaqItem } from "@/lib/faq-dmed";
import { formatPublicCount, withLang, type Locale } from "@/lib/locale";

function matches(item: FaqItem, q: string) {
  if (!q) return true;
  const hay = `${item.n} ${item.title} ${item.summary} ${item.answer} ${item.tips.join(" ")}`.toLowerCase();
  return hay.includes(q);
}

export function FaqBoard({
  groups,
  heading = "Savol-javoblar",
  searchLabel = "Savol yoki kalit so‘z: OneID, navbat, dori…",
  empty = "Mos savol topilmadi. Boshqa so‘z bilan qidiring.",
  openLabel = "Alohida sahifada ochish",
  locale = "uz",
}: {
  groups: FaqGroup[];
  heading?: string;
  searchLabel?: string;
  empty?: string;
  openLabel?: string;
  locale?: Locale;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(groups[0]?.items[0]?.slug ?? null);
  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matches(item, q)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, q],
  );

  const total = groups.reduce((n, group) => n + group.items.length, 0);

  return (
    <section className="space-y-5" aria-label={heading}>
      <div className="catalog-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-[#071428]">
          <UiText>{heading}</UiText>
        </h2>
        <p className="rounded-full bg-[#e7f1ff] px-3 py-1 text-sm font-semibold text-[#083a8a]">
          <UiText>{q
            ? `${visible.reduce((n, g) => n + g.items.length, 0)} / ${total}`
            : formatPublicCount(total, locale)}</UiText>
        </p>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#4a7ab8]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchLabel}
          className="catalog-search h-12 rounded-full pl-10 shadow-none"
        />
      </label>

      {visible.length === 0 ? (
        <p className="catalog-panel rounded-[1.4rem] px-4 py-6 text-base font-medium text-[#163056]">
          <UiText>{empty}</UiText>
        </p>
      ) : (
        visible.map((group) => (
          <div key={group.id} className="space-y-2">
            <div className="catalog-panel flex items-center gap-3 rounded-2xl px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={group.sticker}
                alt=""
                width={44}
                height={44}
                className="size-11 rounded-[14px] bg-white object-cover shadow-[0_10px_22px_-14px_rgba(15,40,80,0.5)] ring-1 ring-white/80"
              />
              <div>
                <p className="font-heading text-base font-semibold text-[#071428]">
                  <UiText>{group.title}</UiText>
                </p>
                <p className="text-sm font-medium text-[#163056]"><UiText>{group.hint}</UiText></p>
              </div>
            </div>
            <ul className="catalog-panel divide-y divide-[#e8f0fb] overflow-hidden rounded-[1.6rem]">
              {group.items.map((item) => {
                const expanded = open === item.slug;
                return (
                  <li key={item.slug}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : item.slug)}
                      className="flex w-full items-start gap-3 px-3.5 py-3.5 text-left transition hover:bg-[#f5f9ff] sm:px-4"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.sticker}
                        alt=""
                        width={52}
                        height={52}
                        className="mt-0.5 size-[52px] shrink-0 rounded-[16px] bg-[#eef5ff] object-cover ring-1 ring-white"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 inline-flex rounded-full bg-[#e8f1fb] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#0a5ad4]">
                          <UiText>{String(item.n).padStart(2, "0")}</UiText>
                        </span>
                        <span className="mt-1 block font-semibold tracking-tight text-[#071428]">
                          <UiText>{item.title}</UiText>
                        </span>
                        {!expanded ? (
                          <span className="mt-0.5 block text-sm font-medium text-[#3d5a84]">
                            <UiText>{item.summary}</UiText>
                          </span>
                        ) : null}
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-2 size-5 shrink-0 text-[#0a5ad4] transition",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>
                    {expanded ? (
                      <div className="space-y-3 px-3.5 pb-4 sm:px-4 sm:pl-[4.9rem]">
                        <p className="text-base font-medium leading-relaxed text-[#10243f]">
                          <UiText>{item.answer}</UiText>
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {item.tips.map((tip) => (
                            <li
                              key={tip}
                              className="rounded-xl bg-[#eef5ff] px-3 py-2 text-sm font-medium text-[#0b3a7a]"
                            >
                              <UiText>{tip}</UiText>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href={withLang(`/m/${item.slug}`, locale)}
                          className="inline-flex text-sm font-semibold text-[#0a5ad4] underline-offset-2 hover:underline"
                        >
                          <UiText>{openLabel}</UiText>
                        </Link>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
