export const MOBILE_PACKAGE = "uz.dmed.mobile.mijoz";
export const MAX_APK_BYTES = 128 * 1024 * 1024;
export type MobileRelease = {
  latest_version: string; version_code: number; minimum_version: number;
  force_update: boolean; apk_url: string; sha256: string; apk_size: number;
  release_notes: string; package_name: string;
};

export function trustedApkUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.href === raw && u.protocol === "https:" && u.hostname === "raw.githubusercontent.com" &&
      !u.port && !u.username && !u.password && !u.search && !u.hash &&
      /^\/humoyun2838-beep\/nazarovs\/[a-f0-9]{40}\/releases\/android\/DMED-Mijoz\.apk$/.test(u.pathname);
  } catch { return false; }
}

export function parseMobileRelease(input: unknown): MobileRelease {
  if (!input || typeof input !== "object") throw new Error("Versiya ma’lumotlari noto‘g‘ri.");
  const v = input as Record<string, unknown>;
  const code = v.version_code;
  const minimum = v.minimum_version;
  if (typeof code !== "number" || !Number.isInteger(code) || code < 1 || code > 2100000000 ||
      typeof minimum !== "number" || !Number.isInteger(minimum) || minimum < 1 || minimum > code) {
    throw new Error("versionCode va minimal kod butun son bo‘lsin; minimal kod oxirgi koddan katta bo‘lmasin.");
  }
  if (typeof v.latest_version !== "string" || !/^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(v.latest_version)) throw new Error("Versiya 1.0.0 ko‘rinishida bo‘lsin.");
  if (typeof v.force_update !== "boolean") throw new Error("Majburiy yangilash holati noto‘g‘ri.");
  if (typeof v.apk_url !== "string" || !trustedApkUrl(v.apk_url)) throw new Error("APK havolasi ushbu GitHub repozitoriysidagi 40 belgili commit manziliga bog‘langan HTTPS havola bo‘lsin.");
  if (typeof v.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(v.sha256)) throw new Error("APK SHA-256 qiymati 64 ta hex belgidan iborat bo‘lsin.");
  if (typeof v.apk_size !== "number" || !Number.isInteger(v.apk_size) || v.apk_size < 1 || v.apk_size > MAX_APK_BYTES) throw new Error("APK hajmi 1–134217728 bayt oralig‘ida bo‘lsin.");
  if (typeof v.release_notes !== "string" || !v.release_notes.trim() || v.release_notes.length > 4000) throw new Error("Yangiliklar tavsifi 1–4000 belgidan iborat bo‘lsin.");
  if (v.package_name !== MOBILE_PACKAGE) throw new Error("APK paket nomi mos emas.");
  return { latest_version: v.latest_version, version_code: code, minimum_version: minimum,
    force_update: v.force_update, apk_url: v.apk_url, sha256: v.sha256.toLowerCase(),
    apk_size: v.apk_size, release_notes: v.release_notes.trim(), package_name: MOBILE_PACKAGE };
}

export function updateRequired(release: MobileRelease, installedCode: number) {
  return installedCode < release.minimum_version || (release.force_update && installedCode < release.version_code);
}
