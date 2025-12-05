import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      css: {
        postcss: './postcss.config.js',
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: {
            popup: path.resolve(__dirname, 'components/popup.html'),
            dashboard: path.resolve(__dirname, 'components/dashboard.html'),
            blocked: path.resolve(__dirname, 'components/blocked.html'),
            background: path.resolve(__dirname, 'src/background.ts'),
            content: path.resolve(__dirname, 'src/content.ts'),
          },
          output: {
            entryFileNames: (chunkInfo) => {
              if (chunkInfo.name === 'popup' || chunkInfo.name === 'dashboard' || chunkInfo.name === 'blocked') {
                return '[name].js';
              }
              if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
                return '[name].js';
              }
              return 'assets/[name]-[hash].js';
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'popup.html' || assetInfo.name === 'dashboard.html' || assetInfo.name === 'blocked.html') {
                return '[name][extname]';
              }
              return 'assets/[name]-[hash][extname]';
            }
          }
        },
        copyPublicDir: true,
      }
    };
});
