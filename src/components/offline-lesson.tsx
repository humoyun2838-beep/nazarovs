"use client";
import { useState } from "react";
import { parseContent } from "./material-body";

export function OfflineLesson({title,slug,content,linkMap,locale,coverImage}:{title:string;slug:string;content:string;linkMap:Record<string,string>;locale:string;coverImage?:string}) {
  const [busy,setBusy]=useState(false),[status,setStatus]=useState("");
  async function save() {
    setBusy(true);
    const assetKeys:string[]=[];
    const cacheName=`dmed-lesson-${encodeURIComponent(slug)}-${locale}-${Date.now()}`;
    try {
      if (!navigator.onLine) throw Error("Yuklab olish uchun internetni yoqing.");
      if (!('serviceWorker' in navigator) || !('caches' in window)) throw Error("Bu brauzer oflayn saqlashni qo‘llamaydi.");
      await navigator.serviceWorker.register('/dmed-offline-sw.js',{scope:'/'});
      await navigator.serviceWorker.ready;
      await navigator.storage?.persist?.();
      const blocks=parseContent(coverImage?`IMAGE::${coverImage}\n${content}`:content,linkMap), media=await caches.open('dmed-offline-media-v1');
      const saved=await caches.open(cacheName);
      let count=0;
      for (const block of blocks) {
        if (block.type !== 'video' && block.type !== 'image') continue;
        setStatus(`Rasm va videolar yuklanmoqda: ${++count}… Sahifani yopmang.`);
        const url=new URL(block.src,location.origin);
        if(url.origin!==location.origin) throw Error("Tashqi faylni saqlab bo‘lmadi.");
        if(url.pathname.startsWith('/api/media')) { url.searchParams.set('proxy','1'); url.searchParams.set('download','1'); }
        const key=`/offline-media/${crypto.randomUUID()}`;
        const response=await fetch(url,{signal:AbortSignal.timeout(600000)});
        if(!response.ok || response.status===206) throw Error("Fayl to‘liq yuklanmadi. Qayta urinib ko‘ring.");
        const type=response.headers.get('content-type')||'';
        if(!type.startsWith(block.type==='video'?'video/':'image/')) throw Error("Rasm yoki video manbasi ochilmadi.");
        assetKeys.push(key);
        await saved.put(key,new Response('asset'));
        let bytes=0,last=0;
        const total=Number(response.headers.get('content-length'))||0;
        const stream=response.body?.pipeThrough(new TransformStream({transform(chunk,controller){
          bytes+=chunk.byteLength;
          if(Date.now()-last>500){last=Date.now();setStatus(`Fayl ${count}: ${(bytes/1048576).toFixed(1)} MB${total?` / ${(total/1048576).toFixed(1)} MB`:''}. Sahifani yopmang.`);}
          controller.enqueue(chunk);
        }}));
        if(!stream)throw Error("Fayl bo‘sh.");
        await media.put(key,new Response(stream,{headers:response.headers}));
        if(total && bytes!==total)throw Error("Fayl to‘liq yuklanmadi.");
        block.src=key;
      }
      const index=await caches.open('dmed-offline-index-v1');
      const id=`/offline-record/${encodeURIComponent(slug)}?lang=${locale}`;
      const old=await index.match(id);
      await index.put(id,Response.json({title,slug,locale,blocks,cacheName,savedAt:new Date().toISOString()}));
      if(old)try{const previous=await old.json(); const oldCache=await caches.open(previous.cacheName); for(const key of await oldCache.keys())await media.delete(key);await caches.delete(previous.cacheName);}catch{/* Keep the newly committed lesson when old-file cleanup fails. */}
      setStatus("Tayyor! Dars, rasmlar va videolar internetsiz ochiladi.");
    } catch(error) {
      if('caches' in window){const media=await caches.open('dmed-offline-media-v1');
      for(const key of assetKeys) await media.delete(key);
      await caches.delete(cacheName);}
      setStatus(error instanceof DOMException && error.name==='QuotaExceededError' ? "Telefonda bo‘sh joy yetarli emas." : error instanceof Error ? error.message : "Yuklab olish amalga oshmadi.");
    } finally {setBusy(false);}
  }
  return <aside className="my-4 rounded-2xl border border-blue-200 bg-blue-50 p-4" aria-busy={busy}>
    <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy?'Yuklanmoqda…':'↓ Internetsiz ko‘rish uchun saqlash'}</button>{' '}<a href="/offline.html" className="inline-block p-2 font-semibold text-blue-800">Saqlangan darslar</a>
    <p className="mt-2 text-sm text-blue-900" role="status">{status||'Avval internet bilan to‘liq yuklab oling. Video telefon xotirasida joy egallaydi. Chat uchun internet kerak.'}</p>
  </aside>;
}
