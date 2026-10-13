import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/mfe/financeiro/",
  plugins: [
    react(),
    federation({
      name: "mfe_financeiro",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/App.tsx" },
      shared: ["react", "react-dom"],
    }),
  ],
  build: { target: "esnext", minify: false, cssCodeSplit: false },
  server: { port: 5172 },
});
