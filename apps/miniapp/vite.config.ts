import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
export default defineConfig({
  plugins: [uni()],
  optimizeDeps: { exclude: ["@uh/domain", "@uh/contracts", "@uh/tool-core"] },
  server: {
    host: "0.0.0.0",
    port: 3072,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3070" },
  },
});
