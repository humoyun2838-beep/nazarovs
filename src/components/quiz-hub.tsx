"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect,useState } from 'react';
import { ArrowRight, ArrowLeft, Search, BookOpen, Check, Sparkles } from 'lucide-react';
import { quizCopy } from '@/lib/quiz-copy';
import { quizStorageKey,quizQuestionCount } from '@/lib/quiz';
import { withLang,type Locale } from '@/lib/locale';
export type QuizSectionCard={slug:string;title:string;image:string;ids:string[]};
export function QuizHub({sections,locale,version}:{sections:QuizSectionCard[];locale:Locale;version:string}) {
 const t=quizCopy(locale);const [search,setSearch]=useState('');const [progress,setProgress]=useState<Record<string,{answered:number;finished:boolean}>>({});
 useEffect(()=>{const next:typeof progress={};for(const s of sections){try{const a=JSON.parse(localStorage.getItem(quizStorageKey(s.slug))||'null');if(a?.version===version&&a.answers&&typeof a.answers==='object'){const answered=s.ids.filter(id=>typeof a.answers[id]==='string').length;next[s.slug]={answered,finished:!!a.finished&&answered===s.ids.length};}}catch{}}setProgress(next);},[sections,version]);
 const filtered=sections.filter(s=>s.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6">
  <Link href={withLang('/nazarov',locale)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800"><ArrowLeft size={16}/>{t.catalog}</Link>
  <header className="relative overflow-hidden rounded-[2rem] border border-white bg-gradient-to-br from-[#102c62] via-[#174a9a] to-[#167f89] px-6 py-9 text-white shadow-xl sm:px-10">
   <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full border-[36px] border-white/10"/>
   <div className="relative max-w-2xl"><p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Sparkles size={14}/>{t.eyebrow}</p>
   <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.title}</h1><p className="mt-3 text-2xl font-semibold">{t.headline}</p><p className="mt-3 max-w-xl text-base leading-7 text-blue-50">{t.lead}</p>
   <dl className="mt-7 flex flex-wrap gap-8">{[[sections.length,t.sections],[quizQuestionCount,t.questions],[4,t.languages]].map(([n,label])=><div key={label}><dt className="text-sm text-blue-100">{label}</dt><dd className="mt-1 text-3xl font-bold">{n}</dd></div>)}</dl></div>
  </header>
  <ol className="my-6 grid gap-3 sm:grid-cols-3">{t.steps.map((step,i)=><li key={step} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/90 p-4 text-sm font-semibold"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">{i+1}</span>{step}</li>)}</ol>
  <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">{t.sections} <span className="text-blue-600">{filtered.length}</span></h2><label className="relative w-full sm:w-80"><Search className="absolute left-4 top-3.5 size-4 text-blue-500"/><span className="sr-only">{t.search}</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search} className="w-full rounded-2xl border border-blue-200 bg-white py-3 pl-11 pr-4 text-sm outline-blue-600"/></label></div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((s,i)=>{const p=progress[s.slug];return <Link key={s.slug} href={withLang(`/test/${s.slug}`,locale)} prefetch={false} className="group flex flex-col rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-blue-600">
   <div className="mb-4 flex items-center justify-between"><Image src={s.image} alt="" width={64} height={64} unoptimized className="size-16 rounded-2xl object-cover"/><span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{String(i+1).padStart(2,'0')}</span></div>
   <h3 className="min-h-12 text-lg font-bold leading-6">{s.title}</h3><p className="my-3 flex items-center gap-2 text-xs font-semibold text-slate-500"><BookOpen size={14}/>{t.perSection}</p>
   <div className="mt-auto"><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{width:`${Math.round((p?.answered||0)/s.ids.length*100)}%`}}/></div>
   <div className="flex items-center justify-between gap-2 text-sm font-bold text-blue-700"><span>{p?.finished?t.result:p?.answered?t.resume:t.start}</span>{p?.finished?<Check size={18}/>:<ArrowRight size={18}/>}</div>{p?.answered?<p className="mt-2 text-xs text-slate-500">{p.answered}/{s.ids.length} {t.answered}</p>:null}</div>
  </Link>})}</div>{!filtered.length?<p className="rounded-2xl bg-white p-8 text-center">{t.empty}</p>:null}
  <p className="mt-6 text-sm leading-6 text-slate-600">{t.note}</p>
 </main>
}
