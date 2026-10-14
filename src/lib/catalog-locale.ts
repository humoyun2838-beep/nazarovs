import type { Locale } from "@/lib/locale";
import { translateKaa } from "@/lib/kaa";
import { FAQ_CATEGORY_SLUG } from "@/lib/faq-dmed";
import { faqCategoryCopy } from "@/lib/faq-locale";
import catalogI18n from "@/data/catalog-i18n.json";
import { translateCatalog } from "@/lib/ui-translation";

function norm(text: string) {
  return String(text || "")
    .replace(/[\u2018\u2019\u02BB\u02BC`']/g, "")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const RU: Array<[string, string]> = [
  ["Top 20 ta savol", "Топ-20 вопросов"],
  ["Eng ko'p beriladigan savollarga qisqa javoblar", "Топ-20 вопросов"],
  ["Ro'yxatga oluvchi", "Регистратор"],
  ["Amaliyotchi hamshira", "Процедурная медсестра"],
  ["Patronaj hamshirasi", "Патронажная медсестра"],
  ["Bosh hamshira", "Старшая медсестра"],
  ["Katta hamshira", "Старшая медсестра"],
  ["Qabul bo'limining navbatchi shifokor/Hamshirasi", "Дежурный врач/медсестра приёмного отделения"],
  ["Shifoxonaning davolovchi shifokor", "Лечащий врач стационара"],
  ["Shifoxona. Tor mutaxassis korik tartibi", "Стационар. Порядок осмотра узкого специалиста"],
  ["Taqrizchi (qayta ko'rib chiquvchi)", "Рецензент (повторная проверка)"],
  ["KPI (Asosiy samaradorlik ko'rsatkichlari)", "KPI (ключевые показатели эффективности)"],
  ["Yangi Omborxona", "Новый склад"],
  ["Muxlisa ilovasini o'rnatish", "Установка приложения Muxlisa"],
  ["Tizimga kirish", "Вход в систему"],
  ["Bepul belgilangan vaqtga yozilish", "Бесплатная запись на назначенное время"],
  ["Bepul jonli navbatga yozilish", "Бесплатная запись в живую очередь"],
  ["Belgilangan vaqtga qabulga pulli yozilish", "Платная запись на приём в назначенное время"],
  ["Jonli navbatga qabulga pulli yozilish", "Платная запись в живую очередь"],
  ["Tug'ilgan sanasi ma'lum bo'lmagan bemorni qidirish", "Поиск пациента с неизвестной датой рождения"],
  ["Bemor profilidagi shaxsiy ma'lumotlar yangilash", "Обновление личных данных в профиле пациента"],
  ["Hujjatni bemor profiliga biriktirish", "Прикрепление документа к профилю пациента"],
  ["Hisob-fakturalar bilan bog'liq operatsiyalar", "Операции, связанные со счетами-фактурами"],
  ['"Shartnomalar" bo\'limining funksionali', "Функции раздела «Договоры»"],
  ["Bepul yozilish", "Бесплатная запись"],
  ["Pulli yozilish", "Платная запись"],
  ["Bemorning profili", "Профиль пациента"],
  ["Yangi kassa", "Новая касса"],
  ["Bemorning antropometriya malumotlarini kiritish va shifokorga yuborish", "Ввод антропометрии пациента и отправка врачу"],
  ["Bemorlarning o'z hududiga biriktirilishi", "Прикрепление пациентов к своему участку"],
  ["DMED Pro mobil ilovasi orqali bemorni oilaviy shifokorga biriktirish", "Прикрепление пациента к семейному врачу через DMED Pro"],
  ["Patronaj rejasini tuzish", "Составление плана патронажа"],
  ["YUIKning testdan oldingi ehtimolini baholash", "Оценка дотестовой вероятности ИБС"],
  ["Yurak-qon tomir kasalliklarini erta aniqlash skriningi", "Скрининг раннего выявления сердечно-сосудистых заболеваний"],
  ["MISda YUQTK xavfini erta aniqlash skriningini o'tkazish", "Проведение скрининга риска ССЗ в МИС"],
  ['"Yurak-qon tomir kasalliklari skriningi" maqsadida patronajni rejalashtirish va amalga oshirish', "Планирование и проведение патронажа для скрининга ССЗ"],
  ["YuQTK skriningi natijalari bo'yicha bemorlarni saralash", "Сортировка пациентов по результатам скрининга ССЗ"],
  ["051, 051-1 sonli jurnallarni ko'rish", "Просмотр журналов №051, 051-1"],
  ["Qandli diabet skriningi", "Скрининг сахарного диабета"],
  ["MISda qandli diabet xavfini aniqlash skriningini o'tkazish", "Проведение скрининга риска сахарного диабета в МИС"],
  ["Skrining natijalari bo'yicha bemorlar ro'yxatini saralash", "Сортировка списка пациентов по результатам скрининга"],
  ['"Qandli diabet skriningi" maqsadida patronajni rejalashtirish va amalga oshirish', "Планирование и проведение патронажа для скрининга диабета"],
  ["Qandli diabet skriningi bo'yicha hujjatlar", "Документы по скринингу сахарного диабета"],
  ["Serebrovaskulyar kasalliklarni erta aniqlash so'rovnomasi", "Анкета раннего выявления цереброваскулярных заболеваний"],
  ["Ko'krak (sut) bezi saratonini erta aniqlash skriningi", "Скрининг раннего выявления рака молочной железы"],
  ["MISda ko'krak bezi saratonini erta aniqlash uchun skrining o'tkazish", "Скрининг рака молочной железы в МИС"],
  ["Gelmintoz (gijja) kasalliklarni erta aniqlash skriningi", "Скрининг раннего выявления гельминтозов"],
  ["MISda gelmintoz kasalliklarni erta aniqlash skriningini o'tkazish", "Скрининг гельминтозов в МИС"],
  ["Onkogematologik kasalliklarni erta aniqlash so'rovnomasi", "Анкета раннего выявления онкогематологических заболеваний"],
  ["MISda onkogematologik kasalliklar bo'yicha so'rovnoma o'tkazish", "Анкета по онкогематологии в МИС"],
  ['"Onkogematologik kasalliklarni erta aniqlash skriningi" maqsadida patronaj ko\'rikni rejalashtirish', "Планирование патронажного осмотра для онкогематологического скрининга"],
  ["Onkogematologik kasalliklar so'rovnomasi natijalari bo'yicha bemorlarni saralash", "Сортировка пациентов по анкете онкогематологии"],
  ["Fertillik so'rovnomasini to'ldirish", "Заполнение анкеты фертильности"],
  ["Fertillik so'rovnomasi", "Анкета фертильности"],
  ["Akusher-ginekologning (doyaning) №024-2 kundalik qabul jurnalini ko'rib chiqish", "Просмотр дневного журнала приёма акушера-гинеколога (акушерки) №024-2"],
  ["Skrining/So'rovnomalar", "Скрининг/анкеты"],
  ["DMED PROda \"Onkogematologik kasalliklarni erta aniqlash skriningi\" maqsadida patronaj ko'rikni rejalashtirish", "Планирование патронажа в DMED PRO для онкогематологического скрининга"],
  ["Ko'krak bezi saratonini erta aniqlash skriningini o'tkazish", "Проведение скрининга рака молочной железы"],
  ["Bemorni qabulga taklif qilish va yangi epizod yaratish", "Вызов пациента на приём и создание нового эпизода"],
  ["Bemorning kasallik tarihini davom ettirish", "Продолжение истории болезни пациента"],
  ["Qo'shimcha talon", "Дополнительный талон"],
  ["Bemorni analizga yuborish", "Направление пациента на анализы"],
  ["Bemorni boshqa mutaxassisga yuborish", "Направление пациента к другому специалисту"],
  ["Murojat epizodi orqali kasalxonaga yotqizish", "Госпитализация через эпизод обращения"],
  ["Homiladorlikni ro'yxatga olish", "Постановка беременности на учёт"],
  ["Homiladorlik bo'yicha hisobga qo'yish", "Постановка на учёт по беременности"],
  ["Homiladorlik hisobini o'chirish", "Снятие с учёта по беременности"],
  ["111-shaklni to'ldirish (Homilador ayolning shaxsiy kartasi)", "Заполнение формы 111 (индивидуальная карта беременной)"],
  ["113-shaklni to'ldirish (Homilador ayolning almashinuv kartasi)", "Заполнение формы 113 (обменная карта беременной)"],
  ['"Tug\'ruq" maqsadida shifoxonaga yotqizish uchun yo\'llanma', "Направление в стационар с целью родов"],
  ["Elektron retsept", "Электронный рецепт"],
  ["MISda oddiy retsept yozish", "Выписка обычного рецепта в МИС"],
  ["DMED Pro'da oddiy retsept yozish", "Выписка обычного рецепта в DMED Pro"],
  ["MISda reimbursatsiya retseptini yozish", "Выписка рецепта возмещения в МИС"],
  ["Retseptni bekor qilish", "Отмена рецепта"],
  ["Elektron hujjat aylanishi", "Электронный документооборот"],
  ["Mehnatga layoqatsizlik varaqasini rasmiylashtirish, uzaytirish, bekor qilish va yopish", "Оформление, продление, отмена и закрытие листа нетрудоспособности"],
  ["Homiladorlik va tug'ish bo'yicha mehnatga layoqatsizlik varaqasini rasmiylashtirish, uzaytirish, bekor qilish va yopish", "Оформление, продление, отмена и закрытие листа нетрудоспособности по беременности и родам"],
  ["Tasdiqlash, tuzatishga qaytarish, mehnatga layoqatsizlik varaqasini chop etish", "Подтверждение, возврат на исправление, печать листа нетрудоспособности"],
  ["Avval yopilgan mehnatga layoqatsizlik varaqasini davom ettirish", "Продолжение ранее закрытого листа нетрудоспособности"],
  ["Mehnatga layoqatsizlik varaqasini chop etish", "Печать листа нетрудоспособности"],
  ["Mehnatga layoqatsizlik varaqasi", "Лист нетрудоспособности"],
  ["Ma'lumotnoma yaratish", "Создание справки"],
  ["Elektron hujjatlarning haqiqiyligini tekshirish", "Проверка подлинности электронных документов"],
  ["Qo'lda kiritish jurnallarini to'ldirish", "Заполнение журналов ручного ввода"],
  ["BI orqali jurnallarni ko'rish", "Просмотр журналов через BI"],
  ["039-shaklni yuklab olish", "Скачивание формы 039"],
  ["Nikohdan o'tish uchun tibbiy ko'rik ma'lumotnomasi", "Справка медосмотра для вступления в брак"],
  ["Ma'lumotnomani yaratish, tahrirlash va ko'rib chiqish", "Создание, редактирование и просмотр справки"],
  ['"Nikoh uchun ma\'lumotnomalar" kichik bo\'limi funksionali', "Функции подраздела «Справки для брака»"],
  ["058-shakl - Yuqumli kasallik haqida shoshilinch xabar", "Форма 058 — экстренное извещение об инфекционном заболевании"],
  ["086-raqamli ma'lumotnomalar", "Справки №086"],
  ["Tibbiy ma'lumotnoma №086-1", "Медицинская справка №086-1"],
  ["Tibbiy ma'lumotnoma №086-2", "Медицинская справка №086-2"],
  ["Tibbiy ma'lumotnoma №086", "Медицинская справка №086"],
  ["Haj / Umra ziyoratini amalga oshiruvchi ziyoratchilar uchun tibbiy ko'rikdan o'tganligi to'g'risida tibbiy ma'lumotnoma", "Медицинская справка о медосмотре для паломников Хадж / Умра"],
  ["Ziyorat vaqtida ko'rikdan o'tkazish jarayoni", "Процесс осмотра во время паломничества"],
  ["Haj / Umra ziyoratini ado etuvchi ziyoratchilar uchun tibbiy ko'rikdan o'tganlik to'g'risidagi ma'lumotnomani yaratish", "Создание справки о медосмотре для паломников Хадж / Умра"],
  ["Xavfsizlik kamarini taqmaslikka ruxsat beruvchi tibbiy ma'lumotnomani tasdiqlash", "Подтверждение справки об освобождении от ремня безопасности"],
  ["Xavfsizlik kamarini taqmaslikka ruxsat beruvchi tibbiy ma'lumotnomani yaratish", "Создание справки об освобождении от ремня безопасности"],
  ["Xavfsizlik kamarini taqmaslikka ruxsat beruvchi tibbiy ma'lumotnoma", "Справка об освобождении от ремня безопасности"],
  ["Davolash kursini yaratish", "Создание курса лечения"],
  ["Fizioterapevtik muolajani tayinlash", "Назначение физиотерапии"],
  ["Fizioterapiya kursini o'tkazish jarayonini kuzatish. 031-jurnalni ko'rib chiqish", "Контроль курса физиотерапии. Просмотр журнала 031"],
  ["Fizioterapiya", "Физиотерапия"],
  ["Emlash", "Вакцинация"],
  ["Shifokor profilida vositachilik haqi dasturi bo'yicha to'lovlarni ko'rish", "Просмотр выплат программы посреднического вознаграждения в профиле врача"],
  ["Shapka va tekshiruv shablonlarini qo'shish", "Добавление шапки и шаблонов осмотра"],
  ["Ambulatoriya operatsiyasini o'tkazish", "Проведение амбулаторной операции"],
  ["Ambulatoriya operatsiyalarini ro'yxatga olish jurnalini ko'rish", "Просмотр журнала амбулаторных операций"],
  ["Ambulator operatsiya", "Амбулаторная операция"],
  ["Shifokor-maslahat komissiyasi majlisini o'tkazish", "Проведение заседания врачебно-консультационной комиссии"],
  ["Shifokor-maslahat komissiya xulosalarini ro'yxatga olish jurnalini ko'rib chiqish", "Просмотр журнала заключений ВКК"],
  ["Shifokor-maslahat komissiyasi majlisi", "Заседание врачебно-консультационной комиссии"],
];

const EN: Array<[string, string]> = [
  ["Top 20 ta savol", "Top 20 questions"],
  ["Eng ko'p beriladigan savollarga qisqa javoblar", "Top 20 questions"],
  ["Ro'yxatga oluvchi", "Registrar"],
  ["Amaliyotchi hamshira", "Practice nurse"],
  ["Patronaj hamshirasi", "Patronage nurse"],
  ["Bosh hamshira", "Head nurse"],
  ["Katta hamshira", "Senior nurse"],
  ["Qabul bo'limining navbatchi shifokor/Hamshirasi", "Duty doctor/nurse of the admission unit"],
  ["Shifoxonaning davolovchi shifokor", "Hospital attending doctor"],
  ["Shifoxona. Tor mutaxassis korik tartibi", "Hospital. Narrow specialist exam flow"],
  ["Taqrizchi (qayta ko'rib chiquvchi)", "Reviewer"],
  ["KPI (Asosiy samaradorlik ko'rsatkichlari)", "KPI (key performance indicators)"],
  ["Yangi Omborxona", "New warehouse"],
  ["Muxlisa ilovasini o'rnatish", "Install the Muxlisa app"],
  ["Tizimga kirish", "Sign in to the system"],
  ["Bepul belgilangan vaqtga yozilish", "Free booking for a set time"],
  ["Bepul jonli navbatga yozilish", "Free live-queue booking"],
  ["Belgilangan vaqtga qabulga pulli yozilish", "Paid booking for a set appointment time"],
  ["Jonli navbatga qabulga pulli yozilish", "Paid live-queue booking"],
  ["Tug'ilgan sanasi ma'lum bo'lmagan bemorni qidirish", "Search a patient with unknown date of birth"],
  ["Bemor profilidagi shaxsiy ma'lumotlar yangilash", "Update personal data in the patient profile"],
  ["Hujjatni bemor profiliga biriktirish", "Attach a document to the patient profile"],
  ["Hisob-fakturalar bilan bog'liq operatsiyalar", "Invoice-related operations"],
  ['"Shartnomalar" bo\'limining funksionali', "Contracts section functions"],
  ["Bepul yozilish", "Free booking"],
  ["Pulli yozilish", "Paid booking"],
  ["Bemorning profili", "Patient profile"],
  ["Yangi kassa", "New cash desk"],
  ["Bemorning antropometriya malumotlarini kiritish va shifokorga yuborish", "Enter patient anthropometry and send to the doctor"],
  ["Bemorlarning o'z hududiga biriktirilishi", "Attach patients to their catchment area"],
  ["DMED Pro mobil ilovasi orqali bemorni oilaviy shifokorga biriktirish", "Attach a patient to a family doctor via DMED Pro"],
  ["Patronaj rejasini tuzish", "Make a patronage plan"],
  ["Skrining/So'rovnomalar", "Screening/questionnaires"],
  ["Elektron retsept", "Electronic prescription"],
  ["Fizioterapiya", "Physiotherapy"],
  ["Emlash", "Vaccination"],
  ["Ambulator operatsiya", "Outpatient surgery"],
  ["Shifokor-maslahat komissiyasi majlisi", "Doctor advisory commission meeting"],
  ["Mehnatga layoqatsizlik varaqasi", "Sick-leave certificate"],
  ["Davolash kursini yaratish", "Create a treatment course"],
];

function escapeRe(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyPairs(text: string, pairs: Array<[string, string]>) {
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  return String(text)
    .split(/(\r?\n)/)
    .map((chunk) => {
      if (chunk === "\n" || chunk === "\r\n") return chunk;
      const trimmed = chunk.trim();
      if (!trimmed || /^(IMAGE|VIDEO)::/i.test(trimmed)) return chunk;
      let out = norm(chunk);
      for (const [from, to] of sorted) {
        const needle = norm(from);
        if (!needle || needle.length < 5) continue;
        if (out === needle) return to;
        const re = new RegExp(
          `(?<![\\p{L}\\p{N}])${escapeRe(needle)}(?![\\p{L}\\p{N}])`,
          "gu",
        );
        out = out.replace(re, to);
      }
      return out;
    })
    .join("");
}

const MORE_RU: Array<[string, string]> = [
  ["DMED o'quv darsi — to'liq matn, rasm va video shu saytda.", "Учебный урок DMED — полный текст, фото и видео на этом сайте."],
  ["Ushbu darsda", "В этом уроке"],
  ["Imtiyozli yo'llanma asosida shifoxonaga yotqizish", "Госпитализация по льготному направлению"],
  ["D-ro'yxat", "D-список"],
  ["Ambulatoriyada 112 xizbati: hodisalar haqida ogohlantirish", "Служба 112 в амбулатории: оповещение о событиях"],
  ["Statsionardagi 112 xizmati: qisqacha instruksiya", "Служба 112 в стационаре: краткая инструкция"],
  ["Biomaterialni olish", "Забор биоматериала"],
  ["Bemor test natijalarini kiritish", "Ввод результатов тестов пациента"],
  ["Yangi LIS", "Новая ЛИС"],
  ["\"Buyurtmalar\" bo'limi funksionali", "Функции раздела «Заказы»"],
  ["Biomaterial olish, buyurtma yaratish, buyurtma shtrix-kodi va tekshiruv ro'yxatini (chek-listni) chop etish, buyurtmani boshqa laboratoriyaga yo'naltirish, buyurtmani rad etish, buyurtmani nolga tenglashtirish", "Забор биоматериала, создание заказа, печать штрихкода и чек-листа, направление в другую лабораторию, отказ и обнуление заказа"],
  ["Natijani kiritish uchun tahlilni qidirish", "Поиск анализа для ввода результата"],
  ["Tahlil natijasini kiritish va tasdiqlash. Tahlilni chop etish", "Ввод и подтверждение результата анализа. Печать анализа"],
  ["Laboratoriyadan buyurtma yaratish", "Создание заказа из лаборатории"],
  ["Tahlillardan foydalanish imkoniyatini boshqarish Tarkibiy tahlil ichida parametrlarni ko'rsatish tartibini sozlash", "Управление доступом к анализам. Порядок параметров внутри составного анализа"],
  ["Reimbursatsiya retseptini tasdiqlash/qayta ishlashga yuborish", "Подтверждение рецепта возмещения / отправка на доработку"],
  ["Akkaunt yaratish", "Создание учётной записи"],
  ["Hisobni (akkauntni) faolsizlantirish", "Отключение учётной записи"],
  ["Kasalxonaga yotqizish holatini tasdiqlash", "Подтверждение госпитализации"],
  ["Mehnatga layoqatsizlik varaqasini tasdiqlash, tuzatish uchun qaytarish", "Подтверждение листа нетрудоспособности, возврат на исправление"],
  ["Yurak-qon tomir kasalliklarini erta aniqlash skriningi bo'yicha hujjatlar", "Документы скрининга раннего выявления ССЗ"],
  ["Ma'lumotnomani tasdiqlash va uni tuzatish uchun yuborish", "Подтверждение справки и отправка на исправление"],
  ["086-son tibbiy ma'lumotnomalarni tasdiqlash", "Подтверждение медицинских справок №086"],
  ["Buhgalteriya", "Бухгалтерия"],
  ['"Muolaja" turidagi xizmatlarni sozlash', "Настройка услуг типа «Процедура»"],
  ["Ombordagi mahsulot narxini sozlash", "Настройка цены товара на складе"],
  ["Xodim to'g'risida ma'lumot kiritish", "Ввод сведений о сотруднике"],
  ["Xodimni uchastka va xonaga (kabinetga) biriktirish", "Прикрепление сотрудника к участку и кабинету"],
  ["Xodimning ta'til jadvali to'g'risida ma'lumotlarni kiritish", "Ввод графика отпуска сотрудника"],
  ["Xodimning ish jadvali to'g'risida ma'lumotlarni kiritish", "Ввод графика работы сотрудника"],
  ["Xodimning lavozimi to'g'risida ma'lumotlarni kiritish", "Ввод должности сотрудника"],
  ["Ombor mudiri", "Заведующий складом"],
  ["Ma'lumotnomalar/Mahsulotlar", "Справочники/Товары"],
  ["Ma'lumotnomalar/Ta'minotchilar", "Справочники/Поставщики"],
  ["Ma'lumotnomalar/Hisob raqamlari", "Справочники/Счета"],
  ["Ma'lumotnomalar/Sub-markaziy omborlar", "Справочники/Субцентральные склады"],
  ["Ma'lumotnomalar/Bo'lim omborlari", "Справочники/Склады отделения"],
  ["Ma'lumotnomalar", "Справочники"],
  ["Hujjatlar", "Документы"],
  ["Ehtiyohlar", "Потребности"],
  ["Kirimlar", "Приходы"],
  ["Talabnomalar", "Заявки"],
  ["Sarflar", "Расходы"],
  ["Qaytarilganlar", "Возвраты"],
  ["Hisobdan chiqarish", "Списание"],
  ["Qoldiqlar", "Остатки"],
  ["Hisob/Ehtiyojlar", "Учёт/Потребности"],
  ["Hisob/Talabnomalar", "Учёт/Заявки"],
  ["Hisob/Sarflar", "Учёт/Расходы"],
  ["Hisob/Qaytarilganlar", "Учёт/Возвраты"],
  ["Hisob/Qoldiqlar", "Учёт/Остатки"],
  ["Post omborlar/Talabnomalar", "Постовые склады/Заявки"],
  ["Post omborlar/Sarflar", "Постовые склады/Расходы"],
  ["Post omborlar/Qaytarilganlar", "Постовые склады/Возвраты"],
  ["Post omborlar/Sterilizatsiya", "Постовые склады/Стерилизация"],
  ["Post omborlar/Qoldiqlar", "Постовые склады/Остатки"],
  ["Omborxona/Sterilizatsiya", "Склад/Стерилизация"],
  ["Omborxona/Markazlashtirilgan sterilizatsiya bo'limi", "Склад/Централизованное стерилизационное отделение"],
  ["KPI moduli haqida umumiy ma'lumot", "Общие сведения о модуле KPI"],
  ["Oila shifokori KPI", "KPI семейного врача"],
  ["Amaliyotchi hamshira KPI", "KPI процедурной медсестры"],
  ["Patronaj hamshirasi KPI", "KPI патронажной медсестры"],
  ["Ultratovushli diagnostika / Rentgen shifokori KPI", "KPI врача УЗИ / рентгена"],
  ["Bolalar shifokori KPI", "KPI детского врача"],
  ["Akusher-ginekolog KPI", "KPI акушера-гинеколога"],
  ["Direktor KPI", "KPI директора"],
  ["DMED mobil ilovasi", "Мобильное приложение DMED"],
  ["DMED ilovasida avtorizatsiya", "Авторизация в приложении DMED"],
  ["Bosh sahifa", "Главная"],
  ["Mening qabullarim", "Мои приёмы"],
  ["Tibbiy karta", "Медкарта"],
  ["Oilaviy akkaunt", "Семейный аккаунт"],
  ["Akkaunt", "Аккаунт"],
  ["DMED ilovasida imtiyozli yo'llanma holatini kuzatish va klinikani tanlash", "Отслеживание льготного направления и выбор клиники в приложении DMED"],
  ["Retsept haqida umumiy ma'lumot", "Общие сведения о рецепте"],
  ["Retseptni ko'rish", "Просмотр рецепта"],
  ["Elektron retsept orqali dori-vositasini olish", "Получение лекарства по электронному рецепту"],
  ["Muxlisa (infokiosk) yordamida bemorning o'zini mustaqil ravishda qabulga yozdirib olishi", "Самостоятельная запись пациента на приём через Muxlisa (инфокиоск)"],
  ["Davolash kursini o'tkazish", "Проведение курса лечения"],
  ["Fizioterapiya kursini o'tkazish", "Проведение курса физиотерапии"],
  ["Muolaja hamshirasi", "Процедурная медсестра"],
  ["Fizioterapiya hamshirasi", "Медсестра физиотерапии"],
  ["Laborant", "Лаборант"],
  ["Direktor", "Директор"],
  ["Statist", "Статистик"],
  ["Farmasevt", "Фармацевт"],
  ["Buxgalter", "Бухгалтер"],
  ["Kassir", "Кассир"],
  ["Hamshira", "Медсестра"],
  ["Bemor", "Пациент"],
  ["Shifokor", "Врач"],
  ["Profile / Statistika", "Профиль / Статистика"],
  ["Bemorning D-hisobi haqidagi ma'lumotlarni kiritish va ko'rish", "Ввод и просмотр данных D-учёта пациента"],
  ["Dispanser hisobi jurnalini ko'rish (030-sonli)", "Просмотр журнала диспансерного учёта (№030)"],
  ["MISda bemorlarni D-hisob ma'lumotlarini ko'rish", "Просмотр D-учёта пациентов в МИС"],
  ["Chaqaloqlarda eshitish qobiliyatini tekshirish", "Проверка слуха у новорождённых"],
  ["Ambulatoriyada 112 xizmati: qisqacha instruksiya", "Служба 112 в амбулатории: краткая инструкция"],
  ["\"Imtiyozli yo'llanmalar\" bo'limining umumiy funksionali", "Общие функции раздела «Льготные направления»"],
  ["Birlamchi bo'g'inda yo'llanma yaratish", "Создание направления на первичном уровне"],
  ["Imtiyozli yo'llanma bo'yicha shifoxonaga rasmiylashtirish jarayoni", "Оформление в стационар по льготному направлению"],
  ["Ko'p tarmoqli poliklinika tomonidan yo'llanmani ko'rib chiqish", "Рассмотрение направления многопрофильной поликлиникой"],
  ["Oilaviy shifokor tomonidan gospitalizatsiya uchun tibbiyot muassasasini tanlash", "Выбор медучреждения для госпитализации семейным врачом"],
  ["Respublika komissiyasi tomonidan yo'llanmani ko'rib chiqish", "Рассмотрение направления республиканской комиссией"],
  ["Viloyat komissiyasi tomonidan yo'llanmani ko'rib chiqish", "Рассмотрение направления областной комиссией"],
  ["Bemorni joylashtirish. Kasalxonaga qabul qilish", "Размещение пациента. Приём в больницу"],
  ["Yo'llanmasiz bemorni ro'yxatga olish va joylashtirish", "Регистрация и размещение пациента без направления"],
  ["Shaxsi noma'lum bemorni ro'yxatga olish (rasmiylashtirish)", "Регистрация пациента без установленных данных"],
  ["\"Tug'ruq\" maqsadida rejali va shoshilinch kasalxonaga yotqizish", "Плановая и экстренная госпитализация с целью родов"],
  ["Boshlangich tekshiruvni otkazish", "Проведение первичного осмотра"],
  ["003-tibbiy xujjat shaklini yaratish/tahrirlash va chop etish", "Создание/редактирование и печать формы 003"],
  ["Kasalxonaga yotkizish. Bemorni ko'chirish.", "Госпитализация. Перевод пациента."],
  ["Analizga yuborish", "Направление на анализы"],
  ["Tor mutaxassisga yunaltirish", "Направление к узкому специалисту"],
  ["Davolash kundaligini yaratish va tahrirlash", "Создание и редактирование дневника лечения"],
  ["Klinik tashxisni asoslash", "Обоснование клинического диагноза"],
  ["Bo'limda ko'rikdan o'tkazish", "Осмотр в отделении"],
  ["Jarrohlik amaliyotidan oldingi epikriz", "Дооперационный эпикриз"],
  ["Bosqichli epikrizni yaratish", "Создание этапного эпикриза"],
  ["Chiqaruv epikrizi - yaratish va chop etish", "Выписной эпикриз — создание и печать"],
  ["Kasalxonaga qabul qilish. Forma 066 toldirish", "Приём в больницу. Заполнение формы 066"],
  ["Homiladorlik va tug'ruq", "Беременность и роды"],
  ["Tug'ruq protokolini to'ldirish", "Заполнение протокола родов"],
  ["096-shaklni to'ldirish (homiladorlik va tug'ruq bo'yicha karta)", "Заполнение формы 096 (карта беременности и родов)"],
  ["097-shaklni to'ldirish (yangi tug'ilgan chaqaloqning rivojlanish kartasi)", "Заполнение формы 097 (карта развития новорождённого)"],
  ["Statsionardagi 112 xizmati: Hodisalar haqida ogohlantirish", "Служба 112 в стационаре: оповещение о событиях"],
];

const MORE_EN: Array<[string, string]> = [
  ["DMED o'quv darsi — to'liq matn, rasm va video shu saytda.", "DMED lesson — full text, photos and video on this site."],
  ["Ushbu darsda", "In this lesson"],
  ["Imtiyozli yo'llanma asosida shifoxonaga yotqizish", "Hospital admission with a privileged referral"],
  ["D-ro'yxat", "D-list"],
  ["Ambulatoriyada 112 xizbati: hodisalar haqida ogohlantirish", "112 service in outpatient care: event alerts"],
  ["Statsionardagi 112 xizmati: qisqacha instruksiya", "112 service in hospital: short guide"],
  ["Biomaterialni olish", "Take a biomaterial sample"],
  ["Bemor test natijalarini kiritish", "Enter patient test results"],
  ["Yangi LIS", "New LIS"],
  ["\"Buyurtmalar\" bo'limi funksionali", "Orders section functions"],
  ["Natijani kiritish uchun tahlilni qidirish", "Search a test to enter the result"],
  ["Tahlil natijasini kiritish va tasdiqlash. Tahlilni chop etish", "Enter and confirm a test result. Print the test"],
  ["Laboratoriyadan buyurtma yaratish", "Create an order from the lab"],
  ["Reimbursatsiya retseptini tasdiqlash/qayta ishlashga yuborish", "Approve a reimbursement prescription / send for rework"],
  ["Akkaunt yaratish", "Create an account"],
  ["Hisobni (akkauntni) faolsizlantirish", "Deactivate an account"],
  ["Kasalxonaga yotqizish holatini tasdiqlash", "Confirm a hospital admission"],
  ["Laborant", "Lab technician"],
  ["Direktor", "Director"],
  ["Statist", "Statistician"],
  ["Farmasevt", "Pharmacist"],
  ["Ombor mudiri", "Warehouse manager"],
  ["Buxgalter", "Accountant"],
  ["Kassir", "Cashier"],
  ["Hamshira", "Nurse"],
  ["Bemor", "Patient"],
  ["Shifokor", "Doctor"],
  ["Bosh sahifa", "Home"],
  ["Mening qabullarim", "My appointments"],
  ["Tibbiy karta", "Medical record"],
  ["Akkaunt", "Account"],
  ["Ma'lumotnomalar", "Directories"],
  ["Hujjatlar", "Documents"],
  ["Kirimlar", "Incoming"],
  ["Talabnomalar", "Requests"],
  ["Sarflar", "Issues"],
  ["Qaytarilganlar", "Returns"],
  ["Qoldiqlar", "Stock"],
  ["Davolash kursini o'tkazish", "Run a treatment course"],
  ["Fizioterapiya kursini o'tkazish", "Run a physiotherapy course"],
  ["Muolaja hamshirasi", "Procedure nurse"],
  ["Fizioterapiya hamshirasi", "Physiotherapy nurse"],
  ["Profile / Statistika", "Profile / Statistics"],
  ["KPI moduli haqida umumiy ma'lumot", "Overview of the KPI module"],
  ["Oila shifokori KPI", "Family doctor KPI"],
  ["Amaliyotchi hamshira KPI", "Practice nurse KPI"],
  ["Patronaj hamshirasi KPI", "Patronage nurse KPI"],
  ["Ultratovushli diagnostika / Rentgen shifokori KPI", "Ultrasound / X-ray doctor KPI"],
  ["Bolalar shifokori KPI", "Pediatrician KPI"],
  ["Akusher-ginekolog KPI", "Obstetrician-gynecologist KPI"],
  ["Direktor KPI", "Director KPI"],
  ["DMED mobil ilovasi", "DMED mobile app"],
  ["DMED ilovasida avtorizatsiya", "Sign in to the DMED app"],
  ["Oilaviy akkaunt", "Family account"],
  ["Retsept haqida umumiy ma'lumot", "Prescription overview"],
  ["Retseptni ko'rish", "View a prescription"],
  ["Elektron retsept orqali dori-vositasini olish", "Get medicine with an electronic prescription"],
  ["Bemorning D-hisobi haqidagi ma'lumotlarni kiritish va ko'rish", "Enter and view the patient’s D-register data"],
  ["Dispanser hisobi jurnalini ko'rish (030-sonli)", "View the dispensary register journal (No. 030)"],
  ["MISda bemorlarni D-hisob ma'lumotlarini ko'rish", "View patient D-register data in MIS"],
  ["Chaqaloqlarda eshitish qobiliyatini tekshirish", "Newborn hearing screening"],
  ["Ambulatoriyada 112 xizmati: qisqacha instruksiya", "112 service in outpatient care: short guide"],
  ["\"Imtiyozli yo'llanmalar\" bo'limining umumiy funksionali", "Privileged referrals section overview"],
  ["Birlamchi bo'g'inda yo'llanma yaratish", "Create a referral at primary care"],
  ["Imtiyozli yo'llanma bo'yicha shifoxonaga rasmiylashtirish jarayoni", "Hospital admission process with a privileged referral"],
  ["Ko'p tarmoqli poliklinika tomonidan yo'llanmani ko'rib chiqish", "Multidisciplinary clinic reviews the referral"],
  ["Oilaviy shifokor tomonidan gospitalizatsiya uchun tibbiyot muassasasini tanlash", "Family doctor chooses a facility for admission"],
  ["Respublika komissiyasi tomonidan yo'llanmani ko'rib chiqish", "Republican commission reviews the referral"],
  ["Viloyat komissiyasi tomonidan yo'llanmani ko'rib chiqish", "Regional commission reviews the referral"],
  ["Bemorni joylashtirish. Kasalxonaga qabul qilish", "Place the patient. Admit to hospital"],
  ["Yo'llanmasiz bemorni ro'yxatga olish va joylashtirish", "Register and place a patient without a referral"],
  ["Shaxsi noma'lum bemorni ro'yxatga olish (rasmiylashtirish)", "Register an unidentified patient"],
  ["\"Tug'ruq\" maqsadida rejali va shoshilinch kasalxonaga yotqizish", "Planned and emergency admission for childbirth"],
  ["Boshlangich tekshiruvni otkazish", "Perform the initial exam"],
  ["003-tibbiy xujjat shaklini yaratish/tahrirlash va chop etish", "Create/edit and print form 003"],
  ["Kasalxonaga yotkizish. Bemorni ko'chirish.", "Hospital admission. Transfer the patient."],
  ["Analizga yuborish", "Send for tests"],
  ["Tor mutaxassisga yunaltirish", "Refer to a narrow specialist"],
  ["Davolash kundaligini yaratish va tahrirlash", "Create and edit the treatment diary"],
  ["Klinik tashxisni asoslash", "Justify the clinical diagnosis"],
  ["Bo'limda ko'rikdan o'tkazish", "Examine in the ward"],
  ["Jarrohlik amaliyotidan oldingi epikriz", "Pre-surgery epicrisis"],
  ["Bosqichli epikrizni yaratish", "Create a staged epicrisis"],
  ["Chiqaruv epikrizi - yaratish va chop etish", "Discharge epicrisis — create and print"],
  ["Kasalxonaga qabul qilish. Forma 066 toldirish", "Hospital admission. Fill in form 066"],
  ["Homiladorlik va tug'ruq", "Pregnancy and childbirth"],
  ["Tug'ruq protokolini to'ldirish", "Fill in the birth protocol"],
  ["096-shaklni to'ldirish (homiladorlik va tug'ruq bo'yicha karta)", "Fill in form 096 (pregnancy and birth card)"],
  ["097-shaklni to'ldirish (yangi tug'ilgan chaqaloqning rivojlanish kartasi)", "Fill in form 097 (newborn development card)"],
  ["Statsionardagi 112 xizmati: Hodisalar haqida ogohlantirish", "112 service in hospital: event alerts"],
  ["Bemorni qabulga taklif qilish va yangi epizod yaratish", "Invite the patient and create a new episode"],
  ["Bemorning kasallik tarihini davom ettirish", "Continue the patient’s medical history"],
  ["Qo'shimcha talon", "Extra ticket"],
  ["Bemorni analizga yuborish", "Send the patient for tests"],
  ["Bemorni boshqa mutaxassisga yuborish", "Refer the patient to another specialist"],
  ["Murojat epizodi orqali kasalxonaga yotqizish", "Admit via the visit episode"],
  ["Homiladorlikni ro'yxatga olish", "Register a pregnancy"],
  ["Homiladorlik bo'yicha hisobga qo'yish", "Put on the pregnancy register"],
  ["Homiladorlik hisobini o'chirish", "Remove from the pregnancy register"],
  ["Elektron hujjat aylanishi", "Electronic document flow"],
  ["YUIKning testdan oldingi ehtimolini baholash", "Pre-test probability of IHD"],
  ["Patronaj rejasini tuzish", "Make a patronage plan"],
];

function leftoversLatin(text: string) {
  return /[A-Za-zʻ''oO]/u.test(text) && /[gG]a |ni |va |bo'|o't|qil|yarat|ko'r|to'l|bo'yicha/.test(text);
}

export function localizeCatalogText(text: string, locale: Locale) {
  if (!text || locale === "uz") return text;
  let out = String(text);
  if (locale === "kaa") {
    out = out.replace(/(\d+)\s+ta ichki dars/gi, (_all, n: string) => `${n} ishki sabaq`);
    out = out.replace(/(\d+)\s+ta material/gi, (_all, n: string) => `${n} material`);
    return translateKaa(out);
  }
  out = out.replace(/(\d+)\s+ta ichki dars/gi, (_all, n: string) =>
    locale === "en" ? `${n} nested lessons` : `${n} внутр. уроков`,
  );
  out = out.replace(/(\d+)\s+ta material/gi, (_all, n: string) =>
    locale === "en" ? `${n} lessons` : `${n} материалов`,
  );
  const pairs = locale === "ru" ? [...RU, ...MORE_RU] : [...EN, ...MORE_EN];
  return applyPairs(out, pairs);
}

export function localizeDescription(text: string, locale: Locale) {
  if (!text || locale === "uz") return text;
  const trimmed = text.trim();
  const count = trimmed.match(/^(\d+)\s+ta material/i);
  if (count) {
    const n = Number(count[1]);
    if (locale === "ru") return n === 1 ? "1 материал" : `${n} материалов`;
    if (locale === "kaa") return `${n} material`;
    return n === 1 ? "1 lesson" : `${n} lessons`;
  }
  return localizeCatalogText(text, locale);
}

export function localizeCatalogTitle(slug: string, title: string, locale: Locale) {
  const complete = translateCatalog(title, locale);
  if (complete) return complete;
  if (slug === FAQ_CATEGORY_SLUG) return faqCategoryCopy(locale).title;
  if (locale === "uz") return title;
  const hit = (
    catalogI18n as Record<string, { uz?: string; ru?: string; en?: string; kaa?: string }>
  )[slug];
  const translated = hit?.[locale];
  if (translated && translated !== hit.uz && translated !== title) return translated;
  return localizeCatalogText(title, locale);
}

export function localizeCatalogDescription(
  slug: string,
  description: string,
  locale: Locale,
) {
  const complete = translateCatalog(description, locale);
  if (complete) return complete;
  if (slug === FAQ_CATEGORY_SLUG) return faqCategoryCopy(locale).description;
  if (locale === "uz") return description;
  return localizeDescription(description, locale);
}

export function catalogLocaleCoverage(title: string, locale: Locale) {
  const out = localizeCatalogText(title, locale);
  return { out, leftover: leftoversLatin(out) };
}
