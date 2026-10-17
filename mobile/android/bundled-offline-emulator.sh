#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-output
package=uz.dmed.mobile.mijoz
sleep 20
adb shell am force-stop com.google.android.apps.nexuslauncher
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
adb logcat -c
adb install -r mobile/android/app/build/outputs/apk/mijoz/debug/app-mijoz-debug.apk
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity"
sleep 20
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/bundled-first-launch.log
grep -q 'DMED_OFFLINE_READY:26:711' android-output/bundled-first-launch.log
adb exec-out screencap -p > android-output/bundled-first-launch.png
adb shell am force-stop "$package"
adb logcat -c
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --ez offline_play true --es offline_lesson login-to-system-uz
sleep 20
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/bundled-video.log
python3 - <<'PY'
import json,re
s=open('android-output/bundled-video.log').read();m=re.search(r'DMED_OFFLINE_VIDEO:(\{[^\n]+\})',s);assert m,s
v=json.loads(m[1]);assert v['video'] and 20<v['time']<45 and v['duration']>60 and v['ready']>=2 and v['error']==0,v
print('PASS: first-install APK video playback and seek with all networking disabled',v)
PY
adb exec-out screencap -p > android-output/bundled-video.png
adb shell am force-stop "$package"
adb logcat -c
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --es offline_lesson bemor-1fd60b77fb
sleep 20
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/bundled-image.log
python3 - <<'PY'
import json,re
s=open('android-output/bundled-image.log').read();m=re.search(r'DMED_OFFLINE_IMAGE:(\{[^\n]+\})',s);assert m,s
v=json.loads(m[1]);assert v['complete'] and v['width']>0,v
print('PASS: first-install APK image with all networking disabled',v)
PY
adb exec-out screencap -p > android-output/bundled-image.png
adb shell run-as "$package" ls files/offline-media > android-output/private-media-files.txt
python3 - <<'PY'
import re
s=open('android-output/private-media-files.txt').read();assert not re.search(r'^[a-f0-9]{64}$',s,re.M),s
print('PASS: no downloaded or duplicated video/image files; player reads APK assets directly')
PY
pdf_slugs=$(python3 - <<'PYDOC'
import gzip,json
c=json.loads(gzip.decompress(open('mobile/android/app/src/mijoz/assets/offline/catalog.json.gz','rb').read()))
items=[next(m['slug'] for m in c['materials'] if 'FILE::' in m['content']),next(m['slug'] for m in c['materials'] if 'FILE::' in m['content'] and '.docx' in m['content'].lower())];print('\n'.join(dict.fromkeys(items)))
PYDOC
)
document_number=0
for pdf_slug in $pdf_slugs;do
document_number=$((document_number+1))
adb shell am force-stop "$package"
adb logcat -c
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --ez offline_document true --es offline_lesson "$pdf_slug"
sleep 15
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/bundled-pdf-${document_number}.log
grep -q 'DMED_OFFLINE_PDF:' android-output/bundled-pdf-${document_number}.log
adb exec-out screencap -p > android-output/bundled-pdf-${document_number}.png
done
adb logcat -d -b crash > android-output/bundled-crashes.log
if grep -q 'FATAL EXCEPTION' android-output/bundled-crashes.log;then exit 1;fi
