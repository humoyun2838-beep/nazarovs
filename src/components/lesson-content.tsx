"use client";
import { useEffect,useState,type ComponentProps } from "react";
import { OfflineLesson } from "@/components/offline-lesson";
import { MaterialBody } from "@/components/material-body";
import { LessonTools } from "@/components/lesson-tools";
import type { Locale } from "@/lib/locale";
const copy={uz:["Tarjima tayyorlanmoqda. Video va asl matnni hozir ko‘rishingiz mumkin.","Tarjima vaqtincha ochilmadi. Asl matn ko‘rsatilmoqda.","Qayta urinish"],ru:["Перевод готовится. Видео и оригинал уже доступны.","Перевод временно недоступен. Показан оригинал.","Повторить"],en:["Preparing translation. Video and original text are available now.","Translation is temporarily unavailable. Showing the original.","Retry"],kaa:["Awdarma tayarlanbaqta. Video hám túp nusqa házir ashıq.","Awdarma waqtınsha ashılmadı. Túp nusqa kórsetilmekte.","Qayta urınıw"]};
export function LessonContent({body,tools,needsTranslation}:{body:ComponentProps<typeof MaterialBody>;tools:Omit<ComponentProps<typeof LessonTools>,"steps">;needsTranslation:boolean}){
  const [content,setContent]=useState(body.content),[state,setState]=useState(needsTranslation?"loading":"ready"),[attempt,setAttempt]=useState(0);
  useEffect(()=>{if(!needsTranslation)return;const controller=new AbortController();setState("loading");fetch(`/api/material-translation?${new URLSearchParams({slug:tools.slug,lang:body.locale||"uz"})}`,{signal:controller.signal}).then(async res=>{if(!res.ok)throw Error("translation");const data=await res.json();if(!data.translated||typeof data.content!=="string")throw Error("translation");setContent(data.content);setState("ready");}).catch(()=>{if(!controller.signal.aborted)setState("error");});return()=>controller.abort();},[needsTranslation,tools.slug,body.locale,attempt]);
  const locale=(body.locale||"uz") as Locale;
  const steps=content.split(/\n/).map(line=>line.trim()).filter(line=>/^\d+\.\s+\S/.test(line)).slice(0,8);
  return <><OfflineLesson title={tools.title} slug={tools.slug} content={content} linkMap={body.linkMap || {}} locale={locale}/><LessonTools {...tools} steps={steps}/>{state!=="ready"?<p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{copy[locale][state==="error"?1:0]}{state==="error"?<button className="ml-3 underline" onClick={()=>setAttempt(value=>value+1)}>{copy[locale][2]}</button>:null}</p>:null}<MaterialBody {...body} content={content} localized={state==="ready"||needsTranslation}/></>;
}
