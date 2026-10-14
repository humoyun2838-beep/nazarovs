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
    async function tick() {
      const res = await fetch("/api/admin/chat", { credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as {
        unread?: number;
      } | null;
      if (!cancelled && typeof data?.unread === "number") {
        setUnread(data.unread);
      }
    }
    tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
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
