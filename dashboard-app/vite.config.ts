import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Hasil build masuk ke ../dashboard agar tampil di GitHub Pages:
// https://haikalbrohman.github.io/Kirana-e-commerce-/dashboard/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "../dashboard", emptyOutDir: true },
});
