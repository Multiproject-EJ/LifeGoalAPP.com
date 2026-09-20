import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifegoalapp.habitgame',
  appName: 'HabitGame',
  webDir: 'dist',
  plugins: { LocalNotifications: { presentationOptions: ['badge', 'sound', 'banner', 'list'] } },
};

export default config;
