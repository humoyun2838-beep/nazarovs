"use client";
import { useEffect } from 'react';
export function OfflineLibrary(){
  useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/dmed-offline-sw.js',{scope:'/'}).catch(()=>{});},[]);
  return <a href="/offline.html" className="my-3 inline-flex rounded-xl border border-blue-200 bg-white/90 px-4 py-3 font-semibold text-blue-800">↓ Saqlangan darslar · Internetsiz ko‘rish</a>;
}
