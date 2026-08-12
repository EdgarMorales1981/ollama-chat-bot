import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/ollama-api": {
        target: "https://ollama.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama-api/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            const apiKey = process.env.VITE_OLLAMA_API_KEY;
            if (apiKey) {
              proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
            }
          });
        },
      },
    },
  },
});
