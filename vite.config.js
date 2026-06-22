import { defineConfig } from "vite";

// Göreli base ('./') sayesinde derleme, GitHub Pages alt-yolunda
// (örn. /R-M/) sorunsuz çalışır — varlık yolları göreli üretilir.
export default defineConfig({
  base: "./",
});
