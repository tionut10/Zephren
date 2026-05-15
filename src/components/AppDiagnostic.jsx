/**
 * AppDiagnostic — Diagnostic aplicație Zephren (Sprint C Task 1)
 *
 * Tab dedicat pentru debug + health check:
 *   • Storage usage (localStorage + estimate IndexedDB via window.storage)
 *   • Browser capabilities (Service Worker, IndexedDB, WebGL, Worker, etc.)
 *   • State summary (counts elemente, mărime proiect, autosave timestamp)
 *   • Versioning + dependencies + cache stats
 *   • Buton „Export diagnostic" (JSON pentru raportare bug)
 *   • Buton „Curăță cache local" (cu confirmare)
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "./ui.jsx";

const APP_VERSION = "0.4.0"; // sincronizat cu changelog.generated.js

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function getLocalStorageStats() {
  if (typeof localStorage === "undefined") {
    return { available: false, totalBytes: 0, keysCount: 0, keys: [] };
  }
  let totalBytes = 0;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    const v = localStorage.getItem(k) || "";
    const size = (k.length + v.length) * 2; // UTF-16, ~2 bytes/char
    totalBytes += size;
    keys.push({ key: k, sizeBytes: size });
  }
  // Top 10 cele mai mari
  keys.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return {
    available: true,
    totalBytes,
    keysCount: keys.length,
    keys: keys.slice(0, 10),
  };
}

function getBrowserCapabilities() {
  const caps = {};
  if (typeof window === "undefined") return caps;
  caps.serviceWorker = "serviceWorker" in navigator;
  caps.indexedDB = "indexedDB" in window;
  caps.localStorage = (() => {
    try { localStorage.setItem("_zd_test", "1"); localStorage.removeItem("_zd_test"); return true; }
    catch { return false; }
  })();
  caps.webWorker = typeof Worker !== "undefined";
  caps.webGL = (() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    } catch { return false; }
  })();
  caps.notifications = "Notification" in window;
  caps.notificationsPermission = caps.notifications ? Notification.permission : "n/a";
  caps.cookies = navigator.cookieEnabled;
  caps.online = navigator.onLine;
  caps.crypto = "crypto" in window && "randomUUID" in (window.crypto || {});
  caps.intl = typeof Intl !== "undefined";
  caps.structuredClone = typeof structuredClone !== "undefined";
  caps.userAgent = navigator.userAgent;
  caps.language = navigator.language;
  caps.screen = window.screen ? `${window.screen.width}×${window.screen.height}` : "—";
  caps.viewport = `${window.innerWidth}×${window.innerHeight}`;
  caps.devicePixelRatio = window.devicePixelRatio || 1;
  return caps;
}

function getStateSummary({ building, opaqueElements, glazingElements, thermalBridges, instSummary, renewSummary, climate }) {
  const summary = {
    address: building?.address || "—",
    category: building?.category || "—",
    zone: climate?.zone || "—",
    locality: building?.locality || "—",
    yearBuilt: building?.yearBuilt || "—",
    Au: building?.areaUseful || "—",
    nOpaque: opaqueElements?.length || 0,
    nGlazing: glazingElements?.length || 0,
    nBridges: thermalBridges?.length || 0,
    epTotal: (renewSummary?.ep_adjusted_m2 ?? instSummary?.ep_total_m2 ?? 0).toFixed(1),
    energyClass: renewSummary?.energyClass?.class || instSummary?.energyClass?.class || "—",
    rer: renewSummary?.rer ? renewSummary.rer.toFixed(1) + "%" : "—",
    co2: instSummary?.co2_total_m2 ? instSummary.co2_total_m2.toFixed(1) + " kg/m²·an" : "—",
  };
  return summary;
}

function getZephrenStorageKeys() {
  if (typeof localStorage === "undefined") return [];
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith("zephren_") || k.startsWith("project_") || k.startsWith("ep-proj:"))) {
      keys.push(k);
    }
  }
  return keys;
}

export default function AppDiagnostic({ building, climate, opaqueElements, glazingElements, thermalBridges, instSummary, renewSummary, lang = "RO" }) {
  const [refreshTick, setRefreshTick] = useState(0);

  const lsStats = useMemo(() => { void refreshTick; return getLocalStorageStats(); }, [refreshTick]);
  const caps = useMemo(() => { void refreshTick; return getBrowserCapabilities(); }, [refreshTick]);
  const state = useMemo(() => getStateSummary({ building, opaqueElements, glazingElements, thermalBridges, instSummary, renewSummary, climate }),
    [building, opaqueElements, glazingElements, thermalBridges, instSummary, renewSummary, climate]);
  const zKeys = useMemo(() => { void refreshTick; return getZephrenStorageKeys(); }, [refreshTick]);

  const [errorLog, setErrorLog] = useState([]);
  useEffect(() => {
    const handler = (ev) => {
      setErrorLog(prev => [
        { ts: new Date().toISOString(), message: ev.message || String(ev), source: ev.filename || "—" },
        ...prev.slice(0, 19),
      ]);
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  const handleRefresh = useCallback(() => setRefreshTick(t => t + 1), []);

  const handleExportDiagnostic = useCallback(() => {
    const report = {
      generated_at: new Date().toISOString(),
      app: { version: APP_VERSION, name: "Zephren" },
      state, capabilities: caps,
      localStorage: { ...lsStats, keys: lsStats.keys.map(k => ({ key: k.key, sizeBytes: k.sizeBytes })) },
      zephrenStorageKeys: zKeys,
      errors: errorLog,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zephren-diagnostic-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state, caps, lsStats, zKeys, errorLog]);

  const handleClearCache = useCallback(() => {
    const ok = window.confirm(
      lang === "EN"
        ? "Clear all local Zephren storage?\n\nThis removes saved projects, CPE registry, settings, climate overrides — but does NOT affect cloud data.\n\nThis action cannot be undone."
        : "Curăță tot storage-ul local Zephren?\n\nVei pierde proiectele salvate local, registrul CPE, setările, override-urile climatice — dar NU și datele din cloud.\n\nAcțiunea este ireversibilă."
    );
    if (!ok) return;
    let removed = 0;
    zKeys.forEach(k => { try { localStorage.removeItem(k); removed++; } catch { /* ignore */ } });
    alert(`${removed} chei eliminate. Reîncarcă pagina (F5) pentru a vedea efectul.`);
    handleRefresh();
  }, [zKeys, handleRefresh, lang]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          🛠️ {lang === "EN" ? "Application diagnostic" : "Diagnostic aplicație"}
        </h3>
        <p className="text-xs text-slate-400">
          {lang === "EN"
            ? "Health check, storage usage, browser capabilities and state summary. Useful for bug reports and troubleshooting."
            : "Health check, utilizare storage, capabilități browser și sumar stare. Util pentru raportare bug-uri și debugging."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={handleRefresh}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors">
          🔄 {lang === "EN" ? "Refresh" : "Reîmprospătează"}
        </button>
        <button onClick={handleExportDiagnostic}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
          📥 {lang === "EN" ? "Export diagnostic JSON" : "Export diagnostic JSON"}
        </button>
        <button onClick={handleClearCache}
          className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-medium transition-colors">
          🗑️ {lang === "EN" ? "Clear local cache" : "Curăță cache local"}
        </button>
      </div>

      {/* Card: App version + state summary */}
      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          📦 {lang === "EN" ? "Application + project" : "Aplicație + proiect"}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Row label={lang === "EN" ? "Version" : "Versiune"} value={"v" + APP_VERSION} mono />
          <Row label={lang === "EN" ? "Address" : "Adresă"} value={state.address} truncate />
          <Row label={lang === "EN" ? "Category" : "Categorie"} value={state.category} mono />
          <Row label={lang === "EN" ? "Climate zone" : "Zonă climatică"} value={state.zone} mono />
          <Row label={lang === "EN" ? "Locality" : "Localitate"} value={state.locality} truncate />
          <Row label={lang === "EN" ? "Year built" : "An construcție"} value={state.yearBuilt} mono />
          <Row label="Au" value={state.Au + " m²"} mono />
          <Row label="EP" value={state.epTotal + " kWh/(m²·an)"} mono />
          <Row label={lang === "EN" ? "Energy class" : "Clasă energetică"} value={state.energyClass} mono color="#fbbf24" />
          <Row label="RER" value={state.rer} mono color="#22c55e" />
          <Row label={lang === "EN" ? "Opaque elements" : "Elemente opace"} value={String(state.nOpaque)} mono />
          <Row label={lang === "EN" ? "Glazing" : "Vitrare"} value={String(state.nGlazing)} mono />
        </div>
      </div>

      {/* Card: Browser capabilities */}
      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          🌐 {lang === "EN" ? "Browser capabilities" : "Capabilități browser"}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <CapRow label="Service Worker" ok={caps.serviceWorker} />
          <CapRow label="IndexedDB" ok={caps.indexedDB} />
          <CapRow label="LocalStorage" ok={caps.localStorage} />
          <CapRow label="Web Worker" ok={caps.webWorker} />
          <CapRow label="WebGL" ok={caps.webGL} />
          <CapRow label="Notifications" ok={caps.notifications} extra={caps.notificationsPermission} />
          <CapRow label="Online" ok={caps.online} />
          <CapRow label="crypto.randomUUID" ok={caps.crypto} />
          <CapRow label="structuredClone" ok={caps.structuredClone} />
          <CapRow label="Cookies" ok={caps.cookies} />
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-3 border-t border-white/5">
          <Row label={lang === "EN" ? "Language" : "Limbă"} value={caps.language} mono />
          <Row label={lang === "EN" ? "Screen" : "Ecran"} value={caps.screen} mono />
          <Row label="Viewport" value={caps.viewport} mono />
          <Row label="DPR" value={String(caps.devicePixelRatio)} mono />
        </div>
        <div className="mt-2 text-[10px] text-slate-500 break-words">
          UA: <span className="font-mono">{caps.userAgent}</span>
        </div>
      </div>

      {/* Card: Storage stats */}
      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>💾 {lang === "EN" ? "Local storage" : "Storage local"}</span>
          <span className="text-slate-500">
            {lsStats.keysCount} {lang === "EN" ? "keys" : "chei"} · {formatBytes(lsStats.totalBytes)}
            <span className="text-slate-600"> ({lang === "EN" ? "limit ~5–10 MB" : "limită ~5–10 MB"})</span>
          </span>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">
          Top 10 {lang === "EN" ? "largest keys:" : "cele mai mari chei:"}
        </div>
        <div className="space-y-1">
          {lsStats.keys.length === 0 ? (
            <p className="text-xs text-slate-500 italic">{lang === "EN" ? "No keys." : "Nicio cheie."}</p>
          ) : (
            lsStats.keys.map(({ key, sizeBytes }) => (
              <div key={key} className="flex items-center justify-between bg-slate-900/40 rounded px-2.5 py-1 text-xs">
                <span className="font-mono text-slate-300 truncate flex-1 mr-2">{key}</span>
                <span className="font-mono text-slate-500 shrink-0">{formatBytes(sizeBytes)}</span>
              </div>
            ))
          )}
        </div>
        {zKeys.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-500">
            {zKeys.length} {lang === "EN" ? "Zephren-prefixed keys" : "chei Zephren"} (zephren_* / project_* / ep-proj:*)
          </div>
        )}
      </div>

      {/* Card: Error log */}
      {errorLog.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-300 mb-2">
            ⚠ {lang === "EN" ? "Recent errors" : "Erori recente"} ({errorLog.length})
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {errorLog.map((e, i) => (
              <div key={i} className="text-[10px] bg-slate-900/40 rounded px-2 py-1 font-mono">
                <div className="text-red-300">{e.message}</div>
                <div className="text-slate-500">{e.ts} · {e.source}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-slate-500 italic border-t border-white/5 pt-2">
        {lang === "EN"
          ? "Diagnostic info is local-only — nothing leaves the browser unless you click „Export diagnostic JSON\"."
          : "Informațiile de diagnostic sunt strict locale — nimic nu părăsește browser-ul decât dacă apăsați „Export diagnostic JSON\"."}
      </div>
    </div>
  );
}

function Row({ label, value, mono = false, truncate = false, color }) {
  return (
    <div className="bg-slate-900/40 rounded px-2.5 py-1.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={cn(
        "text-slate-200",
        mono && "font-mono",
        truncate && "truncate"
      )} style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

function CapRow({ label, ok, extra }) {
  return (
    <div className={cn(
      "rounded px-2.5 py-1.5 flex items-center justify-between",
      ok === true ? "bg-green-500/10 border border-green-500/20" :
      ok === false ? "bg-red-500/10 border border-red-500/20" :
      "bg-slate-900/40 border border-white/5"
    )}>
      <span className={cn("text-[11px]",
        ok === true ? "text-green-300" : ok === false ? "text-red-300" : "text-slate-300"
      )}>
        {ok === true ? "✓" : ok === false ? "✗" : "?"} {label}
      </span>
      {extra && <span className="text-[9px] text-slate-500 font-mono">{extra}</span>}
    </div>
  );
}
