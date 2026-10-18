#!/usr/bin/env bash
set -euo pipefail
mkdir -p admin-output
trap 'adb logcat -d > admin-output/logcat.txt; adb exec-out screencap -p > admin-output/admin-launch.png' EXIT
adb install mobile/android/app/build/outputs/apk/admin/debug/app-admin-debug.apk
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
adb shell svc data enable
sleep 15
for attempt in $(seq 1 45); do
  adb shell dumpsys connectivity > admin-output/connectivity.txt
  if grep -q VALIDATED admin-output/connectivity.txt; then break; fi
  sleep 2
done
grep -q VALIDATED admin-output/connectivity.txt
adb logcat -c
adb shell am start -W -n uz.dmed.mobile.admin/uz.dmed.mobile.MainActivity
sleep 20
for attempt in $(seq 1 6); do
  adb shell uiautomator dump /sdcard/admin-ui.xml
  adb pull /sdcard/admin-ui.xml admin-output/admin-ui.xml
  if grep -q 'Parol' admin-output/admin-ui.xml; then break; fi
  sleep 5
done
adb logcat -d > admin-output/logcat.txt
adb shell dumpsys activity activities > admin-output/activity.txt
grep 'uz.dmed.mobile.admin/uz.dmed.mobile.MainActivity' admin-output/activity.txt
python3 -c "from pathlib import Path; u=Path('admin-output/admin-ui.xml').read_text(); logs=Path('admin-output/logcat.txt').read_text(); assert 'Login' in u and 'Parol' in u, 'Admin login page did not render'; assert 'FATAL EXCEPTION' not in logs; print('PASS: Android 15 admin login rendered without fatal crash')"
