import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "github-pages-spa-fallback",
      closeBundle() {
        copyFileSync("dist/index.html", "dist/404.html");
      },
    },
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
