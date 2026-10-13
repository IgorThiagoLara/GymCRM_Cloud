import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// REMOTE: publica `./App` em /mfe/matriculas/assets/remoteEntry.js. Build e deploy independentes do shell.
export default defineConfig({
  base: "/mfe/matriculas/",
  plugins: [
    react(),
    federation({
      name: "mfe_matriculas",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/App.tsx" },
      shared: ["react", "react-dom"],
    }),
  ],
  build: { target: "esnext", minify: false, cssCodeSplit: false },
  server: { port: 5171 },
});
