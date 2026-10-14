import type { Locale } from "@/lib/locale";
export type TranslationRow = Record<Locale, string>;
export function translationKey(text: string) { return String(text || "").normalize("NFC").replace(/\s+/g, " ").trim(); }
export function protectTranslation(text: string) {
  const saved: string[] = [];
  const protectedText = text.replace(/https?:\/\/[^\s)]+|\/(?:m|b)\/[a-zA-Z0-9_-]+(?:\?[^\s)]+)?|\b\d+(?:[.,]\d+)*\b/g, value => { saved.push(value); return `__KEEP_${saved.length - 1}__`; });
  return { text: protectedText, restore(value: string) {
    for (let i=0;i<saved.length;i++) if (value.split(`__KEEP_${i}__`).length !== 2) throw new Error("translation_link_changed");
    const restored=value.replace(/__KEEP_(\d+)__/g, (_, i: string) => {if(saved[Number(i)]===undefined)throw new Error("translation_link_changed");return saved[Number(i)];});
    const numbers=(s:string)=>JSON.stringify((s.match(/\d+(?:[.,]\d+)*/g)||[]).sort());
    if(numbers(restored)!==numbers(text))throw new Error("translation_numbers_changed");
    return restored;
  } };
}
