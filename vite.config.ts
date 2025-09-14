
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'FitWithPari',
          short_name: 'FWP',
          description: 'Live fitness classes platform',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@config': path.resolve(__dirname, './src/config'),
        '@context': path.resolve(__dirname, './src/context'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'terser' : false,
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tooltip',
            ],
            'zoom-vendor': ['@zoom/videosdk'],
            'supabase-vendor': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/js/${facadeModuleId}-[hash].js`;
          },
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: false,
    },
    server: {
      port: 3000,
      open: true,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@supabase/supabase-js',
        '@zoom/videosdk',
      ],
      exclude: ['@supabase/cli'],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
});