import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.merchantdad.app',
  appName: 'Merchant DAD',
  webDir: 'mobile',
  server: {
    url: 'https://merchant-dad-application.vercel.app/',
    cleartext: false,
  },
  plugins: {
    SystemBars: {
      // MainActivity applies native padding for bars, cutouts and the keyboard.
      insetsHandling: 'disable',
      hidden: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: true,
      androidScaleType: 'CENTER_INSIDE',
    },
  },
};

export default config;
