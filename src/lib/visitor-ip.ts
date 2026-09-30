type HeaderGet = (name: string) => string | null | undefined;

function stripIp(raw: string) {
  let value = raw.trim().replace(/^"|"$/g, "");
  if (value.toLowerCase().startsWith("for=")) {
    value = value.slice(4).replace(/^"|"$/g, "");
  }
  if (value.toLowerCase() === "unknown" || value.toLowerCase() === "hidden") {
    return "";
  }
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end > 0) value = value.slice(1, end);
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value)) {
    value = value.replace(/:\d+$/, "");
  }
  if (value.toLowerCase().startsWith("::ffff:")) value = value.slice(7);
  const mapped = value.match(/(?:^|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) value = mapped[1];
  return value.trim();
}

function isIpAddress(value: string) {
  if (!value || value.length > 45) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((part) => {
      const n = Number(part);
      return n >= 0 && n <= 255;
    });
  }
  return /^[0-9a-f:]+$/i.test(value) && value.includes(":");
}

function isPrivateIp(value: string) {
  const ip = value.toLowerCase();
  if (ip === "::1" || ip === "localhost") return true;
  if (
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.")
  ) {
    return true;
  }
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  const cgnat = ip.match(/^100\.(\d+)\./);
  if (cgnat) {
    const n = Number(cgnat[1]);
    if (n >= 64 && n <= 127) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

function pushIps(found: string[], raw: string) {
  for (const part of raw.split(",")) {
    const ip = stripIp(part);
    if (isIpAddress(ip) && !found.includes(ip)) found.push(ip);
  }
}

const IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "cf-pseudo-ipv4",
  "x-real-ip",
  "x-forwarded-for",
  "x-original-forwarded-for",
  "x-client-ip",
  "x-cluster-client-ip",
  "x-vercel-forwarded-for",
  "fly-client-ip",
  "fastly-client-ip",
  "do-connecting-ip",
  "x-appengine-user-ip",
  "x-azure-clientip",
];

/** Visitor address for admin chat — prefers a public IP from proxy headers. */
export function parseVisitorIp(headerGet: HeaderGet, platformIp = "") {
  const found: string[] = [];
  for (const name of IP_HEADERS) {
    pushIps(found, headerGet(name) || "");
  }
  const forwarded = headerGet("forwarded") || "";
  for (const item of forwarded.split(";").join(",").split(",")) {
    if (/for=/i.test(item)) pushIps(found, item);
  }
  if (platformIp) pushIps(found, platformIp);
  const publicIp = found.find((ip) => !isPrivateIp(ip));
  return (publicIp || found[0] || "").slice(0, 45);
}
