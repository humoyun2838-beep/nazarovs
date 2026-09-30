#!/usr/bin/env node
/**
 * Rebuild src/data/dmed-only.json and dmed-tree.json so section and
 * nested lesson order match https://dmed.notion.site/learning-materials-uzb
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ROOT_PAGE,
  SPACE_ID,
  buildContent,
  categorySlugify,
  compactId,
  isUuidTitle,
  loadPage,
  collectTree,
  roleIcon,
  richText,
  slugify,
  sleep,
  summaryFrom,
  uniqueChildren,
  unwrap,
} from "./notion-dmed-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "src/data/dmed-only.json");
const TREE_OUT = path.join(ROOT, "src/data/dmed-tree.json");
const META = path.join(ROOT, "src/data/notion-videos.json");
const CACHE_PATH = "/tmp/notion-order-cache.json";
const CACHE_VERSION = 2;
const GOOD_SEED = "/tmp/dmed-only-good.json";

const pageCache = new Map();
if (fs.existsSync(CACHE_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    for (const row of raw.pages || []) pageCache.set(row.id, row);
    console.log("cache pages", pageCache.size);
  } catch {
    /* ignore */
  }
}

function saveCache() {
  fs.writeFileSync(
    CACHE_PATH,
    JSON.stringify({ pages: [...pageCache.values()] }),
  );
}

async function loadRecord(id) {
  const cached = pageCache.get(id);
  if (cached && cached.v === CACHE_VERSION) return cached;
  const blocks = await loadPage(id);
  await sleep(140);
  const page = unwrap(blocks[id]);
  const title = richText(page?.properties?.title) || id;
  const slug = page?.format?.slug || "";
  const tree = collectTree(blocks, id);
  const rec = {
    v: CACHE_VERSION,
    id,
    title,
    slug,
    childPages: uniqueChildren(tree.childPages),
    texts: tree.texts,
    videos: tree.videos,
    images: tree.images,
  };
  pageCache.set(id, rec);
  if (pageCache.size % 10 === 0) {
    saveCache();
    console.log("loaded", pageCache.size, rec.title.slice(0, 60));
  }
  return rec;
}

function indexExisting(seed) {
  const byId = new Map();
  const byCompact = new Map();
  const byPath = new Map();
  const byTitle = new Map();
  for (const m of seed.materials || []) {
    if (m.notionId) byId.set(m.notionId, m);
    const url = m.sourceUrl || "";
    const hex = (url.match(/[0-9a-f]{32}/i) || [])[0];
    if (hex) byCompact.set(hex.toLowerCase(), m);
    try {
      const leaf = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
      if (leaf) byPath.set(leaf.toLowerCase(), m);
    } catch {
      /* ignore */
    }
    const key = `${m.section || ""}::${m.title}`.toLowerCase();
    if (!byTitle.has(key)) byTitle.set(key, m);
  }
  return { byId, byCompact, byPath, byTitle };
}

function findExisting(id, rec, index) {
  const c = compactId(id);
  if (index.byId.get(id)) return index.byId.get(id);
  if (index.byCompact.get(c)) return index.byCompact.get(c);
  if (rec.slug) {
    const byPath = index.byPath.get(String(rec.slug).toLowerCase());
    if (byPath) return byPath;
  }
  return null;
}

function childLinks(children, linkMap) {
  const lines = [];
  const seen = new Set();
  for (const child of children) {
    if (seen.has(child.id)) continue;
    seen.add(child.id);
    const slug = linkMap[child.id];
    if (slug) lines.push(`[${child.title}](/m/${slug})`);
  }
  return lines;
}

function mergeContent(title, existing, rec, children, linkMap) {
  const c = compactId(rec.id);
  const url = existing?.sourceUrl || "";
  const samePage =
    existing &&
    (existing.notionId === rec.id ||
      (url && url.toLowerCase().includes(c)) ||
      (rec.slug && url.toLowerCase().includes(String(rec.slug).toLowerCase())));
  if (samePage && existing.content && /IMAGE::|VIDEO::/.test(existing.content)) {
    const body = existing.content.trim();
    const missing = childLinks(children, linkMap).filter(
      (line) => !body.includes(line),
    );
    if (!missing.length) return body;
    return `${body}\n\n${missing.join("\n\n")}`;
  }
  const tree = {
    texts: rec.texts || [],
    videos: rec.videos || [],
    images: rec.images || [],
    childPages: children,
  };
  return buildContent(title, tree, linkMap);
}

async function resolveChildren(rec, seenWalk) {
  const out = [];
  for (const child of rec.childPages || []) {
    let id = child.id;
    if (seenWalk.has(id)) continue;
    let next;
    try {
      next = await loadRecord(id);
    } catch (error) {
      console.warn("skip", id, error.message);
      continue;
    }
    if (isUuidTitle(next.title)) {
      for (const inner of next.childPages || []) {
        if (seenWalk.has(inner.id)) continue;
        try {
          const innerRec = await loadRecord(inner.id);
          if (isUuidTitle(innerRec.title)) continue;
          out.push(innerRec);
        } catch (error) {
          console.warn("skip inner", inner.id, error.message);
        }
      }
      continue;
    }
    out.push(next);
  }
  return out;
}

async function main() {
  const seedPath = fs.existsSync(GOOD_SEED) ? GOOD_SEED : OUT;
  const seed = fs.existsSync(seedPath)
    ? JSON.parse(fs.readFileSync(seedPath, "utf8"))
    : { materials: [] };
  console.log("content source", seedPath, "materials", (seed.materials || []).length);
  const index = indexExisting(seed);
  const videoIndex = fs.existsSync(META)
    ? JSON.parse(fs.readFileSync(META, "utf8"))
    : {};

  console.log("Loading Notion tree from root…");
  const root = await loadRecord(ROOT_PAGE);
  const sectionRecords = await resolveChildren(root, new Set([ROOT_PAGE]));
  console.log(
    "sections",
    sectionRecords.map((s, i) => `${i + 1}. ${s.title}`).join("\n"),
  );

  const allNodes = [];
  const ownerById = new Map();
  async function walkNode(rec, sectionTitle, ancestors) {
    if (ownerById.has(rec.id)) {
      const node = {
        id: rec.id,
        title: rec.title,
        slug: rec.slug,
        section: sectionTitle,
        rec,
        children: [],
        alias: true,
      };
      allNodes.push(node);
      return node;
    }
    ownerById.set(rec.id, sectionTitle);
    const guard = new Set(ancestors);
    guard.add(rec.id);
    const children = await resolveChildren(rec, guard);
    const node = {
      id: rec.id,
      title: rec.title,
      slug: rec.slug,
      section: sectionTitle,
      rec,
      children: [],
    };
    allNodes.push(node);
    for (const child of children) {
      node.children.push(await walkNode(child, sectionTitle, [...ancestors, rec.id]));
    }
    return node;
  }

  const sectionTrees = [];
  for (const section of sectionRecords) {
    const children = await resolveChildren(section, new Set([ROOT_PAGE, section.id]));
    const nodes = [];
    if (!children.length) {
      nodes.push(await walkNode(section, section.title, [ROOT_PAGE]));
    } else {
      for (const child of children) {
        nodes.push(await walkNode(child, section.title, [ROOT_PAGE, section.id]));
      }
    }
    sectionTrees.push({
      id: section.id,
      title: section.title,
      slug: categorySlugify(section.title),
      icon: roleIcon(section.title),
      children: nodes,
    });
  }

  saveCache();
  console.log("tree nodes", allNodes.length);

  const usedSlugs = new Set();
  const linkMap = {};
  function assignSlug(node) {
    if (linkMap[node.id]) {
      node.outSlug = linkMap[node.id];
    } else {
      const existing = findExisting(node.id, node.rec, index);
      const generated = slugify(node.title, node.id);
      const official = String(node.slug || "").trim();
      const looksOfficial =
        official &&
        !/^[0-9a-f-]{20,}$/i.test(official) &&
        !official.startsWith("amaliyotchi-hamshira") &&
        !official.startsWith("shifokor-") &&
        official.length > 4;
      let s =
        (existing?.slug &&
        (existing.notionId === node.id ||
          String(existing.sourceUrl || "").toLowerCase().includes(compactId(node.id)))
          ? existing.slug
          : null) ||
        (looksOfficial ? official : null) ||
        generated;
      let n = 2;
      const base = s;
      while (usedSlugs.has(s)) s = `${base}-${n++}`;
      usedSlugs.add(s);
      linkMap[node.id] = s;
      node.outSlug = s;
    }
    for (const child of node.children) assignSlug(child);
  }
  for (const section of sectionTrees) {
    for (const child of section.children) assignSlug(child);
  }

  const materials = [];
  const seenPage = new Set();
  const treeOut = { sections: [] };

  function toTreeChild(node) {
    return {
      title: node.title,
      slug: node.outSlug,
      children: node.children.map(toTreeChild),
    };
  }

  function emitMaterial(node, parentSlug) {
    if (seenPage.has(node.id)) return;
    seenPage.add(node.id);
    const existing = findExisting(node.id, node.rec, index);
    const content = mergeContent(
      node.title,
      existing,
      node.rec,
      node.children.map((c) => ({ id: c.id, title: c.title })),
      linkMap,
    );
    const childCount = node.children.length;
    const summary =
      childCount > 0 && !/IMAGE::|VIDEO::/.test(content)
        ? `${childCount} ta ichki dars — Notion tartibida`
        : existing?.summary || summaryFrom(content, node.title);
    materials.push({
      title: node.title,
      section: node.section,
      slug: node.outSlug,
      parentSlug: parentSlug || "",
      summary,
      content,
      sourceUrl:
        existing?.sourceUrl ||
        `https://dmed.notion.site/${node.rec.slug || compactId(node.id)}`,
      icon: roleIcon(node.section),
      notionId: node.id,
    });
    for (const v of node.rec.videos || []) {
      videoIndex[v.blockId] = {
        ...v,
        pageId: node.id,
        pageTitle: node.title,
        spaceId: SPACE_ID,
      };
    }
    for (const child of node.children) emitMaterial(child, node.outSlug);
  }

  for (const section of sectionTrees) {
    const leaf =
      section.children.length === 1 &&
      section.children[0].children.length === 0 &&
      section.children[0].title === section.title;
    treeOut.sections.push({
      title: section.title,
      slug: section.slug,
      icon: section.icon,
      leaf: Boolean(leaf),
      leafSlug: leaf ? section.children[0].outSlug : "",
      children: section.children.map(toTreeChild),
    });
    for (const child of section.children) emitMaterial(child, "");
  }

  const have = new Set(materials.map((m) => m.slug));
  let orphan = 0;
  for (const item of seed.materials || []) {
    if (have.has(item.slug)) continue;
    const compact = String(item.sourceUrl || "").match(/[0-9a-f]{32}/i)?.[0];
    if (compact && materials.some((m) => (m.sourceUrl || "").toLowerCase().includes(compact.toLowerCase()))) {
      continue;
    }
    if (materials.some((m) => m.title === item.title && m.section === item.section)) {
      continue;
    }
    // Keep leftover lessons that the live tree did not link, at the end of their section.
    materials.push(item);
    have.add(item.slug);
    orphan += 1;
  }

  const out = {
    category: {
      title: "DMED",
      slug: "dmed",
      description:
        "DMED o‘quv materiallari — Notiondagi ketma-ketlik va ichki darslar shu saytda.",
      icon: "stethoscope",
    },
    materials,
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  fs.writeFileSync(TREE_OUT, JSON.stringify(treeOut, null, 2));
  fs.writeFileSync(META, JSON.stringify(videoIndex, null, 2));
  saveCache();

  const withVid = materials.filter((m) => /VIDEO::/.test(m.content || "")).length;
  const withImg = materials.filter((m) => /IMAGE::/.test(m.content || "")).length;
  console.log(
    JSON.stringify(
      {
        sections: treeOut.sections.map((s) => s.title),
        materials: materials.length,
        orphans: orphan,
        withVideo: withVid,
        withImage: withImg,
        royxatga: treeOut.sections.find((s) => s.slug.startsWith("royxatga"))?.children,
        amaliyotchi: treeOut.sections.find((s) => s.slug.startsWith("amaliyotchi"))
          ?.children,
        shifokor: treeOut.sections
          .find((s) => s.slug === "shifokor")
          ?.children.map((c) => ({
            title: c.title,
            n: c.children.length,
          })),
      },
      null,
      2,
    ),
  );
  console.log("Wrote", OUT, TREE_OUT);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
