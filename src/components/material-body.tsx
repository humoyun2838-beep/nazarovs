"use client";
import { UiText } from "@/components/ui-locale";


import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { localizeLessonText } from "@/lib/lesson-locale";
import { publicCopy } from "@/lib/public-copy";
import { withLang, type Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";

type Block =
  | { type: "text"; value: string }
  | { type: "heading"; level: 1 | 2 | 3; value: string }
  | { type: "internal"; href: string; label: string }
  | { type: "external"; href: string; label: string }
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

function hiResUrl(src: string) {
  try {
    const absolute = src.startsWith("http")
      ? new URL(src)
      : new URL(src, "http://127.0.0.1");
    if (absolute.searchParams.has("width")) {
      absolute.searchParams.set("width", "2400");
    }
    if (absolute.searchParams.has("w")) {
      absolute.searchParams.set("w", "2400");
    }
    if (absolute.searchParams.has("q")) {
      absolute.searchParams.set("q", "95");
    }
    if (absolute.searchParams.has("u")) {
      const inner = absolute.searchParams.get("u") || "";
      try {
        const nested = new URL(inner);
        if (nested.searchParams.has("width")) nested.searchParams.set("width", "2400");
        if (nested.searchParams.has("w")) nested.searchParams.set("w", "2400");
        if (nested.searchParams.has("q")) nested.searchParams.set("q", "95");
        nested.searchParams.delete("blur");
        absolute.searchParams.set("u", nested.toString());
      } catch {
        /* keep original */
      }
    }
    absolute.searchParams.delete("blur");
    if (src.startsWith("http")) return absolute.toString();
    return `${absolute.pathname}${absolute.search}`;
  } catch {
    return src;
  }
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
      return hiResUrl(`${src}${src.includes("?") ? "&" : "?"}proxy=1`);
    }
    return hiResUrl(src);
  }

  if (src.startsWith("/stickers/") || src.startsWith("/ai-") || src.startsWith("/nazarov-")) {
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
  return proxy ? hiResUrl(`${wrapped}&proxy=1`) : hiResUrl(wrapped);
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
    .replace(/^\s*image\.png\s*$/gim, "")
    .replace(/^(?!\s*(?:IMAGE|VIDEO|FILE)::)\s*\S+\.(?:png|jpe?g|webp|gif)\s*$/gim, "")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseContent(
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

    const fileMarker = trimmed.match(/^FILE::(.+)$/);
    if (fileMarker) {
      const raw = fileMarker[1];
      let label = raw.split("|").at(-1) || "Fayl / Файл";
      try { label = decodeURIComponent(label); } catch { /* keep file name */ }
      blocks.push({ type: "external", href: toPlayableSrc(raw), label });
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
        } else if (/^https?:\/\//i.test(href) && !/notion\.(site|so)/i.test(href)) {
          blocks.push({ type: "external", href, label });
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
    const lineBlocks: Block[] = [];
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
            label: "go-lesson",
          });
        } else if (!/notion\.(site|so)/i.test(href)) {
          lineBlocks.push({ type: "external", href, label: href });
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
        if (b.type === "internal" || b.type === "external") blocks.push(b);
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

function VideoPlayer({ src, t }: { src: string; t: ReturnType<typeof publicCopy> }) {
  const container = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!container.current || !("IntersectionObserver" in window)) {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearViewport(true); observer.disconnect(); }
    }, { rootMargin: "500px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport) return;
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
            cache: "no-store",
            signal: AbortSignal.timeout(20000),
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
  }, [src, nearViewport]);

  const retryViaProxy = () => {
    if (src.startsWith("/api/media")) {
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
    <div ref={container} className="relative overflow-hidden rounded-xl bg-[#0b0b0b]">
      {error ? (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 px-4 text-center text-sm text-white/80">
          <p><UiText>{t.videoFail}</UiText></p>
          <a href="#lesson-text" className="text-sm font-semibold text-white underline">
            <UiText>{t.guide}</UiText>
          </a>
          <button
            type="button"
            onClick={retryViaProxy}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-white transition hover:bg-white/25"
          >
            <UiText>{t.videoReload}</UiText>
          </button>
        </div>
      ) : (
        <>
          {loading && !playUrl ? (
            <div className="flex aspect-video items-center justify-center text-sm text-white/70">
              <UiText>{t.videoOpening}</UiText>
            </div>
          ) : null}
          {playUrl ? (
            <video
              key={playUrl}
              controls
              playsInline
              preload="metadata"
              className="lesson-video aspect-video w-full bg-black"
              src={playUrl}
              onError={() => {
                if (playUrl.startsWith("http") && src.startsWith("/api/media")) {
                  retryViaProxy();
                  return;
                }
                setError(true);
              }}
            >
              <UiText>{t.videoUnsupported}</UiText>
            </video>
          ) : null}
        </>
      )}
    </div>
  );
}

function ContentImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="my-4 block w-full cursor-zoom-in rounded-xl text-left"
      >
        {broken ? (
          <span className="block rounded-xl bg-[#f4f8ff] px-4 py-6 text-sm font-medium text-[#163056]">
            <UiText>{alt}</UiText>
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="lesson-shot"
            onError={() => setBroken(true)}
          />
        )}
        <span className="mt-2 block text-sm font-medium text-[#163056]"><UiText>{alt}</UiText></span>
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#041018]/88 p-3 sm:p-8"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </>
  );
}

export function MaterialBody({
  content,
  title,
  linkMap = {},
  locale = "uz",
  localized = false,
}: {
  content: string;
  title: string;
  linkMap?: Record<string, string>;
  locale?: Locale;
  localized?: boolean;
}) {
  const t = publicCopy(locale);
  const shotAlt = uiCopy(locale).screenshot;
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
        <section className="catalog-panel space-y-3 rounded-[1.5rem] p-3 sm:p-4">
          <h2 className="px-1 font-heading text-lg font-semibold"><UiText>{t.videoLesson}</UiText></h2>
          {videos.map((block, index) => (
            <VideoPlayer key={`${block.src}-${index}`} src={block.src} t={t} />
          ))}
        </section>
      ) : null}

        <section id="lesson-text" className="prose-material catalog-panel rounded-[1.6rem] p-5 text-[16px] leading-7 sm:p-8">
        <h2 className="mb-4 font-heading text-lg font-semibold"><UiText>{title}</UiText></h2>
        {rest.length === 0 && videos.length === 0 ? (
          <p><UiText>{t.emptyBody}</UiText></p>
        ) : !rest.some(
            (b) =>
              b.type === "image" ||
              b.type === "heading" ||
              b.type === "internal" || b.type === "external" ||
              (b.type === "text" && b.value.trim()),
          ) && videos.length > 0 ? (
          <p className="text-[#7a7166]"><UiText>{t.extraNone}</UiText></p>
        ) : (
          rest.map((block, index) => {
            if (block.type === "text") {
              return (
                <span key={index} className="whitespace-pre-wrap">
                  {localized ? block.value : localizeLessonText(block.value, locale)}
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
                  {localized ? block.value : localizeLessonText(block.value, locale)}
                </Tag>
              );
            }
            if (block.type === "image") {
              return <ContentImage key={index} src={block.src} alt={shotAlt} />;
            }
            if (block.type === "external") {
              return <a key={index} href={block.href} target="_blank" rel="noopener noreferrer" className="my-2 block rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-800">↗ <UiText>{block.label}</UiText></a>;
            }
            if (block.type === "internal") {
              return (
              <Link
                key={index}
                href={withLang(block.href, locale)}
                className="my-1 block rounded-lg bg-[#eef3fb] px-3 py-2 text-[#2f6fed] no-underline transition hover:bg-[#dce8fb]"
              >
                <UiText>{block.label === "go-lesson"
                  ? t.goToLesson
                  : localized ? block.label : localizeLessonText(block.label, locale)}</UiText>
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
