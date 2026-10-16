#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-output
adb logcat -c
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
  adb shell am force-stop "$package"
done
adb logcat -d -b crash > android-output/crash-log.txt
if grep -q 'FATAL EXCEPTION' android-output/crash-log.txt; then cat android-output/crash-log.txt; exit 1; fi
