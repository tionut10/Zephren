import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// Fix energy-calc.jsx for Vite dev mode. Two issues:
//
// 1. React Fast Refresh fails on 80+ hooks → neutralise by replacing
//    the react-refresh import with no-op stubs.
//
// 2. Several useMemo hooks (envelopeSummary, monthlyISO, instSummary)
//    are declared with `const` after useCallbacks that reference them in
//    dependency arrays. In production Rollup converts const→var (no TDZ),
//    but in dev mode the native const TDZ enforcement throws
//    "Cannot access 'X' before initialization". Fix: convert those
//    specific `const` declarations to `var` in dev only.
function fixEnergyCalcForDev() {
  return {
    name: "fix-energy-calc-dev",
    enforce: "post",
    apply: "serve", // dev only
    transform(code, id) {
      if (!id.includes("energy-calc.jsx")) return null;

      let patched = code;

      // --- Fix 1: Neutralise React Fast Refresh ---
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

      // --- Fix 2: Eliminate TDZ for forward-referenced hook vars ---
      // In production, Rollup converts const→var (no TDZ). In dev mode,
      // native const enforcement throws when useCallback dependency arrays
      // reference useMemo/useCallback vars declared later in the function.
      // Convert all hook-assigned consts to var, matching prod behaviour.
      patched = patched.replace(
        /\bconst\s+(\w+)\s*=\s*(useMemo|useCallback)\(/g,
        "var $1 = $2("
      );

      return patched !== code ? patched : null;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), fixEnergyCalcForDev()],
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
