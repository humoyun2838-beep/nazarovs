"use client";
import { UiText, useUiLocale } from "@/components/ui-locale";
import { translateUi } from "@/lib/ui-translation";


import { useMemo, useState } from "react";
import { Check, CheckCheck, FolderOpen, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sectionSticker } from "@/lib/section-stickers";

export type InquiryCategory = { id: number; title: string; slug?: string };

export function CloseChatDialog({ open, categories, name, busy, error, onOpenChange, onConfirm }: {
  open: boolean; categories: InquiryCategory[]; name: string; busy: boolean; error?: string;
  onOpenChange: (open: boolean) => void; onConfirm: (categoryId: number) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const locale = useUiLocale();
  const [selected, setSelected] = useState(0);
  const filtered = useMemo(() => categories.filter(row => `${row.title} ${translateUi(row.title, locale)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [categories, query, locale]);
  const category = categories.find(row => row.id === selected);
  return (
    <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
      <DialogContent showCloseButton={!busy} className="max-h-[90dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-100"><CheckCheck className="size-6" /></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><UiText>{"1. Bo‘limni tanlash → 2. Yakunlash"}</UiText></span></div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600"><UiText>{"Suhbatni yakunlash"}</UiText></p>
          <DialogTitle className="text-2xl font-semibold leading-tight"><UiText>{"Mijoz nima masalada murojaat qildi?"}</UiText></DialogTitle>
          <DialogDescription className="leading-relaxed text-slate-500"><span className="font-semibold text-slate-700"><UiText>{name || "Mijoz"}</UiText></span><UiText>{" uchun materiallar katalogidan mos bo‘limni tanlang. Tanlov murojaatlar statistikasida hisobga olinadi."}</UiText></DialogDescription>
        </DialogHeader>
        <p className="text-xs text-slate-500"><UiText>{"Yuborilmagan javob matni mijozga yuborilmaydi."}</UiText></p>
        <div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input autoFocus aria-label="Murojaat bo‘limini qidirish" placeholder="Bo‘lim nomini qidiring…" value={query} onChange={event => setQuery(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10" /></div>
        <p className="text-xs font-medium text-slate-500"><UiText>{"Barcha bo‘limlar: "}</UiText>{categories.length}<UiText>{" · Topildi: "}</UiText>{filtered.length}</p>
        <fieldset disabled={busy} className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          <legend className="sr-only"><UiText>{"Murojaat bo‘limi"}</UiText></legend>
          {filtered.map(row => (
            <label key={row.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected === row.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}>
              <input type="radio" name="inquiry-category" value={row.id} checked={selected === row.id} onChange={() => setSelected(row.id)} className="size-4 accent-blue-600" />
              {row.slug && sectionSticker(row.slug) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sectionSticker(row.slug)} alt="" className="size-10 shrink-0 rounded-xl object-contain" />
              ) : <FolderOpen className={`size-4 shrink-0 ${selected === row.id ? "text-blue-600" : "text-slate-400"}`} />}
              <span className="flex-1 text-sm font-medium"><UiText>{row.title}</UiText></span>
              {selected === row.id ? <Check className="size-4 text-blue-600" /> : null}
            </label>
          ))}
          {!filtered.length ? <p className="py-6 text-center text-sm text-slate-500"><UiText>{categories.length ? "Bo‘lim topilmadi. Qidiruvni o‘zgartiring." : "Materiallar bo‘limlari mavjud emas. Admin panelda bo‘lim qo‘shing."}</UiText></p> : null}
        </fieldset>
        {category ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><UiText>{"Tanlangan bo‘lim: "}</UiText><strong><UiText>{category.title}</UiText></strong></p> : null}
        {error ? <p role="alert" className="text-sm text-red-600"><UiText>{error}</UiText></p> : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)} className="rounded-xl"><UiText>{"Bekor qilish"}</UiText></Button>
          <Button disabled={!category || busy} onClick={() => void onConfirm(selected)} className="rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"><CheckCheck className="size-4" /><UiText>{busy ? "Saqlanmoqda…" : "Saqlash va yakunlash"}</UiText></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
