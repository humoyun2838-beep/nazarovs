const COUNTRY = "998";
const LOCAL_LEN = 9;

export function uzLocalDigits(raw: string) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith(COUNTRY)) digits = digits.slice(COUNTRY.length);
  return digits.slice(0, LOCAL_LEN);
}

export function formatUzPhoneInput(raw: string) {
  const local = uzLocalDigits(raw);
  return `+${COUNTRY}${local}`;
}

export function isValidUzPhone(raw: string) {
  const value = String(raw || "").trim();
  if (!/^[+\d\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length === LOCAL_LEN ||
    (digits.startsWith(COUNTRY) && digits.length === COUNTRY.length + LOCAL_LEN);
}

export function suggestUsername(name: string, phone: string) {
  const slug = name
    .toLowerCase()
    .replace(/['’ʻʼ`]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10);
  const tail = phone.replace(/\D/g, "").slice(-4);
  return `${slug || "mijoz"}${tail}`;
}

export function formatTelegramUsername(raw: string) {
  const handle = String(raw || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 32);
  return handle ? `@${handle}` : "@";
}

export function isValidTelegramUsername(raw: string) {
  const handle = formatTelegramUsername(raw).replace(/^@/, "");
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(handle);
}
