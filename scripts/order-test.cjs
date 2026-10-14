#!/usr/bin/env node
/**
 * Assert catalog and nested lesson order match Notion learning-materials-uzb.
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://127.0.0.1:3847";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "local-dev-only-password";
let sessionCookie = "";

async function loginAdmin() {
  const form = new FormData();
  form.set("username", "Nazarov");
  form.set("password", ADMIN_PASS);
  form.set("next", "/nazarov");
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const cookie = res.headers.get("set-cookie") || "";
  const match = cookie.match(/nazarov_session=([^;]+)/);
  if (!match) throw new Error("order-test login failed");
  sessionCookie = `nazarov_session=${match[1]}`;
}
const tree = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/dmed-tree.json"), "utf8"),
);

const EXPECTED_SECTIONS = [
  "Tizimga kirish",
  "Ro‘yxatga oluvchi",
  "Amaliyotchi hamshira",
  "Patronaj hamshirasi",
  "Shifokor",
  "Qabul bo‘limining navbatchi shifokor/Hamshirasi",
  "Shifoxonaning davolovchi shifokor",
  "Shifoxona. Tor mutaxassis korik tartibi",
  "Laborant",
  "Taqrizchi (qayta ko'rib chiquvchi)",
  "Direktor",
  "Statist",
  "Farmasevt",
  "Ombor mudiri",
  "Buxgalter",
  "Kassir",
  "Bosh hamshira",
  "Hamshira",
  "Bemor",
  "KPI (Asosiy samaradorlik ko’rsatkichlari)",
  "Yangi Omborxona",
  "Muxlisa ilovasini o‘rnatish",
];

const EXPECTED_ROYXATGA = [
  "Bepul yozilish",
  "Bepul belgilangan vaqtga yozilish",
  "Bepul jonli navbatga yozilish",
  "Pulli yozilish",
  "Belgilangan vaqtga qabulga pulli yozilish",
  "Jonli navbatga qabulga pulli yozilish",
  "Tug‘ilgan sanasi ma’lum bo'lmagan bemorni qidirish",
  "Bemorning profili",
  "Yangi kassa",
];

const EXPECTED_AMALIYOTCHI = [
  "Bemorning antropometriya malumotlarini kiritish va shifokorga yuborish",
  "Bemorlarning o'z hududiga biriktirilishi",
  "DMED Pro mobil ilovasi orqali bemorni oilaviy shifokorga biriktirish",
  "Patronaj rejasini tuzish",
  "Skrining/So’rovnomalar",
];

const EXPECTED_SHIFOKOR = [
  "Bemorni qabulga taklif qilish va yangi epizod yaratish",
  "Bemorning kasallik tarihini davom ettirish",
  "Qo’shimcha talon",
  "Bemorni analizga yuborish",
  "Bemorni boshqa mutaxassisga yuborish",
  "Murojat epizodi orqali kasalxonaga yotqizish",
  "Homiladorlikni ro‘yxatga olish",
  "Elektron retsept",
  "Elektron hujjat aylanishi",
  "Davolash kursini yaratish",
  "Fizioterapiya",
  "Emlash",
  "Profile / Statistika",
  "Shapka va tekshiruv shablonlarini qo‘shish",
  "DMED Pro mobil ilovasi orqali bemorni oilaviy shifokorga biriktirish",
  "Bemorning profili",
  "Ambulator operatsiya",
  "Shifokor-maslahat komissiyasi majlisi",
  "Imtiyozli yo'llanma asosida shifoxonaga yotqizish",
  "D-ro’yxat",
  "Skrining/So’rovnomalar",
  "Ambulatoriyada 112 xizmati: hodisalar haqida ogohlantirish",
];

function decode(text) {
  return String(text || "")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function listTitles(html) {
  return [...html.matchAll(/<span class="block truncate text-\[15px\][^"]*">([^<]+)/g)].map(
    (m) => decode(m[1]),
  );
}

function assertSequence(actual, expected, label) {
  let pos = -1;
  for (const title of expected) {
    const next = actual.findIndex((item, index) => index > pos && item === title);
    if (next < 0) {
      throw new Error(
        `${label}: missing “${title}” after “${actual[pos] || "start"}”. got=${JSON.stringify(actual.slice(0, 12))}`,
      );
    }
    pos = next;
  }
}

function childTitles(slug) {
  const section = tree.sections.find((s) => s.slug === slug);
  if (!section) throw new Error(`missing section ${slug}`);
  return (section.children || []).map((c) => c.title);
}

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, {
    headers: { "user-agent": "nazarov-order/1.0", cookie: sessionCookie },
  });
  const body = await res.text();
  if (res.status !== 200) {
    throw new Error(`${pathname} -> ${res.status}`);
  }
  return body;
}

async function main() {
  await loginAdmin();
  const treeTitles = (tree.sections || []).map((s) => s.title);
  assertSequence(treeTitles, EXPECTED_SECTIONS, "dmed-tree.json");

  const catalogAll = listTitles(await get("/nazarov"));
  const faqTitle = "Top 20 ta savol";
  if (!catalogAll.includes(faqTitle)) {
    throw new Error("catalog is missing the FAQ section");
  }
  const catalog = catalogAll.filter((title) => title !== faqTitle);
  assertSequence(catalog, EXPECTED_SECTIONS, "/nazarov");
  if (catalog.length !== EXPECTED_SECTIONS.length) {
    throw new Error(
      `/nazarov title count ${catalog.length} != ${EXPECTED_SECTIONS.length}`,
    );
  }

  const royxatga = listTitles(await get("/b/royxatga-oluvchi"));
  assertSequence(royxatga, childTitles("royxatga-oluvchi"), "/b/royxatga-oluvchi");

  const amaliyotchi = listTitles(await get("/b/amaliyotchi-hamshira"));
  assertSequence(
    amaliyotchi,
    childTitles("amaliyotchi-hamshira"),
    "/b/amaliyotchi-hamshira",
  );

  const shifokor = listTitles(await get("/b/shifokor"));
  assertSequence(shifokor, childTitles("shifokor"), "/b/shifokor");

  const qabul = listTitles(
    await get("/b/qabul-bolimining-navbatchi-shifokorhamshirasi"),
  );
  assertSequence(
    qabul,
    childTitles("qabul-bolimining-navbatchi-shifokorhamshirasi"),
    "/b/qabul",
  );

  const bepul = tree.sections
    .find((s) => s.slug.startsWith("royxatga"))
    .children.find((c) => c.title === "Bepul yozilish");
  const bepulHtml = await get(`/m/${bepul.slug}`);
  if (!bepulHtml.includes("Bepul belgilangan vaqtga yozilish")) {
    throw new Error("Bepul yozilish page is missing nested lesson links");
  }

  const tizimga = tree.sections[0];
  const tizimgaLesson = tizimga.children?.[0]?.slug;
  if (!tizimgaLesson) {
    throw new Error("Tizimga kirish lesson slug missing");
  }
  const home = await get("/nazarov");
  if (!home.includes(`/b/${tizimga.slug}`) && !home.includes(`/m/${tizimgaLesson}`)) {
    throw new Error("catalog does not link Tizimga kirish");
  }

  assertSequence(shifokor, childTitles("shifokor").slice(0, 6), "shifokor vs tree");

  console.log(
    JSON.stringify(
      {
        ok: true,
        sections: catalog.length,
        royxatga: royxatga.length,
        amaliyotchi: amaliyotchi.length,
        shifokor: shifokor.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
