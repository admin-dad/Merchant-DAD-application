import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

// The Android launch splash is the app's only startup loader. It stays up
// until the first real screen is ready (capacitor.config.ts has a timeout fallback).
export function hideNativeSplash() {
  if (Capacitor.isNativePlatform()) void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {})
}
