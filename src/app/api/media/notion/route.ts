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
const signing = new Map<string,Promise<string>>();
const failures=new Map<string,number>();

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
          // Notion's file CDN serves byte ranges close to the viewer. Direct
          // S3 URLs bypass that edge and were much slower on mobile networks.
          useS3Url: false,
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`sign failed ${res.status}`);
  }
  const data = (await res.json()) as { signedUrls?: string[] };
  const signed = data.signedUrls?.[0];
  if (!signed) throw new Error("empty signed url");
  if (/\.(mp4|mov|webm)$/i.test(filename)) {
    const check=await fetch(signed,{headers:{Range:"bytes=0-0"},cache:"no-store",signal:AbortSignal.timeout(8000)});
    await check.body?.cancel();
    if(check.status!==206&&check.status!==200)throw new Error(`file unavailable ${check.status}`);
  }
  return signed;
}

async function signOnce(blockId: string, fileId: string, filename: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await signOnceAttempt(blockId, fileId, filename);
    } catch (error) {
      if(error instanceof Error&&error.message.startsWith("file unavailable"))throw error;
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
        const signed = await signOnce(known?.blockId || blockId, fid, name);
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
  const image = !range && /\.(png|jpe?g|webp|gif|svg)$/i.test(req.nextUrl.searchParams.get("n") || "");
  const upstream = await fetch(signed, {
    headers: range ? { Range: range } : undefined,
    cache: image ? "force-cache" : "no-store",
    ...(image ? { next: { revalidate: 86400 } } : {}),
    signal: AbortSignal.timeout(req.nextUrl.searchParams.get("download") === "1" ? 600000 : 20000),
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
  headers.set("Cache-Control", image ? "public, max-age=86400, stale-while-revalidate=604800" : "public, max-age=60");
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
    const key=`${blockId}:${fileId}:${name}`;
    if((failures.get(key)||0)>Date.now())return NextResponse.json({error:"Source file unavailable"},{status:502,headers:{"Cache-Control":"no-store"}});
    let pending=signing.get(key);
    if(!pending){pending=signNotionFile(blockId,fileId,name);signing.set(key,pending);void pending.finally(()=>signing.delete(key)).catch(()=>{});}
    let signed:string;
    try {signed=await pending;}catch(error){failures.set(key,Date.now()+60000);throw error;}
    if (fmt === "json") {
      return NextResponse.json(
        { url: signed },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (proxy) {
      return proxySigned(signed, req);
    }
    // Keep redirect for non-JS clients; the player uses fmt=json + file CDN.
    return NextResponse.redirect(signed, 302);
  } catch {
    return NextResponse.json({ error: "Video proxy xatosi" }, { status: 502 });
  }
}
