#!/usr/bin/env bash
# Local release APK: refreshes Android launcher icons from app.json, embeds frontend/.env EXPO_PUBLIC_*,
# then runs Gradle assembleRelease (same flow as a manual prebuild + ./gradlew assembleRelease).
#
# Usage (repo root):
#   ./scripts/build-android-apk.sh
#
# Optional:
#   SKIP_PREBUILD=1 ./scripts/build-android-apk.sh   # Gradle only (skip if you did not change icon / app.json native)
#   ANDROID_HOME=/your/sdk ./scripts/build-android-apk.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="${ROOT}/frontend"
APK_OUT="${FRONTEND}/android/app/build/outputs/apk/release/app-release.apk"

if [[ -z "${ANDROID_HOME:-}" ]] && [[ -z "${ANDROID_SDK_ROOT:-}" ]]; then
  if [[ -d "${HOME}/Library/Android/sdk" ]]; then
    export ANDROID_HOME="${HOME}/Library/Android/sdk"
  elif [[ -d "${HOME}/Android/Sdk" ]]; then
    export ANDROID_HOME="${HOME}/Android/Sdk"
  else
    echo "ANDROID_HOME is not set and no default SDK was found (~/Library/Android/sdk or ~/Android/Sdk)." >&2
    echo "Set ANDROID_HOME to your Android SDK root, then re-run." >&2
    exit 1
  fi
  echo "Using ANDROID_HOME=${ANDROID_HOME}"
fi

if [[ -n "${ANDROID_SDK_ROOT:-}" ]] && [[ -z "${ANDROID_HOME:-}" ]]; then
  export ANDROID_HOME="${ANDROID_SDK_ROOT}"
fi

cd "${FRONTEND}"

if [[ "${SKIP_PREBUILD:-0}" != "1" ]]; then
  echo "==> expo prebuild --platform android (mipmap icons from app.json)"
  npx expo prebuild --platform android --no-install
else
  echo "==> skipping expo prebuild (SKIP_PREBUILD=1)"
fi

echo "==> ./gradlew assembleRelease"
cd "${FRONTEND}/android"
chmod +x ./gradlew 2>/dev/null || true
./gradlew assembleRelease

echo ""
echo "Done. Install this file (uninstall old app first if the launcher icon looks cached):"
echo "  ${APK_OUT}"
ls -lh "${APK_OUT}"
