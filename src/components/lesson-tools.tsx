"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useState } from "react";
import Link from "next/link";
import { learnCopy } from "@/lib/learn-copy";
import { withLang, type Locale } from "@/lib/locale";

const KEY = "dmed-learn-v1";

type Store = {
  lastSlug: string;
  lastTitle: string;
  items: Record<string, { seen?: boolean; done?: boolean; saved?: boolean }>;
};

function readStore(): Store {
  if (typeof window === "undefined") return { lastSlug: "", lastTitle: "", items: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "") as Store;
    if (!raw || typeof raw !== "object") return { lastSlug: "", lastTitle: "", items: {} };
    return {
      lastSlug: raw.lastSlug || "",
      lastTitle: raw.lastTitle || "",
      items: raw.items || {},
    };
  } catch {
    return { lastSlug: "", lastTitle: "", items: {} };
  }
}

function writeStore(next: Store) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function ContinueLearning({ locale }: { locale: Locale }) {
  const t = learnCopy(locale);
  const [last, setLast] = useState<{ slug: string; title: string } | null>(null);

  useEffect(() => {
    const store = readStore();
    if (store.lastSlug) setLast({ slug: store.lastSlug, title: store.lastTitle || store.lastSlug });
  }, []);

  if (!last) return null;
  return (
    <section className="catalog-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div>
        <p className="text-xs font-semibold tracking-wide text-[#0b4fa8] uppercase"><UiText>{t.continueTitle}</UiText></p>
        <p className="text-base font-semibold text-[#071428]"><UiText>{last.title}</UiText></p>
        <p className="text-sm text-[#163056]"><UiText>{t.continueBody}</UiText></p>
      </div>
      <Link
        href={withLang(`/m/${last.slug}`, locale)}
        className="inline-flex h-11 items-center rounded-full bg-[#0b4fa8] px-4 text-sm font-semibold text-white"
      >
        <UiText>{t.continueTitle}</UiText>
      </Link>
    </section>
  );
}

export function LessonTools({
  slug,
  title,
  locale,
  signedIn,
  prev,
  next,
  steps,
}: {
  slug: string;
  title: string;
  locale: Locale;
  signedIn: boolean;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  steps: string[];
}) {
  const t = learnCopy(locale);
  const [saved, setSaved] = useState(false);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState("");
  const [promptStep, setPromptStep] = useState("");
  const [answer, setAnswer] = useState("");
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    const store = readStore();
    const item = store.items[slug] || {};
    setSaved(Boolean(item.saved));
    setDone(Boolean(item.done));
    store.lastSlug = slug;
    store.lastTitle = title;
    store.items[slug] = { ...item, seen: true };
    writeStore(store);
    if (signedIn) {
      void fetch("/api/learn", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, seen: true }),
      });
    }
    if (steps.length >= 3) {
      const given = steps[0];
      const correct = steps[1];
      const decoys = steps.slice(2, 4);
      setPromptStep(given);
      setAnswer(correct);
      setOptions([correct, ...decoys].sort((a, b) => a.localeCompare(b)));
    }
  }, [slug, title, signedIn, steps]);

  function patch(nextPatch: { done?: boolean; saved?: boolean }) {
    const store = readStore();
    const item = { ...(store.items[slug] || {}), seen: true, ...nextPatch };
    store.items[slug] = item;
    store.lastSlug = slug;
    store.lastTitle = title;
    writeStore(store);
    if (nextPatch.saved != null) setSaved(nextPatch.saved);
    if (nextPatch.done) setDone(true);
    if (signedIn) {
      void fetch("/api/learn", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, ...nextPatch }),
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {prev ? (
          <Link href={withLang(`/m/${prev.slug}`, locale)} className="inline-flex h-11 items-center rounded-full border border-[#c5d7f2] bg-white px-4 text-sm font-semibold text-[#071428]">
            <UiText>{t.prev}</UiText>
          </Link>
        ) : null}
        {next ? (
          <Link href={withLang(`/m/${next.slug}`, locale)} className="inline-flex h-11 items-center rounded-full bg-[#0b4fa8] px-4 text-sm font-semibold text-white">
            <UiText>{t.next}</UiText>
          </Link>
        ) : null}
        <button type="button" onClick={() => patch({ saved: !saved })} className="inline-flex h-11 items-center rounded-full border border-[#c5d7f2] bg-white px-4 text-sm font-semibold text-[#071428]">
          <UiText>{saved ? t.saved : t.save}</UiText>
        </button>
        <button type="button" onClick={() => patch({ done: true })} className="inline-flex h-11 items-center rounded-full border border-[#c5d7f2] bg-white px-4 text-sm font-semibold text-[#071428]">
          <UiText>{done ? t.done : t.markDone}</UiText>
        </button>
      </div>
      {steps.length > 0 ? (
        <nav className="catalog-panel rounded-2xl px-4 py-3" aria-label={t.steps}>
          <p className="text-xs font-semibold tracking-wide text-[#0b4fa8] uppercase"><UiText>{t.steps}</UiText></p>
          <ol className="mt-2 space-y-1 text-sm text-[#163056]">
            {steps.slice(0, 8).map((step) => (
              <li key={step}><UiText>{step}</UiText></li>
            ))}
          </ol>
        </nav>
      ) : null}
      {options.length >= 2 ? (
        <section className="catalog-panel rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-[#0b4fa8] uppercase"><UiText>{t.check}</UiText></p>
          <p className="mt-1 text-sm text-[#163056]">
            <UiText>{t.checkGiven}</UiText>: <UiText>{promptStep}</UiText>
          </p>
          <p className="mt-1 text-base font-semibold text-[#071428]"><UiText>{t.checkAsk}</UiText></p>
          <div className="mt-2 grid gap-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPicked(option)}
                className="rounded-xl border border-[#d5e3f7] bg-white px-3 py-2 text-left text-sm text-[#071428]"
              >
                <UiText>{option}</UiText>
              </button>
            ))}
          </div>
          {picked ? (
            <p className="mt-2 text-sm font-medium text-[#163056]">
              <UiText>{picked === answer ? t.correct : t.wrong}</UiText>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
