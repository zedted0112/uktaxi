# Build the Android APK with Gradle (local)

This project can produce a **release APK** on your machine with the Android Gradle wrapper—no EAS cloud build required. The output is `app-release.apk` under the app module’s `build/outputs` directory.

## App launcher icon looks unchanged

Changing `frontend/assets/images/app-icon.png` (or `app.json` `icon` / `android.adaptiveIcon`) does **not** update the home-screen icon by itself: Android uses **generated files** under `frontend/android/app/src/main/res/mipmap-*` (e.g. `ic_launcher*.webp`). After you change the source image, sync native assets, then rebuild the APK:

```bash
cd frontend
npx expo prebuild --platform android
```

Commit the updated `mipmap-*` files if others should get the new icon without running prebuild. Then run `assembleRelease` again and reinstall the app (some launchers cache icons; uninstall first if it still looks old).

## Prerequisites

1. **Node.js** and dependencies installed in `frontend` (`npm install` in `frontend`).
2. **Android SDK** (via Android Studio or standalone command-line tools).
3. **`ANDROID_HOME`** (or **`ANDROID_SDK_ROOT`**) pointing at the SDK root.

**macOS (typical SDK path):**

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

**Linux (typical):**

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
```

Add the same line to your shell profile if you build often.

4. **JDK** compatible with the project’s Gradle / AGP (Android Studio’s bundled JDK is usually fine).

## Build commands

From the repository root, use **`frontend`** as the JS/native app root.

### All-in-one script (prebuild + APK)

Runs **`npx expo prebuild --platform android`** (refreshes launcher mipmaps from `app.json` / `assets/images/app-icon.png`), then **`./gradlew assembleRelease`** (embeds `frontend/.env` **`EXPO_PUBLIC_*`** at bundle time). Use this after changing the icon or demo flags in `.env`.

```bash
chmod +x ./scripts/build-android-apk.sh   # once
./scripts/build-android-apk.sh
```

Skip prebuild when you only changed JS and not icons / native config: `SKIP_PREBUILD=1 ./scripts/build-android-apk.sh`.

### Option A — npm script (Gradle only, from `frontend`)

```bash
cd frontend
npm install   # if you have not already
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
npm run build:apk
```

`build:apk` runs: `cd android && ./gradlew assembleRelease`.

### Option B — Gradle directly (from `frontend/android`)

```bash
cd frontend/android
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
chmod +x ./gradlew   # once, if needed
./gradlew assembleRelease
```

### Clean rebuild (optional)

```bash
cd frontend/android
./gradlew clean assembleRelease
```

## Where the APK is written

After a successful build:

| Path (relative to repo) | Full example |
|-------------------------|--------------|
| `frontend/android/app/build/outputs/apk/release/app-release.apk` | `…/UKParivahan-sync/frontend/android/app/build/outputs/apk/release/app-release.apk` |

This directory is **build output** (not committed to git). Install the file on a device with USB file transfer, AirDrop, or `adb install app-release.apk`.

## Environment variables (JS bundle)

Gradle triggers an embedded JS bundle step. **`EXPO_PUBLIC_*` values** come from your **`frontend/.env`** (and `.env.local` if present) at bundle time, same idea as local Metro. Set them before running `assembleRelease` if you need a specific API base URL or flags.

## Signing note (Google Sign-In)

In this repo, **release** is currently configured to use the **debug keystore** for signing (`signingConfig signingConfigs.debug` in `frontend/android/app/build.gradle`). That matches typical **debug SHA-1** entries in Google Cloud / Firebase, which is why a **local Gradle release APK** can behave differently from an **EAS** build that uses Expo’s **release** keystore. For Play Store production you would use a dedicated release keystore and register its SHA-1 for OAuth.

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `SDK location not found` | Set `ANDROID_HOME` or create `frontend/android/local.properties` with `sdk.dir=/absolute/path/to/sdk` (that file is gitignored). |
| `gradlew: Permission denied` | `chmod +x frontend/android/gradlew` |
| Stale native/JS state | `./gradlew clean` then `assembleRelease` again |

## EAS vs Gradle (short)

| | **EAS Build** | **Gradle `assembleRelease` (this doc)** |
|---|----------------|----------------------------------------|
| Where it runs | Expo cloud | Your machine |
| APK path | Download from expo.dev build page | `frontend/android/app/build/outputs/apk/release/app-release.apk` |
| Signing | Expo-managed credentials (by default) | As configured in `app/build.gradle` (here: debug keystore for release) |
