const KEYS = [
  "login",
  "calendar",
  "clock",
  "queue",
  "card",
  "search",
  "profile",
  "clip",
  "cash",
  "invoice",
  "contract",
  "measure",
  "map",
  "phone",
  "house",
  "clipboard",
  "heart",
  "glucose",
  "brain",
  "ribbon",
  "scope",
  "bloom",
  "baby",
  "hospital",
  "tube",
  "pills",
  "stamp",
  "print",
  "shield",
  "chart",
  "crate",
  "kiosk",
  "maternity",
  "scope-doc",
  "bed",
  "shot",
  "siren",
  "pen",
  "insure",
  "trophy",
  "rings",
  "badge",
  "steam",
  "coins",
  "ear",
  "gear",
  "family",
  "barcode",
] as const;

type LessonKey = (typeof KEYS)[number];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function src(key: LessonKey) {
  return `/stickers/lessons/lesson-${key}.webp?v=l2`;
}

export function allLessonStickerUrls() {
  return KEYS.map((key) => src(key));
}

function pick(keys: readonly LessonKey[], seed: string): LessonKey {
  return keys[hash(seed) % keys.length];
}

function haystack(slug: string, title: string) {
  return `${title} ${slug}`
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const RULES: Array<[RegExp, readonly LessonKey[]]> = [
  [/faq-face-id|face-id|oneid/i, ["login"]],
  [/faq-ilova-xato|ilovani yangila|kesh/i, ["phone"]],
  [/faq-chet-el|vid na jitelstvo|jshshir yo/i, ["profile"]],
  [/faq-tor-mutaxassis|kardiolog|\blor\b/i, ["ear"]],
  [/faq-jadval-band|doim "band"|ish jadvali ilovada/i, ["clock"]],
  [/faq-server-navbat|navbatim kuyadimi/i, ["queue"]],
  [/faq-sms-qabul|qabulda bo'ldingiz/i, ["phone"]],
  [/faq-statsionar|elektron yo'llanma bilan yot/i, ["hospital"]],
  [/faq-imtiyozli|nogironligi/i, ["stamp"]],
  [/faq-dispanser|psixiatr|narkolog/i, ["brain"]],
  [/faq-poliklinikaga-biriktirilmagan|biriktirilmagansiz/i, ["map"]],
  [/faq-chaqaloqni-qoshish|chaqaloqni tizimga/i, ["baby"]],
  [/faq-emlash-kalendari|emlash kalendar/i, ["shot"]],
  [/faq-tibbiy-sugurta|\bmts\b/i, ["insure"]],
  [/faq-bepul-dori|reimbursatsiya/i, ["pills"]],
  [/faq-tahlil-pdf|tahlil javoblarini pdf/i, ["tube"]],
  [/faq-qogoz-tarix|qog'oz tibbiy tarix/i, ["clip"]],
  [/faq-tez-yordam-103|\b103\b/i, ["siren"]],
  [/faq-xususiy-klinika|xususiy klinikalar/i, ["hospital"]],
  [/faq-shifokor-baho|shikoyat yoki minnatdorchilik/i, ["trophy"]],
  [/tizimga kirish|avtorizatsiya|akkaunt yaratish|hisobni \(akkaunt|login-to-system|bosh sahifa/i, ["login"]],
  [/oilaviy akkaunt|oilaviy/i, ["family"]],
  [/muxlisa|infokiosk|kiosk/i, ["kiosk"]],
  [/mobil ilova|dmed pro|dmed ilovasida|akkaunt$/i, ["phone"]],
  [/jonli navbat/i, ["queue"]],
  [/belgilangan vaqt/i, ["clock"]],
  [/bepul.*yozilish/i, ["calendar"]],
  [/pulli yozilish|qabulga pulli/i, ["card"]],
  [/mening qabullarim|qabulga yoz|yozilish/i, ["calendar", "clock", "queue"]],
  [/tug'ilgan sanasi|noma'lum bemor|qidirish|search-unknown/i, ["search"]],
  [/bemorning profili|shaxsiy ma'lumot|profilida|profile \/ statistika|tibbiy karta/i, ["profile"]],
  [/hujjatni bemor|biriktirish|clip/i, ["clip"]],
  [/antropometr/i, ["measure"]],
  [/hududiga biriktir|uchastka va xona|map/i, ["map"]],
  [/patronaj reja|patronajni rejalashtirish|patronaj ko'rik|uyga/i, ["house"]],
  [/yurak-qon|yuqtk|yuikning|ekg|heart/i, ["heart"]],
  [/qandli diabet|diabet|glucose/i, ["glucose"]],
  [/serebrovaskulyar|onkogematolog|miya|brain/i, ["brain"]],
  [/ko'krak|sut bezi|ribbon/i, ["ribbon"]],
  [/gelmintoz|gijja|biomaterial|laborator|lis|tahlil|analiz/i, ["scope", "tube"]],
  [/fertillik/i, ["bloom"]],
  [/eshitish|chaqaloq.*eshit/i, ["ear"]],
  [/homilador|tug'ruq|tug'ish|096-shakl|111-shakl|113-shakl|097-shakl/i, ["maternity"]],
  [/chaqaloq|yangi tug'ilgan|rivojlanish kartasi/i, ["baby"]],
  [/nikoh|haj \/ umra|ziyorat|xavfsizlik kamari/i, ["rings"]],
  [/retsept|dori-vosita|farmasevt|emlash|pills/i, ["pills", "shot"]],
  [/mehnatga layoqatsizlik|malumotnoma|ma'lumotnoma|086|058-shakl|039-shakl|tasdiqlash/i, ["stamp", "shield"]],
  [/chop etish|yuklab olish|print/i, ["print"]],
  [/haqiqiyligini tekshirish|shield/i, ["shield"]],
  [/elektron hujjat|hujjat aylanishi/i, ["clip"]],
  [/qo'lda kiritish jurnal|jurnallarni|bi orqali|051|024-2|030-sonli|031-jurnal|066/i, ["pen", "clipboard"]],
  [/skrining|so'rovnoma|clipboard/i, ["clipboard"]],
  [/fizioterapiya|muolaja|davolash kursi|davolash kundaligi/i, ["shot", "scope-doc"]],
  [/stethoscope|korik|ko'rik|tekshiruv|epikriz|tashxis|mutaxassis/i, ["scope-doc"]],
  [/kasalxona|shifoxona|yotqizish|joylashtirish|yo'llanma|hospital/i, ["hospital", "bed"]],
  [/112 xizmati|shoshilinch|siren/i, ["siren"]],
  [/kassa|smena|hisob-faktura|hisoblar|depozit|to'lov|narx/i, ["cash", "invoice", "coins"]],
  [/shartnoma|ta'minotchi|sug'urta/i, ["contract", "insure"]],
  [/hisobot|ssv|statistika|kpi|chart/i, ["chart", "trophy"]],
  [/xodim|lavozim|ta'til|ish jadvali|telefon raqam/i, ["badge", "clock"]],
  [/ombor|mahsulot|kirim|chiqim|qoldiq|talabnoma|sarf|ehtiyoj|steriliz/i, ["crate", "barcode", "steam"]],
  [/sozlash|parametr|shablon|gear/i, ["gear"]],
  [/shtrix-kod|barcode|buyurtma/i, ["barcode"]],
  [/d-ro'yxat|d-hisob|dispanser/i, ["pen"]],
  [/imtiyozli/i, ["stamp"]],
  [/direktor/i, ["badge"]],
];

export function lessonSticker(slug: string, title = "") {
  const text = haystack(slug, title);
  for (const [pattern, keys] of RULES) {
    if (pattern.test(text)) return src(pick(keys, slug));
  }
  return src(pick(KEYS, slug || title));
}
