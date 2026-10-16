#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-output
package=uz.dmed.mobile.mijoz
trap 'adb logcat -d > android-output/offline-diagnostics.log; adb exec-out screencap -p > android-output/offline-last-screen.png' EXIT
sleep 20
adb shell am force-stop com.google.android.apps.nexuslauncher
adb logcat -c
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
sleep 5
adb install -r mobile/android/app/build/outputs/apk/mijoz/debug/app-mijoz-debug.apk
adb shell am force-stop "$package"
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity"
for attempt in $(seq 1 12); do
  sleep 5
  adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/offline-first-launch.log
  if grep -q 'DMED_OFFLINE_READY:26:711' android-output/offline-first-launch.log; then break;fi
done
adb shell uiautomator dump /sdcard/offline.xml
adb pull /sdcard/offline.xml android-output/offline-first-launch.xml
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/offline-first-launch.log
grep -q 'DMED_OFFLINE_READY:26:711' android-output/offline-first-launch.log
adb exec-out screencap -p > android-output/offline-first-launch.png
adb shell am force-stop "$package"
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --es offline_lesson login-to-system-uz
sleep 12
adb shell uiautomator dump /sdcard/offline.xml
adb pull /sdcard/offline.xml android-output/offline-text.xml
grep -q 'Tizimga kirish' android-output/offline-text.xml
adb exec-out screencap -p > android-output/offline-text.png
adb shell am force-stop "$package"
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
adb shell svc data enable
sleep 12
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --ez offline_download true --es offline_lesson login-to-system-uz
ready=false
for attempt in $(seq 1 60); do
  sleep 5
  if adb shell run-as "$package" test -f files/offline-media/index.json; then ready=true;break;fi
done
if [ "$ready" != true ]; then adb logcat -d > android-output/offline-download-error.log;exit 1;fi
adb shell run-as "$package" cat files/offline-media/index.json > android-output/offline-files.json
python3 - <<'PY'
import json
files=json.load(open('android-output/offline-files.json'));assert files;assert any(x['size']>1000000 and x['mime'].startswith('video/') for x in files.values())
PY
adb shell am force-stop "$package"
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
sleep 5
adb logcat -c
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --es offline_lesson login-to-system-uz
sleep 18
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/offline-video.log
python3 - <<'PY'
import re,json
text=open('android-output/offline-video.log').read();m=re.search(r'DMED_OFFLINE_VIDEO:(\{[^\n]+\})',text);assert m,text
v=json.loads(m[1]);assert v['video'] and v['time']>30 and v['duration']>60 and v['ready']>=2 and v['error']==0,v
print('PASS: APK first launch without internet; bundled 26 sections/711 lessons; full download; process restart; offline video playback and seek',v)
PY
adb exec-out screencap -p > android-output/offline-video.png
adb shell am force-stop "$package"
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
adb shell svc data enable
