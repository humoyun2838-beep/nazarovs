#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-output
adb logcat -c
trap 'adb logcat -d -s DMED:E chromium:E AndroidRuntime:E > android-output/web-errors.txt; adb exec-out screencap -p > android-output/last-screen.png' EXIT
curl -IL --max-time 30 'https://nazarovs-production.up.railway.app/nazarov?lang=uz' > android-output/server-headers.txt
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
  case "$role" in
    mijoz) grep -q 'Materiallar' "android-output/$role-ui.xml" ;;
    *) grep -q 'Parol' "android-output/$role-ui.xml" ;;
  esac
  adb exec-out screencap -p > "android-output/$role-screen.png"
  adb shell am force-stop "$package"
done
adb logcat -d -b crash > android-output/crash-log.txt
if grep -q 'FATAL EXCEPTION' android-output/crash-log.txt; then cat android-output/crash-log.txt; exit 1; fi
