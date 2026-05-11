# Building Ambition APK for friends/testing

This project ships with an EAS Build configuration (`eas.json`). EAS Build runs the actual compilation in Expo's cloud — **no Android SDK or Java needed on your machine.**

## Prerequisites

1. **Free Expo account** — sign up at https://expo.dev (one-click)
2. Node ≥ 18 and npm/yarn installed locally
3. Run `npx expo install --check` once to make sure all dependencies are aligned with the SDK

## Steps

### 1. Log in to Expo

```bash
npx eas login
```

Enter your expo.dev credentials.

### 2. First-time link the project

```bash
npx eas init
```

This writes a `projectId` into `app.json` under `expo.extra.eas.projectId`. Commit that change.

### 3. Trigger a preview APK build

```bash
npx eas build --platform android --profile preview
```

- Build runs in EAS Cloud (free tier: ~30 builds/month)
- Takes ~10–20 minutes
- Output: a downloadable `.apk` URL

The CLI will print a URL like `https://expo.dev/accounts/<you>/projects/ambition/builds/<id>`. Open it, download the APK, and share with friends via Telegram/email/etc.

### 4. Install on Android

Friends just need to:
1. Open the APK download link on their phone
2. Tap the file → "Install"
3. Allow "Install from unknown sources" if Android prompts (one-time)

## When releasing a new version

1. Bump `expo.version` in `app.json` (semantic version, e.g., `1.4.0`)
2. Bump `expo.android.versionCode` (integer, must always increase)
3. Run `npx eas build --platform android --profile preview` again
4. Share the new APK link

## Build profiles

- `preview` — APK, internal distribution, ideal for friends testing
- `production` — AAB (Google Play bundle), auto-increments versionCode
- `development` — Dev client APK with hot reload, for debugging on a device

## Troubleshooting

**"Cannot find project ID"** — Run `npx eas init` first.

**Build fails with a missing native module** — That dependency probably requires a config plugin or isn't compatible with Expo Go. Check `npx expo install --check` output.

**Friends see "App not installed"** — Android sometimes rejects an APK if a version with the same package name and a higher versionCode is already installed. Tell them to uninstall the older Ambition first.
