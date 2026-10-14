/**
 * 900 checks that client catalog section logos are present and visible.
 * No paid AI calls. No account changes.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://127.0.0.1:3847";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "reports", "section-logos-900");

const STICKERS = {
  "tizimga-kirish": "/stickers/tizimga-kirish.webp",
  "royxatga-oluvchi": "/stickers/royxatga-oluvchi.webp",
  "amaliyotchi-hamshira": "/stickers/amaliyotchi-hamshira.webp",
  "patronaj-hamshirasi": "/stickers/patronaj-hamshirasi.webp",
  shifokor: "/stickers/shifokor.webp",
  "qabul-bolimining-navbatchi-shifokorhamshirasi":
    "/stickers/qabul-bolimining-navbatchi-shifokorhamshirasi.webp",
  "shifoxonaning-davolovchi-shifokor":
    "/stickers/shifoxonaning-davolovchi-shifokor.webp",
  "shifoxona-tor-mutaxassis-korik-tartibi":
    "/stickers/shifoxona-tor-mutaxassis-korik-tartibi.webp",
  laborant: "/stickers/laborant.webp",
  "taqrizchi-qayta-korib-chiquvchi":
    "/stickers/taqrizchi-qayta-korib-chiquvchi.webp",
  direktor: "/stickers/direktor.webp",
  statist: "/stickers/statist.webp",
  farmasevt: "/stickers/farmasevt.webp",
  "ombor-mudiri": "/stickers/ombor-mudiri.webp",
  buxgalter: "/stickers/buxgalter.webp",
  kassir: "/stickers/kassir.webp",
  "bosh-hamshira": "/stickers/bosh-hamshira.webp",
  hamshira: "/stickers/hamshira.webp",
  bemor: "/stickers/bemor.webp",
  "kpi-asosiy-samaradorlik-korsatkichlari":
    "/stickers/kpi-asosiy-samaradorlik-korsatkichlari.webp",
  "yangi-omborxona": "/stickers/yangi-omborxona.webp",
  "muxlisa-ilovasini-ornatish": "/stickers/muxlisa-ilovasini-ornatish.webp",
};

const LOCALES = ["uz", "ru", "en", "kaa"];
const HEADINGS = {
  uz: "Bo‘limlar",
  ru: "Разделы",
  en: "Sections",
  kaa: "Bólimler",
};
const SLUGS = Object.keys(STICKERS);

function cases() {
  const list = [];
  for (const slug of SLUGS) {
    for (const kind of ["file", "magic", "size", "http", "type", "bytes"]) {
      list.push({ id: `sticker.${slug}.${kind}`, kind, slug });
    }
  }
  for (const lang of LOCALES) {
    list.push({ id: `catalog.${lang}.status`, kind: "catalog-status", lang });
    list.push({ id: `catalog.${lang}.heading`, kind: "catalog-heading", lang });
    list.push({ id: `catalog.${lang}.nologin`, kind: "catalog-nologin", lang });
    for (const slug of SLUGS) {
      list.push({ id: `catalog.${lang}.${slug}`, kind: "catalog-has", lang, slug });
    }
  }
  for (const lang of LOCALES) {
    for (const slug of SLUGS) {
      for (const check of ["status", "sticker", "hero", "pad", "h1", "nologin", "twice"]) {
        list.push({
          id: `section.${lang}.${slug}.${check}`,
          kind: `section-${check}`,
          lang,
          slug,
        });
      }
    }
  }
  for (const slug of SLUGS) {
    list.push({ id: `wash.${slug}.status`, kind: "wash-status", slug });
    list.push({ id: `wash.${slug}.jpeg`, kind: "wash-jpeg", slug });
  }
  for (const kind of [
    "health",
    "operator",
    "admin-redirect",
    "css-opacity",
    "css-no-ghost",
    "css-size",
    "css-mobile",
    "logos-count",
  ]) {
    list.push({ id: `site.${kind}`, kind });
  }
  return list;
}

async function get(urlPath) {
  const res = await fetch(`${BASE}${urlPath}`, { redirect: "manual" });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    type: res.headers.get("content-type") || "",
    location: res.headers.get("location") || "",
    buf,
    text: buf.toString("utf8"),
  };
}

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return out;
}

const pageCache = new Map();
async function page(urlPath) {
  if (!pageCache.has(urlPath)) pageCache.set(urlPath, get(urlPath));
  return pageCache.get(urlPath);
}

function countOf(text, needle) {
  if (!needle) return 0;
  let n = 0;
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf(needle, from);
    if (at < 0) break;
    n += 1;
    from = at + needle.length;
  }
  return n;
}

async function main() {
  const planned = cases();
  if (planned.length !== 900) {
    throw new Error(`Expected 900 cases, built ${planned.length}`);
  }

  const stickerBytes = new Map();
  await pool(SLUGS, 6, async (slug) => {
    const hit = await get(STICKERS[slug]);
    stickerBytes.set(slug, hit);
  });
  const washBytes = new Map();
  await pool(SLUGS, 6, async (slug) => {
    washBytes.set(slug, await get(`/ai-b-${slug}.jpg?v=s1`));
  });
  for (const lang of LOCALES) {
    await page(`/nazarov?lang=${lang}`);
    await pool(SLUGS, 4, async (slug) => {
      await page(`/b/${slug}?lang=${lang}`);
    });
  }
  const health = await get("/api/health");
  const operator = await get("/operator");
  const admin = await get("/admin");
  const catalogUz = await page("/nazarov?lang=uz");
  const cssHrefs = [...catalogUz.text.matchAll(/href="([^"]+\.css)"/g)].map((match) => match[1]);
  let css = "";
  for (const href of cssHrefs) {
    const file = await get(href);
    css += `\n${file.text}`;
  }
  const heroRules = [...css.matchAll(/\.catalog-hero-art\s*\{[^}]+\}/g)].map((match) => match[0]);
  const heroRule = heroRules[0] || "";
  const mobileRule = heroRules.some(
    (rule) => /width:\s*64px/.test(rule) && /opacity:\s*1/.test(rule),
  );

  const results = [];
  for (const item of planned) {
    let ok = false;
    let detail = "";
    if (item.kind === "file" || item.kind === "magic" || item.kind === "size") {
      const file = path.join(ROOT, "public", STICKERS[item.slug].slice(1));
      const bytes = await readFile(file).catch(() => null);
      if (item.kind === "file") ok = Boolean(bytes);
      if (item.kind === "magic") {
        ok = Boolean(
          bytes &&
            bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
            bytes.subarray(8, 12).toString("ascii") === "WEBP",
        );
      }
      if (item.kind === "size") ok = Boolean(bytes && bytes.length > 2000);
      detail = bytes ? String(bytes.length) : "missing";
    } else if (item.kind === "http" || item.kind === "type" || item.kind === "bytes") {
      const hit = stickerBytes.get(item.slug);
      if (item.kind === "http") ok = hit.status === 200;
      if (item.kind === "type") ok = hit.type.includes("image/webp");
      if (item.kind === "bytes") ok = hit.buf.length > 2000;
      detail = `${hit.status} ${hit.type} ${hit.buf.length}`;
    } else if (item.kind.startsWith("catalog-")) {
      const hit = await page(`/nazarov?lang=${item.lang}`);
      if (item.kind === "catalog-status") ok = hit.status === 200;
      if (item.kind === "catalog-heading") ok = hit.text.includes(HEADINGS[item.lang]);
      if (item.kind === "catalog-nologin") ok = !hit.text.includes("/admin/login");
      if (item.kind === "catalog-has") ok = hit.text.includes(STICKERS[item.slug]);
      detail = String(hit.status);
    } else if (item.kind.startsWith("section-")) {
      const hit = await page(`/b/${item.slug}?lang=${item.lang}`);
      const src = STICKERS[item.slug];
      if (item.kind === "section-status") ok = hit.status === 200;
      if (item.kind === "section-sticker") ok = hit.text.includes(src);
      if (item.kind === "section-hero") ok = hit.text.includes("catalog-hero-art");
      if (item.kind === "section-pad") ok = hit.text.includes("pr-24");
      if (item.kind === "section-h1") ok = hit.text.includes("<h1");
      if (item.kind === "section-nologin") ok = !hit.text.includes("/admin/login");
      if (item.kind === "section-twice") ok = countOf(hit.text, src) >= 2;
      detail = `${hit.status} x${countOf(hit.text, src)}`;
    } else if (item.kind === "wash-status" || item.kind === "wash-jpeg") {
      const hit = washBytes.get(item.slug);
      if (item.kind === "wash-status") ok = hit.status === 200 && hit.type.includes("image/jpeg");
      if (item.kind === "wash-jpeg") ok = hit.buf.length > 10000 && hit.buf[0] === 0xff && hit.buf[1] === 0xd8;
      detail = `${hit.status} ${hit.type} ${hit.buf.length}`;
    } else if (item.kind === "health") {
      ok = health.status === 200 && health.text.includes('"service":"nazarov-uz"');
      detail = String(health.status);
    } else if (item.kind === "operator") {
      ok = operator.status === 200 && operator.text.includes("operator");
      detail = String(operator.status);
    } else if (item.kind === "admin-redirect") {
      ok = admin.status === 307 && admin.location.includes("/admin/login");
      detail = `${admin.status} ${admin.location}`;
    } else if (item.kind === "css-opacity") {
      ok = /opacity:\s*1/.test(heroRule);
      detail = heroRule.slice(0, 180);
    } else if (item.kind === "css-no-ghost") {
      ok = heroRules.length > 0 && heroRules.every((rule) => !rule.includes("0.22"));
      detail = heroRule ? "rule" : "missing-rule";
    } else if (item.kind === "css-size") {
      ok = /width:\s*84px/.test(heroRule) && /height:\s*84px/.test(heroRule);
      detail = heroRule.slice(0, 120);
    } else if (item.kind === "css-mobile") {
      ok = mobileRule;
      detail = String(mobileRule);
    } else if (item.kind === "logos-count") {
      const n = SLUGS.filter((slug) => catalogUz.text.includes(STICKERS[slug])).length;
      ok = n === SLUGS.length;
      detail = String(n);
    }
    results.push({ id: item.id, ok, detail: ok ? "" : detail });
  }

  const failed = results.filter((row) => !row.ok);
  const summary = {
    total: results.length,
    pass: results.length - failed.length,
    fail: failed.length,
    failed: failed.slice(0, 40),
  };
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  await writeFile(path.join(OUT, "results.json"), JSON.stringify(results));
  console.log(JSON.stringify(summary, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
