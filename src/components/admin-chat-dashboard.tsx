"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ChatDay = {
  day: string;
  total: number;
  closed: number;
  rated: number;
  avg: number | null;
};

type ChatStarCounts = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

type ChatStats = {
  from?: string;
  to?: string;
  total: number;
  closed: number;
  open: number;
  rated: number;
  avg: number | null;
  stars?: ChatStarCounts;
  daily?: ChatDay[];
};

const UZ_MONTHS = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

function isoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: isoDay(from), to: isoDay(to) };
}

function formatDay(iso: string) {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const month = UZ_MONTHS[Number(parts[1]) - 1] || parts[1];
  return `${Number(parts[2])} ${month}`;
}

function DailyChart({ days }: { days: ChatDay[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((row) => row.total));
  const width = 640;
  const height = 196;
  const padL = 36;
  const padR = 10;
  const padT = 14;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const n = Math.max(days.length, 1);
  const gap = n > 40 ? 1 : n > 20 ? 2 : 4;
  const barW = Math.max(3, innerW / n - gap);

  function xAt(i: number) {
    return padL + (i + 0.5) * (innerW / n);
  }

  function yAt(value: number) {
    return padT + innerH - (value / max) * innerH;
  }

  const area = days
    .map((row, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(row.total).toFixed(1)}`)
    .join(" ");
  const areaFill = `${area} L ${xAt(n - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  const closedLine = days
    .map((row, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(row.closed).toFixed(1)}`)
    .join(" ");

  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const hover = active != null ? days[active] : null;
  const ticks = [0, Math.round(max / 2), max];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[13.5rem] w-full"
        role="img"
        aria-label="Kunlik murojaatlar grafigi"
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="#d7e6fb"
              strokeDasharray="4 4"
            />
            <text
              x={padL - 6}
              y={yAt(tick) + 4}
              textAnchor="end"
              className="fill-[#1a3a66] text-[10px] font-semibold"
            >
              {tick}
            </text>
          </g>
        ))}
        <path d={areaFill} fill="url(#murojaatFill)" opacity="0.9" />
        <path d={area} fill="none" stroke="#1a6fd4" strokeWidth="2.4" strokeLinejoin="round" />
        <path d={closedLine} fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinejoin="round" />
        {days.map((row, i) => (
          <rect
            key={row.day}
            x={xAt(i) - barW / 2}
            y={yAt(row.total)}
            width={barW}
            height={Math.max(0, padT + innerH - yAt(row.total))}
            rx="2"
            fill={active === i ? "#0b4fa8" : "#1a6fd4"}
            opacity={active === i ? 1 : 0.18}
            onMouseEnter={() => setActive(i)}
          />
        ))}
        {days.map((row, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={`${row.day}-l`}
              x={xAt(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-[#14325c] text-[10px] font-semibold"
            >
              {formatDay(row.day)}
            </text>
          ) : null,
        )}
        <defs>
          <linearGradient id="murojaatFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a6fd4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1a6fd4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
      {hover ? (
        <div className="pointer-events-none absolute top-1 right-1 rounded-xl bg-[#051530] px-3 py-2 text-white shadow-lg">
          <p className="text-xs font-semibold">{formatDay(hover.day)}</p>
          <p className="text-sm font-bold">{hover.total} murojaat</p>
          <p className="text-[11px] text-white/90">
            Yopilgan {hover.closed}
            {hover.rated
              ? ` · O‘rtacha ${hover.avg != null ? hover.avg.toFixed(1) : "—"}/5`
              : " · Baholar yo‘q"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AdminChatDashboard() {
  const initial = useMemo(defaultRange, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const applied = useRef({ from: initial.from, to: initial.to });

  async function load(nextFrom = applied.current.from, nextTo = applied.current.to) {
    applied.current = { from: nextFrom, to: nextTo };
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    try {
      const res = await fetch(`/api/admin/chat?${params.toString()}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as {
        stats?: ChatStats;
        error?: string;
      } | null;
      if (!res.ok || !data?.stats) {
        setError(data?.error || "Statistika yuklanmadi.");
        return;
      }
      setError("");
      setStats(data.stats);
    } catch {
      setError("Statistika yuklanmadi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  function applyFilter(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    void load(from, to);
  }

  const cards = [
    { key: "total", label: "Murojaatlar", value: stats?.total ?? 0, color: "text-[#0b4fa8]" },
    { key: "closed", label: "Yopilgan", value: stats?.closed ?? 0, color: "text-[#0f766e]" },
    { key: "rated", label: "Baholangan", value: stats?.rated ?? 0, color: "text-[#0b4fa8]" },
    {
      key: "avg",
      label: "O‘rtacha baho",
      value:
        stats?.avg == null ? "—" : Number(stats.avg).toFixed(1),
      color: "text-[#b45309]",
    },
  ] as const;

  const stars = stats?.stars || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const starMax = Math.max(1, stars[1], stars[2], stars[3], stars[4], stars[5]);

  const daily = stats?.daily || [];
  const peak = daily.reduce<ChatDay | null>(
    (best, row) => (!best || row.total > best.total ? row : best),
    null,
  );
  const avg = daily.length
    ? Math.round((daily.reduce((sum, row) => sum + row.total, 0) / daily.length) * 10) / 10
    : 0;
  const today = daily.at(-1);
  const yesterday = daily.length > 1 ? daily[daily.length - 2] : null;
  const delta =
    today && yesterday && yesterday.total > 0
      ? Math.round(((today.total - yesterday.total) / yesterday.total) * 100)
      : today && yesterday
        ? today.total > 0
          ? 100
          : 0
        : null;

  return (
    <section
      data-admin-chat="stats"
      className="mb-5 space-y-5 rounded-2xl border border-white/70 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase">
            Dashboard
          </p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#051530]">
            Chat statistikasi
          </h2>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-[#1c3358]">
            Sana oralig‘ida nechta murojaat kelgani, nechtasi yopilgani va
            operatorning 1–5 ballik baholari.
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={applyFilter}
        >
          <div className="space-y-1">
            <Label htmlFor="chat-from" className="text-xs font-semibold text-[#1a3a66]">
              Dan
            </Label>
            <Input
              id="chat-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-[10.5rem] rounded-xl border-[#c5d7f2] bg-[#f4f8ff] text-[#051530]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="chat-to" className="text-xs font-semibold text-[#1a3a66]">
              Gacha
            </Label>
            <Input
              id="chat-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-[10.5rem] rounded-xl border-[#c5d7f2] bg-[#f4f8ff] text-[#051530]"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-10 rounded-full bg-[#1a6fd4] px-4 text-white hover:bg-[#155bb0]"
          >
            Filtrlash
          </Button>
        </form>
      </div>
      {error ? (
        <p className="text-sm font-medium text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.key}
            data-stat={card.key}
            className="rounded-xl bg-[#eef5ff] px-3 py-3"
          >
            <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase">
              {card.label}
            </p>
            <p className={`text-3xl font-semibold tracking-tight ${card.color}`}>
              {loading && !stats ? "…" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div
        data-admin-chat="star-breakdown"
        className="space-y-2 rounded-2xl border border-[#f3e4b8] bg-[#fffbeb] p-3 sm:p-4"
      >
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#b45309] uppercase">
            5 ballik tizim
          </p>
          <h3 className="font-heading text-lg font-semibold text-[#051530]">
            Operator baholari
          </h3>
          <p className="mt-0.5 text-sm font-medium text-[#1c3358]">
            Har bir yulduz — 1 dan 5 gacha. O‘rtacha baho shu taqsimotdan
            hisoblanadi.
          </p>
        </div>
        {loading && !stats ? (
          <p className="py-4 text-center text-sm font-medium text-[#1c3358]">
            Baholar yuklanmoqda…
          </p>
        ) : (stats?.rated ?? 0) === 0 ? (
          <p className="py-4 text-center text-sm font-medium text-[#1c3358]">
            Bu sanalarda hali baho yo‘q.
          </p>
        ) : (
          <div className="space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((n) => (
              <div key={n} className="flex items-center gap-2" data-star={n}>
                <p className="w-10 shrink-0 text-sm font-semibold text-[#b45309]">
                  {n}★
                </p>
                <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#f5b301]"
                    style={{ width: `${(stars[n] / starMax) * 100}%` }}
                  />
                </div>
                <p className="w-8 shrink-0 text-right text-sm font-semibold text-[#051530]">
                  {stars[n]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        data-admin-chat="analytics"
        className="space-y-3 rounded-2xl border border-[#d7e6fb] bg-[#f7fbff] p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase">
              Analitika
            </p>
            <h3 className="font-heading text-xl font-semibold text-[#051530]">
              Kunlik murojaatlar
            </h3>
            <p className="mt-0.5 text-sm font-medium text-[#1c3358]">
              Har bir kunga tushgan savollar — filtrlangan sanalar bo‘yicha.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-semibold tracking-wide text-[#1a3a66] uppercase">
                O‘rtacha / kun
              </p>
              <p className="text-lg font-semibold text-[#051530]">{avg}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-semibold tracking-wide text-[#1a3a66] uppercase">
                Eng ko‘p
              </p>
              <p className="text-lg font-semibold text-[#0b4fa8]">
                {peak ? `${peak.total}` : "0"}
                {peak ? (
                  <span className="ml-1 text-xs font-semibold text-[#1c3358]">
                    {formatDay(peak.day)}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-semibold tracking-wide text-[#1a3a66] uppercase">
                Oxirgi kun
              </p>
              <p className="text-lg font-semibold text-[#051530]">
                {today?.total ?? 0}
                {delta != null ? (
                  <span
                    className={`ml-1 text-xs font-semibold ${
                      delta >= 0 ? "text-[#15803d]" : "text-[#b91c1c]"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta}%
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
        {loading && !daily.length ? (
          <p className="py-8 text-center text-sm font-medium text-[#1c3358]">
            Grafik yuklanmoqda…
          </p>
        ) : daily.every((row) => row.total === 0) ? (
          <p className="py-8 text-center text-sm font-medium text-[#1c3358]">
            Bu sanalarda murojaat yo‘q.
          </p>
        ) : (
          <DailyChart days={daily} />
        )}
        <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#14325c]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#1a6fd4]" />
            Murojaatlar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#0f766e]" />
            Yopilgan
          </span>
        </div>
      </div>
    </section>
  );
}
