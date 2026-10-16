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
