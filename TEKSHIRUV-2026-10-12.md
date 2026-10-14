# Uchta qism tekshiruvi — 12 oktabr 2026

## Natija

Arxiv bitta Next.js loyihasidan iborat: mijoz katalogi (`/nazarov`), admin (`/admin`), operator (`/operator`). Hozirgi nusxa to‘liq ishga yaroqli emas: majburiy `src/data` fayllari ZIPda yo‘q. Original ZIP o‘zgartirilmadi. Sinov bazasi `qa-data/nazarov.db` ga SQLite backup orqali olindi; server shu nusxaga ulandi.

## Tekshirilganlar

- SQLite `integrity_check`: `ok`. Bazada 23 bo‘lim va 344 material bor. Bu mazmunning to‘liqligini tasdiqlamaydi.
- Mahalliy `/api/health`: HTTP 200.
- Mahalliy `/nazarov`: HTTP 500. Javobda `@/data/catalog-i18n.json` topilmagani ko‘rindi.
- Mahalliy `/operator`: HTTP 500.
- Next route turlari muvaffaqiyatli yaratildi. Keyingi TypeScript tekshiruvi quyidagi 5 ta yetishmayotgan JSON importida to‘xtadi.
- To‘liq ESLint: 0 xato, 9 ogohlantirish. Ular asosan React effect bog‘liqliklari va foydalanilmagan o‘zgaruvchilar haqida. `scripts/**` mavjud konfiguratsiyada lintdan chiqarilgan.
- Telefon validatsiyasi uchun yangi 11 holatli test: barchasi o‘tdi.

## Ishga tushirishni to‘sayotgan fayllar

Asl kompyuterdan quyidagilarni `src/data/` ichiga tiklash kerak:

- `dmed-tree.json` — katalogning ichki daraxti va tartibi.
- `catalog-i18n.json` — katalog tarjimalari.
- `lesson-i18n.json` — dars tarjimalari.
- `lesson-phrases.json` — dars iboralari tarjimalari.
- `notion-videos.json` — videolar uchun Notion identifikatorlari.

Bo‘sh JSON bilan almashtirish saytning asl funksiyalarini tiklamaydi. Bazada darslar mavjud, ammo yo‘qolgan tarjimalar va video metama’lumotlarining to‘liq nusxasi ekani tasdiqlanmagan. Qayta seed/sync qilishdan oldin original `src/data` papkasini to‘liq olish kerak.

## Kiritilgan tuzatishlar

1. Telefon validatsiyasi endi uzun raqamning dastlabki 9 raqamini qabul qilmaydi. Ro‘yxatdan o‘tish va admin orqali mijoz yaratishda xom qiymat tekshiriladi.
2. Kirishda parolning bo‘sh joylari olib tashlanmaydi; parol yaratishdagi qiymat bilan aynan solishtiriladi.
3. `admin-test.cjs`, `chat-test.cjs`, `stress-test.cjs` admin kirishi uchun `role=admin` yuboradi. Ilgari ular hozirgi kirish qoidalariga mos kelmas edi. To‘liq testlar hali qayta o‘tmadi.
4. `scripts/preflight.cjs` kerakli JSON fayllarni tekshiradi. Build va ZIP tayyorlash endi fayllar yetishmasa aniq sabab bilan to‘xtaydi.
5. Sinov bazasi Git va production ZIPdan chiqarildi.

## Keyingi tekshiruvlar

Fayllar tiklangach: production build, admin kirish/chiqish, mijoz arizasini tasdiqlash va muddati, operator bloklanishi, suhbat biriktirish/javob/yopish/baholash, rasm/video/ovoz yuklash, barcha dars yo‘llari, tillar, mobil menyu va sahifalarning ekran kengligiga moslashuvi tekshirilishi kerak.

Brauzer ko‘rinishi, mobil interfeys, video ijrosi va to‘liq suhbat oqimi hozir tasdiqlanmagan. `chat-workspace-test.cjs` pnpm muhitida bevosita e’lon qilinmagan `@next/env` importi sabab boshlanmadi; test muhitini ham tuzatish kerak. Eski operator redirect testi `/operator/kirish` ni kutadi, hozirgi kod esa kirish formasini `/operator` da chiqaradi — kutilmalarni moslashtirish zarur.

Kod ko‘rigida qo‘shimcha tekshirishga arziydigan jihatlar: session uchun standart fallback secret, cookie xavfsizligi faqat muhit sozlamasiga bog‘liqligi, media proksida keng host ruxsatlari va avtomatik redirectlar. Bular ushbu bosqichda ekspluatatsiya bilan tekshirilmagan.

READMEda berilgan ochiq URL va hosting holati haqidagi eski ma’lumotlar internet orqali tekshirilmadi. Ushbu hisobot mahalliy ZIP nusxasiga tegishli.
