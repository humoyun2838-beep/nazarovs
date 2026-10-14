# Uchta sayt — 2026-10-12, v5

## Ishlayotgan URLlar

1. Mijozlar: http://127.0.0.1:3850/nazarov
2. Admin: http://127.0.0.1:3852/admin/login
3. Operator: http://127.0.0.1:3853/operator

Admin/operator fonlari built-in ImageGen orqali yangidan yaratildi, WebP qilib optimallashtirildi. Admin uchun indigo/lavanda/arxitektura, operator uchun turkuaz/chat/yordamchi mavzusi. Desktop operator oynasi yumaloq chegarali panelga joylashtirildi; mobil ekranlarda qo‘shimcha tashqi bo‘shliq qo‘yilmaydi. Promptlar va original rasm yo‘llari: public/art/AI-STAFF-V5.md.

## Tekshiruv natijalari

- Production build va TypeScript: muvaffaqiyatli.
- Sahifalar, 23 bo‘lim, 344 dars, ruxsatlar va 95 mahalliy rasm: 472/472.
- Uchta alohida origin, yo‘naltirishlar, avtorizatsiya va yangi AI rasmlar: 39/39.
- Admin/operator/mijoz chat integratsiyasi: 43/43.
- Telefon validatsiyasi: 11/11.
- Jami: 565 avtomatik tekshiruv.
- Chat integratsiyasi qa-data bazasida bajarildi. Ishchi runtime-data bazasida test suhbati yopilmadi.
- Brauzerda admin statistikasi, operator chat oynasi va bo‘lim tanlash dialogi ko‘rildi. Dialogda barcha 23 bo‘lim bor; tanlovsiz yakunlash tugmasi o‘chiq. 1280 px operator oynasida gorizontal overflow yo‘q.
- Eski fonni tekshirayotgan separate-sites testi tuzatildi: endi aynan joriy v4/v5 aktivlari tekshiriladi, admin/mijoz HTML ulanishi ham tasdiqlanadi.

## Cheklovlar

Mahalliy dars sahifasining ochilishi tashqi videoning ijro etilishini kafolatlamaydi. Oldingi media auditida 163 video manbasidan 3 tasi Notion tomonda 404/502 qaytargan; ular ushbu dizayn tekshiruvida qayta tiklanmadi. To‘liq mobil brauzer tekshiruvi va tashqi AI yordamchi API kaliti bilan jonli test bu natijalarga kirmaydi. Next metadataBase fallback haqida ogohlantiradi; production build muvaffaqiyatli.

Ishga tushirish: ./start-codex.command. Yakunda server runtime-data bilan qayta ishga tushirildi.
