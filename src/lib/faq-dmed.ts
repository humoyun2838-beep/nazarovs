export const FAQ_CATEGORY_SLUG =
  "eng-kop-beriladigan-savollarga-qisqa-javoblar";
export const FAQ_CATEGORY_ART = "/stickers/lessons/lesson-faq.jpg?v=f1";

function art(key: string) {
  return `/stickers/lessons/lesson-${key}.webp?v=l2`;
}

export type FaqItem = {
  n: number;
  slug: string;
  title: string;
  summary: string;
  sticker: string;
  icon: string;
  group: string;
  answer: string;
  tips: string[];
};

export type FaqGroup = {
  id: string;
  title: string;
  hint: string;
  sticker: string;
  items: FaqItem[];
};

const RAW: Array<
  Omit<FaqItem, "sticker"> & { stickerKey: string }
> = [
  {
    n: 1,
    slug: "faq-face-id-oneid",
    group: "kirish",
    icon: "key-round",
    stickerKey: "login",
    title: "Face-ID yoki OneID ishlamasa, nima qilaman?",
    summary: "Parolni yangilang yoki JSHSHIR bilan kiring.",
    answer:
      "OneID (Yagona portal) parolingizni yangilang. Keyin odatiy usulda — JSHSHIR va telefon raqami orqali kiring. Face-ID serverlarida ba’zan vaqtinchalik yuklama bo‘ladi, birozdan keyin qayta urinib ko‘ring.",
    tips: [
      "Avval OneID parolini yangilang.",
      "JSHSHIR + telefon orqali kiring.",
      "Yuklama bo‘lsa, 5–10 daqiqadan so‘ng qayta urinib ko‘ring.",
    ],
  },
  {
    n: 2,
    slug: "faq-ilova-xato",
    group: "kirish",
    icon: "phone",
    stickerKey: "phone",
    title: "Ilovani yangilagach kirmayapti. Nima qilaman?",
    summary: "Keshni tozalang yoki brauzerdan kiring.",
    answer:
      "Ilova keshini (cache) tozalang yoki ilovani o‘chirib, qayta yuklab oling. Muammo davom etsa, vaqtinchalik veb-sayt (brauzer) orqali kiring.",
    tips: [
      "Keshni tozalang.",
      "Ilovani o‘chirib qayta o‘rnating.",
      "Brauzer orqali kiring.",
    ],
  },
  {
    n: 3,
    slug: "faq-chet-el-fuqarolari",
    group: "kirish",
    icon: "user",
    stickerKey: "profile",
    title: "Chet el fuqarolari qanday ro‘yxatdan o‘tadi?",
    summary: "Yashash guvohnomasi bo‘lsa — tizimga, yo‘qsa — poliklinikaga.",
    answer:
      "O‘zbekistonda yashash guvohnomasiga (vid na jitelstvo) ega chet elliklar ro‘yxatdan o‘tishi mumkin. Vaqtinchalik kelganlar odatda poliklinika ro‘yxatxonasi orqali pullik xizmatlarga yoziladi. Pasportda JSHSHIR bo‘lmasa, onlayn yo‘l ochilmasligi mumkin.",
    tips: [
      "Yashash guvohnomasi bo‘lsa — Dmedga kiritishadi.",
      "Vaqtinchalik mehmon — ro‘yxatxona orqali.",
    ],
  },
  {
    n: 4,
    slug: "faq-tor-mutaxassis",
    group: "qabul",
    icon: "stethoscope",
    stickerKey: "ear",
    title: "LOR yoki kardiologga to‘g‘ridan-to‘g‘ri yozilsam bo‘ladimi?",
    summary: "Bepul ko‘rik — avval oilaviy shifokor.",
    answer:
      "Bepul ko‘rikdan o‘tish uchun birinchi navbatda oilaviy shifokorga yozilish shart. To‘g‘ridan-to‘g‘ri yozilish faqat ba’zi pullik xizmatlar uchun ochiq bo‘lishi mumkin.",
    tips: [
      "Bepul yo‘l: oilaviy shifokor → yo‘llanma.",
      "Pullik xizmatlarda to‘g‘ridan-to‘g‘ri yozilish ochiq bo‘lishi mumkin.",
    ],
  },
  {
    n: 5,
    slug: "faq-jadval-band",
    group: "qabul",
    icon: "activity",
    stickerKey: "clock",
    title: "Nega shifokor jadvali doim “band”?",
    summary: "Talab yuqori yoki shifokor hozir ishda emas.",
    answer:
      "Bu elektron poliklinika tizimiga talabning o‘ta yuqoriligini yoki shifokor ayni paytda ta’tilda / malaka oshirishda ekanligini bildiradi. Boshqa kun yoki boshqa shifokorni tanlab ko‘ring.",
    tips: [
      "Boshqa sana yoki shifokorni tanlang.",
      "Ertalab navbat tezroq ochilishi mumkin.",
    ],
  },
  {
    n: 6,
    slug: "faq-server-navbat",
    group: "qabul",
    icon: "activity",
    stickerKey: "queue",
    title: "Dmed serveri ishlamasa, elektron navbatim kuyadimi?",
    summary: "Yo‘q — navbat bazada saqlanadi.",
    answer:
      "Yo‘q, navbatingiz bazada saqlanadi. Tizim ishlamagan vaqtda shifokorlar bemorlarni qog‘ozda qayd etadi, tizim tiklangach ma’lumotlar bazaga kiritiladi.",
    tips: ["Navbat saqlanadi.", "Qabulga o‘z vaqtida boring."],
  },
  {
    n: 7,
    slug: "faq-sms-qabul",
    group: "qabul",
    icon: "phone",
    stickerKey: "phone",
    title: "Bormasam ham “Siz qabulda bo‘ldingiz” SMS keldi.",
    summary: "Xato belgi — poliklinikaga xabar bering.",
    answer:
      "Bu shifokor yoki ro‘yxatxona xodimi tomonidan xato belgilash yoki navbatning sun’iy yopilganini anglatadi. Darhol poliklinika rahbariyatiga yoki Call-markazga xabar bering.",
    tips: [
      "SMS ni saqlab qo‘ying.",
      "Call-markaz yoki poliklinika rahbariyatiga murojaat qiling.",
    ],
  },
  {
    n: 8,
    slug: "faq-statsionar-yollanma",
    group: "qabul",
    icon: "briefcase-medical",
    stickerKey: "hospital",
    title: "Shifoxonaga elektron yo‘llanma bilan qanday yotaman?",
    summary: "Yo‘llanma Dmedda avtomatik shakllanadi.",
    answer:
      "Oilaviy poliklinika tomonidan berilgan elektron yo‘llanma Dmed tizimida avtomatik shakllanadi. Shu hujjat asosida navbatga turasiz va statsionar davolanishga qabul qilinasiz.",
    tips: [
      "Avval oilaviy poliklinikadan yo‘llanma oling.",
      "Hujjat Dmedda ko‘rinadi — shu bilan navbatga turing.",
    ],
  },
  {
    n: 9,
    slug: "faq-imtiyozli-navbat",
    group: "qabul",
    icon: "badge-check",
    stickerKey: "stamp",
    title: "Imtiyozli shaxslarga navbatda ustunlik bormi?",
    summary: "Maqom hisobga olinadi, onlayn slot — belgilangan vaqt.",
    answer:
      "Tizim bemorning imtiyozli maqomini (bazada tasdiqlangan bo‘lsa) inobatga oladi. Biroq onlayn navbatga yozilishda barcha belgilangan vaqt bo‘yicha qabul qilinadi.",
    tips: [
      "Imtiyoz bazada tasdiqlangan bo‘lsin.",
      "Onlayn yozilish — tanlangan vaqtga.",
    ],
  },
  {
    n: 10,
    slug: "faq-dispanser",
    group: "qabul",
    icon: "stethoscope",
    stickerKey: "brain",
    title: "Psixiatr, narkologga Dmed orqali yozilsam bo‘ladimi?",
    summary: "Hozircha ko‘pincha poliklinika yo‘llanmasi kerak.",
    answer:
      "Maxsus dispanserlar tizimga bosqichma-bosqich ulanmoqda. Hozircha aksariyat hollarda yo‘llanma poliklinika orqali beriladi, to‘g‘ridan-to‘g‘ri onlayn yozilish cheklangan bo‘lishi mumkin.",
    tips: [
      "Avval oilaviy shifokordan yo‘llanma oling.",
      "To‘g‘ridan-to‘g‘ri onlayn yozilish hali ochilmagan bo‘lishi mumkin.",
    ],
  },
  {
    n: 11,
    slug: "faq-poliklinikaga-biriktirilmagan",
    group: "oila",
    icon: "home",
    stickerKey: "map",
    title: "“Siz hech qaysi poliklinikaga biriktirilmagansiz” chiqdi.",
    summary: "Pasport bilan poliklinikaga boring.",
    answer:
      "Yashash joyingizdagi poliklinikaga pasportingiz bilan boring va o‘zingizni elektron reyestrga (Dmed bazasiga) kiritishlarini so‘rang. Baza yangilangach, xatolik yo‘qoladi.",
    tips: [
      "Pasportni olib boring.",
      "Ro‘yxatxonadan Dmed reyestriga kiritishni so‘rang.",
    ],
  },
  {
    n: 12,
    slug: "faq-chaqaloqni-qoshish",
    group: "oila",
    icon: "heart",
    stickerKey: "baby",
    title: "Yangi tug‘ilgan chaqaloqni tizimga qanday qo‘shaman?",
    summary: "Guvohnoma + JSHSHIR, keyin ro‘yxatxona.",
    answer:
      "Bola uchun FHDYo bo‘limidan tug‘ilganlik haqidagi guvohnoma va JSHSHIR oling. Keyin poliklinika ro‘yxatxonasi orqali bazaga kiritasiz. Shundan so‘ng u kabinetingizdagi “Oila a’zolarim” bo‘limida ko‘rinadi.",
    tips: [
      "Avval guvohnoma va JSHSHIR oling.",
      "Ro‘yxatxona kiritgach — “Oila a’zolarim”da chiqadi.",
    ],
  },
  {
    n: 13,
    slug: "faq-emlash-kalendari",
    group: "oila",
    icon: "heart-pulse",
    stickerKey: "shot",
    title: "Farzandimning emlash kalendarini ko‘ramanmi?",
    summary: "Ha — “Emlashlar” yoki “Tibbiy tarix”da.",
    answer:
      "Ha. Farzandingiz profilidagi “Tibbiy tarix” yoki “Emlashlar” bo‘limida olgan va olishi kerak bo‘lgan vaksinalar jadvali elektron tarzda shakllanadi.",
    tips: [
      "Bolaning profilini oching.",
      "“Emlashlar” yoki “Tibbiy tarix”ni qidiring.",
    ],
  },
  {
    n: 14,
    slug: "faq-tibbiy-sugurta",
    group: "dorixona",
    icon: "badge-check",
    stickerKey: "insure",
    title: "Majburiy tibbiy sug‘urta (MTS) dan qanday foydalanaman?",
    summary: "Oilaviy shifokor yo‘llanmasi orqali.",
    answer:
      "Agar hududingizda tibbiy sug‘urta joriy etilgan bo‘lsa, Dmed orqali oilaviy shifokorga yozilasiz. Bepul xizmatlar va dori-darmonlar faqat shu shifokorning elektron yo‘llanmasi orqali, sug‘urta doirasida beriladi.",
    tips: [
      "Avval oilaviy shifokorga yoziling.",
      "Bepul dori — faqat elektron yo‘llanma bilan.",
    ],
  },
  {
    n: 15,
    slug: "faq-bepul-dori",
    group: "dorixona",
    icon: "pill",
    stickerKey: "pills",
    title: "Bepul dori-darmonlarni qanday olaman?",
    summary: "Elektron retsept + pasport / JSHSHIR.",
    answer:
      "Oilaviy shifokor ko‘rigidan so‘ng tizim orqali elektron retsept yozadi. Shu e-retsept va pasportingiz (yoki JSHSHIR) bilan tizimga ulangan dorixonalardan dorilarni bepul yoki imtiyozli narxda olasiz.",
    tips: [
      "Avval shifokor ko‘rigi.",
      "E-retseptni dorixonaga ko‘rsating.",
    ],
  },
  {
    n: 16,
    slug: "faq-tahlil-pdf",
    group: "dorixona",
    icon: "microscope",
    stickerKey: "tube",
    title: "Tahlil javoblarini PDF qilib olsam bo‘ladimi?",
    summary: "Ha — “Tahlillar” bo‘limidan yuklab oling.",
    answer:
      "Tahlil natijalari elektron bazaga kiritilgach, shaxsiy kabinetingizdagi “Tahlillar” bo‘limida paydo bo‘ladi. Ularni PDF shaklida yuklab olib, boshqa shifokorlarga ko‘rsatish mumkin.",
    tips: [
      "Natija bazaga tushgach chiqadi.",
      "PDF ni kabinetdan yuklab oling.",
    ],
  },
  {
    n: 17,
    slug: "faq-qogoz-tarix",
    group: "dorixona",
    icon: "file-text",
    stickerKey: "clip",
    title: "Eski qog‘oz tibbiy tariximni rasmga olib joylay olamanmi?",
    summary: "Hozircha bemor o‘zi fayl yuklamaydi.",
    answer:
      "Hozircha bemorlarning o‘zlari fayl yuklashi cheklangan. Oldingi tibbiy xulosalarni faqat biriktirilgan shifokoringiz tizimga PDF yoki rasm shaklida kiritishi kerak.",
    tips: [
      "Qog‘oz hujjatlarni qabulga olib boring.",
      "Shifokordan tizimga kiritishni so‘rang.",
    ],
  },
  {
    n: 18,
    slug: "faq-tez-yordam-103",
    group: "dorixona",
    icon: "ambulance",
    stickerKey: "siren",
    title: "Tez yordam (103) chaqiruvlari Dmedda ko‘rinadimi?",
    summary: "Ha — oilaviy shifokor tizimida.",
    answer:
      "Tez yordam chaqiruvlari varaqasi hududiy poliklinikaga yuboriladi va u sizning oilaviy shifokoringiz tizimida “Aktiv chaqiruvlar” ro‘yxatida ko‘rinadi.",
    tips: [
      "103 chaqiruvi poliklinikaga uzatiladi.",
      "Oilaviy shifokor “Aktiv chaqiruvlar”da ko‘radi.",
    ],
  },
  {
    n: 19,
    slug: "faq-xususiy-klinika",
    group: "dorixona",
    icon: "briefcase-medical",
    stickerKey: "hospital",
    title: "Xususiy klinikalar Dmedga qachon to‘liq ulanadi?",
    summary: "Hozircha faqat shartnomali klinikalar.",
    answer:
      "Hozirda faqat davlat tibbiy sug‘urtasi bilan shartnoma tuzgan ayrim xususiy klinikalar tizimga ulangan. Qolganlarini ulash bosqichma-bosqich ketmoqda.",
    tips: [
      "Sug‘urta shartnomasi bo‘lgan klinika — Dmedda.",
      "Qolganlari hali navbatda.",
    ],
  },
  {
    n: 20,
    slug: "faq-shifokor-baho",
    group: "dorixona",
    icon: "badge-check",
    stickerKey: "trophy",
    title: "Shifokorga shikoyat yoki minnatdorchilik qoldira olamanmi?",
    summary: "Ba’zi filiallarda 1–5 baho so‘rovnomasi keladi.",
    answer:
      "Ba’zi filiallarda xizmat sifatini baholash sinovdan o‘tmoqda. Qabul tugagach, ilova orqali shifokor xizmatini 1 dan 5 gacha baholash bo‘yicha so‘rovnoma kelishi mumkin.",
    tips: [
      "Qabuldan keyin so‘rovnomani kuting.",
      "Hali yo‘q bo‘lsa, Call-markaz orqali yozing.",
    ],
  },
];

const GROUP_META: Record<
  string,
  { title: string; hint: string; sticker: string }
> = {
  kirish: {
    title: "Kirish va ilova",
    hint: "OneID, Face-ID, kesh, chet el fuqarolari",
    sticker: art("login"),
  },
  qabul: {
    title: "Qabul, navbat va yo‘llanma",
    hint: "Mutaxassis, band jadval, SMS, statsionar",
    sticker: art("calendar"),
  },
  oila: {
    title: "Poliklinika va oila",
    hint: "Biriktirish, chaqaloq, emlash",
    sticker: art("family"),
  },
  dorixona: {
    title: "Sug‘urta, dori va tahlil",
    hint: "MTS, retsept, PDF, 103, baho",
    sticker: art("pills"),
  },
};

export const FAQ_ITEMS: FaqItem[] = RAW.map((row) => ({
  ...row,
  sticker: art(row.stickerKey),
}));

export const FAQ_GROUPS: FaqGroup[] = ["kirish", "qabul", "oila", "dorixona"].map(
  (id) => ({
    id,
    ...GROUP_META[id],
    items: FAQ_ITEMS.filter((item) => item.group === id),
  }),
);

export function isFaqCategory(slug: string) {
  return slug === FAQ_CATEGORY_SLUG;
}

export function faqBySlug(slug: string) {
  return FAQ_ITEMS.find((item) => item.slug === slug);
}

export function faqLessonContent(item: FaqItem) {
  const tips = item.tips.map((tip) => `• ${tip}`).join("\n");
  return `IMAGE::${item.sticker}

## Javob

${item.answer}

## Qisqa yo‘l

${tips}`;
}

export const FAQ_CATEGORY_COPY = {
  title: "Top 20 ta savol",
  description: "20 ta savol — 20 ta aniq javob.",
};
