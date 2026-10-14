import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clientVisits, users } from "@/db/schema";
import { parseClientDevice, viaLabel } from "@/lib/client-device";
import {
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
  lookupIpPlace,
} from "@/lib/geo-ip";

export const LIVE_MS = 3 * 60 * 1000;

export type ClientVisitRow = typeof clientVisits.$inferSelect;

export function formatStay(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} soat ${m} daq`;
  if (m > 0) return `${m} daq ${s} son`;
  return `${s} soniya`;
}

function stamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function visitDurationMs(row: ClientVisitRow, now = Date.now()) {
  const start = new Date(row.startedAt).getTime();
  const endRaw = row.endedAt || row.lastSeenAt || row.startedAt;
  const end = new Date(endRaw).getTime();
  const last = Number.isFinite(end) ? end : now;
  const from = Number.isFinite(start) ? start : last;
  return Math.max(0, last - from);
}

export function isVisitLive(row: ClientVisitRow, now = Date.now()) {
  if (row.endedAt) return false;
  const seen = new Date(row.lastSeenAt).getTime();
  return Number.isFinite(seen) && now - seen < LIVE_MS;
}

export async function startClientVisit(input: {
  userId: number;
  username: string;
  ip: string;
  userAgent: string;
  page?: string;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const ua = String(input.userAgent || "").slice(0, 400);
  const parsed = parseClientDevice(ua);
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1)
    .all()[0];
  const ip = String(input.ip || "").slice(0, 45);
  const geo = await lookupIpPlace(ip);

  db.insert(clientVisits)
    .values({
      id,
      userId: input.userId,
      username: input.username,
      fullName: user?.fullName || "",
      ip,
      userAgent: ua,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
      page: String(input.page || "").slice(0, 180),
      startedAt: now,
      lastSeenAt: now,
      endedAt: "",
      country: geo?.country || "",
      region: geo?.region || "",
      city: geo?.city || "",
      lat: geo?.lat || "",
      lon: geo?.lon || "",
      address: geo?.address || "",
    })
    .run();

  return id;
}

export async function enrichVisitPlace(row: ClientVisitRow) {
  if (row.lat && row.lon && row.address) return row;
  if (!row.ip) return row;
  const geo = await lookupIpPlace(row.ip);
  if (!geo) return row;
  db.update(clientVisits)
    .set({
      country: geo.country,
      region: geo.region,
      city: geo.city,
      lat: geo.lat,
      lon: geo.lon,
      address: geo.address,
    })
    .where(eq(clientVisits.id, row.id))
    .run();
  return { ...row, ...geo };
}

export function touchClientVisit(id: string, page = "") {
  if (!id) return;
  const row = db
    .select()
    .from(clientVisits)
    .where(eq(clientVisits.id, id))
    .limit(1)
    .all()[0];
  if (!row || row.endedAt) return;
  const now = Date.now();
  const last = new Date(row.lastSeenAt).getTime();
  if (Number.isFinite(last) && now - last < 8000) return;
  db.update(clientVisits)
    .set({
      lastSeenAt: new Date(now).toISOString(),
      page: page ? page.slice(0, 180) : row.page,
    })
    .where(eq(clientVisits.id, id))
    .run();
}

export function endClientVisit(id: string) {
  if (!id) return;
  const now = new Date().toISOString();
  db.update(clientVisits)
    .set({ lastSeenAt: now, endedAt: now })
    .where(eq(clientVisits.id, id))
    .run();
}

export function listClientVisits(limit = 200) {
  return db
    .select()
    .from(clientVisits)
    .orderBy(desc(clientVisits.startedAt))
    .limit(limit)
    .all();
}

export function visitView(row: ClientVisitRow, now = Date.now()) {
  const live = isVisitLive(row, now);
  const parsed = parseClientDevice(row.userAgent || "");
  const mapsUrl = googleMapsSearchUrl(row.lat, row.lon, row.address);
  const mapsEmbed = googleMapsEmbedUrl(row.lat, row.lon, row.address);
  return {
    ...row,
    live,
    model: parsed.model,
    via: viaLabel(parsed),
    stay: formatStay(visitDurationMs(row, now)),
    stayMs: visitDurationMs(row, now),
    startedLabel: stamp(row.startedAt),
    seenLabel: stamp(row.lastSeenAt),
    place: row.address || [row.city, row.region, row.country].filter(Boolean).join(", "),
    coords:
      row.lat && row.lon
        ? `${Number(row.lat).toFixed(6)}, ${Number(row.lon).toFixed(6)}`
        : "",
    mapsUrl,
    mapsEmbed,
  };
}

export function visitDashboard(now = Date.now()) {
  const rows = listClientVisits(800);
  const views = rows.map((row) => visitView(row, now));
  const live = views.filter((row) => row.live);
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const today = views.filter((row) => new Date(row.startedAt).getTime() >= dayAgo);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const week = views.filter((row) => new Date(row.startedAt).getTime() >= weekAgo);

  const ips = new Set(today.map((row) => row.ip).filter(Boolean));
  const devices: Record<string, number> = {};
  const cities: Record<string, number> = {};
  const deviceModels: Record<
    string,
    Array<{ model: string; browser: string; username: string; count: number }>
  > = {};
  for (const row of week) {
    const kind = row.device || "Noma’lum";
    devices[kind] = (devices[kind] || 0) + 1;
    const city = row.city || row.country || "";
    if (city) cities[city] = (cities[city] || 0) + 1;
    const list = deviceModels[kind] || [];
    const key = `${row.model}||${row.browser}||${row.username}`;
    const found = list.find((item) => `${item.model}||${item.browser}||${item.username}` === key);
    if (found) found.count += 1;
    else {
      list.push({
        model: row.model,
        browser: row.browser || parseClientDevice(row.userAgent).browser,
        username: row.username,
        count: 1,
      });
    }
    deviceModels[kind] = list;
  }
  const avgMs =
    week.length > 0
      ? Math.round(week.reduce((sum, row) => sum + row.stayMs, 0) / week.length)
      : 0;
  const longest = [...week].sort((a, b) => b.stayMs - a.stayMs)[0];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const count = week.filter((row) => {
      const at = new Date(row.startedAt);
      const rowKey = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
      return rowKey === key;
    }).length;
    return {
      key,
      label: d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric" }),
      count,
    };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const topDevice = Object.entries(devices).sort((a, b) => b[1] - a[1])[0];
  const topCity = Object.entries(cities).sort((a, b) => b[1] - a[1])[0];
  let insight = "Hali kirishlar yo‘q — mijoz login qilgach shu yerda chiqadi.";
  if (live.length) {
    const from = live.map((row) => row.place || row.ip).filter(Boolean).slice(0, 2).join(", ");
    insight = `Hozir ${live.length} ta mijoz onlayn${from ? `: ${from}` : ""}.`;
  } else if (topCity && week.length) {
    insight = `So‘nggi 7 kunda ko‘proq ${topCity[0]} dan kirishgan (${topCity[1]} marta). O‘rtacha o‘tirish: ${formatStay(avgMs)}.`;
  } else if (topDevice && week.length) {
    insight = `So‘nggi 7 kunda ko‘proq ${topDevice[0].toLowerCase()} orqali kirishgan (${topDevice[1]} marta). O‘rtacha o‘tirish: ${formatStay(avgMs)}.`;
  } else if (today.length) {
    insight = `Bugun ${today.length} ta kirish, ${ips.size} ta turli IP.`;
  }

  return {
    liveCount: live.length,
    todayCount: today.length,
    uniqueIpsToday: ips.size,
    weekCount: week.length,
    avgStay: formatStay(avgMs),
    longestStay: longest ? `${longest.username} · ${longest.stay}` : "—",
    devices,
    deviceModels,
    cities,
    days,
    maxDay,
    insight,
    live,
    recent: views.slice(0, 12),
  };
}
