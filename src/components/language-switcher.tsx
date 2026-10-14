"use client";

import { useState } from "react";
import { LOCALES, type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = {
  uz: "O‘Z",
  ru: "РУ",
  en: "EN",
  kaa: "QQ",
};

export function LanguageSwitcher({
  locale,
}: {
  locale: Locale;
}) {
  const [current, setCurrent] = useState(locale);
  const [pending, setPending] = useState(false);

  async function pick(next: Locale) {
    if (next === current || pending) return;
    setPending(true);
    setCurrent(next);
    window.dispatchEvent(new CustomEvent("nazarov-locale", { detail: next }));
    try { await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ locale: next }),
    }); } catch { /* The URL still carries the selected language when preference saving fails. */ }
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div
      data-site-lang="switcher"
      role="group"
      aria-label="Language"
      className="flex items-center rounded-full border border-[#c5d8f5] bg-white/80 p-0.5 text-[11px] font-semibold tracking-wide"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          title={code === "kaa" ? "Qaraqalpaqsha" : LABELS[code]}
          aria-pressed={current === code}
          disabled={pending}
          onClick={() => void pick(code)}
          className={cn(
            "rounded-full px-2 py-1 transition",
            current === code
              ? "bg-[#0b4fa8] text-white"
              : "text-[#3d5a84] hover:bg-[#e8f1fb]",
          )}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
