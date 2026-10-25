import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  base: "./",
  optimizeDeps: { exclude: ["@uh/domain", "@uh/contracts"] },
  server: {
    port: 3071,
    host: "0.0.0.0",
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3070" },
  },
  build: { chunkSizeWarningLimit: 1200 },
});
