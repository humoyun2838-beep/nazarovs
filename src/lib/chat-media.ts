import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { dataDir } from "@/lib/data-dir";

export type ChatMediaKind = "image" | "video" | "voice";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const VOICE_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/mp3",
]);

const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VOICE = 8 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

export function chatMediaRoot() {
  return path.join(dataDir(), "chat-media");
}

export function mimeFromFilename(name: string) {
  const ext = name.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    ogg: "audio/ogg",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
  };
  return map[ext] || "";
}

export function kindFromMime(mime: string): ChatMediaKind | null {
  const type = mime.toLowerCase().split(";")[0].trim();
  if (IMAGE_TYPES.has(type)) return "image";
  if (VIDEO_TYPES.has(type)) return "video";
  if (VOICE_TYPES.has(type) || type.startsWith("audio/")) return "voice";
  return null;
}

export function maxBytesForKind(kind: ChatMediaKind) {
  if (kind === "video") return MAX_VIDEO;
  return kind === "image" ? MAX_IMAGE : MAX_VOICE;
}

export function extForMime(mime: string, kind: ChatMediaKind) {
  const type = mime.toLowerCase().split(";")[0].trim();
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/aac": ".aac",
  };
  return map[type] ?? (kind === "image" ? ".bin" : kind === "video" ? ".webm" : ".webm");
}

export function safeContentType(mime: string) {
  const type = mime.toLowerCase().split(";")[0].trim();
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(type)) {
    return "application/octet-stream";
  }
  return type;
}

export async function saveChatMediaFile(opts: {
  sessionId: string;
  mime: string;
  kind: ChatMediaKind;
  bytes: Buffer;
}) {
  const dir = path.join(chatMediaRoot(), opts.sessionId);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${extForMime(opts.mime, opts.kind)}`;
  const abs = path.join(dir, name);
  await writeFile(abs, opts.bytes);
  return path.join(opts.sessionId, name);
}

export function safeMediaAbsPath(mediaKey: string) {
  const root = path.resolve(chatMediaRoot());
  const abs = path.resolve(root, mediaKey);
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}
