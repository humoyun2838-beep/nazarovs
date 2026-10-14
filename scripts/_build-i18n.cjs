const fs = require("fs");
const src = fs.readFileSync("src/lib/catalog-locale.ts", "utf8");
function take(name) {
  const start = src.indexOf(`const ${name}`);
  if (start < 0) return [];
  const slice = src.slice(start);
  const pairs = [];
  const re = /\["((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\]/g;
  let m;
  const end = slice.indexOf("\n];");
  const body = slice.slice(0, end + 3);
  while ((m = re.exec(body))) {
    pairs.push([JSON.parse(`"${m[1]}"`), JSON.parse(`"${m[2]}"`)]);
  }
  return pairs;
}
function norm(text) {
  return String(text || "")
    .replace(/[\u2018\u2019\u02BB\u02BC`]/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
function apply(text, pairs) {
  let out = norm(text);
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    const needle = norm(from);
    if (!needle) continue;
    if (out === needle) return to;
    out = out.split(needle).join(to);
  }
  return out;
}
const RU = [...take("RU"), ...take("MORE_RU")];
const EN = [...take("EN"), ...take("MORE_EN")];
const titles = JSON.parse(fs.readFileSync("scripts/_inner-titles.json", "utf8"));
const map = {};
const leftover = [];
for (const row of titles) {
  const ru = apply(row.title, RU);
  const en = apply(row.title, EN);
  map[row.slug] = { uz: row.title, ru, en };
  if (norm(ru) === norm(row.title) || /[qg]il|o'tkaz|bo'yicha|yaratish|ko'rish/.test(norm(ru))) {
    leftover.push({ ...row, ru, en });
  }
}
const EXTRA = {
  "yurak-qon-tomir-kasalliklari-skriningi-maqsadida-patron-28b60b77fb-2": {
    ru: "Планирование и проведение патронажа для скрининга ССЗ",
    en: "Plan and run patronage for CVD screening",
  },
  "yurak-qon-tomir-kasalliklari-skriningi-maqsadida-patron-28b60b77fb": {
    ru: "Планирование и проведение патронажа для скрининга ССЗ",
    en: "Plan and run patronage for CVD screening",
  },
  "yurak-qon-tomir-kasalliklarini-erta-aniqlash-skriningi-28b60b77fb": {
    ru: "Скрининг раннего выявления сердечно-сосудистых заболеваний",
    en: "Early screening for cardiovascular disease",
  },
  "yurak-qon-tomir-kasalliklarini-erta-aniqlash-skriningi-28b60b77fb-2": {
    ru: "Скрининг раннего выявления сердечно-сосудистых заболеваний",
    en: "Early screening for cardiovascular disease",
  },
  "qandli-diabet-skriningi-27e60b77fb": {
    ru: "Скрининг сахарного диабета",
    en: "Diabetes screening",
  },
  "qandli-diabet-skriningi-28b60b77fb": {
    ru: "Скрининг сахарного диабета",
    en: "Diabetes screening",
  },
  "qandli-diabet-skriningi-maqsadida-patronajni-rejalashti-28b60b77fb": {
    ru: "Планирование и проведение патронажа для скрининга диабета",
    en: "Plan and run patronage for diabetes screening",
  },
  "qandli-diabet-skriningi-maqsadida-patronajni-rejalashti-27e60b77fb": {
    ru: "Планирование и проведение патронажа для скрининга диабета",
    en: "Plan and run patronage for diabetes screening",
  },
  "kokrak-sut-bezi-saratonini-erta-aniqlash-skriningi-27360b77fb": {
    ru: "Скрининг раннего выявления рака молочной железы",
    en: "Early screening for breast cancer",
  },
  "kokrak-sut-bezi-saratonini-erta-aniqlash-skriningi-27360b77fb-2": {
    ru: "Скрининг раннего выявления рака молочной железы",
    en: "Early screening for breast cancer",
  },
  "gelmintoz-gijja-kasalliklarni-erta-aniqlash-skriningi-27360b77fb": {
    ru: "Скрининг раннего выявления гельминтозов",
    en: "Early screening for helminth infections",
  },
  "gelmintoz-gijja-kasalliklarni-erta-aniqlash-skriningi-27360b77fb-2": {
    ru: "Скрининг раннего выявления гельминтозов",
    en: "Early screening for helminth infections",
  },
  "misda-oddiy-retsept-yozish-2c760b77fb": {
    ru: "Выписка обычного рецепта в МИС",
    en: "Write a regular prescription in MIS",
  },
  "misda-reimbursatsiya-retseptini-yozish-2c760b77fb": {
    ru: "Выписка рецепта возмещения в МИС",
    en: "Write a reimbursement prescription in MIS",
  },
  "retseptni-bekor-qilish-2c760b77fb": {
    ru: "Отмена рецепта",
    en: "Cancel a prescription",
  },
  "112-integration-ambulatory-uz": {
    ru: "Служба 112 в амбулатории: оповещение о событиях",
    en: "112 service in outpatient care: event alerts",
  },
  "muolaja-turidagi-xizmatlarni-sozlash-1d760b77fb": {
    ru: "Настройка услуг типа «Процедура»",
    en: "Set up procedure-type services",
  },
  "buxgalter-1": {
    ru: "Настройка услуг типа «Процедура»",
    en: "Set up procedure-type services",
  },
  "employee-phone-uz": {
    ru: "Ввод телефона сотрудника",
    en: "Enter the employee’s phone number",
  },
  "learning-materials-statist-ssv-reports-uzb": {
    ru: "Отчёты Минздрава",
    en: "Ministry of Health reports",
  },
  "ombor-mudiri-5": {
    ru: "Учёт: приход, расход, остаток",
    en: "Accounts: incoming, outgoing, stock",
  },
  "smenani-ochish-va-yopish-28d60b77fb": {
    ru: "Открытие и закрытие смены",
    en: "Open and close a shift",
  },
  "shartnomalar-bo-limining-funksionali-28d60b77fb-2": {
    ru: "Функции раздела «Договоры»",
    en: "Contracts section functions",
  },
  "shartnomalar-bo-limining-funksionali-28d60b77fb-3": {
    ru: "Функции раздела «Договоры»",
    en: "Contracts section functions",
  },
  "shartnomalar-bo-limining-funksionali-28d60b77fb-4": {
    ru: "Функции раздела «Договоры»",
    en: "Contracts section functions",
  },
  "shartnomalar-bo-limining-funksionali-28d60b77fb": {
    ru: "Функции раздела «Договоры»",
    en: "Contracts section functions",
  },
  "hisoblar-bo-limi-funksionali-28d60b77fb-2": {
    ru: "Функции раздела «Счета»",
    en: "Invoices section functions",
  },
  "hisoblar-bo-limi-funksionali-28d60b77fb-3": {
    ru: "Функции раздела «Счета»",
    en: "Invoices section functions",
  },
  "hisoblar-bo-limi-funksionali-28d60b77fb": {
    ru: "Функции раздела «Счета»",
    en: "Invoices section functions",
  },
  "depozitlar-bo-limi-funksionali-28d60b77fb-2": {
    ru: "Функции раздела «Депозиты»",
    en: "Deposits section functions",
  },
  "depozitlar-bo-limi-funksionali-28d60b77fb-3": {
    ru: "Функции раздела «Депозиты»",
    en: "Deposits section functions",
  },
  "depozitlar-bo-limi-funksionali-28d60b77fb": {
    ru: "Функции раздела «Депозиты»",
    en: "Deposits section functions",
  },
  "hisobotlar-bo-limining-funksional-imkoniyatlari-28d60b77fb-2": {
    ru: "Возможности раздела «Отчёты»",
    en: "Reports section features",
  },
  "hisobotlar-bo-limining-funksional-imkoniyatlari-28d60b77fb-3": {
    ru: "Возможности раздела «Отчёты»",
    en: "Reports section features",
  },
  "hisobotlar-bo-limining-funksional-imkoniyatlari-28d60b77fb": {
    ru: "Возможности раздела «Отчёты»",
    en: "Reports section features",
  },
  "mening-smenalarim-bo-limining-funksional-imkoniyatlari-28d60b77fb": {
    ru: "Возможности раздела «Мои смены»",
    en: "My shifts section features",
  },
  "buhgalteriya-1d760b77fb": { ru: "Бухгалтерия", en: "Accounting" },
  "ombordagi-mahsulot-narxini-sozlash-1d760b77fb": {
    ru: "Настройка цены товара на складе",
    en: "Set warehouse product price",
  },
  "buxgalter-2": {
    ru: "Настройка цены товара на складе",
    en: "Set warehouse product price",
  },
  "ehtiyohlar-73760b77fb": { ru: "Потребности", en: "Needs" },
  "hisobdan-chiqarish-c2160b77fb": { ru: "Списание", en: "Write-off" },
  "hisob-ehtiyojlar-85d60b77fb": { ru: "Учёт/Потребности", en: "Accounts/Needs" },
  "post-omborlar-sterilizatsiya-de660b77fb": {
    ru: "Постовые склады/Стерилизация",
    en: "Ward stores/Sterilization",
  },
  "omborxona-sterilizatsiya-7c560b77fb": {
    ru: "Склад/Стерилизация",
    en: "Warehouse/Sterilization",
  },
  "omborxona-sterilizatsiya-3a960b77fb": {
    ru: "Склад/Стерилизация",
    en: "Warehouse/Sterilization",
  },
  "attachment-to-the-brigade-and-office-uz": {
    ru: "Прикрепление сотрудника к участку и кабинету",
    en: "Attach an employee to a catchment area and room",
  },
  "fisiotherapy-prescription-uz": {
    ru: "Назначение физиотерапии",
    en: "Prescribe physiotherapy",
  },
  "physiotherapy-prescription-uz": {
    ru: "Назначение физиотерапии",
    en: "Prescribe physiotherapy",
  },
  "fizioterapevtik-muolajani-tayinlash-20060b77fb": {
    ru: "Назначение физиотерапии",
    en: "Prescribe physiotherapy",
  },
  "referral-for-hospitalization-for-childbirth-uz": {
    ru: "Направление в стационар с целью родов",
    en: "Referral to hospital for childbirth",
  },
  "nikoh-uchun-malumotnomalar-kichik-bo-limi-funksionali-2a060b77fb": {
    ru: "Функции подраздела «Справки для брака»",
    en: "Marriage certificates subsection functions",
  },
  "sug-urta-tashkilotlarini-yaratish-va-sozlash-33a60b77fb": {
    ru: "Создание и настройка страховых организаций",
    en: "Create and set up insurance organizations",
  },
  "sug-urta-tashkilotlarini-yaratish-va-sozlash-33a60b77fb-2": {
    ru: "Создание и настройка страховых организаций",
    en: "Create and set up insurance organizations",
  },
  "drug-release-mis-uz": {
    ru: "Выдача лекарства по рецепту через DMED EMIS",
    en: "Dispense medicine by prescription in DMED EMIS",
  },
  "farmasevt-2": {
    ru: "Выдача лекарства в DMED Pro",
    en: "Dispense medicine in DMED Pro",
  },
  "ombor-mudiri-2": {
    ru: "Добавление поставщиков и договоров",
    en: "Add suppliers and contracts",
  },
  "ombor-mudiri-3": { ru: "Добавление товаров", en: "Add products" },
  "ombor-mudiri-4": { ru: "Добавление складов", en: "Add warehouses" },
  "imtiyozli-yollanma-orqali-yotqizish-uchun-nozologik-gur-27660b77fb": {
    ru: "Создание и настройка нозологической группы для льготной госпитализации",
    en: "Create and set a nosology group for privileged admission",
  },
  "onkogematologik-kasalliklarni-erta-aniqlash-skriningi-m-26c60b77fb": {
    ru: "Планирование патронажного осмотра для онкогематологического скрининга",
    en: "Plan a patronage exam for oncohematology screening",
  },
  "058-shakl-yuqumli-kasallik-haqida-shoshilinch-xabar-2cc60b77fb": {
    ru: "Форма 058 — экстренное извещение об инфекционном заболевании",
    en: "Form 058 — urgent notice of an infectious disease",
  },
  "058-shakl-yuqumli-kasallik-haqida-shoshilinch-xabar-3ad60b77fb": {
    ru: "Форма 058 — экстренное извещение об инфекционном заболевании",
    en: "Form 058 — urgent notice of an infectious disease",
  },
  "058-shakl-yuqumli-kasallik-haqida-shoshilinch-xabar-2cc60b77fb-2": {
    ru: "Форма 058 — экстренное извещение об инфекционном заболевании",
    en: "Form 058 — urgent notice of an infectious disease",
  },
  "058-shakl-yuqumli-kasallik-haqida-shoshilinch-xabar-2cc60b77fb-3": {
    ru: "Форма 058 — экстренное извещение об инфекционном заболевании",
    en: "Form 058 — urgent notice of an infectious disease",
  },
  "tasdiqlash-tuzatishga-qaytarish-mehnatga-layoqatsizlik--1cf60b77fb": {
    ru: "Подтверждение, возврат на исправление, печать листа нетрудоспособности",
    en: "Approve, return for correction, print a sick-leave certificate",
  },
  "tasdiqlash-tuzatishga-qaytarish-mehnatga-layoqatsizlik--3ac60b77fb": {
    ru: "Подтверждение, возврат на исправление, печать листа нетрудоспособности",
    en: "Approve, return for correction, print a sick-leave certificate",
  },
  "avval-yopilgan-mehnatga-layoqatsizlik-varaqasini-davom--1cf60b77fb": {
    ru: "Продолжение ранее закрытого листа нетрудоспособности",
    en: "Continue a previously closed sick-leave certificate",
  },
  "avval-yopilgan-mehnatga-layoqatsizlik-varaqasini-davom--3ac60b77fb": {
    ru: "Продолжение ранее закрытого листа нетрудоспособности",
    en: "Continue a previously closed sick-leave certificate",
  },
  "elektron-hujjatlarning-haqiqiyligini-tekshirish-1cf60b77fb": {
    ru: "Проверка подлинности электронных документов",
    en: "Verify electronic documents",
  },
  "elektron-hujjatlarning-haqiqiyligini-tekshirish-1cf60b77fb-2": {
    ru: "Проверка подлинности электронных документов",
    en: "Verify electronic documents",
  },
  "039-shaklni-yuklab-olish-1cf60b77fb": {
    ru: "Скачивание формы 039",
    en: "Download form 039",
  },
  "haj-umra-ziyoratini-amalga-oshiruvchi-ziyoratchilar-uch-36060b77fb": {
    ru: "Медицинская справка о медосмотре для паломников Хадж / Умра",
    en: "Medical exam certificate for Hajj / Umrah pilgrims",
  },
};

for (const row of titles) {
  const extra = EXTRA[row.slug];
  if (extra) map[row.slug] = { uz: row.title, ru: extra.ru, en: extra.en };
}
fs.writeFileSync("src/data/catalog-i18n.json", JSON.stringify(map, null, 2));
fs.writeFileSync("scripts/_leftover.json", JSON.stringify(leftover, null, 2));
console.log("pairs ru", RU.length, "en", EN.length, "titles", titles.length, "leftover", leftover.length);
console.log(leftover.map((r) => r.slug + " | " + r.title).join("\n"));
