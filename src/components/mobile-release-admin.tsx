"use client";
import { useState } from "react";
import { ArrowUpCircle, CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import type { MobileRelease } from "@/lib/mobile-release-policy";
import type { Locale } from "@/lib/locale";

export const mobileUpdateTitles = { uz: "Ilova yangilanishlari", ru: "Обновления приложения", en: "App updates", kaa: "Qosımsha jańalanıwları" };
const COPY = {
  uz: ["DMED Mijoz · Android", "Sayt avtomatik yangilanadi. Android kodi uchun tekshirilgan APK nashrini belgilang.", "Oxirgi versiya", "Android versionCode", "Minimal ruxsat etilgan kod", "APK yuklash havolasi", "APK SHA-256", "Hajmi (bayt)", "Nimalar o‘zgardi?", "Barcha eski versiyalar uchun majburiy yangilash", "Tekshirish va nashr qilish", "APK tekshirilmoqda…", "Nashr saqlandi. Ochiq mijoz ilovalari yangilikni tekshiradi.", "Sayt versiyasi", "Yaxlitlik va Android manifesti tekshiriladi. Telefonda imzo ham solishtiriladi.", "HTTPS havola 40 belgili GitHub commitiga bog‘langan bo‘lsin. Minimal koddan past ilovalar yangilanishni o‘rnatishi talab qilinadi."],
  ru: ["DMED Mijoz · Android", "Сайт обновляется автоматически. Для кода Android укажите проверенный выпуск APK.", "Последняя версия", "Android versionCode", "Минимальный допустимый код", "Ссылка на APK", "SHA-256 APK", "Размер (байты)", "Что изменилось?", "Обязательное обновление всех старых версий", "Проверить и опубликовать", "Проверяем APK…", "Выпуск сохранён. Открытые приложения проверят обновления.", "Версия сайта", "Проверяем целостность и Android-манифест. На телефоне также проверяется подпись.", "HTTPS-ссылка должна содержать 40-значный коммит GitHub. Приложения ниже минимального кода требуют обновления."],
  en: ["DMED Mijoz · Android", "The website updates automatically. Publish a verified APK for Android code changes.", "Latest version", "Android versionCode", "Minimum allowed code", "APK download URL", "APK SHA-256", "Size (bytes)", "What changed?", "Require updating all older versions", "Verify and publish", "Verifying APK…", "Release saved. Open client apps will check for updates.", "Website version", "Integrity and Android manifest are verified. The phone also compares signing certificates.", "The HTTPS URL must pin a 40-character GitHub commit. Apps below the minimum code require an update."],
  kaa: ["DMED Mijoz · Android", "Sayt avtomatik jańalanadı. Android kodı ushın tekserilgen APK nashrin belgileń.", "Sońǵı versiya", "Android versionCode", "Minimal ruqsat etilgen kod", "APK júklew siltemesi", "APK SHA-256", "Kólemi (bayt)", "Ne ózgerdi?", "Barlıq eski versiyalar ushın májbúriy jańalaw", "Tekseriw hám járiyalaw", "APK tekserilmekte…", "Nashr saqlandı. Ashıq qosımshalar jańalıqtı tekseredi.", "Sayt versiyası", "Pútinlik hám Android manifesti tekseriledi. Telefonda qol tańba da salıstırıladı.", "HTTPS silteme 40 belgili GitHub commitine baylanıslı bolsın. Minimal kodtan tómengi qosımshalar jańalanıwı kerek."],
};

export function MobileReleaseAdmin({ initial, locale }: { initial: MobileRelease & { web_version: string }; locale: Locale }) {
  const t = COPY[locale];
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  function field(key: keyof MobileRelease, value: string | number | boolean) { setDraft(current => ({ ...current, [key]: value })); setMessage(""); }
  const inputStyle = "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 p-6 text-white shadow-xl sm:p-8">
        <Smartphone className="mb-4 size-10 rounded-2xl bg-white/15 p-2" />
        <p className="text-sm text-blue-100">{t[0]}</p>
        <h1 className="mt-2 text-3xl font-semibold">{mobileUpdateTitles[locale]}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-50">{t[1]}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <span className="rounded-xl bg-white/15 px-3 py-2">{t[2]}: <strong>{saved.latest_version}</strong> · #{saved.version_code}</span>
          <span className="rounded-xl bg-white/15 px-3 py-2">{t[4]}: <strong>#{saved.minimum_version}</strong></span>
        </div>
      </section>
      <form aria-busy={busy} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:p-7" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
        try {
          const response = await fetch("/api/admin/mobile-release", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft), signal: AbortSignal.timeout(45000) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Nashr saqlanmadi.");
          setSaved(data.release); setDraft(data.release); setSuccess(true); setMessage(t[12]);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Tarmoq xatosi. Qayta urinib ko‘ring."); }
        finally { setBusy(false); }
      }}>
        <div className="grid gap-4 sm:grid-cols-3">
          {([['latest_version', t[2], 'text'], ['version_code', t[3], 'number'], ['minimum_version', t[4], 'number']] as const).map(([key,label,type]) => <label key={key} className="block text-sm font-medium">{label}<input className={inputStyle} type={type} required min={type === 'number' ? 1 : undefined} value={draft[key]} onChange={event => field(key, type === 'number' ? Number(event.target.value) : event.target.value)} /></label>)}
        </div>
        <label className="block text-sm font-medium">{t[5]}<input className={`${inputStyle} font-mono text-sm`} type="url" required value={draft.apk_url} onChange={event=>field('apk_url',event.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <label className="block text-sm font-medium">{t[6]}<input className={`${inputStyle} font-mono text-sm`} required pattern="[a-fA-F0-9]{64}" value={draft.sha256} onChange={event=>field('sha256',event.target.value)} /></label>
          <label className="block text-sm font-medium">{t[7]}<input className={inputStyle} type="number" min={1} max={134217728} required value={draft.apk_size} onChange={event=>field('apk_size',Number(event.target.value))} /></label>
        </div>
        <label className="block text-sm font-medium">{t[8]}<textarea className={`${inputStyle} min-h-36`} required maxLength={4000} value={draft.release_notes} onChange={event=>field('release_notes',event.target.value)} /></label>
        <label className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm font-medium text-blue-900 dark:bg-blue-950 dark:text-blue-100"><input className="mt-0.5 size-5" type="checkbox" checked={draft.force_update} onChange={event=>field('force_update',event.target.checked)} />{t[9]}</label>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-300">{t[15]}</p>
        {message ? <p role={success ? "status" : "alert"} className={`rounded-xl p-3 text-sm ${success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{success ? <CheckCircle2 className="mr-2 inline size-4" /> : null}{message}</p> : null}
        <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"><ArrowUpCircle className={`size-5 ${busy ? 'animate-pulse' : ''}`} />{busy ? t[11] : t[10]}</button>
        <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-300"><ShieldCheck className="size-4 shrink-0" />{t[14]}</p>
      </form>
      <p className="break-all rounded-xl bg-slate-100 p-4 font-mono text-xs text-slate-600">{t[13]}: {saved.web_version}</p>
    </div>
  );
}
