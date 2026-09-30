"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type RetryResult = {
  ok?: boolean;
  sent?: number;
  connected?: boolean;
  reason?: string;
};

export function TelegramConnect() {
  const [status, setStatus] = useState("CallMeBot’ni ochib Start bosing, keyin shu sahifa o‘zi tekshiradi.");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const holder = document.getElementById("callmebot-login");
    if (holder && !holder.querySelector("script")) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", "CallMeBot_txtbot");
      script.setAttribute("data-size", "large");
      script.setAttribute(
        "data-auth-url",
        "https://api2.callmebot.com/txt/check_authorization.php",
      );
      script.setAttribute("data-request-access", "write");
      holder.appendChild(script);
    }
    let cancelled = false;
    let done = false;
    async function tick() {
      if (done || cancelled) return;
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      const data = (await res.json().catch(() => null)) as RetryResult | null;
      if (cancelled || !data) return;
      if ((Number(data.sent) || 0) > 0) {
        done = true;
        setReady(true);
        setStatus(
          `Telegram ulandi. ${data.sent} ta kutilgan xabar yuborildi.`,
        );
        return;
      }
      setStatus(
        "Hali ulanmagan. @nazarov_07_09 hisobidan CallMeBot’ga Start bosing.",
      );
    }
    tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div id="callmebot-login" className="min-h-12" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-12 rounded-full bg-[#1a6fd4] text-white hover:bg-[#155bb0]">
          <a href="https://t.me/CallMeBot_txtbot" target="_blank" rel="noreferrer">
            1) CallMeBot’ni ochish
          </a>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-full">
          <a
            href="https://api2.callmebot.com/txt/login.php"
            target="_blank"
            rel="noreferrer"
          >
            2) Telegram Login
          </a>
        </Button>
      </div>
      <p
        className={
          ready
            ? "rounded-xl bg-[#ecfdf3] px-3 py-2 text-sm text-[#067647]"
            : "rounded-xl bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]"
        }
        role="status"
      >
        {status}
      </p>
    </div>
  );
}
