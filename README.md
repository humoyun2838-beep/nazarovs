# Nazarov DMED

Mijozlar katalogi, admin paneli va operator chat tizimi. Next.js 16, React 19, SQLite.

- Mijozlar: `/nazarov`
- Admin: `/admin/login`
- Operator: `/operator`
- 26 bo‘lim, 711 dars; o‘zbek, rus, ingliz va qoraqalpoq tillari.

## Railway

Repository Dockerfile orqali yig‘iladi. `PORT` Railway tomonidan beriladi.
`/app/data` manziliga Volume ulang. Railway Variables ichida `AUTH_SECRET`,
`ADMIN_USERNAME` va `ADMIN_PASSWORD` ni maxfiy sozlang. AI uchun `OPENAI_API_KEY` kerak.

`data/nazarov.db` faqat ommaviy katalog va dars tarjimalaridan iborat. Unda foydalanuvchilar,
chat xabarlari yoki API kalitlari yo‘q. Birinchi ishga tushishda doimiy bazaga ko‘chiriladi.
Mavjud volume bazasi qayta deploy vaqtida almashtirilmaydi.

## Lokal

Node.js 24 bilan `npm ci --ignore-scripts=false`, `npm run build`, `npm start`.
`.env.example` asosida shaxsiy `.env` tayyorlang. Maxfiy fayllar GitHub‘ga yuborilmaydi.

## Android yangilanishlari

Admin boshqaruvi: `/admin/app-updates`. Ommaviy nashr API: `/api/mobile-release`.
Sayt versiyasi va APK versiyasi alohida tekshiriladi. Android 1.1.0 va keyingi
mijoz ilovalari native yangilash oynasi, hash va imzo tekshiruvini qo'llaydi.
Yig'ish, imzolash va keyingi nashrlar: [Android release guide](mobile/android/RELEASE-GUIDE.md).
