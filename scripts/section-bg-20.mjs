import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

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
];
const results = [];
const hashes = new Map();

function add(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

for (const slug of slugs) {
  const pageRes = await fetch(`${base}/b/${slug}`);
  const html = await pageRes.text();
  const own = `/art/sections/${slug}.webp?v=c4`;
  const other = slugs.find((item) => item !== slug);
  add(
    `page-${slug}`,
    pageRes.status === 200 &&
      html.includes(own) &&
      html.includes(`/stickers/${slug}.webp?v=c3`) &&
      !html.includes(`/art/sections/${other}.webp`),
    String(pageRes.status),
  );
  const img = await fetch(`${base}${own}`);
  const buf = Buffer.from(await img.arrayBuffer());
  const hash = createHash("sha1").update(buf).digest("hex");
  hashes.set(slug, hash);
  add(
    `img-${slug}`,
    img.status === 200 &&
      (img.headers.get("content-type") || "").includes("webp") &&
      buf.length > 8000 &&
      buf.length < 80000,
    String(buf.length),
  );
}

add("washes-differ", new Set(hashes.values()).size === slugs.length, String(new Set(hashes.values()).size));

const shifokor = await (await fetch(`${base}/b/shifokor`)).text();
const lessonHref = shifokor.match(/href="(\/m\/[^"?]+)/);
const lesson = lessonHref ? await fetch(`${base}${lessonHref[1]}`) : null;
const lessonHtml = lesson ? await lesson.text() : "";
add(
  "lesson-follows-section",
  Boolean(lesson && lesson.status === 200 && lessonHtml.includes("/art/sections/shifokor.webp?v=c4")),
  lesson ? String(lesson.status) : "missing",
);
const laborant = await (await fetch(`${base}/b/laborant`)).text();
const laborantHref = laborant.match(/href="(\/m\/[^"?]+)/);
const laborantLesson = laborantHref ? await (await fetch(`${base}${laborantHref[1]}`)).text() : "";
add(
  "lesson-changes-with-section",
  laborantLesson.includes("/art/sections/laborant.webp?v=c4") &&
    !laborantLesson.includes("/art/sections/shifokor.webp?v=c4"),
  laborantHref ? laborantHref[1] : "missing",
);

const failed = results.filter((row) => !row.ok);
const summary = { total: results.length, pass: results.length - failed.length, fail: failed.length, failed };
const dir = path.join(process.cwd(), "reports/section-bg-20");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ total: summary.total, pass: summary.pass, fail: summary.fail, failed }, null, 2));
if (summary.total < 20 || summary.fail) process.exit(1);
