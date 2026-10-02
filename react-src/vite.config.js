import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";
import { publicDiscoveryPlugin } from "./scripts/generate-discovery.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "github-pages-spa-fallback",
      closeBundle() {
        copyFileSync("dist/index.html", "dist/404.html");
      },
    },
    publicDiscoveryPlugin(),
  ],

  server: {
    proxy: {
      "/api": {
        target: "https://api.cfpadvantage.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
