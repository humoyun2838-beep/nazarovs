"use client";
import { useEffect } from "react";
export function OperatorPresence() {
  useEffect(() => {
    let lastActivity = Date.now(), busy = false, tracking = false;
    const activity = () => { lastActivity = Date.now(); };
    const pause = () => {
      if (!tracking) return;
      tracking = false;
      navigator.sendBeacon("/api/operator/presence", new Blob([JSON.stringify({ active: false })], { type: "application/json" }));
    };
    const heartbeat = async () => {
      if (document.visibilityState !== "visible" || Date.now() - lastActivity > 300_000) { pause(); return; }
      if (busy) return;
      busy = true;
      try { tracking = true; await fetch("/api/operator/presence", { method: "POST", credentials: "same-origin", cache: "no-store" }); } catch { /* Offline time is not counted. */ }
      finally { busy = false; }
    };
    const visible = () => { if (document.visibilityState === "visible") { activity(); void heartbeat(); } else pause(); };
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"] as const;
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pagehide", pause);
    void heartbeat();
    const timer = window.setInterval(() => { void heartbeat(); }, 15_000);
    return () => { pause(); window.removeEventListener("pagehide", pause); window.clearInterval(timer); events.forEach(event => window.removeEventListener(event, activity)); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return null;
}
