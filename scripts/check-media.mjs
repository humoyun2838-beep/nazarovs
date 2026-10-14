import Database from "better-sqlite3";

const base = process.env.BASE || "http://127.0.0.1:3847";
const db = new Database(new URL("../data/nazarov.db", import.meta.url).pathname, { readonly: true });
const rows = db.prepare("SELECT content FROM materials").all();
const videos = [];
const images = [];
for (const row of rows) {
  for (const raw of String(row.content || "").split("\n")) {
    const line = raw.trim();
    const video = line.match(/^VIDEO::(.+)$/i);
    const image = line.match(/^IMAGE::(.+)$/i);
    if (video) videos.push(video[1]);
    if (image) images.push(image[1]);
  }
}

function notionUrl(marker) {
  const match = marker.match(/^notion:([0-9a-f-]{36})\|([0-9a-f-]{36})\|(.+)$/i);
  if (!match) return null;
  return `${base}/api/media/notion?b=${encodeURIComponent(match[1])}&f=${encodeURIComponent(match[2])}&n=${encodeURIComponent(match[3])}&fmt=json`;
}

async function check(marker, kind) {
  const endpoint = notionUrl(marker);
  if (!endpoint) {
    if (kind === "image" && /^https?:\/\//i.test(marker)) {
      const res = await fetch(`${base}/api/media?u=${encodeURIComponent(marker)}&proxy=1`, {signal: AbortSignal.timeout(20000)});
      const valid = res.ok && (res.headers.get('content-type') || '').startsWith('image/');
      await res.body?.cancel();
      return {kind, result: valid ? 'ok' : `image-${res.status}`};
    }
    return { kind, result: "unparsed", marker: marker.slice(0, 24) };
  }
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) return { kind, result: `sign-${res.status}` };
  const data = await res.json().catch(() => null);
  if (!data?.url) return { kind, result: "no-url" };
  const head = await fetch(data.url, {
    method: "GET",
    headers: { Range: "bytes=0-1" },
    signal: AbortSignal.timeout(20000),
  });
  return { kind, result: head.status === 200 || head.status === 206 ? "ok" : `body-${head.status}` };
}

async function pool(items, kind, limit = 4) {
  const counts = {};
  const failures = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      try {
        const row = await check(current, kind);
        counts[row.result] = (counts[row.result] || 0) + 1;
        if (row.result !== "ok") {
          const id = String(current).match(/[0-9a-f]{8}-[0-9a-f-]{27}/i)?.[0] || "other";
          failures.push({ result: row.result, id });
        }
      } catch (error) {
        const name = error?.name === "TimeoutError" ? "timeout" : (error?.cause?.code || error?.name || "error");
        counts[name] = (counts[name] || 0) + 1;
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return { counts, failures: failures.slice(0, 20) };
}

const uniqueVideos = [...new Set(videos)];
const uniqueImages = [...new Set(images)];
const imageLimit = Math.max(0, Number(process.env.MEDIA_IMAGE_LIMIT || uniqueImages.length));
const selectedImages = uniqueImages.slice(0, imageLimit);
const videoReport = await pool(uniqueVideos, "video");
const imageReport = await pool(selectedImages, "image");
console.log(JSON.stringify({
  videoMarkers: videos.length,
  uniqueVideos: uniqueVideos.length,
  videoSources: videoReport.counts,
  videoFailures: videoReport.failures,
  imageMarkers: images.length,
  uniqueImages: uniqueImages.length,
  checkedImages: selectedImages.length,
  imageSources: imageReport.counts,
  imageFailures: imageReport.failures,
}));
