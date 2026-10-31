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
      // MainActivity shows the branded logo and spinner until the first page loads.
      launchShowDuration: 0,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
    },
  },
};

export default config;
