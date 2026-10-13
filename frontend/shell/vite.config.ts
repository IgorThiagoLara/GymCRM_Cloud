import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "shell",
      remotes: {
        mfe_matriculas: "/mfe/matriculas/assets/remoteEntry.js",
        mfe_financeiro: "/mfe/financeiro/assets/remoteEntry.js",
        mfe_eventos: "/mfe/eventos/assets/remoteEntry.js",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: { target: "esnext", minify: false },
  server: {
    port: 5170,
    proxy: {
      "/api": "http://localhost:4000",
      "/auth": "http://localhost:4000",
      "/mfe/matriculas": "http://localhost:5171",
      "/mfe/financeiro": "http://localhost:5172",
      "/mfe/eventos": "http://localhost:5173",
    },
  },
});
