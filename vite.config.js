import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// Fix 1 (dev only): Neutralise React Fast Refresh for energy-calc.jsx.
// The file has 80+ hooks which exceeds Refresh's per-component limit.
function neutraliseRefreshDev() {
  return {
    name: "neutralise-refresh-dev",
    enforce: "post",
    apply: "serve",
    transform(code, id) {
      if (!id.includes("energy-calc.jsx")) return null;
      let patched = code;
      const noop = [
        "/* react-refresh disabled for this file (hook limit) */",
        "const $RefreshReg$ = () => {};",
        "const $RefreshSig$ = () => { const s = (c) => c; s.s = () => {}; return s; };",
      ].join("\n");
      patched = patched.replace(
        /import\s+RefreshRuntime\s+from\s+["']\/?\@react-refresh["'];?/g,
        noop
      );
      patched = patched.replace(
        /if\s*\(import\.meta\.hot\)\s*\{[\s\S]*?import\.meta\.hot\.accept\(\);\s*\}/g,
        "/* HMR accept removed — full reload on change */"
      );
      return patched !== code ? patched : null;
    },
  };
}

// Fix 2 (dev AND build): Eliminate TDZ for forward-referenced hook vars.
// Several useMemo/useCallback vars are referenced in dependency arrays of
// hooks declared earlier in the function body. `const` has TDZ enforcement;
// converting to `var` matches the safe hoisting behaviour.
function fixHookTDZ() {
  return {
    name: "fix-hook-tdz",
    enforce: "post",
    transform(code, id) {
      if (!id.includes("energy-calc.jsx")) return null;
      // Convert const to var ONLY for simple assignments (not destructuring).
      // This avoids TDZ issues from Rollup's module concatenation while
      // preserving destructuring patterns like const [a, b] = useState(...)
      const patched = code.replace(
        /\bconst\s+(\w+)\s*=/g,
        "var $1 ="
      );
      return patched !== code ? patched : null;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), neutraliseRefreshDev(), fixHookTDZ()],
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
