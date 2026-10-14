"use client";
import { UiText } from "@/components/ui-locale";


import { useState, type ReactNode } from "react";
import { ChartNoAxesCombined, MessagesSquare } from "lucide-react";

export function AdminChatWorkspace({ inbox, dashboard, initialTab = "inbox" }: { inbox: ReactNode; dashboard: ReactNode; initialTab?: "inbox" | "dashboard" }) {
  const [tab, setTab] = useState(initialTab);
  return <>
    <div role="tablist" aria-label="Chat boshqaruvi" className="mb-6 flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {[["inbox", "Suhbatlar", MessagesSquare], ["dashboard", "Statistika", ChartNoAxesCombined]].map(([key, label, Icon]) => {
        const id = key as "inbox" | "dashboard";
        const Glyph = Icon as typeof MessagesSquare;
        return <button key={id} type="button" role="tab" id={`chat-tab-${id}`} aria-selected={tab === id} aria-controls={`chat-panel-${id}`} onClick={() => setTab(id)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = id === "inbox" ? "dashboard" : "inbox"; setTab(next); document.getElementById(`chat-tab-${next}`)?.focus(); } }} tabIndex={tab === id ? 0 : -1} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${tab === id ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}><Glyph className="size-4" /><UiText>{label as string}</UiText></button>;
      })}
    </div>
    <div role="tabpanel" id="chat-panel-inbox" aria-labelledby="chat-tab-inbox" hidden={tab !== "inbox"}>{inbox}</div>
    {tab === "dashboard" ? <div role="tabpanel" id="chat-panel-dashboard" aria-labelledby="chat-tab-dashboard">{dashboard}</div> : null}
  </>;
}
