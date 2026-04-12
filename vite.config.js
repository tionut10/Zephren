import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// Post-split: neutraliseRefreshDev and fixHookTDZ are no longer needed.
// The monolithic energy-calc.jsx (14K+ lines, 80+ hooks) has been split into
// ~30 modules. React Fast Refresh works correctly with smaller files.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Proxy /api → producție Vercel în dev local (Python serverless indisponibil local)
  server: {
    proxy: {
      '/api': {
        target: 'https://energy-app-ruby.vercel.app',
        changeOrigin: true,
        secure: true,
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
