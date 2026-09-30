import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "file.notion.so",
  "prod-files-secure.s3.us-west-2.amazonaws.com",
  "www.notion.so",
  "notion.so",
]);

export const dynamic = "force-dynamic";

function isAllowed(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    ALLOWED_HOSTS.has(host) ||
    host.endsWith(".amazonaws.com") ||
    host.endsWith(".googleusercontent.com") ||
    host.endsWith(".notion.so") ||
    host.endsWith(".notion-static.com")
  );
}

function shouldProxy(target: URL) {
  const host = target.hostname.toLowerCase();
  return (
    host.endsWith(".googleusercontent.com") ||
    target.pathname.startsWith("/image/") ||
    /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(target.pathname)
  );
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Bad url" }, { status: 400 });
  }

  if (!isAllowed(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  if (req.nextUrl.searchParams.get("fmt") === "json") {
    return NextResponse.json(
      { url: target.toString() },
      { headers: { "Cache-Control": "public, max-age=90" } },
    );
  }

  const proxy =
    req.nextUrl.searchParams.get("proxy") === "1" || shouldProxy(target);
  if (proxy) {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.notion.so/",
      },
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Rasm yuklanmadi" },
        { status: 502 },
      );
    }
    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || "image/png",
    );
    headers.set("Cache-Control", "public, max-age=86400");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new NextResponse(upstream.body, { status: 200, headers });
  }

  return NextResponse.redirect(target.toString(), 302);
}
