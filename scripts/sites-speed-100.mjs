import fs from "node:fs";
import path from "node:path";

const base = "http://127.0.0.1:3847";
const slugs = [
  "tizimga-kirish",
  "royxatga-oluvchi",
  "amaliyotchi-hamshira",
  "patronaj-hamshirasi",
  "shifokor",
  "qabul-bolimining-navbatchi-shifokorhamshirasi",
  "shifoxonaning-davolovchi-shifokor",
  "shifoxona-tor-mutaxassis-korik-tartibi",
  "laborant",
  "taqrizchi-qayta-korib-chiquvchi",
  "direktor",
  "statist",
  "farmasevt",
  "ombor-mudiri",
  "buxgalter",
  "kassir",
  "bosh-hamshira",
  "hamshira",
  "bemor",
  "kpi-asosiy-samaradorlik-korsatkichlari",
  "yangi-omborxona",
  "muxlisa-ilovasini-ornatish",
];
const scenes = ["catalog-scene", "section-scene", "lesson-scene", "admin-scene"];
const results = [];

function add(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

async function get(url) {
  const started = performance.now();
  const res = await fetch(url, { redirect: "manual" });
  const buf = Buffer.from(await res.arrayBuffer());
  return { res, buf, ms: Math.round(performance.now() - started), text: buf.toString("utf8") };
}

for (const slug of slugs) {
  const page = await get(`${base}/b/${slug}`);
  add(`section-${slug}-status`, page.res.status === 200, String(page.res.status));
  add(`section-${slug}-fast`, page.ms < 2500, `${page.ms}ms`);
  add(
    `section-${slug}-art`,
    page.text.includes(`/art/sections/${slug}.webp?v=c4`) &&
      page.text.includes(`/stickers/${slug}.webp?v=c3`) &&
      !page.text.includes(`/ai-b-${slug}.jpg`),
    "scene+icon",
  );
  const icon = await get(`${base}/stickers/${slug}.webp?v=c3`);
  add(
    `icon-${slug}`,
    icon.res.status === 200 &&
      (icon.res.headers.get("content-type") || "").includes("webp") &&
      icon.buf.length > 800 &&
      icon.buf.length < 20000,
    `${icon.buf.length}`,
  );
}

for (const scene of scenes) {
  const file = await get(`${base}/art/${scene}.webp?v=c3`);
  add(
    `scene-${scene}`,
    file.res.status === 200 &&
      (file.res.headers.get("content-type") || "").includes("webp") &&
      file.buf.length > 2000 &&
      file.buf.length < 80000,
    `${file.buf.length}`,
  );
}

const catalog = await get(`${base}/nazarov`);
add("catalog-status", catalog.res.status === 200, String(catalog.res.status));
add("catalog-fast", catalog.ms < 1500, `${catalog.ms}ms`);
add(
  "catalog-scene",
  catalog.text.includes("/art/catalog-scene.webp?v=c3") && !catalog.text.includes("lesson-brain.webp"),
  "no lesson prefetch",
);
add("catalog-lead", catalog.text.includes("DMED o‘quv materiallari kasb va vazifa bo‘yicha."), "lead");

const admin = await get(`${base}/admin`);
add("admin-redirect", admin.res.status === 307, String(admin.res.status));
const login = await get(`${base}/admin/login`);
add("admin-login", login.res.status === 200 && login.text.includes("/art/admin-scene.webp?v=c3"), String(login.res.status));
const operator = await get(`${base}/operator`);
add("operator-status", operator.res.status === 200 && operator.text.includes("Operator"), String(operator.res.status));
add("operator-fast", operator.ms < 1000, `${operator.ms}ms`);
const health = await get(`${base}/api/health`);
add("health", health.res.status === 200 && health.text.includes("nazarov-uz"), String(health.res.status));

const lessonHref = catalog.text.match(/href="(\/m\/[^"]+)"/);
if (lessonHref) {
  const lesson = await get(`${base}${lessonHref[1].replace(/&amp;/g, "&")}`);
  add("lesson-status", lesson.res.status === 200, String(lesson.res.status));
  add("lesson-scene", lesson.text.includes("/art/lesson-scene.webp?v=c3"), "scene");
} else {
  const section = await get(`${base}/b/shifokor`);
  const href = section.text.match(/href="(\/m\/[^"]+)"/);
  const lesson = href ? await get(`${base}${href[1].replace(/&amp;/g, "&")}`) : null;
  add("lesson-status", Boolean(lesson && lesson.res.status === 200), lesson ? String(lesson.res.status) : "missing");
  add("lesson-scene", Boolean(lesson && lesson.text.includes("/art/lesson-scene.webp?v=c3")), "scene");
}

for (let i = 1; i <= 8; i += 1) {
  const home = await get(`${base}/nazarov`);
  const ops = await get(`${base}/operator`);
  const gate = await get(`${base}/admin/login`);
  add(`repeat-catalog-${i}`, home.res.status === 200 && home.ms < 1500, `${home.ms}ms`);
  add(`repeat-operator-${i}`, ops.res.status === 200 && ops.ms < 1000, `${ops.ms}ms`);
  add(`repeat-admin-${i}`, gate.res.status === 200 && gate.ms < 1500, `${gate.ms}ms`);
}

const failed = results.filter((row) => !row.ok);
const summary = { total: results.length, pass: results.length - failed.length, fail: failed.length, failed };
const dir = path.join(process.cwd(), "reports/sites-speed-100");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(dir, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ total: summary.total, pass: summary.pass, fail: summary.fail, failed: failed.slice(0, 12) }, null, 2));
if (summary.total < 100 || summary.fail) process.exit(1);
