#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-output
dmed_adb_executable="$(command -v adb)"
adb(){ timeout 45s "$dmed_adb_executable" "$@"; }
package=uz.dmed.mobile.mijoz
dmed_log_pid=""
trap 'if [ -n "$dmed_log_pid" ];then kill "$dmed_log_pid" 2>/dev/null || true;fi; sudo dmesg | tail -80 > android-output/host-memory.txt; free -m > android-output/host-memory-summary.txt; adb logcat -d > android-output/offline-diagnostics.log; adb exec-out screencap -p > android-output/offline-last-screen.png' EXIT
sleep 20
adb shell am force-stop com.google.android.apps.nexuslauncher
"$dmed_adb_executable" logcat -v time > android-output/offline-live.log &
dmed_log_pid=$!
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
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/offline-first-launch.log
grep -q 'DMED_OFFLINE_READY:26:711' android-output/offline-first-launch.log
adb exec-out screencap -p > android-output/offline-first-launch.png
adb shell am force-stop "$package"
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --es offline_lesson login-to-system-uz
sleep 12
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/offline-text.log
grep -q 'DMED_OFFLINE_TEXT:Tizimga kirish' android-output/offline-text.log
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
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --ez offline_download true --es offline_lesson bemor-1fd60b77fb
ready=false
for attempt in $(seq 1 40); do
  sleep 5
  adb shell run-as "$package" cat files/offline-media/index.json > android-output/offline-files.json
  if python3 -c 'import json;d=json.load(open("android-output/offline-files.json"));assert any(x["mime"].startswith("image/") for x in d.values())';then ready=true;break;fi
done
if [ "$ready" != true ]; then exit 1;fi
sleep 5
adb shell run-as "$package" cat files/offline-media/catalog.json > android-output/synced-catalog.json
python3 - <<'PY'
import json
d=json.load(open('android-output/synced-catalog.json'));assert len(d['materials'])>=711 and d['version']!='2026-10-16';print('PASS: native catalog synchronization',d['version'])
PY
adb shell am force-stop "$package"
adb shell svc wifi disable
adb shell svc data disable
adb shell cmd connectivity airplane-mode enable
sleep 5
adb logcat -c
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --ez offline_play true --es offline_lesson login-to-system-uz
sleep 18
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/offline-video.log
python3 - <<'PY'
import re,json
text=open('android-output/offline-video.log').read();m=re.search(r'DMED_OFFLINE_VIDEO:(\{[^\n]+\})',text);assert m,text
v=json.loads(m[1]);assert v['video'] and 20<v['time']<45 and v['duration']>60 and v['ready']>=2 and v['error']==0,v
print('PASS: APK first launch without internet; bundled 26 sections/711 lessons; full download; process restart; offline video playback and seek',v)
PY
adb exec-out screencap -p > android-output/offline-video.png
adb shell am force-stop "$package"
adb logcat -c
adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity" --ez offline_test true --es offline_lesson bemor-1fd60b77fb
sleep 15
adb logcat -d -s DMED_OFFLINE_TEST:I > android-output/offline-image.log
python3 - <<'PY'
import json,re
text=open('android-output/offline-image.log').read();m=re.search(r'DMED_OFFLINE_IMAGE:(\{[^\n]+\})',text);assert m,text
image=json.loads(m[1]);assert image['complete'] and image['width']>0,image
print('PASS: private downloaded image after offline process restart',image)
PY
adb exec-out screencap -p > android-output/offline-image.png
adb shell am force-stop "$package"
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
adb shell svc data enable
