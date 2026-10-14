import ui from "@/data/ui-translations.json";
import catalog from "@/data/catalog-translations.json";
import overrides from "@/data/locale-overrides.json";
import type { Locale } from "@/lib/locale";
import { translationKey, type TranslationRow } from "@/lib/translation-format";
const UI = ui as Record<string,TranslationRow>;
const CATALOG = catalog as Record<string,TranslationRow>;
const OVERRIDES = overrides as Record<string,Partial<TranslationRow>>;
const TARGETS = Object.fromEntries((["uz","ru","en","kaa"] as Locale[]).map(locale=>[locale,new Set([...Object.values(UI),...Object.values(CATALOG)].map(row=>translationKey(row[locale])))])) as Record<Locale,Set<string>>;
export function translateUi(text: string, locale: Locale) {
  const key=translationKey(text);
  if (!OVERRIDES[key]?.[locale] && TARGETS[locale].has(key)) return text;
  const translated=OVERRIDES[key]?.[locale] || (UI[key]||CATALOG[key])?.[locale];
  if (!translated) return text;
  return `${/^\s/.test(text)?" ":""}${translated}${/\s$/.test(text)?" ":""}`;
}
export function translateCatalog(text: string, locale: Locale) { const key=translationKey(text);return OVERRIDES[key]?.[locale] || CATALOG[key]?.[locale]; }
