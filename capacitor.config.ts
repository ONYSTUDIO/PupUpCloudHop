import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onystudio.pupupcloudHop',
  appName: 'Pup Up! Cloud Hop',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#87ceeb',
      showSpinner: false,
    },
  },
};

export default config;
