import type { Locale } from "@/lib/locale";
import { localizeCatalogText } from "@/lib/catalog-locale";
import { translateKaa } from "@/lib/kaa";
import lessonI18n from "@/data/lesson-i18n.json";
import lessonPhrases from "@/data/lesson-phrases.json";
import { translateCatalog } from "@/lib/ui-translation";

function fold(text: string) {
  return String(text || "")
    .replace(/[\u2018\u2019\u02BB\u02BC`']/g, "")
    .replace(/[\u201c\u201d«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const MAP_RAW = lessonI18n as Record<string, { ru?: string; en?: string; kaa?: string }>;
const MAP: Record<string, { ru?: string; en?: string; kaa?: string }> = {};
for (const [key, value] of Object.entries(MAP_RAW)) {
  MAP[key] = value;
  MAP[fold(key)] = value;
}
const PHRASES = (lessonPhrases as Array<[string, string, string]>)
  .slice()
  .sort((a, b) => b[0].length - a[0].length);

const LABELS: Record<string, { ru: string; en: string }> = {
  "Tashxisni qo'shish": { ru: "Добавить диагноз", en: "Add diagnosis" },
  "Barcha tashxislar": { ru: "Все диагнозы", en: "All diagnoses" },
  "Taklif qilish": { ru: "Пригласить", en: "Invite" },
  "Qabulni boshlash": { ru: "Начать приём", en: "Start the appointment" },
  "Yangi epizod": { ru: "Новый эпизод", en: "New episode" },
  "Shablonni tanlang": { ru: "Выберите шаблон", en: "Select a template" },
  "Ko'rikni yakunlash": { ru: "Завершить осмотр", en: "Finish the examination" },
  "Qabulga yozuvlar": { ru: "Записи на приём", en: "Appointment bookings" },
  "Qabulni qo'shish": { ru: "Добавить приём", en: "Add appointment" },
  "Davom etish": { ru: "Продолжить", en: "Continue" },
  Yangilash: { ru: "Обновить", en: "Refresh" },
  Antropometriya: { ru: "Антропометрия", en: "Anthropometry" },
  "Joriy ko'rik": { ru: "Текущий осмотр", en: "Current examination" },
  Uchrashuv: { ru: "Приём", en: "Appointment" },
  "Bemorni qabulga yozish": {
    ru: "Запись пациента на приём",
    en: "Book the patient",
  },
  Faol: { ru: "Активные", en: "Active" },
  Aktiv: { ru: "Активные", en: "Active" },
  Qabullar: { ru: "Приёмы", en: "Appointments" },
  Saqlash: { ru: "Сохранить", en: "Save" },
  Tahrirlash: { ru: "Редактировать", en: "Edit" },
  "Chop etish": { ru: "Печать", en: "Print" },
  "Qo'shish": { ru: "Добавить", en: "Add" },
  "Kasalxona": { ru: "Больница", en: "Hospital" },
  "Kasalxonaga yollanma": { ru: "Направление в больницу", en: "Hospital referral" },
  "Kasalxonaga qabul qilish": { ru: "Приём в больницу", en: "Hospital admission" },
  Foydalanuvchilar: { ru: "Пользователи", en: "Users" },
  Xodimlar: { ru: "Сотрудники", en: "Staff" },
  "Qabullar-Aktiv": { ru: "Приёмы — активные", en: "Appointments — active" },
  "Qabulga yozuvni yaratish": {
    ru: "Создать запись на приём",
    en: "Create an appointment booking",
  },
  Shifokor: { ru: "Врач", en: "Doctor" },
  Shifikor: { ru: "Врач", en: "Doctor" },
  Sana: { ru: "Дата", en: "Date" },
};

const LABEL_MAP: Record<string, { ru: string; en: string }> = {};
for (const [key, value] of Object.entries(LABELS)) {
  LABEL_MAP[fold(key)] = value;
}

function labelOf(raw: string, locale: Locale) {
  if (locale === "kaa") return translateKaa(raw);
  const key = fold(raw);
  const hit = LABEL_MAP[key];
  if (hit) return hit[locale === "en" ? "en" : "ru"];
  const via = localizeCatalogText(raw, locale);
  return via && fold(via) !== key ? via : raw;
}

function quote(name: string, locale: Locale) {
  return locale === "en" ? `"${name}"` : `«${name}»`;
}

function localizeKaaLine(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || /^(IMAGE|VIDEO)::/i.test(trimmed)) return raw;
  let out = fold(trimmed).replace(/\s*image\.png\s*$/i, "");
  out = out.replace(
    /^(\d+)\.\s+Tizimga kirganingizdan song "?([^"]+)"? paneliga(?:,)?\s*(?:va )?qoshimcha "?([^"]+)"? paneliga oting:?$/i,
    (_all, n: string, a: string, b: string) =>
      `${n}. Sistemaǵa kirgenińizden soń ${quote(translateKaa(a), "kaa")} panelge, sońınan ${quote(translateKaa(b), "kaa")} panelge ótiń:`,
  );
  out = out.replace(
    /^(\d+)\.\s+Keyin,?\s+"([^"]+)" bolimiga [ou]ting:?$/i,
    (_all, n: string, name: string) =>
      `${n}. Keyin ${quote(translateKaa(name), "kaa")} bólimge ótiń:`,
  );
  out = out.replace(/\bbolimiga\s+[ou]ting:?/gi, "bólimge ótiń");
  out = out.replace(/\bAvvalo,?/gi, "Eń aldın,");
  out = out.replace(/\btugmasini bosamiz:?/gi, "túymesin basamız");
  out = out.replace(/\bbolimiga otamiz/gi, "bólimge ótemiz");
  out = out.replace(
    /(?:Va|Keyin,?)\s+"([^"]+)"\s+tugmasini bosing:?/gi,
    (_all, label: string) => `Keyin ${quote(translateKaa(label), "kaa")} túymesin basıń:`,
  );
  out = out.replace(
    /"([^"]+)"\s+tugmasini bosing:?/gi,
    (_all, label: string) => `${quote(translateKaa(label), "kaa")} túymesin basıń:`,
  );
  out = out.replace(/"([^"]{2,80})"/g, (_all, label: string) =>
    quote(translateKaa(label), "kaa"),
  );
  return translateKaa(out);
}

function localizeLine(line: string, locale: Locale) {
  const raw = String(line || "");
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (locale === "kaa") {
    const key = fold(trimmed).replace(/\s*image\.png\s*$/i, "");
    const stripped = key.replace(/^(?:\d+\.\s+|•\s+)/, "");
    const mapped = MAP[key]?.kaa || MAP[stripped]?.kaa;
    return mapped || raw;
  }
  if (/^(IMAGE|VIDEO)::/i.test(trimmed)) return raw;

  const key = fold(trimmed).replace(/\s*image\.png\s*$/i, "");
  const stripped = key.replace(/^(?:\d+\.\s+|•\s+)/, "");
  const mapped =
    (locale === "en" ? MAP[key]?.en : MAP[key]?.ru) ||
    (locale === "en" ? MAP[stripped]?.en : MAP[stripped]?.ru);
  if (mapped) {
    if (/^\d+\./.test(key) && !/^\d+\./.test(mapped)) {
      const n = key.match(/^(\d+)\./)?.[1];
      return n ? `${n}. ${mapped.replace(/^\d+\.\s+/, "")}` : mapped;
    }
    return mapped;
  }

  const whole = fold(trimmed).replace(/\s*image\.png\s*$/i, "");
  for (const [uz, ru, en] of PHRASES) {
    const needle = fold(uz);
    if (needle && whole === needle) return locale === "en" ? en : ru;
  }

  const panel = whole.match(
    /^(\d+)\.\s+Tizimga kirganingizdan song "?([^"]+)"? paneliga(?:,)?\s*(?:va )?qoshimcha "?([^"]+)"? paneliga oting:?$/i,
  );
  if (panel) {
    const a = labelOf(panel[2], locale);
    const b = labelOf(panel[3], locale);
    if (fold(a) !== fold(panel[2]) && fold(b) !== fold(panel[3])) {
      return locale === "en"
        ? `${panel[1]}. After signing in, go to the ${quote(a, locale)} panel and then the ${quote(b, locale)} panel:`
        : `${panel[1]}. После входа в систему перейдите к панели ${quote(a, locale)} и затем к панели ${quote(b, locale)}:`;
    }
  }

  return raw;
}

export function localizeLessonText(text: string, locale: Locale) {
  if (!text || locale === "uz") return text;
  const prepared = String(text).replace(/\s+(?=\d+\.\s)/g, "\n");
  return prepared
    .split(/(\r?\n)/)
    .map((chunk) => {
      if (chunk === "\n" || chunk === "\r\n") return chunk;
      return localizeLine(chunk, locale);
    })
    .join("");
}

export function localizeLessonSummary(text: string, locale: Locale) {
  const complete = translateCatalog(text, locale);
  if (complete) return complete;
  const full = localizeLessonText(text, locale);
  const first = full
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line && !/^(IMAGE|VIDEO)::/i.test(line));
  return first || full;
}
