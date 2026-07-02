import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["sentinel-icon.svg"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document" || request.destination === "script" || request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "sentinel-static"
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "sentinel-api",
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24
              },
              backgroundSync: {
                name: "sentinel-api-sync",
                options: {
                  maxRetentionTime: 24 * 60
                }
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
});
