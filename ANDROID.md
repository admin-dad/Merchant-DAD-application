# Merchant DAD Android APK

The Capacitor Android app opens https://merchant-dad-application.vercel.app/.
It needs internet access. Deploying website changes to that URL updates the
content shown in the app; native changes require a new APK.

The app name is Merchant DAD and the application ID is `com.merchantdad.app`.
Its launcher icons use `public/logopng.jpeg`.

Android's Back button/gesture navigates through WebView history, then uses normal
Android back behavior when there is no previous page. The native activity keeps
the website inside the status bar, navigation bar and display cutouts, and resizes
it above the keyboard. Rebuild and reinstall the APK for these native changes.

## Download an APK using GitHub Actions

1. Commit and push the Android setup files to the repository's `main` branch.
2. Open the repository's Actions tab and select **Build Android APK**.
3. Wait for a successful run (or select **Run workflow** to start one manually).
4. Download **merchant-dad-apk** from the run's Artifacts section.
5. Extract the ZIP and install `app-debug.apk` on an Android device.
   Android may ask you to allow installation from your browser or file manager.

This is a debug APK for testing and direct installation. It is not a signed
production release for Google Play. No signing secrets or Supabase/Razorpay
server credentials are needed for this workflow: those remain on Vercel.
GitHub runners can use different debug signing keys between runs, so you may
need to uninstall a previous test build before installing another one.

## Build locally

Install Node.js 22 or later, JDK 21, and the Android SDK (platform 36) using
Android Studio. Set `ANDROID_HOME` or configure `android/local.properties`
with your local SDK path. Then run:

```sh
npm ci
npm run android:apk
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

Use `npm run android:open` to open Android Studio. The website remains a
server-rendered Next.js deployment; no static export is required.

Before distributing, test login, payments, QR scanning and downloads on a
physical Android device. Native WebView behavior can differ from a browser.
