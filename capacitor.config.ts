import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tonnom.nativechat',
  appName: 'NativeChat',
  webDir: 'out',
  // capacitor.config.ts
  server: {
    url: 'https://native-chat-ai.vercel.app/',
    allowNavigation: [
      'native-chat-ai.vercel.app',
      '*.clerk.accounts.dev', // Domaine de Clerk pour l'auth
      'accounts.clerk.com'    // Parfois nécessaire selon ton plan Clerk
    ]
  }
};

export default config;