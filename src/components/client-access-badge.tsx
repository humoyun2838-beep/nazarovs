"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useState } from "react";
import { formatAccessStamp } from "@/lib/access-time";

function remainLabel(ms: number) {
  if (ms <= 0) return "tugadi";
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${days} kun ${hours} soat ${mins} daq ${secs} son`;
}

export function ClientAccessBadge({ expiresAt }: { expiresAt?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    if (Number.isFinite(end) && Date.now() >= end) {
      window.location.replace("/api/session-expired");
    }
  }, [expiresAt, now]);

  if (!expiresAt) {
    return (
      <span className="max-w-[18rem] text-right text-[11px] font-medium leading-snug text-[#4a6288] sm:max-w-none"><UiText>{" Muddat belgilanmagan "}</UiText></span>
    );
  }

  const end = new Date(expiresAt).getTime();
  const left = end - now;
  const expired = !Number.isFinite(end) || left <= 0;
  const stamp = formatAccessStamp(expiresAt);

  return (
    <span
      className={
        expired
          ? "max-w-[20rem] text-right text-[11px] font-semibold leading-snug text-[#b42318] sm:max-w-none"
          : left < 60 * 60 * 1000
            ? "max-w-[20rem] text-right text-[11px] font-semibold leading-snug text-[#b45309] sm:max-w-none"
            : "max-w-[20rem] text-right text-[11px] font-medium leading-snug text-[#0b4fa8] sm:max-w-none"
      }
      title={stamp}
    >
      {expired
        ? "Muddat tugadi — kirish yopiq"
        : (
          <>
            <span className="block"><UiText>{stamp}</UiText><UiText>{" gacha"}</UiText></span>
            <span className="block"><UiText>{remainLabel(left)}</UiText></span>
          </>
        )}
    </span>
  );
}
