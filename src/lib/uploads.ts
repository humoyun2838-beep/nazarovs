import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "media");

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const IMAGE_MAX = 8 * 1024 * 1024;
const VIDEO_MAX = 80 * 1024 * 1024;

function writeUpload(file: File, ext: string) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dest = path.join(UPLOAD_DIR, name);
  return { dest, url: `/media/${name}` };
}

function extensionFromName(filename: string, fallback: string) {
  const ext = path.extname(filename || "").replace(".", "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return fallback;
}

export async function saveUploadedImage(file: File | null) {
  if (!file || file.size <= 0) return null;
  const ext =
    IMAGE_TYPES[file.type] ||
    (file.name && /\.(png|jpe?g|webp|gif)$/i.test(file.name)
      ? extensionFromName(file.name, "jpg")
      : "");
  if (!ext || !["jpg", "png", "webp", "gif"].includes(ext)) {
    throw new Error("Faqat rasm yuklash mumkin (jpg, png, webp, gif).");
  }
  if (file.size > IMAGE_MAX) {
    throw new Error("Rasm 8MB dan katta bo‘lmasin.");
  }

  const { dest, url } = writeUpload(file, ext);
  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
  return url;
}

export function removeUploadedMedia(url: string | null | undefined) {
  if (!url || !url.startsWith("/media/")) return;
  const name = url.slice("/media/".length);
  if (!name || name.includes("/") || name.includes("..")) return;
  const dest = path.join(UPLOAD_DIR, name);
  fs.rmSync(dest, { force: true });
}

export function mediaUrlsFromContent(content: string) {
  return [...(content || "").matchAll(/VIDEO::(\/media\/[A-Za-z0-9._-]+)/g)].map(
    (m) => m[1],
  );
}

export async function saveUploadedVideo(file: File | null) {
  if (!file || file.size <= 0) return null;
  const ext =
    VIDEO_TYPES[file.type] ||
    (file.name && /\.(mp4|webm|mov)$/i.test(file.name)
      ? extensionFromName(file.name, "mp4")
      : "");
  if (!ext || !["mp4", "webm", "mov"].includes(ext)) {
    throw new Error("Faqat video yuklash mumkin (mp4, webm).");
  }
  if (file.size > VIDEO_MAX) {
    throw new Error("Video 80MB dan katta bo‘lmasin.");
  }

  const { dest, url } = writeUpload(file, ext);
  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
  return url;
}
