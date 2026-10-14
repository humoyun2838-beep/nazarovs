# Mijoz sayti — tezlik va media tuzatishlari

2026-10-13

## Tuzatildi

- Darsning dastlabki ochilishida to‘liq AI tarjimasini kutish olib tashlandi. Tayyor tarjima bazadan darhol olinadi; qolgan hollarda video va asl matn ochilib, tarjima fonda olinadi. Tarjima muvaffaqiyatsiz bo‘lsa qayta urinish tugmasi bor.
- Tarjima endpointi faqat bazadagi mavjud ommaviy darslarni qabul qiladi. Bir vaqtdagi tarjima so‘rovlari cheklangan; API kaliti serverda qoladi.
- Video havolasini brauzerda uzoq saqlab, eskirgan imzoli URLdan foydalanish to‘xtatildi. Notion faylining mavjudligi imzolash vaqtida tekshiriladi; bir xil parallel so‘rovlar birlashtiriladi.
- Video uchun server orqali uzatish zaxira yo‘li va HTTP Range javoblari tuzatildi.
- 6 buzilgan videoning joriy fayl IDlari asl Notion darslaridan tiklandi. Hisobni faolsizlantirish darsida manbadagi yangi video bloki olindi; uning ovozi ruscha. Video ovozi avtomatik tarjima qilinmaydi.
- Kelajakdagi importda attachment/source manzilidagi joriy fayl IDsi eski file_ids ro‘yxatining birinchi elementidan ustun qo‘yildi.

## Tekshiruv

- 711 darsning hammasida kontent mavjud.
- 744 sahifa, 102 rasm va 3 himoya tekshiruvi: 849/849 o‘tdi.
- 338 noyob video: dastlab 332 muvaffaqiyatli, 6 muammoli. Tuzatishdan keyin qolgan 6/6 saytning o‘z API orqali yuklandi (`artifacts/client-audit/repaired-videos.json`). Bu HTTP yuklanish tekshiruvi; har bir videoning butun ijrosi qo‘lda tomosha qilinmadi.
- Media sinovi: 3 rasm, 3 video Range va 3 fayl — 9/9 o‘tdi.
- Internet brauzerda avval ishlamagan “Retseptni bekor qilish” videosi ijro qilindi; currentTime o‘sdi, error=null. Dalil: `artifacts/client-audit/video-playing.png`.
- Production build, TypeScript va o‘zgargan asosiy fayllar ESLint tekshiruvi o‘tdi.
- Birinchi internet tezlik o‘lchovida 4 sahifa 295–660 ms, bitta katta inglizcha dars 18.7 soniya bo‘ldi. Keyingi yakuniy brauzer ochilishi ishladi; takroriy shell tezlik sinoviga ruxsat berilmagani uchun barcha sahifalarga bir xil tezlik kafolatlanmaydi.

## Ishga tushirish

Yakuniy yig‘ilish: `.next-fast-v2`; `start-codex.command` shu versiyani ishga tushiradi. Internet tunneli o‘zgarmadi. Mac, server va tunnel ishlayotgan bo‘lishi kerak.

Mijoz: https://scenes-ringtones-untitled-champion.trycloudflare.com/nazarov

Tashqi video/rasm manbasi va internet tezligi yuklanish vaqtiga ta’sir qiladi. Darsning ochilishi AI tarjimasi vaqtiga bog‘lanmaydi.
