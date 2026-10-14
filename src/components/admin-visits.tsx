
import { UiText } from "@/components/ui-locale";
import { visitDashboard, visitView, listClientVisits, enrichVisitPlace } from "@/lib/client-visits";
import type { Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";
import { VisitMap } from "@/components/visit-map";
import { DeviceBreakdown } from "@/components/device-breakdown";

function SessionFacts({
  row,
}: {
  row: ReturnType<typeof visitView>;
}) {
  return (
    <div className="mt-2 grid gap-1 text-sm text-[#12315f]">
      <p>
        <span className="font-medium"><UiText>{"O‘tirdi:"}</UiText></span><UiText>{" "}</UiText>
        <span className="font-semibold text-[#0b4fa8]"><UiText>{row.stay}</UiText></span>
        <UiText>{row.endedAt ? " (chiqdi)" : row.live ? " (hozir ham saytda)" : ""}</UiText>
      </p>
      <p>
        <span className="font-medium"><UiText>{"Nima orqali:"}</UiText></span> <UiText>{row.via}</UiText>
      </p>
      <VisitMap
        embed={row.mapsEmbed}
        href={row.mapsUrl}
        label={row.place}
        coords={row.coords}
      />
    </div>
  );
}

export async function AdminDashboardBoard() {
  const raw = listClientVisits(800);
  await Promise.all(
    raw
      .filter((row) => !(row.lat && row.lon))
      .slice(0, 20)
      .map((row) => enrichVisitPlace(row).catch(() => row)),
  );
  const board = visitDashboard();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#1a6fd4]/20 bg-gradient-to-br from-[#eef6ff] via-white to-[#f7fbff] p-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#1a6fd4] uppercase"><UiText>{" Tahlil "}</UiText></p>
        <p className="mt-2 text-sm leading-relaxed text-[#1c3358]"><UiText>{board.insight}</UiText></p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Hozir onlayn", v: String(board.liveCount), tint: "text-[#1a6fd4]" },
          { k: "Bugun kirish", v: String(board.todayCount), tint: "text-[#071a38]" },
          { k: "Bugun IP", v: String(board.uniqueIpsToday), tint: "text-[#071a38]" },
          { k: "O‘rtacha o‘tirish", v: board.avgStay, tint: "text-[#0b4fa8]" },
        ].map((card) => (
          <div key={card.k} className="catalog-panel rounded-2xl px-4 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-[#4a6288] uppercase">
              <UiText>{card.k}</UiText>
            </p>
            <p className={`mt-1 font-heading text-2xl font-semibold ${card.tint}`}>
              <UiText>{card.v}</UiText>
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="catalog-panel rounded-2xl p-4">
          <h3 className="font-heading text-lg font-semibold text-[#071a38]"><UiText>{" 7 kunlik kirishlar "}</UiText></h3>
          <div className="mt-4 flex h-36 items-end gap-2">
            {board.days.map((day) => (
              <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-[#1a6fd4]/80"
                  style={{
                    height: `${Math.max(8, Math.round((day.count / board.maxDay) * 100))}%`,
                  }}
                  title={`${day.label}: ${day.count}`}
                />
                <p className="text-[10px] font-medium text-[#4a6288]"><UiText>{day.label}</UiText></p>
                <p className="text-[10px] tabular-nums text-[#071a38]">{day.count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="catalog-panel rounded-2xl p-4">
          <h3 className="font-heading text-lg font-semibold text-[#071a38]"><UiText>{" Nima orqali "}</UiText></h3>
          <p className="mt-1 text-xs text-[#4a6288]"><UiText>{" So‘nggi 7 kun · bosing — model chiqadi "}</UiText></p>
          <DeviceBreakdown devices={board.devices} models={board.deviceModels} />
          <p className="mt-4 text-sm font-medium text-[#0b4fa8]"><UiText>{" Eng uzoq o‘tirish: "}</UiText><UiText>{board.longestStay}</UiText>
          </p>
        </section>
      </div>

      {Object.keys(board.cities).length > 0 ? (
        <section className="catalog-panel rounded-2xl p-4">
          <h3 className="font-heading text-lg font-semibold text-[#071a38]"><UiText>{" Qayerdan kirishgan "}</UiText></h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.entries(board.cities)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <li
                  key={name}
                  className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0b4fa8]"
                >
                  <UiText>{name}</UiText> · {count}
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="font-heading text-lg font-semibold text-[#071a38]"><UiText>{" Hozir saytda "}</UiText></h3>
        {board.live.length === 0 ? (
          <p className="catalog-panel rounded-2xl px-4 py-6 text-center text-sm text-[#4a6288]"><UiText>{" Hozir hech kim onlayn emas. "}</UiText></p>
        ) : (
          <ul className="space-y-2">
            {board.live.map((row) => (
              <li key={row.id} className="catalog-panel rounded-2xl px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#071a38]">
                    {row.fullName || row.username}
                    <span className="ml-2 text-xs font-medium text-[#1a6fd4]"><UiText>{"onlayn"}</UiText></span>
                  </p>
                  <p className="font-mono text-sm text-[#0b4fa8]"><UiText>{row.ip || "IP yo‘q"}</UiText></p>
                </div>
                <SessionFacts row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-heading text-lg font-semibold text-[#071a38]"><UiText>{" So‘nggi kirishlar — vaqt va lokatsiya "}</UiText></h3>
        {board.recent.length === 0 ? (
          <p className="catalog-panel rounded-2xl px-4 py-6 text-center text-sm text-[#4a6288]"><UiText>{" Hali kirish yo‘q. "}</UiText></p>
        ) : (
          <ul className="space-y-2">
            {board.recent.map((row) => (
              <li key={row.id} className="catalog-panel rounded-2xl px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#071a38]">
                    {row.fullName || row.username}
                    {row.live ? (
                      <span className="ml-2 text-xs font-medium text-[#1a6fd4]"><UiText>{"onlayn"}</UiText></span>
                    ) : null}
                  </p>
                  <p className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-sm font-semibold text-[#0b4fa8]">
                    <UiText>{row.stay}</UiText>
                  </p>
                </div>
                <p className="mt-1 font-mono text-xs text-[#4a6288]"><UiText>{row.ip}</UiText></p>
                <SessionFacts row={row} />
                <p className="mt-2 text-xs text-[#7a7166]"><UiText>{" Kirgan: "}</UiText><UiText>{row.startedLabel}</UiText><UiText>{" · Oxirgi faol: "}</UiText><UiText>{row.seenLabel}</UiText>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export async function AdminVisitsList({ locale = "uz" }: { locale?: Locale }) {
  const copy = uiCopy(locale);
  const raw = listClientVisits(250);
  const filled = await Promise.all(
    raw.map((row) =>
      row.lat && row.address ? row : enrichVisitPlace(row).catch(() => row),
    ),
  );
  const rows = filled.map((row) => visitView(row));
  if (rows.length === 0) {
    return (
      <p className="catalog-panel rounded-2xl px-4 py-8 text-center text-sm text-[#4a6288]">
        <UiText>{copy.visitsEmpty}</UiText>
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="catalog-panel space-y-2 rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[#071a38]">
                {row.fullName || row.username}
                {row.live ? (
                  <span className="ml-2 rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                    <UiText>{copy.online}</UiText>
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-[#4a6288]">@{row.username}</p>
            </div>
            <p className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-sm font-semibold text-[#0b4fa8]">
              <UiText>{row.stay}</UiText>
            </p>
          </div>
          <p className="font-mono text-sm font-semibold text-[#0b4fa8]">
            <UiText>{row.ip || "IP aniqlanmadi"}</UiText>
          </p>
          <p className="text-sm text-[#12315f]">
            <span className="font-medium"><UiText>{"Nima orqali:"}</UiText></span> <UiText>{row.via}</UiText>
          </p>
          <p className="text-sm text-[#12315f]">
            <span className="font-medium"><UiText>{"O‘tirdi:"}</UiText></span> <UiText>{row.stay}</UiText>
            <UiText>{row.endedAt ? " (chiqdi)" : row.live ? " (hozir)" : ""}</UiText>
          </p>
          <VisitMap
            embed={row.mapsEmbed}
            href={row.mapsUrl}
            label={row.place}
            coords={row.coords}
          />
          <p className="text-xs text-[#7a7166]"><UiText>{" Kirgan: "}</UiText><UiText>{row.startedLabel}</UiText><UiText>{" · Oxirgi faol: "}</UiText><UiText>{row.seenLabel}</UiText>
            <UiText>{row.page ? ` · ${row.page}` : ""}</UiText>
          </p>
        </li>
      ))}
    </ul>
  );
}
