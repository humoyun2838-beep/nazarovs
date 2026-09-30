"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Block =
  | { type: "text"; value: string }
  | { type: "heading"; level: 1 | 2 | 3; value: string }
  | { type: "internal"; href: string; label: string }
  | { type: "video"; src: string }
  | { type: "image"; src: string };

function normalizeNotionKey(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "").toLowerCase();
    const idMatch = path.match(/([0-9a-f]{32})$/i);
    if (idMatch) return idMatch[1].toLowerCase();
    const slug = path.split("/").filter(Boolean).pop() || "";
    return slug.replace(/-[0-9a-f]{32}$/i, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function isVideoUrl(href: string) {
  return (
    href.startsWith("/api/media") ||
    href.startsWith("/media/") ||
    href.startsWith("blob:") ||
    /\.mp4(\?|$)/i.test(href) ||
    /file\.notion\.so\/.+\.mp4/i.test(href) ||
    href.startsWith("VIDEO::") ||
    href.includes("VIDEO::notion:")
  );
}

function isImageUrl(href: string) {
  return (
    href.startsWith("IMAGE::") ||
    href.includes("IMAGE::") ||
    /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(href) ||
    /googleusercontent\.com/i.test(href) ||
    /notion\.so\/image\//i.test(href)
  );
}

function encodeFileName(name: string) {
  try {
    return encodeURIComponent(decodeURIComponent(name));
  } catch {
    return encodeURIComponent(name);
  }
}

function toPlayableSrc(raw: string, { proxy = false } = {}) {
  const src = raw.trim();
  if (
    src.startsWith("/media/") ||
    src.startsWith("/api/media") ||
    src.startsWith("blob:")
  ) {
    if (proxy && src.startsWith("/api/media") && !src.includes("proxy=")) {
      return `${src}${src.includes("?") ? "&" : "?"}proxy=1`;
    }
    return src;
  }

  const notion = src.match(
    /^notion:([0-9a-f-]{36})\|([0-9a-f-]{36})\|(.+)$/i,
  );
  if (notion) {
    const [, b, f, n] = notion;
    const path = `/api/media/notion?b=${encodeURIComponent(b)}&f=${encodeURIComponent(f)}&n=${encodeFileName(n)}`;
    return proxy ? `${path}&proxy=1` : path;
  }

  const wrapped = `/api/media?u=${encodeURIComponent(src)}`;
  return proxy ? `${wrapped}&proxy=1` : wrapped;
}

function cleanContent(content: string) {
  return content
    .replace(/^\[Skip to content\]\([^)]+\)\s*/gim, "")
    .replace(/^URL Source:\s*\S+\s*$/gim, "")
    .replace(/^Published Time:.*$/gim, "")
    .replace(/^Warning:.*$/gim, "")
    .replace(/^Markdown Content:\s*/gim, "")
    .replace(/^Get Notion free\s*$/gim, "")
    .replace(
      /^This video format \(mp4\) can[’']t be played on this device\.\s*$/gim,
      "",
    )
    .replace(/^\[Learn more\]\([^)]+\)\s*$/gim, "")
    .replace(/^Manba:\s*https?:\/\/\S+\s*$/gim, "")
    .replace(/^Video dars:\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseContent(
  content: string,
  linkMap: Record<string, string>,
): Block[] {
  const blocks: Block[] = [];
  const lines = cleanContent(content || "").split("\n");
  const seenVideos = new Set<string>();
  const seenImages = new Set<string>();

  const resolveInternal = (href: string): string | null => {
    if (href.startsWith("/m/") || href.startsWith("/b/")) return href;
    if (/notion\.site|notion\.so/i.test(href)) {
      const key = normalizeNotionKey(href);
      if (linkMap[key]) return `/m/${linkMap[key]}`;
      for (const [k, slug] of Object.entries(linkMap)) {
        if (key && (href.toLowerCase().includes(k) || k.includes(key))) {
          return `/m/${slug}`;
        }
      }
      return null; // never send users to Notion
    }
    const key = normalizeNotionKey(href);
    if (linkMap[key]) return `/m/${linkMap[key]}`;
    return null;
  };

  const pushVideo = (raw: string) => {
    const src = toPlayableSrc(raw.trim());
    if (seenVideos.has(src)) return;
    seenVideos.add(src);
    blocks.push({ type: "video", src });
  };

  const pushImage = (raw: string) => {
    const src = toPlayableSrc(raw.trim(), { proxy: true });
    if (seenImages.has(src)) return;
    seenImages.add(src);
    blocks.push({ type: "image", src });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push({ type: "text", value: "\n" });
      continue;
    }

    const videoMarker = trimmed.match(/^VIDEO::(.+)$/);
    if (videoMarker) {
      pushVideo(videoMarker[1]);
      continue;
    }

    const imageMarker = trimmed.match(/^IMAGE::(.+)$/);
    if (imageMarker) {
      pushImage(imageMarker[1]);
      continue;
    }

    const mdImage = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+|\/[^)]+)\)$/);
    if (mdImage) {
      pushImage(mdImage[2]);
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        value: heading[2],
      });
      continue;
    }

    const md = trimmed.match(/^\[([^\]]*)\]\((https?:\/\/[^)]+|\/[^)]+)\)$/);
    if (md) {
      const label = (md[1] || "").trim() || "Dars";
      const href = md[2];
      if (isVideoUrl(href)) {
        pushVideo(href);
      } else if (isImageUrl(href)) {
        pushImage(href);
      } else {
        const internal = resolveInternal(href);
        if (internal) {
          blocks.push({ type: "internal", href: internal, label });
        } else if (href.startsWith("/")) {
          blocks.push({ type: "internal", href, label });
        } else {
          // Drop external Notion / unknown links — keep label as text
          blocks.push({ type: "text", value: `${label}\n` });
        }
      }
      continue;
    }

    let last = 0;
    const urlRe = /(https?:\/\/[^\s)]+)/g;
    let match: RegExpExecArray | null;
    let foundUrl = false;
    let lineBlocks: Block[] = [];
    while ((match = urlRe.exec(trimmed)) !== null) {
      foundUrl = true;
      if (match.index > last) {
        lineBlocks.push({ type: "text", value: trimmed.slice(last, match.index) });
      }
      const href = match[1];
      if (isVideoUrl(href)) {
        pushVideo(href);
      } else if (isImageUrl(href)) {
        pushImage(href);
      } else {
        const internal = resolveInternal(href);
        if (internal) {
          lineBlocks.push({
            type: "internal",
            href: internal,
            label: "Darsga o‘tish",
          });
        }
      }
      last = match.index + href.length;
    }
    if (foundUrl) {
      if (last < trimmed.length) {
        lineBlocks.push({ type: "text", value: trimmed.slice(last) });
      }
      const leftover = lineBlocks
        .filter((b) => b.type === "text")
        .map((b) => (b as Extract<Block, { type: "text" }>).value)
        .join("")
        .replace(/^(URL Source:|Published Time:|Markdown Content:)\s*/i, "")
        .trim();
      for (const b of lineBlocks) {
        if (b.type === "internal") blocks.push(b);
      }
      if (leftover && !/^(URL Source|Published Time|Markdown Content)/i.test(leftover)) {
        blocks.push({ type: "text", value: `${leftover}\n` });
      }
      continue;
    }

    if (/^•\s+/.test(trimmed)) {
      blocks.push({ type: "text", value: `${trimmed}\n` });
      continue;
    }

    blocks.push({ type: "text", value: `${trimmed}\n` });
  }

  return blocks;
}

function VideoPlayer({ src }: { src: string }) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setError(false);
      setLoading(true);
      setPlayUrl(null);
      try {
        if (src.startsWith("/api/media")) {
          const endpoint = new URL(src, window.location.origin);
          endpoint.searchParams.set("fmt", "json");
          const res = await fetch(endpoint.pathname + endpoint.search, {
            cache: "force-cache",
          });
          if (!res.ok) throw new Error(`sign ${res.status}`);
          const data = (await res.json()) as { url?: string };
          if (!data.url) throw new Error("empty url");
          if (!cancelled) setPlayUrl(data.url);
        } else if (!cancelled) {
          setPlayUrl(src);
        }
      } catch {
        // Last resort: let the browser follow the 302 redirect.
        if (!cancelled) setPlayUrl(src);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [src]);

  const retryViaProxy = () => {
    if (src.startsWith("/api/media/notion")) {
      const endpoint = new URL(src, window.location.origin);
      endpoint.searchParams.set("proxy", "1");
      setError(false);
      setPlayUrl(endpoint.pathname + endpoint.search);
      return;
    }
    setError(false);
    setPlayUrl(src);
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0b0b0b]">
      {error ? (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 px-4 text-center text-sm text-white/80">
          <p>Video yuklanmadi. Qayta urinish mumkin.</p>
          <button
            type="button"
            onClick={retryViaProxy}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-white transition hover:bg-white/25"
          >
            Qayta yuklash
          </button>
        </div>
      ) : (
        <>
          {loading && !playUrl ? (
            <div className="flex aspect-video items-center justify-center text-sm text-white/70">
              Video ochilmoqda…
            </div>
          ) : null}
          {playUrl ? (
            <video
              key={playUrl}
              controls
              playsInline
              preload="none"
              className="aspect-video w-full bg-black"
              src={playUrl}
              onError={() => {
                if (playUrl.startsWith("http") && src.startsWith("/api/media/notion")) {
                  retryViaProxy();
                  return;
                }
                setError(true);
              }}
            >
              Brauzeringiz video formatini qo‘llab-quvvatlamaydi.
            </video>
          ) : null}
        </>
      )}
    </div>
  );
}

function ContentImage({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      className="my-3 w-full rounded-xl border border-black/10 bg-white object-contain shadow-sm"
    />
  );
}

export function MaterialBody({
  content,
  title,
  linkMap = {},
}: {
  content: string;
  title: string;
  linkMap?: Record<string, string>;
}) {
  const blocks = useMemo(
    () => parseContent(content || "", linkMap),
    [content, linkMap],
  );
  const videos = blocks.filter(
    (b): b is Extract<Block, { type: "video" }> => b.type === "video",
  );
  const rest = blocks.filter((b) => b.type !== "video");

  return (
    <div className="space-y-6">
      {videos.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-[#d7e4fb] bg-white/95 p-3 shadow-sm sm:p-4">
          <h2 className="px-1 font-heading text-lg font-semibold">Video dars</h2>
          {videos.map((block, index) => (
            <VideoPlayer key={`${block.src}-${index}`} src={block.src} />
          ))}
        </section>
      ) : null}

      <section className="prose-material rounded-2xl border border-[#d7e4fb] bg-white/95 p-5 text-[15px] leading-7 shadow-sm sm:p-7">
        <h2 className="mb-4 font-heading text-lg font-semibold">{title}</h2>
        {rest.length === 0 && videos.length === 0 ? (
          <p>Mazmun hali yozilmagan.</p>
        ) : !rest.some(
            (b) =>
              b.type === "image" ||
              b.type === "heading" ||
              b.type === "internal" ||
              (b.type === "text" && b.value.trim()),
          ) && videos.length > 0 ? (
          <p className="text-[#7a7166]">Video yuqorida. Qo‘shimcha matn yo‘q.</p>
        ) : (
          rest.map((block, index) => {
            if (block.type === "text") {
              return (
                <span key={index} className="whitespace-pre-wrap">
                  {block.value}
                </span>
              );
            }
            if (block.type === "heading") {
              const Tag = (
                block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5"
              ) as "h3" | "h4" | "h5";
              return (
                <Tag
                  key={index}
                  className="mt-4 mb-2 font-heading font-semibold text-[#1f1b16]"
                >
                  {block.value}
                </Tag>
              );
            }
            if (block.type === "image") {
              return <ContentImage key={index} src={block.src} />;
            }
            if (block.type === "internal") {
              return (
              <Link
                key={index}
                href={block.href}
                className="my-1 block rounded-lg bg-[#eef3fb] px-3 py-2 text-[#2f6fed] no-underline transition hover:bg-[#dce8fb]"
              >
                {block.label}
              </Link>
              );
            }
            return null;
          })
        )}
      </section>
    </div>
  );
}
