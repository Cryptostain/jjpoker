import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves this repo from /jjpoker/, so the build must use that base.
export default defineConfig({
  base: "/jjpoker/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Once cached the app runs offline; there is nothing to fetch from a network.
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Side Pots",
        short_name: "Side Pots",
        description: "Split multi-way all-in poker pots at the table.",
        theme_color: "#0F1214",
        background_color: "#0F1214",
        display: "standalone",
        orientation: "portrait",
        start_url: "/jjpoker/",
        scope: "/jjpoker/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
