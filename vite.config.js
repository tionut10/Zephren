import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Proxy /api → Vercel Dev local (port 3000) pentru a evita System Rule challenge
  // de la Vercel edge când se fac multe request-uri de testare. Pornește în alt
  // terminal: `npx vercel dev --listen 3000` din root-ul proiectului energy-app/.
  // Fallback la producție dacă vercel dev nu rulează — `target` poate fi schimbat.
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
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
