const BASE = "http://127.0.0.1:3847";

function visible(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const UZ = [
  "tugmasini bosing",
  "Tizimga kirganingizdan",
  "Uchrashuvga navbatda",
  "bo'limiga o'ting",
  "ichki dars",
  "Dmed bilan yozish",
  "Barcha bo‘limlar",
  "Barcha bo'limlar",
  "Dars nomini qidirish",
  "Materiallar",
  "tanishamiz",
  "Ushbu darsda",
  "Avvalo",
  "qabulga yozish",
];

async function get(path) {
  const res = await fetch(BASE + path);
  return res.text();
}

(async () => {
  const report = [];
  const catalog = visible(await get("/nazarov?lang=ru"));
  const catHits = UZ.filter((n) => catalog.includes(n));
  report.push({ page: "/nazarov?lang=ru", hits: catHits });

  const sections = [
    "/b/royxatga-oluvchi?lang=ru",
    "/b/shifokor?lang=ru",
    "/b/kassir?lang=ru",
    "/b/amaliyotchi-hamshira?lang=ru",
    "/b/tizimga-kirish?lang=ru",
  ];
  const htmls = {};
  for (const p of sections) {
    const html = await get(p);
    htmls[p] = html;
    const text = visible(html);
    report.push({ page: p, hits: UZ.filter((n) => text.includes(n)) });
  }

  const lessons = [
    "/m/bemorni-qabulga-taklif-qilish-va-yangi-epizod-yaratish-16860b77fb?lang=ru",
    "/m/bemorning-antropometriya-malumotlarini-kiritish-va-shif-16860b77fb?lang=ru",
    "/m/bepul-belgilangan-vaqtga-yozilish-26860b77fb?lang=ru",
    "/m/login-to-system-uz?lang=ru",
    "/m/smenani-ochish-va-yopish-28d60b77fb?lang=ru",
  ];
  for (const p of lessons) {
    const text = visible(await get(p));
    report.push({ page: p, hits: UZ.filter((n) => text.includes(n)) });
  }

  const hrefs = String(htmls["/b/shifokor?lang=ru"] || "").match(/href="\/m\/[^"]+"/g) || [];
  const slugs = [...new Set(hrefs.map((h) => h.slice(6, -1)))].slice(0, 25);
  let nestedHits = 0;
  const nestedBad = [];
  for (const href of slugs) {
    const text = visible(await get(href + "?lang=ru"));
    const hits = UZ.filter((n) => text.includes(n) && n !== "Dmed bilan yozish");
    if (hits.length) {
      nestedHits += 1;
      nestedBad.push({ href, hits });
    }
  }
  console.log(JSON.stringify({ report, doctorLessons: slugs.length, nestedBad: nestedBad.slice(0, 12), nestedHits }, null, 2));
})();
