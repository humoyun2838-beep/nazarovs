"""Generate removable iOS Web Clip profiles; no MDM, certificates or secrets."""
from pathlib import Path
import plistlib
import uuid
import zipfile
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'exports/dmed-ios'
OUT.mkdir(parents=True, exist_ok=True)
ICON = (ROOT / 'deploy/nazarovs/public/dmed-apple-touch.png').read_bytes()
BASE = 'https://nazarovs-production.up.railway.app'
ROLES = [('mijoz', 'DMED Mijoz', '/nazarov?lang=uz'),
         ('admin', 'DMED Admin', '/admin/login?lang=uz'),
         ('operator', 'DMED Operator', '/operator?lang=uz')]

def identity(identifier, title, kind):
    return dict(PayloadIdentifier=identifier, PayloadDisplayName=title,
                PayloadType=kind, PayloadVersion=1,
                PayloadUUID=str(uuid.uuid5(uuid.NAMESPACE_URL, identifier)).upper())

def clip(role, title, path):
    payload = identity('uz.dmed.webclip.' + role, title, 'com.apple.webClip.managed')
    payload.update(Label=title, URL=BASE + path, Icon=ICON,
                   FullScreen=True, IgnoreManifestScope=True,
                   IsRemovable=True, Precomposed=True)
    return payload

def write_profile(name, title, payloads):
    profile = identity('uz.dmed.profile.' + name, title, 'Configuration')
    profile.update(PayloadContent=payloads, PayloadRemovalDisallowed=False,
                   PayloadDescription='DMED saytlarini bosh ekrandan ochish. Faqat web-ilova belgilari; VPN, MDM va sertifikatlar mavjud emas.')
    target = OUT / (name + '.mobileconfig')
    target.write_bytes(plistlib.dumps(profile, sort_keys=False))
    loaded = plistlib.loads(target.read_bytes())
    assert loaded['PayloadType'] == 'Configuration'
    assert not loaded['PayloadRemovalDisallowed']
    assert len(loaded['PayloadContent']) == len(payloads)
    for p in loaded['PayloadContent']:
        assert p['PayloadType'] == 'com.apple.webClip.managed'
        assert p['URL'].startswith(BASE + '/')
        assert p['FullScreen'] and p['IsRemovable']
        assert p['Icon'].startswith(b'\x89PNG\r\n\x1a\n')
    return target

profiles = [write_profile('DMED-' + title.split()[-1], title, [clip(role, title, path)])
            for role, title, path in ROLES]
profiles.append(write_profile('DMED-3-iPhone', 'DMED — 3 ta web-ilova',
                              [clip(*r) for r in ROLES]))
guide = '''DMED iPhone / iPad — 3 ta web-ilova

Bu App Store/IPA ilovasi emas. Saytlar internet orqali ishlaydi.
Apple Developer hisobi kerak emas. Profil faqat bosh ekran belgilarini qo‘shadi.
VPN, qurilma boshqaruvi, sertifikat yoki parol qo‘shilmaydi.

O‘RNATISH
1. iPhone Safari brauzerida DMED-3-iPhone.mobileconfig faylini oching.
2. Profilni yuklashga Allow / Ruxsat berish tugmasini bosing.
3. Settings / Sozlamalar → Profile Downloaded / Profil yuklandi → Install.
   Topilmasa: General → VPN & Device Management → DMED — 3 ta web-ilova.
4. Telefon ekran qulfi kodini telefonda kiriting va o‘rnatishni tasdiqlang.
5. Bosh ekranda DMED Mijoz, DMED Admin, DMED Operator paydo bo‘ladi.

Faqat bitta ilova kerak bo‘lsa, tegishli alohida profilni o‘rnating.
Birlashtirilgan profil bilan alohida profillarni birga o‘rnatmang — belgilar takrorlanadi.
Profil imzolanmagan: iOS tekshirilmagan profil ekanini ko‘rsatishi mumkin.
O‘chirish: Settings → General → VPN & Device Management → DMED → Remove Profile.

PROFILSIZ VARIANT
Safari’da kerakli manzilni oching → Share → Add to Home Screen.
Nomini DMED Mijoz / DMED Admin / DMED Operator qilib saqlang.
Open as Web App tugmasi bo‘lsa, yoqing.

MANZILLAR
'''+ '\n'.join(title + ': ' + BASE + path for _, title, path in ROLES) + '''

TEKSHIRUV
Profil tarkibi, URLlar, PNG ikonka va ZIP yaxlitligi avtomatik tekshiriladi.
Haqiqiy iPhone’da o‘rnatish, mikrofon, video va login hali sinovdan o‘tkazilmagan.
Sayt yangilanishlari avtomatik ko‘rinadi. Internet bo‘lmasa darslar ochilmaydi.

Apple yo‘riqnomasi: https://support.apple.com/en-my/102400
'''
(OUT / 'ORNATISH.txt').write_text(guide)
archive = OUT.parent / 'DMED-3-iPhone-web-ilova.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in profiles + [OUT / 'ORNATISH.txt']:
        z.write(f, f.name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
report = {f.name: {'bytes': f.stat().st_size,
                  'sha256': hashlib.sha256(f.read_bytes()).hexdigest()} for f in profiles}
(OUT / 'verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps({'profiles': len(profiles), 'zip': str(archive), 'checks': 'passed'}))
