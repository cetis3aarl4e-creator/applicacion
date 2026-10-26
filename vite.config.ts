import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    // La PWA (service worker) solo se genera para la web.
    // En la app nativa (Capacitor, mode=native) no hace falta y se omite.
    ...(mode === 'native'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
            manifest: {
              name: 'Habit Tracker — Hábitos & Agenda',
              short_name: 'Hábitos',
              description: 'Rastreador de hábitos y agenda personal con rachas, calendario y estadísticas.',
              lang: 'es',
              theme_color: '#0e1117',
              background_color: '#0e1117',
              display: 'standalone',
              orientation: 'portrait',
              start_url: './',
              scope: './',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
              ]
            },
            workbox: {
              navigateFallbackDenylist: [/^\/api\//],
              globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
            }
          })
        ])
  ]
}));
