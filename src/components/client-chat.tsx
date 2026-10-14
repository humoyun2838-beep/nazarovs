"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Locale } from "@/lib/locale";

const Chat = dynamic(() => import("./dmed-chat").then(module => module.DmedChat), { ssr: false });
const labels = { uz: "DMED bilan yozish", ru: "Написать DMED", en: "Chat with DMED", kaa: "DMED penen jazısıw" };

// Keep the support desk out of admin/operator bundles and out of the initial render.
export function ClientChat({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const hidden = /^\/(admin|operator|chat|kirish)(\/|$)/.test(pathname || "");
  const [ready, setReady] = useState(false);
  const [initialOpen, setInitialOpen] = useState(false);
  useEffect(() => {
    if (hidden) return;
    const timer = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, [hidden]);
  if (hidden) return null;
  if (ready) return <Chat locale={locale} initialOpen={initialOpen} />;
  return <button type="button" aria-label={labels[locale]} onClick={() => { setInitialOpen(true); setReady(true); }}
    className="fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#1a6fd4] text-white shadow-lg">
    <MessageCircle className="size-7" />
  </button>;
}
