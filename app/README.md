# 商途 — Capacitor app shell

**App shell now, store later.** This wraps the same HTML/CSS/JS game in Capacitor so you can build a native Android/iOS container later. Nothing is submitted to App Store / Play here.

## What’s included

| Path | Purpose |
|------|---------|
| `www/` | Copy of `../prototype/` (the playable game) |
| `capacitor.config.json` | App id `com.merchantroad.app`, name 商途 |
| `package.json` | Capacitor 6 deps |
| `scripts/copy-www.js` | Refresh `www/` from `prototype/` after web edits |

## On David’s machine (build APK later)

Needs: Node 18+, Android Studio (for APK), Xcode (for iOS on Mac).

```bash
cd app
npm install
node scripts/copy-www.js   # sync latest prototype → www
npx cap add android        # once
# npx cap add ios          # once, Mac only
npx cap sync
npx cap open android       # Android Studio → Build → Build APK(s)
```

Debug APK typically lands under `android/app/build/outputs/apk/debug/`.

### Install on phone (sideload)

1. Enable install from unknown sources / USB debugging  
2. `adb install android/app/build/outputs/apk/debug/app-debug.apk`  
   or copy the APK and open it on the phone  

### iOS

```bash
npx cap add ios
npx cap sync
npx cap open ios
```

Then Archive / run on a device from Xcode. Apple Developer account needed for device installs beyond simulator.

## Honest limits

- This folder may not have `android/` / `ios/` checked in until someone runs `cap add` (large native trees).  
- No store listing, IAP, or paid accounts in this phase.  
- Web play on GitHub Pages remains the fastest way to test.

## Sync workflow after prototype changes

```bash
cd app && node scripts/copy-www.js && npx cap sync
```
