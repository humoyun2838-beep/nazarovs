import { inflateRawSync } from "node:zlib";

/** Read package/version from the actual binary manifest, not an admin label. */
export function inspectApk(apk: Buffer) {
  let end = apk.length - 22;
  for (; end >= Math.max(0, apk.length - 65557); end--) {
    if (apk.readUInt32LE(end) === 0x06054b50) break;
  }
  if (end < 0 || apk.readUInt32LE(end) !== 0x06054b50) throw new Error("APK ZIP tuzilmasi noto‘g‘ri.");
  let at = apk.readUInt32LE(end + 16);
  let manifest: Buffer | undefined;
  for (let i = 0; i < apk.readUInt16LE(end + 10); i++) {
    if (apk.readUInt32LE(at) !== 0x02014b50) throw new Error("APK katalogi noto‘g‘ri.");
    const nameLength = apk.readUInt16LE(at + 28);
    const name = apk.subarray(at + 46, at + 46 + nameLength).toString();
    if (name === "AndroidManifest.xml") {
      const local = apk.readUInt32LE(at + 42);
      if (apk.readUInt32LE(local) !== 0x04034b50) throw new Error("APK manifesti noto‘g‘ri.");
      const start = local + 30 + apk.readUInt16LE(local + 26) + apk.readUInt16LE(local + 28);
      const size = apk.readUInt32LE(at + 20);
      if (size > 4 * 1024 * 1024 || start + size > apk.length) throw new Error("APK manifesti hajmi noto‘g‘ri.");
      const bytes = apk.subarray(start, start + size);
      const method = apk.readUInt16LE(at + 10);
      manifest = method === 0 ? bytes : method === 8 ? inflateRawSync(bytes, { maxOutputLength: 4 * 1024 * 1024 }) : undefined;
      break;
    }
    at += 46 + nameLength + apk.readUInt16LE(at + 30) + apk.readUInt16LE(at + 32);
  }
  if (!manifest || manifest.readUInt16LE(0) !== 3) throw new Error("Android manifesti topilmadi.");
  const b = manifest, strings: string[] = [];
  const tags: Record<string, Record<string, string | number | boolean>> = {};
  const len8 = (pos: number): [number, number] => b[pos] & 128 ? [((b[pos] & 127) << 8) | b[pos + 1], pos + 2] : [b[pos], pos + 1];
  for (let pos = 8; pos < b.length;) {
    const kind = b.readUInt16LE(pos), header = b.readUInt16LE(pos + 2), size = b.readUInt32LE(pos + 4);
    if (size < header || size < 8 || pos + size > b.length) throw new Error("Manifest bloklari noto‘g‘ri.");
    if (kind === 1) {
      const count = b.readUInt32LE(pos + 8), utf8 = Boolean(b.readUInt32LE(pos + 16) & 256), start = b.readUInt32LE(pos + 20);
      if (count > 100000) throw new Error("Manifest juda katta.");
      for (let i = 0; i < count; i++) {
        let p = pos + start + b.readUInt32LE(pos + header + i * 4), n: number;
        if (utf8) { [, p] = len8(p); [n, p] = len8(p); strings.push(b.subarray(p, p + n).toString("utf8")); }
        else { n = b.readUInt16LE(p); p += 2; if (n & 32768) { n = ((n & 32767) << 16) | b.readUInt16LE(p); p += 2; } strings.push(b.subarray(p, p + n * 2).toString("utf16le")); }
      }
    } else if (kind === 0x102) {
      const name = strings[b.readUInt32LE(pos + 20)], start = b.readUInt16LE(pos + 24), step = b.readUInt16LE(pos + 26), count = b.readUInt16LE(pos + 28);
      const attributes: Record<string, string | number | boolean> = {};
      if (step < 20) throw new Error("Manifest atributlari noto‘g‘ri.");
      for (let i = 0; i < count; i++) {
        const p = pos + 16 + start + i * step, type = b[p + 15], value = b.readUInt32LE(p + 16);
        attributes[strings[b.readUInt32LE(p + 4)]] = type === 3 ? strings[value] : type === 18 ? Boolean(value) : value;
      }
      if (name === "manifest" || name === "application") tags[name] = attributes;
    }
    pos += size;
  }
  return { packageName: tags.manifest?.package, versionCode: tags.manifest?.versionCode,
    versionName: tags.manifest?.versionName, debuggable: tags.application?.debuggable === true };
}
