# Mijozlar katalogini Notion manbasidan yangilash

Manba: https://dmed.notion.site/learning-materials-ru

24 manba bo‘limi, 367 dars va papka sahifasi import qilindi. Manba rus tilida saqlandi; avvalgi o‘zbekcha 344 dars o‘zgartirilmadi. Mavjud bo‘limlarda ruscha materiallar “RU” guruhi orqali ochiladi. Katalog hozir 26 bo‘lim va 711 materialdan iborat: manbada bo‘lmagan avvalgi FAQ va Muxlisa bo‘limlari ham saqlandi.

Yangi bo‘limlar: sog‘liqni saqlashdagi qoidabuzarliklar haqida murojaat, elektron navbatni sozlash, texnikani sozlash. Eski va yangi ombor materiallari tegishli alohida bo‘limlarga joylashtirildi. Uchta yangi bo‘lim uchun built-in ImageGen orqali alohida rasmlar yaratildi; promptlar va original yo‘llar public/art/AI-NOTION-V6.md faylida.

## To‘liqlik va saqlash

- 6 757 qo‘shimcha blok getRecordValues orqali olindi. Dastlabki sahifa javobi yopiq toggle va sinxron bloklarning barchasini bermas edi.
- 175 video belgisi, 3 817 rasm belgisi va 3 fayl belgisi saqlandi. Bular kontentdagi murojaatlar soni; bir xil media bir necha darsda takrorlanishi mumkin.
- PDF va Word fayllari rasm sifatida ko‘rsatilmaydi: ochiladigan havolalar mavjud.
- Dars/papka tartibi va ichki sahifa havolalari mahalliy /m/ manzillariga bog‘landi.
- Importdan oldingi SQLite nusxasi runtime-data/before-notion-ru-*.db da; oldingi tree/metadata fayllari artifacts/notion-ru/backup ichida.
- Import qo‘shish/yangilash usulida ishlaydi; eski o‘zbekcha materiallarni o‘chirmaydi.

## Tuzatilgan xatolar va media tezligi

- URL tekshiruvi eski data/nazarov.db ni o‘qiyotgan edi. slug-exists.ts endi ilova bilan bir xil DATA_DIR bazasidan foydalanadi. Bu yangi bo‘lim va darslarning 404 xatosini tuzatdi.
- Notion rasm proksisi va oddiy rasm proksisiga server keshi qo‘shildi. Biriktirilgan rasmlar uchun brauzer keshi bir kun.
- Videolar ko‘rinadigan ekran yaqiniga kelgandagina signed URL olishni boshlaydi. metadata preload va HTTP Range saqlandi.
- Tashqi havolalar va FILE markerlarini ko‘rsatish qo‘shildi.

## Yakuniy testlar

- Production build va TypeScript: muvaffaqiyatli. O‘zgargan media komponentlari ESLint: muvaffaqiyatli.
- Matn, media belgisi, ichki havola, katalogdan ochilish va eski darslar saqlanishi: 19 255/19 255.
- Sahifa va mahalliy rasmlar: 849/849 (747 sahifa/ruxsat tekshiruvi + 102 rasm).
- Uchta sayt yo‘naltirish/ruxsat/AI aktiv testi: 39/39.
- Jonli media namunasi: 9/9 — 3 rasm, 3 video, 2 PDF va 1 Word. Videolar HTTP 206 bilan qism-qism yuklandi. Rasmlar birinchi safar 943–3381 ms, qayta ochilganda 13 ms bo‘ldi. Bu faqat ushbu namunalar o‘lchovi.
- Brauzerda yangi texnika bo‘limi va uning printer darsi ochildi.

## Manba cheklovi

17 ichki blok havolasi Notion tomonidan role: none bilan mazmunsiz qaytarildi. Ularning o‘chirilgan yoki kirish yopilganligini aniqlab bo‘lmaydi. IDs va tekshiruv natijalari artifacts/notion-ru/unavailable-check.json da. Ular import qilingan deb hisoblanmaydi; 100% barcha yashirin manba ma’lumoti olindi deb da’vo qilinmaydi. Barcha 367 ochiq sahifa saqlandi. Barcha 3 817 rasm va 175 videoning tarmoq orqali ijrosi alohida tekshirilmagan; media belgilarining saqlanishi to‘liq tekshirildi.

## Ochish

Mijozlar: http://127.0.0.1:3850/nazarov

Yangi bo‘limlar: /b/violation-report, /b/electron-queue, /b/tech-settings.

Server ishchi runtime-data bazasi bilan ishga tushirilgan. ./start-codex.command orqali keyin ham ochish mumkin.
