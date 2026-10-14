# Bo‘lim bo‘yicha chat yakunlash

Operator: http://127.0.0.1:3853/operator

Admin statistikasi: http://127.0.0.1:3852/admin/chat?view=statistics

Suhbatni oching → Suhbatni yakunlash → katalogdagi 23 bo‘limdan mosini qidiring va tanlang → Saqlash va yakunlash.

Bo‘lim tanlanishi serverda ham majburiy. Bo‘lim nomi, IDsi, yakunlagan operator va vaqt saqlanadi. Boshqa operatorga biriktirilgan chatni yakunlash va takroriy yakunlash rad etiladi. Mijoz yakunlangan suhbatni baholay oladi.

Dashboardda bo‘limlar kesimida murojaatlar, mijoz xabarlari, yakunlanganlar, foizlar, eng ko‘p murojaat va CSV eksporti mavjud. Sana filtri suhbat boshlangan sana bo‘yicha ishlaydi. Oldingi va hali yakunlanmagan chatlar «Bo‘lim belgilanmagan» sifatida ko‘rsatiladi. Statistika admin uchun; operatorga ichki statistika yuborilmaydi.

Interfeysga bo‘limlarning original 3D belgilari, tanlov kartalari, qidiruv va ikki bosqichli ko‘rsatma qo‘shildi. Yangi bo‘lim katalogga qo‘shilsa tanlovda avtomatik paydo bo‘ladi.

Tekshiruv: production build va TypeScript muvaffaqiyatli. Sinov bazasida 43 integratsion tekshiruv o‘tdi, jumladan barcha katalog bo‘limlari ro‘yxati, bo‘limsiz/noto‘g‘ri bo‘limli yakunlash, operator egaligi, saqlanish, statistikaga +1 qo‘shilishi, takroriy yakunlash, mijoz bahosi va admin ruxsatlari. Brauzerda 23 bo‘lim, qidiruv, tanlovsiz o‘chiq tugma va tanlovdan keyin faol tugma tekshirildi. Brauzerda haqiqiy chat yakunlanmadi; yozish sinovlari faqat qa-data bazasida bajarildi. Yakuniy server runtime-data bilan yoqildi.
