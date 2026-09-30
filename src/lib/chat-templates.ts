export type ChatTemplateLang = "uz" | "ru";
export type ChatTemplateGroup = "salom" | "dars" | "texnik" | "yakun" | "custom";

export type ChatTemplate = {
  id: string;
  lang: ChatTemplateLang;
  group: ChatTemplateGroup;
  label: string;
  body: string;
  custom?: boolean;
};

export const CHAT_TEMPLATE_GROUPS: {
  id: ChatTemplateGroup;
  uz: string;
  ru: string;
}[] = [
  { id: "salom", uz: "Salom", ru: "Приветствие" },
  { id: "dars", uz: "Dars", ru: "Урок" },
  { id: "texnik", uz: "Yordam", ru: "Помощь" },
  { id: "yakun", uz: "Yakun", ru: "Завершение" },
  { id: "custom", uz: "Mening shablonlarim", ru: "Мои шаблоны" },
];

export const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    id: "uz-salom",
    lang: "uz",
    group: "salom",
    label: "Salom",
    body: "Assalomu alaykum! Savolingizni shu chatda yozing — hozir ko‘rib chiqaman.",
  },
  {
    id: "uz-dars-ochiq",
    lang: "uz",
    group: "dars",
    label: "Dars ochiq",
    body: "Dars ochiq. Katalogdan shu darsni bosing — video sahifa ichida ochiladi.",
  },
  {
    id: "uz-video",
    lang: "uz",
    group: "dars",
    label: "Video",
    body: "Videoni dars sahifasining o‘zida oching. Tashqi saytga o‘tish shart emas.",
  },
  {
    id: "uz-login",
    lang: "uz",
    group: "texnik",
    label: "Login kerak emas",
    body: "Mijozlar uchun login-parol shart emas. Darsni to‘g‘ridan-to‘g‘ri ochishingiz mumkin.",
  },
  {
    id: "uz-kuting",
    lang: "uz",
    group: "texnik",
    label: "Kuting",
    body: "Bir daqiqa, tekshirib aniq javob beraman.",
  },
  {
    id: "uz-qayta",
    lang: "uz",
    group: "texnik",
    label: "Qayta oching",
    body: "Sahifani yangilab, darsni qayta ochib ko‘ring. Bo‘lmasa, qaysi dars ekanini yozing.",
  },
  {
    id: "uz-tushunarli",
    lang: "uz",
    group: "yakun",
    label: "Tushunarli",
    body: "Tushunarli. Yana savol bo‘lsa, shu chatda yozing.",
  },
  {
    id: "uz-omad",
    lang: "uz",
    group: "yakun",
    label: "Omad",
    body: "Omadingizni tilayman. Darsni oxirigacha ko‘rib chiqing.",
  },
  {
    id: "ru-salom",
    lang: "ru",
    group: "salom",
    label: "Здравствуйте",
    body: "Здравствуйте! Напишите вопрос в этом чате — сейчас посмотрю.",
  },
  {
    id: "ru-dars-ochiq",
    lang: "ru",
    group: "dars",
    label: "Урок открыт",
    body: "Урок открыт. Откройте его в каталоге — видео играет на этой же странице.",
  },
  {
    id: "ru-video",
    lang: "ru",
    group: "dars",
    label: "Видео",
    body: "Откройте видео на странице урока. Переходить на другой сайт не нужно.",
  },
  {
    id: "ru-login",
    lang: "ru",
    group: "texnik",
    label: "Без входа",
    body: "Ученикам логин не нужен. Урок можно открыть сразу.",
  },
  {
    id: "ru-kuting",
    lang: "ru",
    group: "texnik",
    label: "Минуту",
    body: "Минуту, проверю и отвечу точно.",
  },
  {
    id: "ru-qayta",
    lang: "ru",
    group: "texnik",
    label: "Обновите",
    body: "Обновите страницу и откройте урок снова. Если не поможет — напишите название урока.",
  },
  {
    id: "ru-tushunarli",
    lang: "ru",
    group: "yakun",
    label: "Понятно",
    body: "Понятно. Если будет ещё вопрос — пишите в этом чате.",
  },
  {
    id: "ru-omad",
    lang: "ru",
    group: "yakun",
    label: "Удачи",
    body: "Удачи. Досмотрите урок до конца.",
  },
];

export function templatesFor(language?: string | null) {
  const lang: ChatTemplateLang = language === "ru" ? "ru" : "uz";
  return CHAT_TEMPLATES.filter((row) => row.lang === lang);
}

export function isCustomTemplateId(id: string) {
  return id.startsWith("c-") || id.startsWith("custom-");
}

export type ChatTemplatePack = {
  uz: ChatTemplate[];
  ru: ChatTemplate[];
};
