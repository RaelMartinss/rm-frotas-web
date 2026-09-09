import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rmfrotas.app',
  appName: 'RM Frotas',
  webDir: 'dist/rm-frotas-web/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
