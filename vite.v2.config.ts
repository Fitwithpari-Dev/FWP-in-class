import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file from root directory (since this config uses root: './src-v2')
  const env = loadEnv(mode, process.cwd(), '');

  console.log('[Vite Config] Environment variables loaded:', {
    VITE_ZOOM_SDK_KEY: env.VITE_ZOOM_SDK_KEY ? 'SET' : 'NOT SET',
    VITE_ZOOM_SDK_SECRET: env.VITE_ZOOM_SDK_SECRET ? 'SET' : 'NOT SET',
    VITE_ZOOM_TOKEN_ENDPOINT: env.VITE_ZOOM_TOKEN_ENDPOINT,
    VITE_AGORA_APP_ID: env.VITE_AGORA_APP_ID ? 'SET' : 'NOT SET',
    mode: mode
  });

  return {
    plugins: [react({
      tsDecorators: true,
    })],
    root: './src-v2',
    build: {
      outDir: '../build-v2',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src-v2'),
        '@core': path.resolve(__dirname, './src-v2/core'),
        '@infrastructure': path.resolve(__dirname, './src-v2/infrastructure'),
        '@presentation': path.resolve(__dirname, './src-v2/presentation'),
        '@shared': path.resolve(__dirname, './src-v2/shared'),
      },
    },
    server: {
      port: 3007,
      open: true,
    },
    define: {
      // Ensure environment variables are available
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      // Explicitly define Zoom SDK environment variables - use fallback values if not set
      'import.meta.env.VITE_ZOOM_SDK_KEY': JSON.stringify(env.VITE_ZOOM_SDK_KEY || ''),
      'import.meta.env.VITE_ZOOM_SDK_SECRET': JSON.stringify(env.VITE_ZOOM_SDK_SECRET || ''),
      'import.meta.env.VITE_ZOOM_TOKEN_ENDPOINT': JSON.stringify(env.VITE_ZOOM_TOKEN_ENDPOINT || 'https://oorxo2zdkjrmmbzdfhaktk5ipa0phjlp.lambda-url.ap-south-1.on.aws'),
      'import.meta.env.VITE_AGORA_APP_ID': JSON.stringify(env.VITE_AGORA_APP_ID || ''),
      'import.meta.env.DEV': JSON.stringify(mode === 'development'),
      // Add global definitions for better browser compatibility
      global: 'globalThis',
      // Fix Buffer compatibility for browser
      Buffer: 'undefined'
    },
    // Use V2-specific TypeScript config
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          jsx: 'react-jsx'
        }
      }
    }
  };
});