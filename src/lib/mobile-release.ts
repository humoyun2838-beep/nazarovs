import "server-only";
import { createHash } from "node:crypto";
import defaults from "@/data/mobile-release.json";
import { getSetting, setSetting } from "@/lib/settings";
import { getAppVersion } from "@/lib/app-version";
import { parseMobileRelease, MAX_APK_BYTES, type MobileRelease } from "@/lib/mobile-release-policy";
import { inspectApk } from "@/lib/apk-inspect";

export function getMobileRelease() {
  let release = parseMobileRelease(defaults);
  try { const stored = getSetting("android_mijoz_release"); if (stored) release = parseMobileRelease(JSON.parse(stored)); } catch { /* Use the last known bundled release if settings are malformed. */ }
  return { ...release, web_version: getAppVersion() };
}

export async function verifyReleaseDownload(release: MobileRelease) {
  const response = await fetch(release.apk_url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error("APK yuklanmadi. Havola yoki internetni tekshiring.");
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_APK_BYTES || (declared && declared !== release.apk_size)) { await response.body.cancel(); throw new Error("APK faylining hajmi mos emas."); }
  const chunks: Buffer[] = []; let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > release.apk_size || size > MAX_APK_BYTES) throw new Error("APK hajmi ruxsat etilganidan katta.");
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  const apk = Buffer.concat(chunks);
  if (size !== release.apk_size || createHash("sha256").update(apk).digest("hex") !== release.sha256) throw new Error("APK SHA-256 yoki hajmi mos emas. Nashr saqlanmadi.");
  const metadata = inspectApk(apk);
  if (metadata.packageName !== release.package_name || metadata.versionCode !== release.version_code || metadata.versionName !== release.latest_version || metadata.debuggable) throw new Error("APK ichidagi paket, versiya yoki release holati kiritilgan qiymatlarga mos emas.");
}

export function saveMobileRelease(release: MobileRelease) {
  setSetting("android_mijoz_release", JSON.stringify(release));
}
