import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        salka: resolve(__dirname, "projects/salka.html"),
        clayer: resolve(__dirname, "projects/c-layer.html"),
        notfound: resolve(__dirname, "404.html"),
      },
    },
  },
});
