import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tonnom.nativechat',
  appName: 'NativeChat',
  webDir: 'out',
  server: {
    url: 'https://native-chat-ai.vercel.app/',
    allowNavigation: [
      'native-chat-ai.vercel.app',
      '*.clerk.accounts.dev', 
      'accounts.clerk.com'    
    ]
  }
};

export default config;