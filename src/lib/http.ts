import { NextResponse, type NextRequest } from "next/server";
import { parseVisitorIp } from "@/lib/visitor-ip";

function firstHeader(request: NextRequest, name: string) {
  return (request.headers.get(name) || "").split(",")[0].trim();
}

function platformIp(request: NextRequest) {
  return "ip" in request ? String((request as { ip?: string }).ip || "") : "";
}

/** Visitor address for admin chat — prefers public IP from proxy headers. */
export function visitorIp(request: NextRequest) {
  return parseVisitorIp((name) => request.headers.get(name), platformIp(request));
}

/** Copy the connecting IP onto the App Router request when proxies omit XFF. */
export function nextWithClientIp(request: NextRequest) {
  const ip = visitorIp(request);
  if (!ip) return NextResponse.next();
  const headers = new Headers(request.headers);
  if (
    !headers.get("cf-connecting-ip") &&
    !headers.get("true-client-ip") &&
    !headers.get("x-real-ip") &&
    !headers.get("x-forwarded-for")
  ) {
    headers.set("x-real-ip", ip);
  }
  return NextResponse.next({ request: { headers } });
}

function hostnameOnly(host: string) {
  const raw = host.trim().toLowerCase();
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    if (end > 0) return raw.slice(1, end);
  }
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(raw)) {
    return raw.split(":")[0];
  }
  return raw.split(":")[0];
}

function hostIsIpLiteral(host: string) {
  const name = hostnameOnly(host);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name)) return true;
  return name.includes(":");
}

function hostLooksPrivate(host: string) {
  const name = hostnameOnly(host);
  if (
    name === "localhost" ||
    name === "0.0.0.0" ||
    name.startsWith("127.") ||
    name.startsWith("192.168.") ||
    name.startsWith("10.") ||
    name === "::1"
  ) {
    return true;
  }
  const m = name.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

function hostUsesDirectHttp(host: string) {
  return hostLooksPrivate(host) || hostIsIpLiteral(host);
}

function hostFromAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.host;
  } catch {
    return "";
  }
}

function asPath(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const url = new URL(path);
    return `${url.pathname}${url.search}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function configuredPublicHost() {
  return (process.env.PUBLIC_HOST || "nazarov.tunn3l.sh")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

/** Host the visitor is actually using — never 0.0.0.0, never swap tunnel names. */
export function publicHost(request: NextRequest) {
  const candidates = [
    firstHeader(request, "x-forwarded-host"),
    firstHeader(request, "x-original-host"),
    hostFromAbsoluteUrl(firstHeader(request, "origin")),
    hostFromAbsoluteUrl(firstHeader(request, "referer")),
    firstHeader(request, "host"),
  ];
  for (const host of candidates) {
    if (!host) continue;
    if (host.toLowerCase().startsWith("0.0.0.0")) {
      return host.replace(/^0\.0\.0\.0/i, "127.0.0.1");
    }
    if (!hostLooksPrivate(host)) return host;
  }
  // tunn3l connects to Next as http://localhost:3847 (Host=localhost, proto=http).
  // Direct local checks use 127.0.0.1 and must keep the landing page.
  if (hostIsTunnelLocalhost(request)) {
    return configuredPublicHost();
  }
  const host = firstHeader(request, "host") || "127.0.0.1:3847";
  if (host.toLowerCase().startsWith("0.0.0.0")) {
    return host.replace(/^0\.0\.0\.0/i, "127.0.0.1");
  }
  return host;
}

function hostIsTunnelLocalhost(request: NextRequest) {
  const host = (firstHeader(request, "host") || "").toLowerCase().split(":")[0];
  return host === "localhost";
}

export function isPublicClientRequest(request: NextRequest) {
  const host = publicHost(request).toLowerCase();
  if (host.includes("nazarov")) return true;
  if (
    host.endsWith(".loca.lt") ||
    host.endsWith(".tunn3l.sh") ||
    host.endsWith(".trycloudflare.com") ||
    host.endsWith(".lhr.life") ||
    host.endsWith(".localhost.run") ||
    host.endsWith(".serveo.net") ||
    host.includes("serveousercontent.com") ||
    host.endsWith(".pinggy.link") ||
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".ngrok.io")
  ) {
    return true;
  }
  if (hostIsTunnelLocalhost(request)) return true;
  if (hostIsIpLiteral(host)) return true;
  return (
    Boolean(firstHeader(request, "x-forwarded-for")) &&
    firstHeader(request, "x-forwarded-proto") === "https"
  );
}

export function requestOrigin(request: NextRequest) {
  const host = publicHost(request);
  const forwardedProto = firstHeader(request, "x-forwarded-proto");
  const proto = forwardedProto === "https" ? "https" : "http";
  // IP / LAN must keep http unless a proxy already terminated TLS.
  if (hostUsesDirectHttp(host)) return `${proto}://${host}`;
  // Named public hosts (nazarov.uz, tunnels) terminate TLS in front of Next.
  return `https://${host}`;
}

/**
 * Navigate without changing the visitor's hostname.
 * Relative Location is used when Host was rewritten to 127.0.0.1 (tunnels).
 * Middleware must use rewriteTo/sendTo instead of a relative redirect.
 */
export function redirectTo(request: NextRequest, path: string, status = 307) {
  const destPath = asPath(path);
  if (hostUsesDirectHttp(publicHost(request))) {
    return new NextResponse(null, {
      status,
      headers: { Location: destPath },
    });
  }
  return NextResponse.redirect(new URL(destPath, requestOrigin(request)), status);
}

export function rewriteTo(request: NextRequest, path: string) {
  return NextResponse.rewrite(new URL(asPath(path), request.url));
}

/** Same-host navigation: rewrite when the public host is unknown/private. */
export function sendTo(request: NextRequest, path: string, status = 307) {
  if (hostUsesDirectHttp(publicHost(request))) {
    return rewriteTo(request, path);
  }
  return redirectTo(request, path, status);
}

/**
 * Change path on the visitor's real host.
 * Local 127.0.0.1 may 307 to the same origin; tunnels that rewrote Host only rewrite.
 */
export function stayOnHost(request: NextRequest, path: string, status = 307) {
  const host = publicHost(request);
  if (hostUsesDirectHttp(host) && isPublicClientRequest(request)) {
    return rewriteTo(request, path);
  }
  if (hostUsesDirectHttp(host)) {
    return NextResponse.redirect(new URL(asPath(path), request.url), status);
  }
  return redirectTo(request, path, status);
}
