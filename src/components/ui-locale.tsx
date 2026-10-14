"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Locale } from "@/lib/locale";
import { translateUi } from "@/lib/ui-translation";
const UiLocale=createContext<Locale>("uz");
export function useUiLocale() { return useContext(UiLocale); }
export function UiText({children}:{children?:ReactNode}) { const locale=useUiLocale();return typeof children==="string" ? translateUi(children,locale) : children; }
function UiAttributes({locale}:{locale:Locale}) {
  useEffect(()=>{
    const names=["placeholder","title","aria-label","alt"];
    const originals=new WeakMap<Element,Map<string,string>>();
    function apply(root:Element, subtree = true) {
      for(const element of subtree ? [root,...root.querySelectorAll("[placeholder],[title],[aria-label],[alt]")] : [root]) {
        for(const name of names){const value=element.getAttribute(name);if(!value)continue;let map=originals.get(element);if(!map){map=new Map();originals.set(element,map)}const previous=map.get(name);const source=previous&&translateUi(previous,locale)===value?previous:value;map.set(name,source);const out=translateUi(source,locale);if(out!==value)element.setAttribute(name,out);}
      }
    }
    apply(document.body);
    const observer=new MutationObserver(records=>{
      const roots = new Set<Element>();
      for(const record of records){
        if(record.type==="attributes") apply(record.target as Element, false);
        else for(const node of record.addedNodes) if(node instanceof Element) roots.add(node);
      }
      for(const root of roots){
        if(!root.isConnected) continue;
        let parent = root.parentElement;
        while(parent && !roots.has(parent)) parent = parent.parentElement;
        if(!parent) apply(root);
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:names});return()=>observer.disconnect();
  },[locale]);
  return null;
}
export function UiLocaleProvider({locale,children}:{locale:Locale;children:ReactNode}) { return <UiLocale.Provider value={locale}>{children}<UiAttributes locale={locale}/></UiLocale.Provider>; }
