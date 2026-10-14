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
  "tanishamiz",
  "Ushbu darsda",
  "Avvalo",
  "qabulga yozish",
  "O‘quv materiallari",
  "Bo‘limlar",
  "Yordam",
  "Materiallarni ochish",
  "Savol-javoblar",
];

async function get(path) {
  const res = await fetch(BASE + path);
  return { status: res.status, html: await res.text(), lang: res.headers.get("content-language") };
}

function hits(text) {
  return UZ.filter((n) => text.includes(n));
}

(async () => {
  const pages = [
    "/?lang=ru",
    "/nazarov?lang=ru",
    "/materials?lang=ru",
    "/b/eng-kop-beriladigan-savollarga-qisqa-javoblar?lang=ru",
    "/b/royxatga-oluvchi?lang=ru",
    "/b/shifokor?lang=ru",
    "/b/kassir?lang=ru",
    "/chat/kirish?lang=ru",
    "/?lang=en",
    "/nazarov?lang=en",
    "/b/royxatga-oluvchi?lang=en",
    "/b/shifokor?lang=en",
  ];
  const report = [];
  const catalog = await get("/nazarov?lang=ru");
  const catalogText = visible(catalog.html);
  report.push({ page: "/nazarov?lang=ru", hits: hits(catalogText) });

  const bHrefs = [...new Set((catalog.html.match(/href="\/b\/[^"?]+/g) || []).map((h) => h.slice(6)))];
  const sectionBad = [];
  for (const href of bHrefs) {
    const { html } = await get(href + "?lang=ru");
    const text = visible(html);
    const h = hits(text);
    if (h.length) sectionBad.push({ href, hits: h, sample: text.slice(0, 220) });
  }

  const innerBad = [];
  const nested = [
    "/b/kassir?lang=ru",
    "/b/royxatga-oluvchi?lang=ru",
    "/b/shifokor?lang=ru",
  ];
  for (const p of nested) {
    const { html } = await get(p);
    const mHrefs = [...new Set((html.match(/href="\/m\/[^"]+/g) || []).map((h) => h.slice(6)))].slice(0, 12);
    for (const href of mHrefs) {
      const { html: body } = await get(href + (href.includes("?") ? "&lang=ru" : "?lang=ru"));
      const text = visible(body);
      const h = hits(text).filter((n) => n !== "Dmed bilan yozish");
      if (h.length) innerBad.push({ href, hits: h });
    }
  }

  for (const p of pages) {
    if (p === "/nazarov?lang=ru") continue;
    const { html } = await get(p);
    report.push({ page: p, hits: hits(visible(html)) });
  }

  console.log(
    JSON.stringify(
      {
        sections: bHrefs.length,
        sectionBad: sectionBad.slice(0, 20),
        innerBad: innerBad.slice(0, 20),
        report,
      },
      null,
      2,
    ),
  );
})();
