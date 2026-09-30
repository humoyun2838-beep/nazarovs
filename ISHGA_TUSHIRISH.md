# Ishlab chiqarishga tayyorlash

Bu zip — Nazarov o‘quv materiallari saytining to‘liq nusxasi. Dastur o‘chirilgandan keyin shu arxivdan saytni tiklab, `nazarov.uz` ga chiqarasiz.

Ichida: kod, 22 bo‘lim / 324 dars (SQLite), rasmlar, stickerlar. Test chatlar olib tashlangan.

## Kerak

- Node.js **20** yoki undan yuqori (`node -v`)
- npm
- VPS/hostingda: doimiy disk (`data/` papkasi o‘chib ketmasin)

## Kompyuterda ochish

```bash
unzip nazarov-sayt-ishlab-chiqarish.zip
cd nazarov-uz
cp .env.example .env
# .env ichida AUTH_SECRET ni uzun tasodifiy matnga almashtiring
npm install
npm run build
npm run start
```

Brauzer: [http://127.0.0.1:3847/nazarov](http://127.0.0.1:3847/nazarov)

- Mijozlar: login yo‘q, manzil **`/nazarov`**
- Admin: `/admin/login` — login **Nazarov**, parol **admin9915504** (ishlab chiqarishda parolni almashtiring)

## Ishlab chiqarish (domen)

1. Shu papkani serverga qo‘ying (Railway, Render, yoki VPS).
2. `.env` ni to‘ldiring:
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   - `AUTH_SECRET` — uzun random (majburiy)
   - `PUBLIC_HOST=www.nazarov.uz`
   - `COOKIE_SECURE=1` (HTTPS bo‘lsa)
3. `data/` ni **persistent volume** ga ulang. `nazarov.db` yo‘qolsa katalog ham yo‘qoladi.
4. `npm install && npm run build && npm run start`
5. Cloudflare’da `nazarov.uz` va `www` ni shu hosting IP/URL ga pointing qiling.
6. [Search Console](https://search.google.com/search-console) da sitemap: `https://www.nazarov.uz/sitemap.xml`

## Railway

1. [railway.app](https://railway.app) da loyiha oching, shu papkani deploy qiling (`Dockerfile` ishlatiladi).
2. **Volume** qo‘shing, mount path: `/app/data`
3. Variables:
   - `DATA_DIR=/app/data` (yoki volume mount `/app/data` bo‘lsa avtomatik)
   - `COOKIE_SECURE=1`
   - `AUTH_SECRET` — uzun random
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   - `PUBLIC_HOST` — avval `xxxx.up.railway.app` (https siz), keyin `www.nazarov.uz`
4. Generate Domain. Katalog: `https://SIZNING-URL.up.railway.app/nazarov`
5. Birinchi ishga tushishda `nazarov.db` volume ga ko‘chiriladi. Volume bo‘lmasa, redeploy da bazani yo‘qotasiz.

Port default **3847**. Hosting `PORT` bersa, `npm start` uni o‘zi oladi.

## Muhim fayllar

| Joy | Nima |
| --- | --- |
| `data/nazarov.db` | Bo‘limlar, darslar, admin |
| `public/` | Logo, portret, fon, stickerlar |
| `src/` | Sayt kodi |
| `.env.example` | Sozlamalar namunasi |

Chat media `data/chat-media/` da saqlanadi — papkani ham diskda saqlang.

## Qayta tekshirish

```bash
npm run test:900
```

Tunnel (`nazarov.tunn3l.sh`) faqat vaqtincha ochiq URL edi. Ishlab chiqarishda u kerak emas — domen hostingga ulanadi.
