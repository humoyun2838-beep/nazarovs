#!/usr/bin/env node
/**
 * Crawl https://dmed.notion.site/learning-materials-uzb and write
 * src/data/dmed-only.json with full text, screenshots, and videos.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "src/data/dmed-only.json");
const META = path.join(ROOT, "src/data/notion-videos.json");
const INV_OUT = path.join(ROOT, "src/data/notion-inventory.json");

const SPACE_ID = "2605dfd5-a33b-49fb-abea-5bffa8eb6385";
const ROOT_PAGE = "16860b77-fbf5-80b8-8500-f26ea7210065";
const API = "https://www.notion.so/api/v3/loadCachedPageChunk";

const ROLE_ICONS = {
  "tizimga kirish": "key-round",
  "ro‘yxatga oluvchi": "phone",
  "ro'yxatga oluvchi": "phone",
  "amaliyotchi hamshira": "activity",
  "patronaj hamshirasi": "home",
  shifokor: "stethoscope",
  "qabul bo‘limining navbatchi shifokor/hamshirasi": "ambulance",
  "shifoxonaning davolovchi shifokor": "briefcase-medical",
  "shifoxona. tor mutaxassis ko‘rik tartibi": "heart-pulse",
  "shifoxona. tor mutaxassis korik tartibi": "heart-pulse",
  laborant: "microscope",
  "taqrizchi (qayta ko'rib chiquvchi)": "badge-check",
  "taqrizchi (qayta ko‘rib chiquvchi)": "badge-check",
  direktor: "briefcase",
  statist: "chart-column",
  farmasevt: "pill",
  "ombor mudiri": "archive",
  buxgalter: "wallet",
  kassir: "banknote",
  "bosh hamshira": "user-round",
  hamshira: "heart",
  bemor: "user",
  "kpi (asosiy samaradorlik ko‘rsatkichlari)": "chart-line",
  "yangi omborxona": "warehouse",
  "muxlisa ilovasini o‘rnatish": "sliders-horizontal",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(url, data) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "notion-client-version": "23.13.0.33",
      },
      body: JSON.stringify(data),
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(20000, 1500 * 2 ** attempt);
      console.warn(`retry ${res.status} in ${wait}ms`);
      await sleep(wait);
      lastError = new Error(`${res.status}`);
      continue;
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text().then((t) => t.slice(0, 180))}`);
    }
    return res.json();
  }
  throw lastError || new Error("request failed");
}

function unwrap(wrap) {
  if (!wrap) return null;
  let v = wrap.value ?? wrap;
  if (v?.value?.id) v = v.value;
  return v;
}

function richText(arr) {
  if (!arr) return "";
  if (typeof arr === "string") return arr;
  return arr
    .map((part) => (typeof part === "string" ? part : Array.isArray(part) ? part[0] || "" : ""))
    .join("");
}

function slugify(title, id) {
  const base = (title || "dars")
    .toLowerCase()
    .replace(/[''`ʻʼ’]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
  return `${base || "dars"}-${String(id).replace(/-/g, "").slice(0, 10)}`;
}

function roleIcon(name) {
  const key = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[`ʼ’]/g, "'");
  return ROLE_ICONS[key] || ROLE_ICONS[key.replace(/'/g, "‘")] || "file-text";
}

function attachmentParts(source, fileIds, title) {
  let fileId = (fileIds && fileIds[0]) || "";
  if (!fileId && source.startsWith("attachment:")) fileId = source.split(":")[1];
  if (!fileId) {
    fileId =
      source.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      )?.[0] || "";
  }
  let filename = "";
  if (source.startsWith("attachment:")) {
    filename = source.split(":").slice(2).join(":") || "";
  } else if (/^https?:\/\//i.test(source)) {
    try {
      filename = decodeURIComponent(new URL(source).pathname.split("/").pop() || "");
    } catch {
      filename = "";
    }
  }
  if (!filename) filename = (title || "file.bin").replace(/ /g, "_");
  return { fileId, filename };
}

async function loadPage(pageId) {
  const blocks = {};
  let cursor = { stack: [] };
  for (let i = 0; i < 80; i++) {
    const data = await post(API, {
      page: { id: pageId },
      limit: 100,
      cursor,
      chunkNumber: i,
      verticalColumns: false,
    });
    Object.assign(blocks, data.recordMap?.block || {});
    cursor = data.cursor || { stack: [] };
    if (!(cursor.stack && cursor.stack.length)) break;
  }
  return blocks;
}

function collectTree(blocks, rootId) {
  const root = unwrap(blocks[rootId]);
  if (!root) return { texts: [], videos: [], images: [], childPages: [] };

  const texts = [];
  const videos = [];
  const images = [];
  const childPages = [];
  const seen = new Set();
  let listCount = 0;

  function walk(id) {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const b = unwrap(blocks[id]);
    if (!b) return;
    const type = b.type;
    const props = b.properties || {};
    const title = richText(props.title);
    const source =
      richText(props.source) || b.format?.display_source || "";

    if (type === "page" && id !== rootId) {
      childPages.push({
        id,
        title: title || "Dars",
        slug: b.format?.slug || "",
      });
      return;
    }

    if (type === "alias" || type === "link_to_page" || type === "transclusion_reference") {
      const pid =
        b.format?.transclusion_reference_pointer?.id ||
        b.format?.copied_from_pointer?.id ||
        b.format?.alias_pointer?.id ||
        b.format?.page_id ||
        b.format?.display_page_id;
      if (pid && pid !== rootId) {
        const ref = unwrap(blocks[pid]);
        const refTitle = ref ? richText(ref.properties?.title) : "";
        childPages.push({
          id: pid,
          title: refTitle || title || "Dars",
          slug: ref?.format?.slug || "",
        });
      }
      for (const cid of b.content || []) walk(cid);
      return;
    }

    if (type === "video") {
      listCount = listCount;
      const { fileId, filename } = attachmentParts(source, b.file_ids, title);
      if (fileId) {
        videos.push({ blockId: id, fileId, filename, size: richText(props.size) });
        texts.push(`VIDEO::notion:${id}|${fileId}|${encodeURIComponent(filename)}`);
      } else if (/^https?:\/\//i.test(source)) {
        texts.push(`VIDEO::${source}`);
      }
      return;
    }

    if (type === "image" || type === "file" || type === "pdf") {
      const { fileId, filename } = attachmentParts(source, b.file_ids, title);
      if (fileId) {
        const marker = `IMAGE::notion:${id}|${fileId}|${encodeURIComponent(filename)}`;
        texts.push(marker);
        images.push({ blockId: id, fileId, filename, source });
      } else if (/^https?:\/\//i.test(source)) {
        const proxy = `https://www.notion.so/image/${encodeURIComponent(source)}?table=block&id=${id}&width=2000&cache=v2`;
        texts.push(`IMAGE::${proxy}`);
        images.push({ blockId: id, source: proxy });
      }
      const caption = title.trim();
      if (caption && type === "image") texts.push(caption);
      return;
    }

    if (
      [
        "column_list",
        "column",
        "transclusion_container",
        "synced_block",
        "toggle",
        "layout",
        "table",
        "copy_indicator",
      ].includes(type)
    ) {
      if (type === "toggle" && title.trim()) texts.push(title);
      for (const cid of b.content || []) walk(cid);
      return;
    }

    if (type === "table_row") {
      const cells = Object.values(props || {})
        .map((cell) => richText(cell).trim())
        .filter(Boolean);
      if (cells.length) texts.push(cells.join(" — "));
      return;
    }

    if (type === "divider") return;

    if (
      [
        "text",
        "header",
        "sub_header",
        "sub_sub_header",
        "header_4",
        "quote",
        "callout",
        "bulleted_list",
        "numbered_list",
        "to_do",
        "code",
        "bookmark",
      ].includes(type)
    ) {
      if (type === "header" || type === "sub_header" || type === "sub_sub_header") {
        listCount = 0;
      }
      if (title.trim()) {
        let prefix = "";
        if (type === "header") prefix = "# ";
        else if (type === "sub_header") prefix = "## ";
        else if (type === "sub_sub_header" || type === "header_4") prefix = "### ";
        else if (type === "bulleted_list") prefix = "• ";
        else if (type === "numbered_list") {
          listCount += 1;
          prefix = `${listCount}. `;
        } else if (type === "quote" || type === "callout") prefix = "> ";
        texts.push(`${prefix}${title}`);
      }
    }

    for (const cid of b.content || []) walk(cid);
  }

  for (const cid of root.content || []) walk(cid);
  return { texts, videos, images, childPages };
}

function buildContent(pageTitle, tree, linkMap) {
  const lines = [];
  for (const t of tree.texts) {
    if (/^Get Notion free$/i.test(t)) continue;
    if (/Skip to content/i.test(t)) continue;
    lines.push(t);
  }
  const seenChild = new Set();
  for (const child of tree.childPages) {
    if (seenChild.has(child.id)) continue;
    seenChild.add(child.id);
    const slug = linkMap[child.id];
    if (slug) lines.push(`[${child.title}](/m/${slug})`);
  }
  let body = lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!body) body = `${pageTitle}`;
  return body;
}

function hasSubstance(content) {
  const stripped = content
    .replace(/^IMAGE::.*$/gm, "")
    .replace(/^VIDEO::.*$/gm, "")
    .replace(/^\[.*?\]\(\/m\/.*?\)$/gm, "")
    .replace(/^[#>•\-\d.\s]+/gm, "")
    .trim();
  const media = /^(IMAGE|VIDEO)::/m.test(content);
  return media || stripped.length >= 24;
}

function summaryFrom(content, title) {
  const text = content
    .replace(/^VIDEO::.*$/gm, "")
    .replace(/^IMAGE::.*$/gm, "")
    .replace(/^\[.*?\]\(\/m\/.*?\)$/gm, "")
    .replace(/^[#>•\-\s]+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  if (!text || text === title) return "DMED o‘quv darsi — to‘liq matn, rasm va video shu saytda.";
  return text.slice(0, 180);
}

async function crawlSite() {
  const inventoryPath = fs.existsSync("/tmp/notion-inventory.json")
    ? "/tmp/notion-inventory.json"
    : INV_OUT;
  if (fs.existsSync(inventoryPath)) {
    const inv = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    const listed = inv.pages || [];
    console.log("Using inventory pages:", listed.length);
    const pages = [];
    let i = 0;
    for (const item of listed) {
      i += 1;
      let blocks;
      try {
        blocks = await loadPage(item.id);
        await sleep(80);
      } catch (error) {
        console.warn("FAIL", item.title || item.id, error.message);
        continue;
      }
      const page = unwrap(blocks[item.id]);
      const title = richText(page?.properties?.title) || item.title || "Dars";
      const slug = page?.format?.slug || item.slug || "";
      const tree = collectTree(blocks, item.id);
      pages.push({
        id: item.id,
        title,
        slug,
        parent: item.parent || null,
        tree,
      });
      if (i % 15 === 0 || i === listed.length) {
        console.log(`loaded ${i}/${listed.length}`);
      }
    }
    return pages;
  }

  const pages = [];
  const queue = [{ id: ROOT_PAGE, parent: null }];
  const seen = new Set();

  while (queue.length) {
    const { id, parent } = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    let blocks;
    try {
      blocks = await loadPage(id);
      await sleep(35);
    } catch (error) {
      console.warn("FAIL", id, error.message);
      continue;
    }
    const page = unwrap(blocks[id]);
    const title = richText(page?.properties?.title) || "Dars";
    const slug = page?.format?.slug || "";
    const tree = collectTree(blocks, id);
    pages.push({ id, title, slug, parent, tree });
    for (const child of tree.childPages) {
      if (!seen.has(child.id)) queue.push({ id: child.id, parent: id });
    }
    if (pages.length % 15 === 0) {
      console.log(`crawled ${pages.length} pages, queue ${queue.length}`);
    }
  }
  return pages;
}

function sectionOf(page, byId) {
  let cur = page;
  let guard = 0;
  while (
    cur &&
    cur.parent &&
    cur.parent !== ROOT_PAGE &&
    byId.has(cur.parent) &&
    guard++ < 10
  ) {
    cur = byId.get(cur.parent);
  }
  return cur?.title || page.title;
}

async function main() {
  console.log("Crawling DMED Notion tree…");
  const pages = await crawlSite();
  console.log("Crawled pages:", pages.length);

  const byId = new Map(pages.map((p) => [p.id, p]));
  const linkMap = {};
  const used = new Set();
  for (const p of pages) {
    let s = p.slug || slugify(p.title, p.id);
    let n = 2;
    const base = s;
    while (used.has(s)) s = `${base}-${n++}`;
    used.add(s);
    linkMap[p.id] = s;
  }

  const materials = [];
  const videoIndex = {};
  const inventory = { pages: [], videos: [] };

  for (const p of pages) {
    if (p.id === ROOT_PAGE) continue;
    const section = sectionOf(p, byId);
    const content = buildContent(p.title, p.tree, linkMap);
    // Keep index/folder pages so Notion child order stays visible.

    for (const v of p.tree.videos) {
      videoIndex[v.blockId] = {
        ...v,
        pageId: p.id,
        pageTitle: p.title,
        spaceId: SPACE_ID,
      };
      inventory.videos.push({
        id: v.blockId,
        parent: p.id,
        title: v.filename,
        file_ids: [v.fileId],
      });
    }

    materials.push({
      title: p.title,
      section,
      slug: linkMap[p.id],
      summary: summaryFrom(content, p.title),
      content,
      sourceUrl: `https://dmed.notion.site/${p.slug || p.id.replace(/-/g, "")}`,
      icon: roleIcon(section),
    });
    inventory.pages.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      parent: p.parent,
      section,
    });
  }

  for (const extraPath of ["/tmp/dmed-only-partial.json", "/tmp/dmed-only-old.json"]) {
    if (!fs.existsSync(extraPath)) continue;
    const extra = JSON.parse(fs.readFileSync(extraPath, "utf8"));
    const have = new Set(materials.map((m) => m.sourceUrl || m.slug));
    for (const item of extra.materials || []) {
      const key = item.sourceUrl || item.slug;
      if (have.has(key)) continue;
      materials.push(item);
      have.add(key);
    }
  }

  const seed = {
    category: {
      title: "DMED",
      slug: "dmed",
      description: "DMED o‘quv materiallari — to‘liq matn, rasm va video shu saytda.",
      icon: "stethoscope",
    },
    materials,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(seed, null, 2));
  fs.writeFileSync(META, JSON.stringify(videoIndex, null, 2));
  fs.writeFileSync(INV_OUT, JSON.stringify(inventory, null, 2));

  const withVid = materials.filter((m) => /VIDEO::/.test(m.content)).length;
  const withImg = materials.filter((m) => /IMAGE::/.test(m.content)).length;
  const avg = Math.round(
    materials.reduce((a, m) => a + (m.content || "").length, 0) / Math.max(materials.length, 1),
  );
  console.log(
    "Done. materials=",
    materials.length,
    "withVideo=",
    withVid,
    "withImage=",
    withImg,
    "avgLen=",
    avg,
  );
  console.log("Wrote", OUT);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
