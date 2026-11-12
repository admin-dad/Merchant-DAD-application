import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.merchantdad.app',
  appName: 'Merchant DAD',
  webDir: 'mobile',
  server: {
    url: 'https://merchant-dad-application.vercel.app/',
    cleartext: false,
    // Capacitor serves this bundled file when the main page cannot load.
    errorPath: 'offline.html',
  },
  plugins: {
    SystemBars: {
      // MainActivity applies native padding for bars, cutouts and the keyboard.
      insetsHandling: 'disable',
      hidden: false,
    },
    SplashScreen: {
      // Android's system splash is blank white and closes at once. The only
      // startup loader is MainActivity's logo + spinner (AppLoader plugin).
      launchShowDuration: 0,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
    },
  },
};

export default config;
