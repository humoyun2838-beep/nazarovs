"use client";
import { useEffect } from 'react';
import { useUiLocale } from './ui-locale';
export function OfflineLibrary(){
  const locale=useUiLocale();
  const label={uz:'Saqlangan darslar · Internetsiz ko‘rish',ru:'Сохранённые уроки · Просмотр без интернета',en:'Saved lessons · View offline',kaa:'Saqlanǵan sabaqlar · Internetsiz kóriw'}[locale];
  useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/dmed-offline-sw.js',{scope:'/'}).catch(()=>{});},[]);
  return <a href={`/offline.html?lang=${locale}`} className="my-3 inline-flex rounded-xl border border-blue-200 bg-white/90 px-4 py-3 font-semibold text-blue-800">↓ {label}</a>;
}
