export function parseExpiresAt(value: unknown) {
  if (typeof value !== "string") return { ok: true as const, value: "" };
  const raw = value.trim();
  if (!raw) return { ok: true as const, value: "" };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { ok: false as const };
  return { ok: true as const, value: date.toISOString() };
}

const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatAccessStamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = UZ_MONTHS[date.getMonth()] || "";
  return `${date.getDate()} ${month} ${date.getFullYear()}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export function toLocalInput(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function isExpiredAt(expiresAt: string, now = Date.now()) {
  if (!expiresAt) return false;
  const at = new Date(expiresAt).getTime();
  return Number.isFinite(at) && now >= at;
}
