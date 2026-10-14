
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { chatInboxSummary } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { withLang, type Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";
import { ArrowUpRight, Star } from "lucide-react";

export function AdminChatCard({ locale = "uz" }: { locale?: Locale }) {
  const copy = uiCopy(locale);
  const summary = chatInboxSummary();
  const latest = summary.latest;
  const stats = summary.stats;
  const modules = stats.modules;
  const leaders = modules.filter((row) => row.id && row.conversations).slice(0, 3);
  const days = (stats.daily || []).slice(-14);
  const peak = Math.max(1, ...days.map((row) => row.total));
  const stars = stats.stars || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const starMax = Math.max(1, stars[1], stars[2], stars[3], stars[4], stars[5]);

  return (
    <section
      id="chat-statistika"
      data-admin-chat="home"
      data-admin-stats="visible"
      className="space-y-4 rounded-[1.6rem] border border-[#d5e4f6] bg-white p-5 shadow-[0_16px_40px_-28px_rgba(11,42,85,0.35)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.22em] text-[#1a6fd4] uppercase"><UiText>{" Chat "}</UiText></p>
          <h2 className="font-heading text-2xl font-semibold text-[#071428]">
            <UiText>{copy.dashTitle}</UiText>
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-[#163056]">
            <UiText>{copy.chatCardLead}</UiText>
          </p>
        </div>
        <Button asChild className="bg-[#1a6fd4] text-white hover:bg-[#155bb0]">
          <Link href={withLang("/admin/chat", locale)}>
            <UiText>{copy.chatCardTitle}</UiText>
            <UiText>{summary.unread > 0 ? ` (${summary.unread})` : ""}</UiText>
          </Link>
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-[#f3f7fd] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase">
            <UiText>{copy.openQuestions}</UiText>
          </p>
          <p className="text-lg font-semibold text-[#1a6fd4]">{summary.unread}</p>
        </div>
        <div className="rounded-xl bg-[#f6f4f1] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase"><UiText>{" Murojaatlar "}</UiText></p>
          <p className="text-lg font-semibold text-[#051530]">{summary.stats?.total ?? summary.total}</p>
        </div>
        <div className="rounded-xl bg-[#f6f4f1] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase"><UiText>{" Yopilgan "}</UiText></p>
          <p className="text-lg font-semibold text-[#051530]">{summary.stats?.closed ?? 0}</p>
        </div>
        <div className="rounded-xl bg-[#f6f4f1] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase"><UiText>{" Baholangan "}</UiText></p>
          <p className="text-lg font-semibold text-[#051530]">{summary.stats?.rated ?? 0}</p>
        </div>
        <div className="rounded-xl bg-[#fffbeb] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase"><UiText>{" O‘rtacha baho "}</UiText></p>
          <p className="text-lg font-semibold text-[#b45309]">
            <UiText>{summary.stats?.avg == null ? "—" : `${Number(summary.stats.avg).toFixed(1)}/5`}</UiText>
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#d5e4f6] bg-[#f7fbff] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-[#071428]"><UiText>{"Baholar va kunlik murojaat"}</UiText></p>
            <p className="mt-1 text-sm text-[#163056]"><UiText>{"Barcha davr bo‘yicha. Batafsil dashboardda sana oralig‘ini tanlang."}</UiText></p>
          </div>
          <Link href={withLang("/admin/chat?view=statistics", locale)} className="inline-flex items-center gap-1 rounded-xl bg-[#0b4fa8] px-3 py-2 text-sm font-semibold text-white">
            <UiText>{copy.dashTitle}</UiText>
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            {([5, 4, 3, 2, 1] as const).map((n) => (
              <div key={n} className="flex items-center gap-2" data-star={n}>
                <span className="inline-flex w-8 items-center gap-0.5 text-sm font-semibold text-[#b45309]">
                  {n}
                  <Star className="size-3 fill-[#f5b301] text-[#f5b301]" />
                </span>
                <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#fff4d6]">
                  <span
                    className="block h-full rounded-full bg-[#f5b301]"
                    style={{ width: `${(stars[n] / starMax) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right text-sm font-semibold text-[#071428]">{stars[n]}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#163056]"><UiText>{"So‘nggi 14 kun"}</UiText></p>
            <div className="mt-3 flex h-24 items-end gap-1">
              {days.length ? days.map((row) => (
                <div key={row.day} className="flex h-full flex-1 items-end" title={`${row.day}: ${row.total}`}>
                  <div
                    className="w-full rounded-t-md bg-[#0b4fa8]"
                    style={{ height: `${Math.max(6, Math.round((row.total / peak) * 100))}%` }}
                  />
                </div>
              )) : <p className="text-sm text-[#163056]"><UiText>{"Bu oralikda murojaat yo‘q."}</UiText></p>}
            </div>
          </div>
        </div>
        {leaders.length ? <div className="mt-4 grid gap-2 sm:grid-cols-3">{leaders.map(row => <div key={row.id} className="min-w-0 rounded-xl border border-[#e6eef8] bg-[#f7fbff] p-3"><p className="truncate text-sm font-medium text-[#163056]"><UiText>{row.title}</UiText></p><p className="mt-1 text-lg font-semibold text-[#071428]"><UiText>{row.conversations.toLocaleString("uz-UZ")}</UiText> <span className="text-sm font-medium text-[#163056]"><UiText>{"murojaat"}</UiText></span></p></div>)}</div> : null}
      </div>
      {latest ? (
        <p className="truncate text-xs text-[#7a7166]"><UiText>{" Oxirgi: "}</UiText>{latest.name} · {latest.lastBody || latest.phone}
        </p>
      ) : (
        <p className="text-xs text-[#7a7166]"><UiText>{" Hali xabar yo‘q. Mijoz katalogdagi DMED tugmasidan yozadi. "}</UiText></p>
      )}
    </section>
  );
}
