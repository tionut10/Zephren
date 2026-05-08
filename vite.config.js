import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Proxy /api → producție (default) sau Vercel Dev local prin env var.
  // Pentru a testa modificări la `api/*.py` sau `api/*.js` local:
  //   1. terminal A: `npx vercel dev --listen 3000`
  //   2. terminal B: `VITE_API_TARGET=http://localhost:3000 npm run dev`
  // Fără override, frontend-ul folosește endpoint-urile deployate pe Vercel —
  // suficient pentru testarea fluxului UI/UX fără setup Python local.
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://energy-app-ruby.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Web Workers bundlați ca module ES (pct. 54 — calc-worker.js)
  worker: {
    format: 'es',
  },
  test: {
    exclude: ["e2e/**", "node_modules/**"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react-vendor";
          if (id.includes("node_modules/jspdf")) return "pdf-engine";
          if (id.includes("node_modules/xlsx")) return "excel-engine";
          if (id.includes("node_modules/docx-preview")) return "docx-engine";
          if (id.includes("node_modules/@supabase")) return "supabase";
        },
      },
    },
  },
});
