"use client";
import { UiText, useUiLocale } from "@/components/ui-locale";
import { translateUi } from "@/lib/ui-translation";


import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ChartNoAxesCombined, FolderOpen, MessagesSquare, Search } from "lucide-react";
import { sectionSticker } from "@/lib/section-stickers";

export type ModuleStat = { id: number; title: string; slug?: string; conversations: number; messages: number; closed: number };
const COLORS = ["#2563eb", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#64748b"];
const count = (n: number) => n.toLocaleString("uz-UZ");
const percent = (n: number) => n > 0 && n < 0.1 ? "<0.1" : n.toFixed(1);

export function ChatModuleAnalytics({ rows, loading }: { rows: ModuleStat[]; loading: boolean }) {
  const locale = useUiLocale();
  const [metric, setMetric] = useState<"conversations" | "messages">("conversations");
  const [q, setQ] = useState("");
  const totals = rows.reduce((sum, row) => ({ conversations: sum.conversations + row.conversations, messages: sum.messages + row.messages, classified: sum.classified + (row.id ? row.conversations : 0) }), { conversations: 0, messages: 0, classified: 0 });
  const sorted = useMemo(() => [...rows].sort((a, b) => b[metric] - a[metric]), [rows, metric]);
  const shown = sorted.filter(row => `${row.title} ${translateUi(row.title, locale)}`.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  const top = sorted.filter(row => row[metric] > 0).slice(0, 5);
  const other = totals[metric] - top.reduce((n, row) => n + row[metric], 0);
  const slices = [...top.map(row => ({ title: row.title, value: row[metric], color: row.id === 0 ? "#f59e0b" : undefined })), ...(other ? [{ title: "Boshqa bo‘limlar", value: other, color: undefined }] : [])];
  let offset = 0;
  const leader = sorted.find(row => row.id && row[metric]);
  const max = Math.max(1, ...rows.map(row => row[metric]));
  const coverage = totals.conversations ? totals.classified / totals.conversations * 100 : 0;

  function exportCsv() {
    const cell = (value: string | number) => {
      const raw = typeof value === "string" ? translateUi(value, locale) : String(value);
      const safe = typeof value === "string" && /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const data = [["Bo‘lim", "Murojaatlar", "Mijoz xabarlari", "Yakunlangan"], ...sorted.map(row => [row.title, row.conversations, row.messages, row.closed])].map(row => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + data], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "murojaatlar-bolimlar.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <section data-admin-chat="module-analytics" className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600"><UiText>{"Murojaatlar xaritasi"}</UiText></p><h3 className="text-xl font-semibold tracking-tight text-slate-900"><UiText>{"Qaysi modul bo‘yicha murojaat qilishmoqda?"}</UiText></h3><p className="mt-1 text-sm text-slate-500"><UiText>{"Operator suhbat yakunida tanlagan materiallar bo‘limi bo‘yicha."}</UiText></p></div>
        <button type="button" disabled={loading || !totals.conversations} onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ArrowDownToLine className="size-4" /><UiText>{"CSV yuklash"}</UiText></button>
      </div>
      <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
        {[
          { label: "Mijoz xabarlari", value: count(totals.messages), hint: "Mijoz yuborgan barcha xabarlar", icon: MessagesSquare },
          { label: "Eng ko‘p murojaat", value: leader?.title || "Hali ma’lumot yo‘q", hint: leader ? `${count(leader[metric])} ${metric === "messages" ? "xabar" : "murojaat"}` : "Bo‘lim tanlangan suhbatlar kutilmoqda", icon: ArrowUpRight },
          { label: "Bo‘limlar belgilangan", value: `${percent(coverage)}%`, hint: `${count(totals.classified)} / ${count(totals.conversations)} suhbat`, icon: FolderOpen },
        ].map(card => <div key={card.label} className="bg-slate-50/90 p-5"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500"><card.icon className="size-4 text-blue-600" /><UiText>{card.label}</UiText></div><p className="line-clamp-2 text-xl font-semibold leading-snug tracking-tight text-slate-900"><UiText>{loading ? "…" : card.value}</UiText></p><p className="mt-2 text-xs text-slate-500"><UiText>{card.hint}</UiText></p></div>)}
      </div>
      <div className="grid lg:grid-cols-[280px_1fr]">
        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-600"><ChartNoAxesCombined className="size-4 text-blue-600" /><UiText>{"Bo‘limlar ulushi"}</UiText></div>
          <div className="relative mx-auto size-48">
            <svg viewBox="0 0 200 200" className="size-full -rotate-90" role="img" aria-label={`${metric === "messages" ? "Xabarlar" : "Murojaatlar"} bo‘yicha bo‘limlar ulushi`}>
              <circle cx="100" cy="100" r="78" fill="none" stroke="#f1f5f9" strokeWidth="23" />
              {slices.map((slice, i) => { const share = slice.value / (totals[metric] || 1) * 100; const start = offset; offset += share; return <circle key={slice.title} cx="100" cy="100" r="78" pathLength="100" fill="none" stroke={slice.color || COLORS[i % COLORS.length]} strokeWidth="23" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start}><title><UiText>{slice.title}</UiText>: {slice.value} (<UiText>{percent(share)}</UiText>%)</title></circle>; })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold tracking-tight text-slate-900"><UiText>{loading ? "…" : count(totals[metric])}</UiText></span><span className="mt-1 text-xs text-slate-500"><UiText>{metric === "messages" ? "mijoz xabari" : "murojaat"}</UiText></span></div>
          </div>
          <div className="mt-5 space-y-2.5">{slices.map((slice, i) => <div key={slice.title} className="flex items-center gap-2 text-xs"><span className="size-2 shrink-0 rounded-full" style={{ background: slice.color || COLORS[i % COLORS.length] }} /><span className="min-w-0 flex-1 truncate text-slate-600" title={slice.title}><UiText>{slice.title}</UiText></span><span className="font-semibold tabular-nums text-slate-900"><UiText>{percent(slice.value / (totals[metric] || 1) * 100)}</UiText>%</span></div>)}</div>
          {!slices.length ? <p className="mt-3 text-center text-xs text-slate-500"><UiText>{"Tanlangan davrda murojaat yo‘q."}</UiText></p> : null}
        </div>
        <div className="min-w-0 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">{([['conversations', 'Murojaatlar'], ['messages', 'Xabarlar']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={metric === key} onClick={() => setMetric(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${metric === key ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}><UiText>{label}</UiText></button>)}</div>
            <label className="relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-500" /><input aria-label="Statistikada bo‘lim qidirish" value={q} onChange={event => setQ(event.target.value)} placeholder="Bo‘limni qidirish" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500" /></label>
          </div>
          <div className="mb-3 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span><UiText>{"Materiallar bo‘limi"}</UiText></span><span><UiText>{metric === "messages" ? "Xabarlar soni" : "Murojaatlar soni"}</UiText></span></div>
          <div className="max-h-[430px] space-y-4 overflow-y-auto pr-1">
            {shown.map((row, index) => <div key={row.id} data-module-id={row.id} className="group"><div className="mb-2 flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{row.slug && sectionSticker(row.slug) ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={sectionSticker(row.slug)} alt="" className="size-10 shrink-0 rounded-xl object-contain" />
) : <FolderOpen className="size-5 shrink-0 text-slate-400" />}<div className="min-w-0"><p className={`text-sm font-medium ${row.id ? "text-slate-700" : "text-amber-700"}`}><UiText>{row.title}</UiText></p><p className="mt-0.5 text-[11px] text-slate-500"><UiText>{count(row.messages)}</UiText><UiText>{" xabar · "}</UiText><UiText>{count(row.closed)}</UiText><UiText>{" yakunlangan"}</UiText></p></div></div><div className="shrink-0 text-right"><span className="text-sm font-semibold tabular-nums text-slate-900"><UiText>{count(row[metric])}</UiText></span><span className="ml-2 text-[11px] text-slate-500">{totals[metric] ? percent(row[metric] / totals[metric] * 100) : 0}%</span></div></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${row[metric] / max * 100}%`, background: row.id === 0 ? "#f59e0b" : COLORS[index % COLORS.length] }} /></div></div>)}
            {!shown.length ? <p className="py-8 text-center text-sm text-slate-500"><UiText>{"Bo‘lim topilmadi."}</UiText></p> : null}
          </div>
        </div>
      </div>
      <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] leading-relaxed text-slate-500"><UiText>{"Hisob tanlangan sanalarda boshlangan suhbatlar bo‘yicha. Xabarlar soniga faqat mijoz yuborgan xabarlar kiradi. Eski va hali yakunlanmagan suhbatlar «Bo‘lim belgilanmagan» qatorida ko‘rsatiladi."}</UiText></p>
    </section>
  );
}
