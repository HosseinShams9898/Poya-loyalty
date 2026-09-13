import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'باشگاه مشتریان پویا پلاستیک',
        short_name: 'باشگاه پویا',
        description: 'باشگاه مشتریان B2B پویا پلاستیک؛ امتیاز، سطح، پاداش و مأموریت',
        theme_color: '#0EA5E9',
        background_color: '#F8FAFC',
        display: 'standalone',
        dir: 'rtl',
        lang: 'fa',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // در محیط‌های CI محدود، PWA_UNMINIFIED=true از اجرای terser worker جلوگیری می‌کند.
        mode: process.env.PWA_UNMINIFIED === 'true' ? 'development' : 'production',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // importScripts فایل push handler را به سرویس ورکر اضافه می‌کند
        importScripts: ['/sw-push.js'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https?:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
});
