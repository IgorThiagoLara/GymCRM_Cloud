import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/mfe/eventos/",
  plugins: [
    react(),
    federation({
      name: "mfe_eventos",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/App.tsx" },
      shared: ["react", "react-dom"],
    }),
  ],
  build: { target: "esnext", minify: false, cssCodeSplit: false },
  server: { port: 5173 },
});
