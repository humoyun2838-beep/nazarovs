#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-output
adb logcat -c
dump_ui() {
  local target="$1"
  adb shell rm -f /sdcard/dmed-update-ui.xml
  for attempt in 1 2 3 4; do
    adb shell uiautomator dump --compressed /sdcard/dmed-update-ui.xml
    if adb pull /sdcard/dmed-update-ui.xml "$target" && [ -s "$target" ]; then return 0; fi
    sleep 2
  done
  return 1
}
trap 'adb logcat -d -s DMED:E chromium:E AndroidRuntime:E > android-output/web-errors.txt; adb exec-out screencap -p > android-output/last-screen.png' EXIT
curl -IL --max-time 30 'https://nazarovs-production.up.railway.app/nazarov?lang=uz' > android-output/server-headers.txt
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
adb shell svc data enable
sleep 15
adb shell dumpsys connectivity > android-output/connectivity.txt
adb shell date > android-output/device-date.txt
adb shell getprop net.dns1 > android-output/device-dns.txt
for role in mijoz admin operator; do
  package="uz.dmed.mobile.$role"
  adb install -r "mobile/android/app/build/outputs/apk/$role/debug/app-$role-debug.apk"
  adb shell am start -W -n "$package/uz.dmed.mobile.MainActivity"
  sleep 18
  adb shell dumpsys activity activities | grep -F "$package"
  dump_ui "android-output/$role-ui.xml"
  if grep -q 'Sahifa ochilmadi' "android-output/$role-ui.xml"; then echo "Network error: $role"; exit 1; fi
  adb exec-out screencap -p > "android-output/$role-screen.png"
  adb logcat -d -s DMED_SMOKE:I > "android-output/$role-dom-check.txt"
  grep -q "$role:true" "android-output/$role-dom-check.txt"
  adb shell am force-stop "$package"
done
for required in false true; do
  adb shell am start -W -n uz.dmed.mobile.mijoz/uz.dmed.mobile.MainActivity --ez update_preview true --ez update_required "$required"
  sleep 4
  dump_ui "android-output/update-$required.xml"
  grep -q 'Hozir yangilash' "android-output/update-$required.xml"
  if [ "$required" = false ]; then grep -q 'Keyinroq' "android-output/update-$required.xml"; else
    if grep -q 'Keyinroq' "android-output/update-$required.xml"; then exit 1; fi
    adb shell input keyevent KEYCODE_BACK
    dump_ui android-output/update-required-back.xml
    grep -q 'Hozir yangilash' android-output/update-required-back.xml
  fi
  adb exec-out screencap -p > "android-output/update-$required.png"
  if [ "$required" = false ]; then
    read -r update_x update_y < <(python3 - <<'PY'
import xml.etree.ElementTree as ET,re
root=ET.parse('android-output/update-false.xml')
button=next(n for n in root.iter('node') if n.get('text')=='Hozir yangilash')
x1,y1,x2,y2=map(int,re.findall(r'\d+',button.get('bounds')))
print((x1+x2)//2,(y1+y2)//2)
PY
    )
    adb shell input tap "$update_x" "$update_y"
    sleep 15
    dump_ui android-output/update-rejected.xml
    grep -q 'APK paketi yoki versiyasi mos emas' android-output/update-rejected.xml
    grep -q 'Qayta urinish' android-output/update-rejected.xml
    adb exec-out screencap -p > android-output/update-rejected.png
    adb shell run-as uz.dmed.mobile.mijoz test ! -f cache/updates/update.apk
    adb shell svc wifi disable
    adb shell svc data disable
    adb shell cmd connectivity airplane-mode enable
    adb shell input tap "$update_x" "$update_y"
    sleep 23
    dump_ui android-output/update-offline.xml
    grep -q 'Internet va telefondagi' android-output/update-offline.xml
    grep -q 'Qayta urinish' android-output/update-offline.xml
    adb exec-out screencap -p > android-output/update-offline.png
    adb shell cmd connectivity airplane-mode disable
    adb shell svc wifi enable
    adb shell svc data enable
    sleep 8
  fi
  adb shell am force-stop uz.dmed.mobile.mijoz
done
adb shell cmd uimode night yes
adb shell am start -W -n uz.dmed.mobile.mijoz/uz.dmed.mobile.MainActivity --ez update_preview true
sleep 4
adb exec-out screencap -p > android-output/update-dark.png
adb shell am force-stop uz.dmed.mobile.mijoz
adb shell cmd uimode night no
adb logcat -d -b crash > android-output/crash-log.txt
if grep -q 'FATAL EXCEPTION' android-output/crash-log.txt; then cat android-output/crash-log.txt; exit 1; fi
