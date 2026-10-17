# DMED Mijoz — sayt va APK yangilanishlari

Sayt Next.js, ma'lumotlar SQLite, Android ilova esa native Java WebView asosida ishlaydi.

## Foydalanuvchi

Hozirgi 1.0.0 APKda APK yangilash moduli yo'q. 1.1.0 (versionCode 2) ni bir marta odatdagi Android o'rnatish oynasi orqali o'rnatish kerak. Paket nomi va imzo kaliti bir xil; eski ilovani o'chirish shart emas.

Shundan keyin ilova ochilganda va faol paytda har 60 soniyada APK nashrini tekshiradi. Yuqoridagi ↑ tugmasi bilan qo'lda ham tekshirish mumkin. Ixtiyoriy yangilanishda “Keyinroq” 24 soatga eslatishni kechiktiradi. Majburiy yangilanishda asosiy oynaga qaytish bloklanadi; Android o'rnatishga baribir foydalanuvchi roziligini so'raydi.

Saytdagi dars/dizayn o'zgarishlari uchun APK o'rnatish talab etilmaydi. Ochiq sahifa 15–18 soniyada tekshiradi; dars va yozilayotgan matnni bo'lmaydi. Ilova yopiq paytda push bildirishnomalari bu tizimga kiritilmagan.

## Administrator

`/admin/app-updates` → “Ilova yangilanishlari”. Faqat administrator kira oladi.

- `latest_version`: 1.1.0 kabi uch qismli nom.
- `version_code`: butun Android versionCode; har yangi APKda oshiring. Matnli versiya raqami solishtirish uchun ishlatilmaydi.
- `minimum_version`: ruxsat etilgan eng kichik **versionCode**.
- `force_update`: yoqilsa, oxirgi koddan past ilovalar yangilanishi shart.
- `apk_url`: raw.githubusercontent.com/humoyun2838-beep/nazarovs/**40 belgili commit SHA**/releases/android/DMED-Mijoz.apk. O'zgaruvchan branch URLlari qabul qilinmaydi.
- `sha256`, `apk_size`: imzolangan yakuniy APK faylidan oling.
- `release_notes`: yangiliklar ro'yxati.
- `web_version`: serverning sayt buildi va katalog revisioni; avtomatik belgilanadi.

Server APKni yuklab, SHA-256, hajm, haqiqiy AndroidManifest.xml ichidagi paket, versiya va debug holatini tekshiradi. Mos bo'lmasa nashr saqlanmaydi. Telefon yuklashdan keyin hash, paket, versiya va **o'rnatilgan ilova bilan bir xil imzo sertifikati**ni tekshiradi. Fayl faqat ilovaning yopiq keshida saqlanadi va Android installerga read-only content URI orqali vaqtincha beriladi.

Nashr ixtiyoriy holatda chiqarilishi tavsiya etiladi. `minimum_version` qiymatini oshirish oldingi mijozlarni bloklaydi. Ushbu native boshqaruv 1.1.0 va keyingi ilovalarda ishlaydi; eski 1.0.0 foydalanuvchilariga birinchi yangilash APKsini yuboring.

## Keyingi APKni chiqarish

1. `mobile/android/app/build.gradle` ichida versionCode ni oshiring va versionName ni yangilang.
2. `codex/android-apps` branchiga native manbani push qiling. GitHub Actions build, lint, siyosat va Android 15 sinovlarini bajaradi.
3. Mijozning unsigned release APKsini oling. Avvalgi **o'sha** maxfiy kalit bilan imzolang. Kalit `.mobile-signing/dmed-mobile.p12` faylida saqlangan; uni va parolini xavfsiz zaxiralang, GitHub'ga qo'shmang.
4. `apksigner verify --verbose --print-certs DMED-Mijoz.apk` bilan tekshiring. Release bo'lishi va paket `uz.dmed.mobile.mijoz` bo'lishi shart.
5. Imzolangan APKni `releases/android/DMED-Mijoz.apk` yo'liga joylang; commit SHA orqali o'zgarmas HTTPS havolasini oling.
6. SHA-256 va bayt hajmini hisoblang. Admin sahifasida qiymatlarni kiriting va “Tekshirish va nashr qilish”ni bosing.
7. Bitta test telefonda eski versiya ustiga o'rnatish, login, video va mikrofonni tekshiring.

## Sinovlar

- `scripts/mobile-release-test.mjs`: sayt repozitoriysida; haqiqiy APKni `APK_FIXTURE` orqali ko'rsatish mumkin.
- `scripts/mobile-release-api-test.mjs`: faqat alohida mahalliy server/bazada admin vakolati, Origin, hash, noto'g'ri versiya va haqiqiy nashrni saqlashni tekshiradi.
- `mobile/android/tests/UpdatePolicyTest.java`: versiya va URL siyosati.
- Emulyator: uchta ilova ochilishi, ixtiyoriy/majburiy oyna, Back bloklash, dark mode, noto'g'ri APKni rad etish, internet uzilishi va retry.

Haqiqiy telefondagi Android o'rnatish oynasini foydalanuvchi o'zi tasdiqlaydi. Server ishlamasa, oxirgi ishonchli nashr keshidan foydalaniladi; keshlangan majburiy yangilanishni internet xatosi chetlab o'tmaydi. Birinchi tekshiruv internet bo'lmasa, ilova yangi siyosatni bila olmaydi va mavjud saytni ochishga harakat qiladi.

## Android 1.2.0 — oflayn mijoz

Mijoz flavori APK ichida 26 bo‘lim / 711 darsdan iborat ochiq katalogni oladi. `catalog.json.gz` manba assetini Android AAPT `assets/offline/catalog.json` sifatida ochib joylaydi; buildning o‘zi APK ichidagi JSONni tekshiradi.

Native `OfflineStore` faqat `https://offline.dmed.invalid` manzilidagi o‘z HTML, katalog va xususiy media fayllarini `shouldInterceptRequest` orqali beradi. JavaScript bridge, file:// va qo‘shimcha storage ruxsatlari ishlatilmaydi. Rasm/video to‘liq yuklangach va fayl hajmi tekshirilgach atomar tarzda ro‘yxatga kiritiladi; ilova qayta ochilganda saqlanadi. Video fayli OfflineVideoActivity orqali Android pleyerida telefon xotirasidan bevosita ochiladi. Bo‘sh joy yetmasa yoki tarmoq uzilsa, yarim fayl tayyor deb belgilanmaydi.

Internet mavjud bo‘lganda `/api/offline-catalog` ochiq darslar bilan katalogni yangilaydi. ETag 304 takror yuklashni tejaydi; noto‘g‘ri/uzilgan javob oldingi nusxani almashtirmaydi. Foydalanuvchi, akkaunt va chat ma’lumotlari ushbu katalogga kiritilmaydi.

`offline-emulator.sh` samolyot rejimida birinchi ochilish, dars matni, video va rasmni to‘liq yuklash, katalog sinxronlash, process restart va oflayn video seek/ijroni tekshiradi. Release ilovada debug intentlari ishlamaydi.


## Android 1.3.0 — APK ichidagi mavjud media

To‘liq oflayn APK GitHub Releases orqali tarqatiladi: [DMED Mijoz 1.3.0](https://github.com/humoyun2838-beep/nazarovs/releases/tag/android-v1.3.0-offline). Paket `uz.dmed.mobile.mijoz`, versionCode 4, avvalgi sertifikat bilan imzolangan. 26 bo‘lim / 711 dars matni, 336 ta 360p video, 5964 ta mavjud rasm havolasi, 26 bo‘lim muqovasi va 3 ta hujjat APK ichida. 2 eski video va 19 rasm manbasi ochilmaydi; dars ichida belgilangan.

`android-full-offline.yml` ommaviy materiallarni guruhlarda tayyorlaydi. Yakuniy yig‘ish bir xil Notion fayliga tegishli havolalarni tiklaydi, takroriy rasmlarni bir nusxada saqlaydi, noto‘g‘ri IMAGE belgisi qo‘yilgan PDFlarni hujjat sifatida ko‘rsatadi va Word hujjatini LibreOffice bilan PDFga aylantiradi. `.bin` media assetlari ZIPda siqilmaydi; xususiy OfflineMediaProvider videoni AssetFileDescriptor orqali APK ichidan Android pleyeriga beradi. Video va rasmlar telefon xotirasiga qayta ko‘chirilmaydi. PDF ko‘rish uchun ilovaning yopiq keshidan foydalaniladi.

Samolyot rejimida birinchi o‘rnatish, matn, video seek/ijro, rasm va PDF/Word sahifalari Android 15 emulyatorida tekshirilgan. Haqiqiy telefonda sinov o‘tkazilmagan. Sinov va yaxlitlik hisobotlari `mobile/android/releases/` ichida.

Imzolash kaliti mahalliy `.mobile-signing` katalogida qoladi. Ommaviy imzo baytlari bilan `apply-public-signing-patch.py` aynan tekshirilgan unsigned APKdan imzolangan nusxani tiklaydi; unsigned va signed SHA-256 mosligi tekshiriladi. `android-offline-publish.yml` muvaffaqiyatli emulyator sinovi va asl sertifikatni tekshirib GitHub Release yaratadi.

1.3.0 katta APKni Releases havolasi orqali o‘rnating. Mavjud admin APK nashri validatori 128 MB va avvalgi raw GitHub URL formatiga sozlangan; katta APK uchun avtomatik nashr transporti alohida yangilanishi kerak. Ochiq katalogning internet kelganda sinxronlanishi saqlangan.
