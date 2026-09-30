import { NextRequest, NextResponse } from "next/server";
import videoMeta from "@/data/notion-videos.json";

type VideoMeta = {
  blockId: string;
  fileId: string;
  filename: string;
};

const META = videoMeta as Record<string, VideoMeta>;
const signedCache = new Map<string, { url: string; exp: number }>();
const CACHE_MS = 8 * 60 * 1000;

export const dynamic = "force-dynamic";

function filenameCandidates(filename: string) {
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    decoded = filename;
  }
  const set = new Set<string>([
    decoded,
    decoded.replace(/ /g, "_"),
    decoded.replace(/_/g, " "),
    filename,
  ]);
  return [...set].filter(Boolean);
}

async function signOnceAttempt(blockId: string, fileId: string, filename: string) {
  const attachment = `attachment:${fileId}:${filename}`;
  const res = await fetch("https://www.notion.so/api/v3/getSignedFileUrls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "notion-client-version": "23.13.0.33",
    },
    body: JSON.stringify({
      urls: [
        {
          url: attachment,
          permissionRecord: { table: "block", id: blockId },
          useS3Url: true,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`sign failed ${res.status}`);
  }
  const data = (await res.json()) as { signedUrls?: string[] };
  const signed = data.signedUrls?.[0];
  if (!signed) throw new Error("empty signed url");
  return signed;
}

async function signOnce(blockId: string, fileId: string, filename: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await signOnceAttempt(blockId, fileId, filename);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError || new Error("sign failed");
}

async function signNotionFile(
  blockId: string,
  fileId: string,
  filename: string,
) {
  const cacheKey = `${blockId}:${fileId}:${filename}`;
  const hit = signedCache.get(cacheKey);
  if (hit && hit.exp > Date.now()) return hit.url;

  const known = META[blockId];
  const fileIds = [
    ...new Set([known?.fileId, fileId].filter(Boolean) as string[]),
  ];
  const uniqueNames = [
    ...new Set([
      ...filenameCandidates(known?.filename || filename),
      ...filenameCandidates(filename),
    ]),
  ];

  let lastError: unknown;
  for (const fid of fileIds) {
    for (const name of uniqueNames) {
      try {
        const signed = await signOnce(blockId, fid, name);
        signedCache.set(cacheKey, { url: signed, exp: Date.now() + CACHE_MS });
        return signed;
      } catch (e) {
        lastError = e;
      }
    }
  }
  throw lastError || new Error("sign failed");
}

async function proxySigned(signed: string, req: NextRequest) {
  const range = req.headers.get("range") || undefined;
  const upstream = await fetch(signed, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: "Video proxy xatosi" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "video/mp4",
  );
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=60");
  const length = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  if (length) headers.set("Content-Length", length);
  if (contentRange) headers.set("Content-Range", contentRange);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function GET(req: NextRequest) {
  const blockId = req.nextUrl.searchParams.get("b");
  const fileId = req.nextUrl.searchParams.get("f");
  const name = req.nextUrl.searchParams.get("n") || "video.mp4";
  const fmt = req.nextUrl.searchParams.get("fmt");
  const proxy = req.nextUrl.searchParams.get("proxy") === "1";

  if (!blockId || !fileId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (
    !/^[0-9a-f-]{36}$/i.test(blockId) ||
    !/^[0-9a-f-]{36}$/i.test(fileId)
  ) {
    return NextResponse.json({ error: "Bad ids" }, { status: 400 });
  }

  try {
    const signed = await signNotionFile(blockId, fileId, name);
    if (fmt === "json") {
      return NextResponse.json(
        { url: signed },
        {
          headers: {
            "Cache-Control": "public, max-age=90, s-maxage=90",
          },
        },
      );
    }
    if (proxy) {
      return proxySigned(signed, req);
    }
    // Keep redirect for non-JS clients; the player uses fmt=json + S3.
    return NextResponse.redirect(signed, 302);
  } catch {
    return NextResponse.json({ error: "Video proxy xatosi" }, { status: 502 });
  }
}
