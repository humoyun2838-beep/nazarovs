# DMED Android

Uchta alohida Android ilova (Android 8 yoki yangi):
- DMED Mijoz: uz.dmed.mobile.mijoz → /nazarov
- DMED Admin: uz.dmed.mobile.admin → /admin/login
- DMED Operator: uz.dmed.mobile.operator → /operator

Native Android WebView. Internet kerak; loginlar sayt serverida tekshiriladi.
Maxfiy API kalitlari va hisob parollari ilovaga kiritilmaydi.
APKlar mahalliy maxfiy imzolash kaliti bilan imzolanadi; kalit repozitoriyga qo‘shilmaydi.

Yig‘ish: JDK 17, Android SDK 35, Gradle 8.11.1.
`gradle :app:assembleRelease :app:lintMijozRelease :app:lintAdminRelease :app:lintOperatorRelease`
GitHub Actions uchala ilovani Android 15 emulyatorida ishga tushirib tekshiradi.
Ovozli xabar uchun mikrofon ruxsati faqat foydalanuvchi tugmani bosganda so‘raladi.
Bu versiyada push bildirishnomalar va internetdan tashqari darslar yo‘q.
