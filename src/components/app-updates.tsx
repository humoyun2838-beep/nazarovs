"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { useUiLocale } from "@/components/ui-locale";
import { mediaBlocksUpdate } from "@/lib/app-update-safety";

const COPY = {
  uz: { pending: "Yangi ma’lumotlar bor", wait: "Ishingizni bo‘lmaslik uchun yangilash kutilmoqda. Darsdan chiqqach yoki yozishni tugatgach yangilanadi.", updating: "Avtomatik yangilanmoqda…", done: "Ilova yangilandi" },
  ru: { pending: "Есть обновления", wait: "Ждём, чтобы не прерывать работу. Обновим после выхода из урока или завершения ввода.", updating: "Обновляем автоматически…", done: "Приложение обновлено" },
  en: { pending: "Updates available", wait: "Waiting to avoid interrupting your work. We’ll update after you leave the lesson or finish typing.", updating: "Updating automatically…", done: "App updated" },
  kaa: { pending: "Jańa maǵlıwmatlar bar", wait: "Jumısıńızdı bólmew ushın jańalaw kútilmekte. Sabaqtan shıqqannan yamasa jazıwdı tamamlaǵannan keyin jańalanadı.", updating: "Avtomatik jańalanbaqta…", done: "Qosımsha jańalandı" },
};
const NOTICE_KEY = "dmed:applied-update";

/** WebView and Safari use the same updater; APK replacement is unnecessary. */
export function AppUpdates({ initialVersion }: { initialVersion: string }) {
  const locale = useUiLocale();
  const t = COPY[locale];
  const [status, setStatus] = useState<"idle" | "pending" | "updating" | "done">("idle");

  useEffect(() => {
    let disposed = false;
    let checking = false;
    let pending = false;
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    const dirty = new Set<HTMLInputElement | HTMLTextAreaElement | HTMLElement>();
    let doneTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const stored = sessionStorage.getItem(NOTICE_KEY);
      if (stored) {
        sessionStorage.removeItem(NOTICE_KEY);
        const notice = JSON.parse(stored) as { path: string; scroll: number; at: number };
        if (Date.now() - notice.at < 60000 && notice.path === location.pathname + location.search) {
          setStatus("done");
          requestAnimationFrame(() => window.scrollTo(0, notice.scroll));
          doneTimer = setTimeout(() => setStatus("idle"), 5000);
        }
      }
    } catch { /* Storage can be disabled; updating still works. */ }

    function busy() {
      if (document.visibilityState !== "visible" || !navigator.onLine) return true;
      // Native players can temporarily reset their DOM playback state while
      // backgrounded. Keep lesson pages intact until the viewer navigates away.
      if (window.location.pathname.startsWith("/m/")) return true;
      if (document.querySelector('[data-auto-update-busy="true"], form[aria-busy="true"]')) return true;
      if ([...document.querySelectorAll("video, audio")].some(element => {
        const media = element as HTMLMediaElement;
        return mediaBlocksUpdate(media);
      })) return true;
      for (const element of dirty) {
        if (!element.isConnected) { dirty.delete(element); continue; }
        const value = "value" in element ? String(element.value) : element.textContent;
        if (value?.trim()) return true;
        dirty.delete(element);
      }
      const focused = document.activeElement;
      return focused instanceof HTMLElement && (
        focused.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName)
      );
    }

    function applyWhenSafe() {
      if (!pending || disposed || reloadTimer) return;
      if (busy()) { setStatus("pending"); return; }
      setStatus("updating");
      reloadTimer = setTimeout(() => {
        reloadTimer = undefined;
        if (disposed || busy()) { if (!disposed) setStatus("pending"); return; }
        try {
          sessionStorage.setItem(NOTICE_KEY, JSON.stringify({
            path: location.pathname + location.search, scroll: window.scrollY, at: Date.now(),
          }));
        } catch { /* Optional notice and scroll restoration. */ }
        // A full reload also installs new JS/CSS after a server deployment.
        // Do not use a server-provided URL as a navigation target.
        window.location.reload();
      }, 1500);
    }

    async function check() {
      if (disposed || checking || document.visibilityState !== "visible" || !navigator.onLine) return;
      if (pending) { applyWhenSafe(); return; }
      checking = true;
      try {
        const response = await fetch("/api/app-version", { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!response.ok) return;
        const data = await response.json() as { version?: string };
        if (!disposed && typeof data.version === "string" && data.version !== initialVersion) {
          pending = true;
          applyWhenSafe();
        }
      } catch { /* Offline/server errors must never cause a reload loop. */ }
      finally { checking = false; }
    }

    const onInput = (event: Event) => {
      const element = event.target;
      if (element instanceof HTMLInputElement && /^(checkbox|radio|button|submit|range|color)$/.test(element.type)) return;
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || (element instanceof HTMLElement && element.isContentEditable)) {
        dirty.add(element);
      }
    };
    const interval = setInterval(() => void check(), 15000 + Math.random() * 3000);
    const safety = setInterval(applyWhenSafe, 2000);
    const onWake = () => void check();
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    void check();
    return () => {
      disposed = true;
      clearInterval(interval); clearInterval(safety);
      clearTimeout(reloadTimer); clearTimeout(doneTimer);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [initialVersion]);

  if (status === "idle") return null;
  return (
    <div role="status" aria-live="polite" data-app-update={status}
      className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-[#12315f] shadow-xl backdrop-blur">
      {status === "done" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <RefreshCw className={`mt-0.5 size-5 shrink-0 text-blue-600 ${status === "updating" ? "animate-spin" : ""}`} />}
      <div>
        <p className="text-sm font-semibold">{status === "done" ? t.done : status === "updating" ? t.updating : t.pending}</p>
        {status === "pending" ? <p className="mt-1 text-xs leading-relaxed">{t.wait}</p> : null}
      </div>
    </div>
  );
}
