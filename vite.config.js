import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// VITE_SITE=fomento gera o site próprio do Fomento Paraná (mesma base de dados)
const FOMENTO = process.env.VITE_SITE === "fomento";

export default defineConfig({
  plugins: [
    react(),
    FOMENTO && {
      name: "html-fomento",
      transformIndexHtml: (html) => html.replace(/Conecta Comércio · Ivatuba - PR/g, "Fomento Paraná · Ivatuba").replace(/content="Conecta Comércio"/g, 'content="Fomento Paraná · Ivatuba"').replace(/content="Conecta"/g, 'content="Fomento"'),
    },
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["icon-192.png", "icon-512.png", "robots.txt"],
      manifest: {
        name: FOMENTO ? "Fomento Paraná · Ivatuba" : "Conecta Comércio",
        short_name: FOMENTO ? "Fomento" : "Conecta",
        description: FOMENTO
          ? "Crédito da Fomento Paraná com o Agente de Crédito de Ivatuba - PR."
          : "Plataforma independente para fortalecer o comércio local de Ivatuba - PR.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0A5AA8",
        background_color: "#FFFFFF",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
});
