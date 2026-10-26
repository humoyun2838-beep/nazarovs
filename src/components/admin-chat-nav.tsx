"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { withLang, type Locale } from "@/lib/locale";

export function AdminChatNav({ locale = "uz" }: { locale?: Locale }) {
  const pathname = usePathname() || "";
  const [unread, setUnread] = useState(0);
  const active = pathname === "/admin/chat" || pathname.startsWith("/admin/chat/");

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let controller: AbortController | null = null;
    async function tick() {
      if (cancelled || inFlight || document.hidden) return;
      inFlight = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10000);
      try {
        const res = await fetch("/api/admin/chat?view=summary", {
          credentials: "same-origin", signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json() as { unread?: number };
        if (!cancelled && typeof data.unread === "number") setUnread(data.unread);
      } catch {
        // Keep the last confirmed count during connection loss.
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 12000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return (
    <Button
      asChild={!active}
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className={active ? "pointer-events-none" : undefined}
    >
      {active ? (
        <span data-admin-nav="chat" className="relative"><UiText>{" Chat "}</UiText>{unread > 0 ? (
            <span
              data-admin-unread={unread}
              className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#1a6fd4] px-1.5 text-[10px] font-semibold tabular-nums text-white"
            >
              {unread}
            </span>
          ) : null}
        </span>
      ) : (
        <Link href={withLang("/admin/chat", locale)} data-admin-nav="chat" className="relative"><UiText>{" Chat "}</UiText>{unread > 0 ? (
            <span
              data-admin-unread={unread}
              className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#1a6fd4] px-1.5 text-[10px] font-semibold tabular-nums text-white"
            >
              {unread}
            </span>
          ) : null}
        </Link>
      )}
    </Button>
  );
}
