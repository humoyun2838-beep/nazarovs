import type { Locale } from "@/lib/locale";
import { translateKaa } from "@/lib/kaa";
import {
  FAQ_CATEGORY_COPY,
  FAQ_GROUPS,
  FAQ_ITEMS,
  type FaqGroup,
  type FaqItem,
} from "@/lib/faq-dmed";
import { FAQ_GROUP_COPY } from "@/lib/public-copy";

type FaqText = {
  title: string;
  summary: string;
  answer: string;
  tips: string[];
};

const ITEMS: Record<string, { ru: FaqText; en: FaqText }> = {
  "faq-face-id-oneid": {
    ru: {
      title: "Что делать, если Face-ID или OneID не работает?",
      summary: "Обновите пароль или войдите по ПИНФЛ.",
      answer:
        "Обновите пароль OneID (Единый портал). Затем войдите обычным способом — по ПИНФЛ и номеру телефона. На серверах Face-ID иногда бывает временная нагрузка, повторите попытку чуть позже.",
      tips: [
        "Сначала обновите пароль OneID.",
        "Войдите по ПИНФЛ и телефону.",
        "При нагрузке повторите через 5–10 минут.",
      ],
    },
    en: {
      title: "What if Face-ID or OneID does not work?",
      summary: "Update the password or sign in with PINFL.",
      answer:
        "Update your OneID (single portal) password. Then sign in the usual way — with PINFL and phone number. Face-ID servers can be busy at times; try again a little later.",
      tips: [
        "Update the OneID password first.",
        "Sign in with PINFL and phone.",
        "If it is busy, retry in 5–10 minutes.",
      ],
    },
  },
  "faq-ilova-xato": {
    ru: {
      title: "После обновления приложение не открывается. Что делать?",
      summary: "Очистите кэш или войдите через браузер.",
      answer:
        "Очистите кэш приложения или удалите его и установите заново. Если проблема остаётся, временно войдите через сайт в браузере.",
      tips: [
        "Очистите кэш.",
        "Удалите приложение и установите снова.",
        "Войдите через браузер.",
      ],
    },
    en: {
      title: "The app will not open after an update. What should I do?",
      summary: "Clear the cache or open it in a browser.",
      answer:
        "Clear the app cache, or uninstall and download it again. If the problem continues, sign in through the website in a browser for now.",
      tips: [
        "Clear the cache.",
        "Uninstall and reinstall the app.",
        "Sign in through a browser.",
      ],
    },
  },
  "faq-chet-el-fuqarolari": {
    ru: {
      title: "Как регистрируются иностранные граждане?",
      summary: "С видом на жительство — в системе, без него — в поликлинике.",
      answer:
        "Иностранцы с видом на жительство в Узбекистане могут быть зарегистрированы. Временно приехавшие обычно записываются на платные услуги через регистратуру поликлиники. Если в паспорте нет ПИНФЛ, онлайн-доступ может быть закрыт.",
      tips: [
        "Если есть вид на жительство — вас внесут в Dmed.",
        "Временный гость — через регистратуру.",
      ],
    },
    en: {
      title: "How do foreign citizens register?",
      summary: "Residence permit — in the system; otherwise at the clinic.",
      answer:
        "Foreigners with a Uzbekistan residence permit can be registered. Short-term visitors are usually booked for paid services at the clinic reception. If the passport has no PINFL, online access may be unavailable.",
      tips: [
        "With a residence permit they are added to Dmed.",
        "Temporary visitors go through reception.",
      ],
    },
  },
  "faq-tor-mutaxassis": {
    ru: {
      title: "Можно ли записаться сразу к ЛОРу или кардиологу?",
      summary: "Бесплатный приём — сначала семейный врач.",
      answer:
        "Для бесплатного приёма сначала нужно записаться к семейному врачу. Прямая запись может быть открыта только для некоторых платных услуг.",
      tips: [
        "Бесплатный путь: семейный врач → направление.",
        "На платные услуги прямая запись может быть открыта.",
      ],
    },
    en: {
      title: "Can I book an ENT or cardiologist directly?",
      summary: "Free visits start with the family doctor.",
      answer:
        "For a free visit you must first book the family doctor. Direct booking may be open only for some paid services.",
      tips: [
        "Free path: family doctor → referral.",
        "Paid services may allow direct booking.",
      ],
    },
  },
  "faq-jadval-band": {
    ru: {
      title: "Почему расписание врача всегда «занято»?",
      summary: "Высокий спрос или врача сейчас нет на работе.",
      answer:
        "Это значит, что спрос на электронную поликлинику очень высокий, или врач в отпуске / на повышении квалификации. Попробуйте другой день или другого врача.",
      tips: [
        "Выберите другую дату или врача.",
        "Утром слоты могут открываться быстрее.",
      ],
    },
    en: {
      title: "Why is the doctor’s schedule always “busy”?",
      summary: "High demand, or the doctor is not working now.",
      answer:
        "Demand for the electronic clinic is very high, or the doctor is on leave / in training. Try another day or another doctor.",
      tips: [
        "Pick another date or doctor.",
        "Slots may open faster in the morning.",
      ],
    },
  },
  "faq-server-navbat": {
    ru: {
      title: "Сгорит ли электронная очередь, если сервер Dmed не работает?",
      summary: "Нет — очередь хранится в базе.",
      answer:
        "Нет, ваша очередь сохраняется в базе. Пока система недоступна, врачи отмечают пациентов на бумаге; после восстановления данные вносят в базу.",
      tips: ["Очередь сохраняется.", "Приходите на приём вовремя."],
    },
    en: {
      title: "Will my e-queue be lost if the Dmed server is down?",
      summary: "No — the queue is stored in the database.",
      answer:
        "No, your place is stored in the database. While the system is down, doctors record patients on paper; after it is back, the data is entered into the database.",
      tips: ["The queue is kept.", "Arrive on time for the visit."],
    },
  },
  "faq-sms-qabul": {
    ru: {
      title: "Я не был на приёме, но пришло СМС «Вы были на приёме».",
      summary: "Ошибочная отметка — сообщите в поликлинику.",
      answer:
        "Это ошибочная отметка врача или регистратуры, либо очередь закрыли вручную. Сразу сообщите руководству поликлиники или в колл-центр.",
      tips: [
        "Сохраните СМС.",
        "Обратитесь в колл-центр или к руководству поликлиники.",
      ],
    },
    en: {
      title: "I did not attend, but I got an SMS “You were at the appointment”.",
      summary: "Wrong mark — tell the clinic.",
      answer:
        "A doctor or receptionist marked it by mistake, or the queue was closed manually. Tell clinic management or the call centre at once.",
      tips: [
        "Keep the SMS.",
        "Contact the call centre or clinic management.",
      ],
    },
  },
  "faq-statsionar-yollanma": {
    ru: {
      title: "Как лечь в больницу по электронному направлению?",
      summary: "Направление формируется в Dmed автоматически.",
      answer:
        "Электронное направление от семейной поликлиники формируется в Dmed автоматически. По этому документу вы встаёте в очередь и принимаетесь на стационарное лечение.",
      tips: [
        "Сначала получите направление в семейной поликлинике.",
        "Документ виден в Dmed — по нему вставайте в очередь.",
      ],
    },
    en: {
      title: "How do I go to hospital with an electronic referral?",
      summary: "The referral is created in Dmed automatically.",
      answer:
        "The electronic referral from the family clinic is created in Dmed automatically. You join the queue with that document and are admitted for inpatient care.",
      tips: [
        "Get the referral from the family clinic first.",
        "The document appears in Dmed — use it to join the queue.",
      ],
    },
  },
  "faq-imtiyozli-navbat": {
    ru: {
      title: "Есть ли приоритет в очереди для льготных лиц?",
      summary: "Статус учитывается; онлайн-слот — выбранное время.",
      answer:
        "Система учитывает льготный статус пациента, если он подтверждён в базе. Но при онлайн-записи все принимаются на выбранное время.",
      tips: [
        "Льгота должна быть подтверждена в базе.",
        "Онлайн-запись — на выбранное время.",
      ],
    },
    en: {
      title: "Do privileged patients get priority in the queue?",
      summary: "Status is used; an online slot is the chosen time.",
      answer:
        "The system uses the patient’s privileged status if it is confirmed in the database. For online booking, everyone is seen at the chosen time.",
      tips: [
        "Privilege must be confirmed in the database.",
        "Online booking is for the selected time.",
      ],
    },
  },
  "faq-dispanser": {
    ru: {
      title: "Можно ли записаться к психиатру или наркологу через Dmed?",
      summary: "Пока чаще нужно направление из поликлиники.",
      answer:
        "Специальные диспансеры подключаются поэтапно. Сейчас в большинстве случаев направление выдаёт поликлиника, прямая онлайн-запись может быть ограничена.",
      tips: [
        "Сначала возьмите направление у семейного врача.",
        "Прямая онлайн-запись может быть ещё закрыта.",
      ],
    },
    en: {
      title: "Can I book a psychiatrist or narcologist in Dmed?",
      summary: "A clinic referral is still needed in most cases.",
      answer:
        "Special dispensaries are being connected in stages. For now a referral usually comes from the clinic, and direct online booking may be limited.",
      tips: [
        "Get a referral from the family doctor first.",
        "Direct online booking may not be open yet.",
      ],
    },
  },
  "faq-poliklinikaga-biriktirilmagan": {
    ru: {
      title: "Появилось: «Вы не прикреплены ни к одной поликлинике».",
      summary: "Придите в поликлинику с паспортом.",
      answer:
        "Придите в поликлинику по месту жительства с паспортом и попросите внести вас в электронный реестр (базу Dmed). После обновления базы ошибка исчезнет.",
      tips: [
        "Возьмите паспорт.",
        "Попросите регистратуру внести вас в реестр Dmed.",
      ],
    },
    en: {
      title: "I see “You are not attached to any clinic”.",
      summary: "Go to the clinic with your passport.",
      answer:
        "Go to your local clinic with your passport and ask to be added to the electronic register (Dmed database). After the database is updated, the error goes away.",
      tips: [
        "Bring your passport.",
        "Ask reception to add you to the Dmed register.",
      ],
    },
  },
  "faq-chaqaloqni-qoshish": {
    ru: {
      title: "Как добавить новорождённого в систему?",
      summary: "Свидетельство + ПИНФЛ, затем регистратура.",
      answer:
        "Получите свидетельство о рождении и ПИНФЛ в ЗАГСе. Затем регистратура поликлиники внесёт ребёнка в базу. После этого он появится в разделе «Члены семьи» в кабинете.",
      tips: [
        "Сначала получите свидетельство и ПИНФЛ.",
        "После внесения ребёнок появится в «Члены семьи».",
      ],
    },
    en: {
      title: "How do I add a newborn to the system?",
      summary: "Certificate + PINFL, then reception.",
      answer:
        "Get the birth certificate and PINFL from civil registration. Then clinic reception adds the child to the database. After that the child appears in “My family members” in your account.",
      tips: [
        "Get the certificate and PINFL first.",
        "After they add the child, it shows in “My family members”.",
      ],
    },
  },
  "faq-emlash-kalendari": {
    ru: {
      title: "Могу ли я видеть календарь прививок ребёнка?",
      summary: "Да — в «Прививки» или «Медкарты».",
      answer:
        "Да. В профиле ребёнка в разделах «Медицинская история» или «Прививки» формируется электронный график полученных и предстоящих вакцин.",
      tips: [
        "Откройте профиль ребёнка.",
        "Ищите «Прививки» или «Медицинская история».",
      ],
    },
    en: {
      title: "Can I see my child’s vaccination calendar?",
      summary: "Yes — in Vaccinations or Medical history.",
      answer:
        "Yes. In the child’s profile, “Medical history” or “Vaccinations” shows an electronic schedule of vaccines already given and still due.",
      tips: [
        "Open the child’s profile.",
        "Look for Vaccinations or Medical history.",
      ],
    },
  },
  "faq-tibbiy-sugurta": {
    ru: {
      title: "Как пользоваться обязательным медстрахованием (ОМС)?",
      summary: "Через направление семейного врача.",
      answer:
        "Если в вашем регионе введено медстрахование, запишитесь к семейному врачу через Dmed. Бесплатные услуги и лекарства выдаются только по электронному направлению этого врача в рамках страховки.",
      tips: [
        "Сначала запишитесь к семейному врачу.",
        "Бесплатные лекарства — только по электронному направлению.",
      ],
    },
    en: {
      title: "How do I use mandatory health insurance (MHI)?",
      summary: "Through a family-doctor referral.",
      answer:
        "If health insurance is active in your area, book the family doctor in Dmed. Free services and medicines are given only with that doctor’s electronic referral under the insurance.",
      tips: [
        "Book the family doctor first.",
        "Free medicine needs an electronic referral.",
      ],
    },
  },
  "faq-bepul-dori": {
    ru: {
      title: "Как получить бесплатные лекарства?",
      summary: "Электронный рецепт + паспорт / ПИНФЛ.",
      answer:
        "После осмотра семейный врач выписывает электронный рецепт. С этим e-рецептом и паспортом (или ПИНФЛ) вы получаете лекарства бесплатно или со льготой в аптеках, подключённых к системе.",
      tips: [
        "Сначала осмотр врача.",
        "Покажите e-рецепт в аптеке.",
      ],
    },
    en: {
      title: "How do I get free medicines?",
      summary: "E-prescription + passport / PINFL.",
      answer:
        "After the visit the family doctor writes an electronic prescription. With that e-prescription and your passport (or PINFL) you get medicines free or at a reduced price in pharmacies connected to the system.",
      tips: [
        "See the doctor first.",
        "Show the e-prescription at the pharmacy.",
      ],
    },
  },
  "faq-tahlil-pdf": {
    ru: {
      title: "Можно ли скачать результаты анализов в PDF?",
      summary: "Да — из раздела «Анализы».",
      answer:
        "Когда результаты внесены в электронную базу, они появляются в личном кабинете в разделе «Анализы». Их можно скачать в PDF и показать другим врачам.",
      tips: [
        "Результат появится после внесения в базу.",
        "Скачайте PDF из кабинета.",
      ],
    },
    en: {
      title: "Can I download lab results as PDF?",
      summary: "Yes — from the Tests section.",
      answer:
        "After results are entered into the electronic database, they appear in your account under Tests. You can download them as PDF and show them to other doctors.",
      tips: [
        "Results appear after they are in the database.",
        "Download the PDF from your account.",
      ],
    },
  },
  "faq-qogoz-tarix": {
    ru: {
      title: "Могу ли я сам загрузить старую бумажную медкарту?",
      summary: "Пока пациент сам файлы не загружает.",
      answer:
        "Пока загрузка файлов пациентами ограничена. Предыдущие заключения должен внести ваш прикреплённый врач в виде PDF или фото.",
      tips: [
        "Принесите бумажные документы на приём.",
        "Попросите врача внести их в систему.",
      ],
    },
    en: {
      title: "Can I upload photos of my old paper medical record?",
      summary: "Patients cannot upload files yet.",
      answer:
        "Patient file uploads are limited for now. Your attached doctor should add previous conclusions as PDF or photos.",
      tips: [
        "Bring paper documents to the visit.",
        "Ask the doctor to add them to the system.",
      ],
    },
  },
  "faq-tez-yordam-103": {
    ru: {
      title: "Видны ли вызовы скорой (103) в Dmed?",
      summary: "Да — в системе семейного врача.",
      answer:
        "Карта вызова скорой отправляется в районную поликлинику и отображается у вашего семейного врача в списке «Активные вызовы».",
      tips: [
        "Вызов 103 передаётся в поликлинику.",
        "Семейный врач видит его в «Активные вызовы».",
      ],
    },
    en: {
      title: "Are ambulance (103) calls visible in Dmed?",
      summary: "Yes — in the family doctor’s system.",
      answer:
        "The ambulance call sheet is sent to the local clinic and appears for your family doctor in the Active calls list.",
      tips: [
        "A 103 call is forwarded to the clinic.",
        "The family doctor sees it under Active calls.",
      ],
    },
  },
  "faq-xususiy-klinika": {
    ru: {
      title: "Когда частные клиники полностью подключат к Dmed?",
      summary: "Пока только клиники по договору.",
      answer:
        "Сейчас подключены лишь некоторые частные клиники с договором государственного медстрахования. Остальные подключают поэтапно.",
      tips: [
        "Клиника с договором страхования — в Dmed.",
        "Остальные ещё в очереди.",
      ],
    },
    en: {
      title: "When will private clinics fully join Dmed?",
      summary: "Only contracted clinics for now.",
      answer:
        "Only some private clinics with a state health-insurance contract are connected. The rest are being added in stages.",
      tips: [
        "A clinic with an insurance contract is in Dmed.",
        "The others are still waiting.",
      ],
    },
  },
  "faq-shifokor-baho": {
    ru: {
      title: "Могу ли я оставить жалобу или благодарность врачу?",
      summary: "В части филиалов приходит оценка 1–5.",
      answer:
        "В некоторых филиалах тестируют оценку качества. После приёма в приложении может прийти опрос с оценкой работы врача от 1 до 5.",
      tips: [
        "После приёма дождитесь опроса.",
        "Если его нет — напишите через колл-центр.",
      ],
    },
    en: {
      title: "Can I leave a complaint or thanks for a doctor?",
      summary: "Some branches send a 1–5 rating survey.",
      answer:
        "Some branches are testing quality ratings. After the visit the app may send a survey to rate the doctor from 1 to 5.",
      tips: [
        "Wait for the survey after the visit.",
        "If there is none, write via the call centre.",
      ],
    },
  },
};

const CATEGORY: Record<Exclude<Locale, "uz">, { title: string; description: string }> =
  {
    ru: {
      title: "Топ-20 вопросов",
      description: "20 вопросов — 20 точных ответов. Со стикерами, поиском, открываются отдельно.",
    },
    en: {
      title: "Top 20 questions",
      description: "20 questions — 20 clear answers. Stickers, search, open on their own page.",
    },
    kaa: {
      title: "Top 20 soraw",
      description: "20 soraw — 20 anıq juwap. Stikerli, izlewli, ayrıqsha bette ashıladı.",
    },
  };

const HEADINGS: Record<Locale, { answer: string; path: string }> = {
  uz: { answer: "Javob", path: "Qisqa yo‘l" },
  ru: { answer: "Ответ", path: "Короткий путь" },
  en: { answer: "Answer", path: "Quick path" },
  kaa: { answer: "Juwap", path: "Qısqa jol" },
};

export function faqCategoryCopy(locale: Locale) {
  if (locale === "uz") return FAQ_CATEGORY_COPY;
  return CATEGORY[locale];
}

export function localizeFaqItem(item: FaqItem, locale: Locale): FaqItem {
  if (locale === "uz") return item;
  if (locale === "kaa") {
    return {
      ...item,
      title: translateKaa(item.title),
      summary: translateKaa(item.summary),
      answer: translateKaa(item.answer),
      tips: item.tips.map((tip) => translateKaa(tip)),
    };
  }
  const copy = ITEMS[item.slug]?.[locale];
  if (!copy) return item;
  return { ...item, ...copy };
}

export function localizedFaqGroups(locale: Locale): FaqGroup[] {
  return FAQ_GROUPS.map((group) => ({
    ...group,
    title: FAQ_GROUP_COPY[locale][group.id]?.title || group.title,
    hint: FAQ_GROUP_COPY[locale][group.id]?.hint || group.hint,
    items: group.items.map((item) => localizeFaqItem(item, locale)),
  }));
}

export function localizedFaqLessonContent(item: FaqItem, locale: Locale) {
  const local = localizeFaqItem(item, locale);
  const heading = HEADINGS[locale];
  const tips = local.tips.map((tip) => `• ${tip}`).join("\n");
  return `IMAGE::${local.sticker}

## ${heading.answer}

${local.answer}

## ${heading.path}

${tips}`;
}

export function localizedFaqBySlug(slug: string, locale: Locale) {
  const item = FAQ_ITEMS.find((row) => row.slug === slug);
  return item ? localizeFaqItem(item, locale) : undefined;
}
