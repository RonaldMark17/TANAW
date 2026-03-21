// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 3000,
//     proxy: {
//       '/api': {
//         target: 'http://127.0.0.1:5001' || 'http://192.168.254.104:5001 ',
//         changeOrigin: true
//       }
//     }
//   }
// })

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 3000,
    
//   }
// })
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl'; // <-- 1. Imported the SSL plugin

export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // <-- 2. Activated the SSL plugin
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when you push new code
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'TANAW Systems Hub',
        short_name: 'TANAW',
        description: 'Centralized agricultural registry and analytics platform.',
        theme_color: '#0f172a', // Matches the slate-900 enterprise theme
        background_color: '#f8fafc', // Matches the slate-50 background
        display: 'standalone', // Makes it look like a native app (hides browser UI)
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // Ensures the icon looks good on Android and iOS shapes
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true, // <-- 3. Exposes the server to your local Wi-Fi network
  }
});