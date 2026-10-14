"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitPulse() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (
      pathname === "/kirish" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/operator") ||
      pathname === "/login"
    ) {
      return;
    }

    let cancelled = false;

    function ping() {
      if (cancelled || document.visibilityState === "hidden") return;
      void fetch("/api/visit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page: pathname }),
        keepalive: true,
      })
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as {
            expired?: boolean;
          } | null;
          if (data?.expired && !cancelled) {
            window.location.replace("/api/session-expired");
          }
        })
        .catch(() => {});
    }

    ping();
    const id = window.setInterval(ping, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", ping);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", ping);
    };
  }, [pathname]);

  return null;
}
