#!/usr/bin/env node
/**
 * Visitor IP parser checks — no Next server required.
 */
function stripIp(raw) {
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

function isIpAddress(value) {
  if (!value || value.length > 45) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((part) => {
      const n = Number(part);
      return n >= 0 && n <= 255;
    });
  }
  return /^[0-9a-f:]+$/i.test(value) && value.includes(":");
}

function isPrivateIp(value) {
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

function pushIps(found, raw) {
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

function parseVisitorIp(headerGet, platformIp = "") {
  const found = [];
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

function headers(map) {
  return (name) => map[name] || map[name.toLowerCase()] || null;
}

function eq(got, expected, label) {
  if (got !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
  }
}

eq(parseVisitorIp(headers({})), "", "empty");
eq(parseVisitorIp(headers({ "cf-connecting-ip": "203.0.113.77" })), "203.0.113.77", "cf");
eq(
  parseVisitorIp(headers({ "x-forwarded-for": "10.0.0.8, 198.51.100.88" })),
  "198.51.100.88",
  "xff-public",
);
eq(parseVisitorIp(headers({ "x-real-ip": "198.51.100.24" })), "198.51.100.24", "real");
eq(
  parseVisitorIp(headers({ "x-forwarded-for": "127.0.0.1" })),
  "127.0.0.1",
  "loopback-fallback",
);
eq(
  parseVisitorIp(headers({ forwarded: 'for="203.0.113.91";proto=https' })),
  "203.0.113.91",
  "forwarded",
);
eq(
  parseVisitorIp(headers({ "cf-connecting-ip": "2001:db8:85a3::8a2e:370:7334" })),
  "2001:db8:85a3::8a2e:370:7334",
  "ipv6",
);
eq(
  parseVisitorIp(headers({ "x-forwarded-for": "::ffff:203.0.113.50" })),
  "203.0.113.50",
  "mapped",
);
eq(
  parseVisitorIp(headers({ "x-forwarded-for": "unknown, 203.0.113.9" })),
  "203.0.113.9",
  "unknown",
);
eq(parseVisitorIp(headers({}), "203.0.113.12"), "203.0.113.12", "platform");
eq(
  parseVisitorIp(headers({ "x-forwarded-for": "100.64.1.2, 203.0.113.3" })),
  "203.0.113.3",
  "cgnat",
);

console.log("visitor-ip unit: 11/11 ok");
