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
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "pdf-engine": ["jspdf", "jspdf-autotable"],
          "excel-engine": ["xlsx"],
          "docx-engine": ["docx-preview"],
          "supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
});
