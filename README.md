# Nazarov — www.nazarov.uz

Shaxsiy o‘quv materiallari portali. Mijozlar login-parolsiz materiallarni ko‘radi; admin panel parol bilan ochiladi.

## Nima uchun Google’da chiqmayapti?

Hozir `nazarov.uz` Cloudflare’da, lekin **server o‘chiq** (HTTP 521). Sayt internetda ochilmasa, Google ham indekslay olmaydi.

Kerak:

1. Shu loyihani hostingga joylash (Railway, Render, VPS va hokazo)
2. Cloudflare’da domenni shu hosting IP/URL ga ulash
3. [Google Search Console](https://search.google.com/search-console) da `www.nazarov.uz` ni qo‘shish
4. Sitemap yuborish: `https://www.nazarov.uz/sitemap.xml`

SEO uchun ochiq sahifalar: `/`, `/nazarov`, `/materials`, `/b/…`, `/m/…`. Admin panel yopiq.

## Lokal ishga tushirish

```bash
npm install
npm run dev
```

Ochish: [http://127.0.0.1:3847](http://127.0.0.1:3847)

### Kirish

**Mijozlar** — login yo‘q. Asosiy manzil **`/nazarov`**: shu path o‘zgarmaydi.

Ochiq barqaror URL (qayta ulanganda ham o‘zgarmaydi):

**[https://nazarov.tunn3l.sh/nazarov](https://nazarov.tunn3l.sh/nazarov)**

Admin: [https://nazarov.tunn3l.sh/admin/login](https://nazarov.tunn3l.sh/admin/login)

```bash
npm run start   # boshqa terminalda
npm run tunnel  # https://nazarov.tunn3l.sh ni 3847-portga ulaydi
```

**Admin** — `/admin/login` (login: **Nazarov**, parol: `admin9915504`). Panelda video, matn va rasm qo‘shiladi; saqlangandan so‘ng dars mijozlarda ochiladi.

Lokal IP da bosh sahifada 2 ta tugma: materiallar va admin kirishi. Ochiq tunnelda `/` ham katalogni ochadi.

Ishlab chiqarish (domen): [https://www.nazarov.uz/nazarov](https://www.nazarov.uz/nazarov)

`trycloudflare` / `loca.lt` tasodifiy nom beradi. Barqaror manzil uchun `npm run tunnel` — subdomain `nazarov` shu qurilma kalitiga biriktirilgan. Kod yangilanganda faqat Next.js qayta start qilinadi. Tunnel har 2 soniyada ochiq URL ni urib mappingni issiq tutadi; `No tunnel found` chiqsa manzilni o‘zgartirmasdan darhol qayta ulaydi. Taxminan har 8 soatda client yangilanadi (relay ~20 soatdan keyin mappingni tashlab yuborishi mumkin). `npm run keep` har 3 soniyada Next.js va tunnel supervisor ni tekshiradi va o‘zi o‘chib qolsa qayta yoqiladi.

```bash
npm run tunnel        # barqaror URL ni 3847-portga ulaydi
npm run keep          # URL yopilib qolmasligi uchun watchdog
npm run test:tunnel   # ochiq URL va qayta ulanishni tekshiradi
```

Sayt foni: yumshoq ko‘k yuvuq (`public/nazarov-bg-wash.webp`) ustida tiniq DMED belgisi (`public/nazarov-mark.webp`) markazda turadi, aylanmaydi.

Mijoz sahifasining pastida **Dmed** chat bor. Chat pufakchalarida mehmon ismi ko‘rinmaydi. Mijoz matn, **rasm, video va ovozli xabar** yuboradi (qog‘oz qisqich va mikrofon). Fayllar faqat shu suhbatning mehmoni va admin ko‘radi. Birinchi savoldan keyin faqat bir marta “Xabaringiz qabul qilindi…” chiqadi. Savol admin panelning **Chat** bo‘limiga tushadi; javob shu yerdan yoziladi va mijoz saytdagi chatda ko‘radi. Operator javobidan keyin 24 soat ichida yozilmasa suhbat yopiladi; admin **Suhbatni yakunlash** ni bossaham yopiladi va mijoz operatorni **1–5 yulduz** bilan baholaydi. Yopilgandan so‘ng **Yangi suhbat** tugmasi bilan qayta yozish mumkin. Chat dashboardida murojaat, yopilgan, baholangan soni, o‘rtacha baho va 5 ballik taqsimot sanalar oralig‘ida ko‘rinadi; pastda kunlik murojaatlar analitikasi bor. Operator javob yozmaguncha inboxdagi ko‘k son qoladi; javobdan keyin yo‘qoladi. Inbox filtri: **Hammasi**, **Yangi**, **Javoblangan** — har birida haqiqiy son chiqadi (99+ emas). Javob maydonida tayyor **shablonlar** bor; **Shablon** tugmasi bilan o‘zingiz nom va matn yozib qo‘shasiz, tahrirlayiz yoki o‘chirasiz. Bosilsa matn javobga tushadi, keyin yuborasiz. Telegram shart emas.

Admin chat: [/admin/chat](/admin/chat)

## Video va matn

Darslar **faqat shu saytda** ochiladi: Notion oynasi yo‘q, tashqi saytga yo‘naltirish yo‘q. Video playerni sahifa ichida ko‘rasiz (`/api/media/notion`).

Ma’lumotlarni qayta yuklash:

Bo‘limlar va ichidagi darslar tartibi [DMED Notion](https://dmed.notion.site/learning-materials-uzb) sahifasidagi ketma-ketlikka mos.

```bash
npm run seed:dmed
# tartibni Notiondan qayta yig‘ish:
npm run order:notion && npm run seed:dmed
# ixtiyoriy to‘liq Notion sync:
npm run sync:notion && npm run seed:dmed
```

Tekshiruv (900 marta):

```bash
npm run test:900
```

## Ishlab chiqarish

To‘liq yo‘riqnoma: **[ISHGA_TUSHIRISH.md](./ISHGA_TUSHIRISH.md)** (zipdan keyin saytni tiklash va `nazarov.uz` ga chiqarish).

Qisqa:

1. `cp .env.example .env` — `AUTH_SECRET` ni almashtiring
2. `npm install && npm run build && npm run start`
3. Persistent disk ni `data/` ga ulang (SQLite)
4. Cloudflare DNS: `nazarov.uz` va `www` ni hostingga pointing qiling
5. Search Console orqali indeks so‘rang

## Stack

Next.js + TypeScript + Tailwind + shadcn/ui + SQLite
