import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.floorplan',
  appName: '平面図エディター',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
