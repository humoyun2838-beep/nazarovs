# Codexda ishlatish — 12 oktabr 2026

Saytning tayyor versiyasi ushbu Macda uchta alohida portda ishlaydi:

- Umumiy kirish: http://127.0.0.1:3850/portal
- Mijozlar: http://127.0.0.1:3850/nazarov
- Admin: http://127.0.0.1:3852/admin/login
- Operator: http://127.0.0.1:3853/operator

Bu mahalliy manzillar; faqat ushbu kompyuterda ochiladi. Internet domeni yoki tashqi tunnel tashkil qilinmadi.

Qayta yoqish uchun `start-codex.command` faylini oching. Terminal ochiq turganida sayt ishlaydi; to‘xtatish uchun shu terminalda Ctrl+C bosing. Codexda shu chatdagi ishlayotgan server to‘xtasa ham ushbu fayl bilan qayta yoqish mumkin. Kompyuter yoqilganda avtomatik ishga tushirish sozlanmagan.

Launcher shu Macdagi o‘rnatilgan Node yo‘lidan foydalanadi. Boshqa kompyuterga ko‘chirilganda Node 22+ va loyiha kutubxonalarini o‘rnatish, launcher yo‘lini yangilash kerak.

## Ma’lumotlar

Ishchi baza va chat fayllari: `runtime-data/`. Original arxivdan olingan `data/` saqlangan. Sinovlar `qa-data/` nusxasida bajarildi; yakuniy server `runtime-data/` ga ulandi. Ishchi ma’lumotlarni zaxiralashda `runtime-data/` va mavjud yuklangan `public/media/` ni ham saqlang.

Adminning saqlangan paroli o‘zgartirilmadi. Operatorlar admin panelidagi Operatorlar bo‘limidan boshqariladi. Sinov operatori va sinov suhbatlari yakuniy ishchi bazaga qo‘shilmadi.

Yo‘qolgan `src/data` fayllarini tiklash chegaralari shu papkadagi `RECOVERY.md` da yozilgan: katalog bazadagi tartibda, 344 dars saqlangan, 163 video metama’lumoti tiklangan. Original ichki guruhlash va barcha tarjimalar to‘liq tiklangan emas. Darsning tarjimasi bo‘lmasa original matn ko‘rsatiladi.

## Tasdiqlangan tekshiruvlar

- Production build (`next build --webpack`) va TypeScript: muvaffaqiyatli.
- 472 tekshiruv: 377 sahifa/ruxsat va 95 rasm/logo manzili — barchasi o‘tdi. Barcha 23 bo‘lim va 344 dars sahifasi ochildi. Bu har bir darsdagi tashqi media ijrosini tasdiqlamaydi.
- Admin, operator va mijoz chat oqimi hamda operator paroli bo‘yicha 41 integratsion tekshiruv: o‘tdi.
- Telefon validatsiyasi: 11 holat o‘tdi.
- Barcha 163 noyob video manbasi tekshirildi: 160 tasi yuklandi, 3 tasi tashqi manbada xato berdi. Retseptni bekor qilish va SSV Hisobotlari: 404; Hisobni (akkauntni) faolsizlantirish: manzil olishda 502.
- 2168 tashqi rasmdan 30 tasi namuna sifatida tekshirildi: 30/30 yuklandi.
- Alohida portlar, yo‘naltirish va ruxsatlar: 37/37.
- 23 bo‘limga alohida AI fon, mijoz/admin/operator uchun 3 umumiy AI fon qo‘yildi. Original DMED logo va bo‘lim belgilari saqlandi. Promptlar: public/art/AI-BACKGROUNDS.md.
- 390 piksel kenglikda umumiy kirish sahifasi tekshirildi: gorizontal chiqib ketish yo‘q.
- Yakuniy 3850, 3852, 3853 manzillar ishlaydi. Backend va baza umumiy: chatlar uchala interfeys orasida bog‘langan.

Telegram, AI provayderlari, barcha fayl formatlari, internet hostingi va kompyuter qayta yoqilgandan keyingi avtomatik ishga tushish tasdiqlanmagan.

## Koddagi tuzatishlar

Yo‘qolgan katalog/video ma’lumotlari tiklandi; `/portal` umumiy kirish sahifasi qo‘shildi; telefon validatsiyasi va bo‘sh joyli parol bilan kirish tuzatildi. Server ishga tushganda kuchliroq hashli mavjud admin parolini standart parolga qaytaradigan kod olib tashlandi. Eski testlarning admin kirishi moslashtirildi, pnpm muhitidagi `@next/env` importi tuzatildi. Mahalliy Turbopack port cheklovi sabab tayyor versiya webpack bilan yig‘iladi.

Dastlabki `TEKSHIRUV-2026-10-12.md` tiklashdan oldingi holatni qayd etadi. Joriy holat ushbu hujjatda.

## 12 oktabr — alohida URL va AI dizayn

`start-codex.command` uchta portni birga ishga tushiradi. Asosiy manzillar: mijoz http://127.0.0.1:3850/ , admin http://127.0.0.1:3852/ , operator http://127.0.0.1:3853/ . Har bir ildiz tegishli sahifaga yo‘naltiradi. Boshqa interfeysga havolalar ham tegishli portga o‘tadi.

Yangi tekshiruvda brauzer o‘lchamini 390 pikselga o‘zgartirish API orqali tasdiqlanmadi (1280 qaytdi); yangi fonlar bilan 390 piksel sinovi tasdiqlangan deb hisoblanmaydi. Avvalgi portal mobil sinovi yuqorida qayd etilgan. Desktopda bo‘lim, admin va operator ko‘rinishi tekshirildi.

## Rangli AI dizayn — v4

Mijozlar katalogiga 01–23 tartib raqamli, alohida yumaloq rasmli kartalar qo‘shildi. Har bir bo‘lim va unga tegishli dars foniga mavzuga mos rangli 3D qahramon rasmi qo‘yildi. 23 bo‘lim rasmi `public/art/ai-color-v4/`, katalog foni `public/art/dmed-client-color-v4.webp` da. Barchasi built-in ImageGen bilan yaratilgan; to‘liq promptlar `public/art/AI-COLOR-V4.md` da. 24 original faylning noyobligi tekshirildi, WebP qilib optimallashtirildi.

Yakuniy production build va TypeScript o‘tdi. 377 sahifa/ruxsat + 95 rasm manzili = 472/472 muvaffaqiyatli tekshiruv. Brauzerda 23 karta tartibi, Laborant foni va ko‘rinadigan rasmlar yuklanishi tekshirildi. 1280 pikselda gorizontal chiqish yo‘q.
