#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-output
adb logcat -c
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
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml "android-output/$role-ui.xml"
  if grep -q 'Sahifa ochilmadi' "android-output/$role-ui.xml"; then echo "Network error: $role"; exit 1; fi
  adb exec-out screencap -p > "android-output/$role-screen.png"
  adb logcat -d -s DMED_SMOKE:I > "android-output/$role-dom-check.txt"
  grep -q "$role:true" "android-output/$role-dom-check.txt"
  adb shell am force-stop "$package"
done
for required in false true; do
  adb shell am start -W -n uz.dmed.mobile.mijoz/uz.dmed.mobile.MainActivity --ez update_preview true --ez update_required "$required"
  sleep 4
  adb shell uiautomator dump /sdcard/update.xml
  adb pull /sdcard/update.xml "android-output/update-$required.xml"
  grep -q 'Hozir yangilash' "android-output/update-$required.xml"
  if [ "$required" = false ]; then grep -q 'Keyinroq' "android-output/update-$required.xml"; else
    if grep -q 'Keyinroq' "android-output/update-$required.xml"; then exit 1; fi
    adb shell input keyevent KEYCODE_BACK
    adb shell uiautomator dump /sdcard/update-required-back.xml
    adb pull /sdcard/update-required-back.xml android-output/update-required-back.xml
    grep -q 'Hozir yangilash' android-output/update-required-back.xml
  fi
  adb exec-out screencap -p > "android-output/update-$required.png"
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
