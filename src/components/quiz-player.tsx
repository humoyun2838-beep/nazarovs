"use client";
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import { ArrowLeft,ArrowRight,Check,RotateCcw,ShieldCheck,Trophy,X } from 'lucide-react';
import { quizCopy } from '@/lib/quiz-copy';
import { quizScore,quizStorageKey,restoreAttempt,type QuizAttempt,type QuizQuestion } from '@/lib/quiz';
import { withLang,type Locale } from '@/lib/locale';

export function QuizPlayer({slug,title,locale,version,questions}:{slug:string;title:string;locale:Locale;version:string;questions:QuizQuestion[]}) {
 const t=quizCopy(locale);
 const [attempt,setAttempt]=useState<QuizAttempt>({version,answers:{},index:0,finished:false});
 const [ready,setReady]=useState(false);const [storageError,setStorageError]=useState(false);const [errorsOnly,setErrorsOnly]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{try{setAttempt(restoreAttempt(localStorage.getItem(quizStorageKey(slug)),version,questions));}catch{setStorageError(true);}setReady(true);},[slug,version,questions]);
 const score=quizScore(questions,attempt.answers);const current=questions[attempt.index];
 function commit(next:QuizAttempt){setAttempt(next);try{localStorage.setItem(quizStorageKey(slug),JSON.stringify(next));}catch{setStorageError(true);}}
 function focusHeading(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'center',behavior:'instant'});});}
 function go(index:number){commit({...attempt,index});focusHeading();}
 function finish(){if(score.answered!==questions.length)return;commit({...attempt,finished:true});focusHeading();}
 function restart(){commit({version,answers:{},index:0,finished:false});setErrorsOnly(false);focusHeading();}
 return <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6">
  <Link href={withLang('/test',locale)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800"><ArrowLeft size={16}/>{t.back}</Link>
  <div className="mb-6"><p className="text-xs font-bold tracking-wider text-teal-700">{t.eyebrow}</p><h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{title}</h1></div>
  {!ready?<p role="status" className="rounded-3xl bg-white p-8">{t.loading}</p>:attempt.finished?<>
   <section aria-labelledby="quiz-result" className="rounded-[2rem] border border-blue-100 bg-white p-6 text-center shadow-lg sm:p-9">
    <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600"><Trophy size={32}/></span>
    <h2 ref={heading} tabIndex={-1} id="quiz-result" className="text-2xl font-bold outline-none">{t.resultTitle}</h2>
    <div className="mx-auto my-6 flex size-40 items-center justify-center rounded-full p-3" style={{background:`conic-gradient(#0d9488 ${score.percent}%, #e8eef8 0)`}}><div className="flex size-full flex-col items-center justify-center rounded-full bg-white"><strong className="text-4xl text-[#123869]" data-quiz-score>{score.percent}%</strong><span className="mt-1 text-sm text-slate-500">{score.correct} / {score.total}</span></div></div>
    <p className="text-lg font-semibold">{score.percent>=85?t.excellent:score.percent>=60?t.good:t.practice}</p>
    <dl className="my-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-teal-50 p-4 text-teal-900"><dt>{t.correct}</dt><dd className="text-3xl font-bold" data-correct-count>{score.correct}</dd></div><div className="rounded-2xl bg-rose-50 p-4 text-rose-900"><dt>{t.incorrect}</dt><dd className="text-3xl font-bold">{score.total-score.correct}</dd></div></dl>
    <div className="flex flex-wrap justify-center gap-3"><button type="button" onClick={restart} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"><RotateCcw size={17}/>{t.retry}</button><Link href={withLang('/test',locale)} className="rounded-2xl border border-blue-200 px-5 py-3 font-semibold text-blue-800">{t.another}</Link></div>
   </section>
   <section className="mt-7" aria-labelledby="quiz-review"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="quiz-review" className="text-xl font-bold">{t.review}</h2><button aria-pressed={errorsOnly} onClick={()=>setErrorsOnly(!errorsOnly)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${errorsOnly?'border-rose-300 bg-rose-50 text-rose-800':'border-blue-200 bg-white text-blue-800'}`}>{t.errorsOnly}</button></div>
   <ol className="space-y-4">{questions.map((q,index)=>{const correct=attempt.answers[q.id]===q.correct;if(errorsOnly&&correct)return null;return <li key={q.id} className="rounded-3xl border border-blue-100 bg-white p-5" data-review-question={q.id}>
    <p className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${correct?'bg-teal-50 text-teal-800':'bg-rose-50 text-rose-800'}`}>{correct?<Check size={14}/>:<X size={14}/>} {index+1}. {correct?t.correct:t.incorrect}</p>
    <h3 className="font-semibold leading-7">{q.prompt}</h3>
    {!correct?<p className="mt-3 text-sm text-rose-800"><span className="font-semibold">{t.yourAnswer}: </span>{q.choices.find(c=>c.id===attempt.answers[q.id])?.text}</p>:null}
    <p className="mt-2 text-sm text-teal-800"><span className="font-semibold">{t.rightAnswer}: </span>{q.choices.find(c=>c.id===q.correct)?.text}</p>
    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><strong>{t.explanation}: </strong>{q.explanation}</p>
    <Link href={withLang(`/b/${q.source}`,locale)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">{t.study}<ArrowRight size={14}/></Link>
   </li>})}</ol>{errorsOnly&&score.correct===score.total?<p className="rounded-2xl bg-teal-50 p-5 text-teal-800">{t.noErrors}</p>:null}</section>
  </>:<>
   <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-lg sm:p-8" aria-labelledby="quiz-question">
    <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">{t.question} {attempt.index+1} / {questions.length}</span><span className="text-slate-500">{score.answered}/20 {t.answered}</span></div>
    <div role="progressbar" aria-label={t.answered} aria-valuenow={score.answered} aria-valuemin={0} aria-valuemax={20} className="mb-7 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-400 transition-all" style={{width:`${score.answered*5}%`}}/></div>
    <p className="mb-3 text-sm leading-6 text-slate-500">{t.instruction}</p><h2 id="quiz-question" ref={heading} tabIndex={-1} className="mb-6 text-xl font-bold leading-8 outline-none sm:text-2xl">{current.prompt}</h2>
    <fieldset className="space-y-3"><legend className="sr-only">{current.prompt}</legend>{current.choices.map((choice,i)=>{const selected=attempt.answers[current.id]===choice.id;return <label key={choice.id} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${selected?'border-blue-600 bg-blue-50 text-blue-950':'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
     <input className="sr-only" type="radio" name={current.id} value={choice.id} checked={selected} onChange={()=>commit({...attempt,answers:{...attempt.answers,[current.id]:choice.id}})}/>
     <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${selected?'bg-blue-600 text-white':'bg-slate-100 text-slate-500'}`}>{selected?<Check size={17}/>:String.fromCharCode(65+i)}</span><span className="min-w-0 font-medium leading-6">{choice.text}</span>
    </label>})}</fieldset>
    <div className="mt-7 flex items-center justify-between gap-3"><button onClick={()=>go(attempt.index-1)} disabled={attempt.index===0} className="inline-flex min-h-12 items-center gap-1 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-800 disabled:opacity-40"><ArrowLeft size={16}/>{t.previous}</button>
    {attempt.index<questions.length-1?<button onClick={()=>go(attempt.index+1)} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">{t.next}<ArrowRight size={16}/></button>:<button disabled={score.answered!==questions.length} onClick={finish} className="min-h-12 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{t.finish}</button>}</div>
    {attempt.index===questions.length-1&&score.answered!==questions.length?<p role="status" className="mt-3 text-sm text-amber-800">{t.remaining}</p>:null}
   </section>
   <nav aria-label={t.progress} className="mt-5 rounded-3xl border border-blue-100 bg-white p-5"><div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{questions.map((q,i)=><button key={q.id} onClick={()=>go(i)} aria-label={`${t.ariaJump} ${i+1} — ${attempt.answers[q.id]?t.selected:t.unanswered}`} aria-current={attempt.index===i?'step':undefined} className={`flex min-h-11 items-center justify-center rounded-xl border text-sm font-bold ${attempt.index===i?'border-blue-700 bg-blue-700 text-white':attempt.answers[q.id]?'border-teal-200 bg-teal-50 text-teal-800':'border-slate-200 text-slate-500 hover:bg-blue-50'}`}>{i+1}</button>)}</div></nav>
   {score.answered===questions.length&&attempt.index!==questions.length-1?<button onClick={finish} className="mt-4 w-full rounded-2xl bg-teal-700 p-4 font-semibold text-white">{t.finish}</button>:null}
  </>}
  <p role="status" className={`mt-5 flex items-start gap-2 text-xs leading-5 ${storageError?'text-amber-800':'text-slate-500'}`}><ShieldCheck size={16} className="mt-0.5 shrink-0"/>{storageError?t.noStorage:t.saved}</p>
 </main>;
}
