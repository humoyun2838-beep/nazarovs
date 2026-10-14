export type MediaKind = "image" | "video";

export type MediaPlanItem =
  | { kind: MediaKind; src: string }
  | { kind: MediaKind; newIndex: number };

const VIDEO_LINE = /^VIDEO::(.+)$/i;
const IMAGE_LINE = /^IMAGE::(.+)$/i;

export function extractMediaFromContent(content: string) {
  const media: { kind: MediaKind; src: string }[] = [];
  const textLines: string[] = [];
  for (const raw of (content || "").split("\n")) {
    const line = raw.trim();
    const video = line.match(VIDEO_LINE);
    if (video) {
      media.push({ kind: "video", src: video[1].trim() });
      continue;
    }
    const image = line.match(IMAGE_LINE);
    if (image) {
      media.push({ kind: "image", src: image[1].trim() });
      continue;
    }
    textLines.push(raw);
  }
  return {
    media,
    text: textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

export function serializeLessonContent(
  media: { kind: MediaKind; src: string }[],
  text: string,
) {
  const markers = media
    .filter((item) => item.src)
    .map((item) =>
      item.kind === "video" ? `VIDEO::${item.src}` : `IMAGE::${item.src}`,
    );
  const body = (text || "").trim();
  if (!markers.length) return body;
  if (!body) return markers.join("\n\n");
  return `${markers.join("\n\n")}\n\n${body}`;
}

export function parseMediaPlan(raw: unknown): MediaPlanItem[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: MediaPlanItem[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const kind = (item as { kind?: string }).kind;
      if (kind !== "image" && kind !== "video") continue;
      const src = (item as { src?: string }).src;
      if (typeof src === "string" && src.trim()) {
        out.push({ kind, src: src.trim() });
        continue;
      }
      const newIndex = Number((item as { newIndex?: unknown }).newIndex);
      if (Number.isInteger(newIndex) && newIndex >= 0) {
        out.push({ kind, newIndex });
      }
    }
    return out;
  } catch {
    return [];
  }
}
