import { Capacitor, registerPlugin } from '@capacitor/core'

// Native startup loader (logo + spinner) shown by MainActivity in the Android app.
const AppLoader = registerPlugin<{ hide(): Promise<void> }>('AppLoader')

// Call once the first real screen is ready so the native loader fades out.
export function hideNativeSplash() {
  if (Capacitor.isNativePlatform()) void AppLoader.hide().catch(() => {})
}
