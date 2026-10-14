# To‘rtta til tekshiruvi — 2026-10-13

Mijoz, admin va operator interfeyslariga umumiy uz/ru/en/kaa tarjima qatlami ulandi. 1384 interfeys yozuvi va 955 katalog yozuvi uchun lug‘atlar mavjud. Operatorga til almashtirgich qo‘shildi. Qidiruv va CSV yozuvlari ham tanlangan tilni hisobga oladi.

Darsning to‘liq matni serverda OpenAI orqali tanlangan tilga tarjima qilinadi va SQLite keshiga saqlanadi. Eski, noto‘liq tarjima keshi chetlab o‘tiladi. Tarjima muvaffaqiyatsiz bo‘lsa asl matn bilan aniq ogohlantirish chiqadi. Faqat ommaviy dars matnlari tarjima xizmatiga yuboriladi.

Tekshiruvlar:
- Production build va TypeScript: o‘tdi.
- Lug‘at to‘liqligi, raqamlar va qoraqalpoq imlosi: 21051 tekshiruv o‘tdi.
- Ikki namunaviy dars × to‘rtta til, media belgilar, raqamlar, havolalar va kesh: 49 tekshiruv o‘tdi (`artifacts/i18n/content-test.json`).
- Alohida uchta sayt manzili, kirish himoyasi, yo‘naltirish va rasmlar: 39 tekshiruv o‘tdi.
- Brauzerda admin, operator va mijoz bo‘limidagi til tugmalari sinovdan o‘tkazildi. Inglizcha dars matni va qadamlar qayta ochib tasdiqlandi (`artifacts/i18n/lesson-en-final.png`).

Chegaralar: barcha 711 dars oldindan tarjima qilinmagan; birinchi xorijiy tildagi ochilish AI kutishini talab qiladi. Namunada 2–8 soniya kuzatildi, boshqa darslarda vaqt farqlanishi mumkin. Rasm ichidagi yozuvlar va videoning ovozi asl tilda qoladi. AI tarjimalarining barchasi inson tilshunos tomonidan tekshirilmagan. Xususiy chat xabarlari va foydalanuvchi ismlari avtomatik tarjima qilinmaydi.

Manzillar:
1. http://127.0.0.1:3850/nazarov?lang=uz
2. http://127.0.0.1:3852/admin?lang=uz
3. http://127.0.0.1:3853/operator?lang=uz
