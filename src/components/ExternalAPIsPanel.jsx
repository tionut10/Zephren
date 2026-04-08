/**
 * ExternalAPIsPanel — Panou UI pentru starea integrărilor cu API-uri externe
 *
 * Afișează status fiecărui API (disponibil / stub / eroare),
 * butoane "Test conexiune", câmpuri API key cu salvare localStorage,
 * și ultima dată de actualizare pentru date cached.
 *
 * Folosit în: Settings / Integrări externe
 */
import { useState, useEffect, useCallback } from "react";
import { cn } from "./ui.jsx";
import {
  fetchCadastralData,
  fetchANRETariffs,
  fetchClimateAutomatic,
  fetchPVGISAutomatic,
  fetchSolarPotential,
  submitCPEtoMDLPA,
} from "../lib/external-apis.js";

// ── Constante ──────────────────────────────────────────────────────────────────
const LS_KEY_ANCPI  = "zephren_ancpi_api_key";
const LS_KEY_SOLAR  = "zephren_google_solar_api_key";
const LS_KEY_CACHE  = "zephren_ext_api_cache_timestamps";

// ── Definiții API-uri afișate ─────────────────────────────────────────────────
const API_DEFINITIONS = [
  {
    id:          "open_meteo",
    label:       "Open-Meteo ERA5",
    description: "Date climatice ERA5 din arhivă — gratuit, fără cheie API",
    category:    "climate",
    requiresKey: false,
    url:         "https://archive-api.open-meteo.com",
    testFn:      async () => {
      // Test cu coordonatele Bucureștiului
      const data = await fetchClimateAutomatic(44.43, 26.10, "București");
      if (!data?.temp_month?.length) throw new Error("Răspuns invalid");
      return { ok: true, note: `Temp. medie anuală: ${(data.temp_month.reduce((a, b) => a + b, 0) / 12).toFixed(1)}°C` };
    },
  },
  {
    id:          "pvgis",
    label:       "PVGIS (EC JRC)",
    description: "Potențial fotovoltaic din baza de date europeană — gratuit, fără cheie API",
    category:    "solar",
    requiresKey: false,
    url:         "https://re.jrc.ec.europa.eu",
    testFn:      async () => {
      const data = await fetchPVGISAutomatic(44.43, 26.10, 1, 14, 35, 0);
      if (!data?.annual_kWh) throw new Error("Răspuns invalid");
      return { ok: true, note: `Producție specifică: ${data.specific_energy} kWh/kWp·an` };
    },
  },
  {
    id:          "anre",
    label:       "ANRE Tarife Energie",
    description: "Tarife reglementate electricitate și gaz natural (stub — date hardcodate)",
    category:    "tariffs",
    requiresKey: false,
    url:         "https://www.anre.ro",
    isStub:      true,
    testFn:      async () => {
      const data = await fetchANRETariffs();
      return {
        ok:   true,
        note: `Curent: ${data.electricity_ron_kwh} RON/kWh | Gaz: ${data.gas_ron_kwh} RON/kWh`,
        simulated: data._simulated,
      };
    },
  },
  {
    id:          "ancpi",
    label:       "ANCPI Cadastru",
    description: "Date cadastrale din Geoportal ANCPI (necesită cheie API sau acces instituțional)",
    category:    "cadastre",
    requiresKey: true,
    keyId:       LS_KEY_ANCPI,
    keyLabel:    "Cheie API ANCPI",
    keyPlaceholder: "Introduceți cheia API de la geoportal.ancpi.ro",
    url:         "https://geoportal.ancpi.ro",
    isStub:      true,
    testFn:      async () => {
      // Test cu un număr cadastral fictiv
      const data = await fetchCadastralData("123456/TEST");
      return {
        ok:   true,
        note: data._simulated
          ? `Date simulate — cheie API neconfiguratã`
          : `Adresă: ${data.address}`,
        simulated: data._simulated,
      };
    },
  },
  {
    id:          "google_solar",
    label:       "Google Maps Solar API",
    description: "Potențial solar acoperiș prin Google Cloud (necesită cheie API plătită)",
    category:    "solar",
    requiresKey: true,
    keyId:       LS_KEY_SOLAR,
    keyLabel:    "Google Cloud API Key",
    keyPlaceholder: "AIza...",
    url:         "https://solar.googleapis.com",
    isStub:      true,
    testFn:      async () => {
      const data = await fetchSolarPotential(44.43, 26.10);
      return {
        ok:   true,
        note: data._simulated
          ? `Stub activ — configurați VITE_GOOGLE_SOLAR_API_KEY`
          : `Max. ${data.maxArrayPanelsCount} panouri | ${data.maxSunshineHoursPerYear} ore/an`,
        simulated: data._simulated,
      };
    },
  },
  {
    id:          "mdlpa",
    label:       "MDLPA Registru CPE",
    description: "Depunere certificat energetic la registrul național (nu există API public)",
    category:    "registry",
    requiresKey: false,
    url:         "https://registru.mdlpa.ro",
    isStub:      true,
    alwaysStub:  true,
    testFn:      async () => {
      const data = await submitCPEtoMDLPA({});
      return {
        ok:        true,
        note:      "Portal disponibil — depunere manuală necesară",
        simulated: true,
        link:      data.portal_url,
      };
    },
  },
];

// ── Componente helper ─────────────────────────────────────────────────────────

function StatusBadge({ status, isStub, alwaysStub }) {
  if (alwaysStub) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
        Manual
      </span>
    );
  }

  const map = {
    idle:     { dot: "bg-slate-500",                label: "Neinterogat" },
    testing:  { dot: "bg-amber-400 animate-pulse",  label: "Se testează…" },
    ok_real:  { dot: "bg-emerald-400",              label: "Disponibil" },
    ok_stub:  { dot: "bg-amber-400",                label: "Stub activ" },
    error:    { dot: "bg-red-500",                  label: "Eroare" },
  };

  const entry = map[status] ?? map.idle;

  return (
    <span className={cn(
      "flex items-center gap-1.5 text-xs font-medium",
      status === "ok_real"  && "text-emerald-400",
      status === "ok_stub"  && "text-amber-400",
      status === "error"    && "text-red-400",
      status === "idle"     && "text-slate-400",
      status === "testing"  && "text-amber-300",
    )}>
      <span className={cn("w-2 h-2 rounded-full inline-block", entry.dot)} />
      {entry.label}
    </span>
  );
}

function CategoryIcon({ category }) {
  const icons = {
    climate:  "🌡",
    solar:    "☀",
    tariffs:  "⚡",
    cadastre: "🗺",
    registry: "📋",
  };
  return (
    <span className="text-lg opacity-70" role="img" aria-label={category}>
      {icons[category] ?? "🔌"}
    </span>
  );
}

function ApiKeyField({ keyId, keyLabel, keyPlaceholder, onSave }) {
  const [value, setValue]   = useState(() => localStorage.getItem(keyId) || "");
  const [visible, setVisible] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(keyId, trimmed);
    } else {
      localStorage.removeItem(keyId);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (typeof onSave === "function") onSave(trimmed);
  };

  return (
    <div className="mt-2 flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wider opacity-50">
        {keyLabel}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={keyPlaceholder}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30
              transition-all pr-10"
          />
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 transition-opacity"
            title={visible ? "Ascunde" : "Arată"}
          >
            {visible ? "🙈" : "👁"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-medium transition-all",
            saved
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-white/5 border border-white/10 hover:bg-white/10 text-white/70",
          )}
        >
          {saved ? "✓ Salvat" : "Salvează"}
        </button>
      </div>
      {value && (
        <p className="text-xs opacity-40">
          Cheie salvată local (localStorage) — nu se transmite serverului.
        </p>
      )}
    </div>
  );
}

// ── Componentă principală ─────────────────────────────────────────────────────
/**
 * @param {function} [showToast] — funcție toast(mesaj, tip) din app
 */
export default function ExternalAPIsPanel({ showToast }) {
  // Starea fiecărui API: { [id]: { status, note, lastTested, simulated, error } }
  const [apiState, setApiState]   = useState({});
  const [expanded, setExpanded]   = useState({});
  const [cacheTs,  setCacheTs]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_CACHE) || "{}"); }
    catch { return {}; }
  });

  const notify = useCallback((msg, type = "info") => {
    if (typeof showToast === "function") showToast(msg, type);
    else console.log(`[ExternalAPIs ${type}]`, msg);
  }, [showToast]);

  // Inițializare stare din cache la montare
  useEffect(() => {
    const initial = {};
    for (const api of API_DEFINITIONS) {
      initial[api.id] = { status: "idle", note: "", lastTested: cacheTs[api.id] || null };
    }
    setApiState(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTest = useCallback(async (api) => {
    setApiState(prev => ({
      ...prev,
      [api.id]: { ...prev[api.id], status: "testing", note: "" },
    }));

    try {
      const result = await api.testFn();
      const now    = new Date().toISOString();

      // Actualizează cache timestamps
      const newTs = { ...cacheTs, [api.id]: now };
      setCacheTs(newTs);
      localStorage.setItem(LS_KEY_CACHE, JSON.stringify(newTs));

      setApiState(prev => ({
        ...prev,
        [api.id]: {
          status:     result.simulated ? "ok_stub" : "ok_real",
          note:       result.note || "",
          link:       result.link || null,
          lastTested: now,
          simulated:  result.simulated ?? false,
        },
      }));

      notify(
        `${api.label}: ${result.simulated ? "Stub activ" : "Conexiune reușită"}`,
        result.simulated ? "info" : "success",
      );
    } catch (err) {
      setApiState(prev => ({
        ...prev,
        [api.id]: {
          ...prev[api.id],
          status: "error",
          note:   err.message || "Eroare necunoscută",
        },
      }));
      notify(`${api.label}: ${err.message || "Eroare"}`, "error");
    }
  }, [cacheTs, notify]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-white/90">Integrări API Externe</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Conexiuni la servicii externe pentru date cadastrale, climatice, energetice și solare.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            for (const api of API_DEFINITIONS) {
              if (!api.alwaysStub) handleTest(api);
            }
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10
            hover:bg-white/10 transition-all text-white/60 hover:text-white/80 whitespace-nowrap"
        >
          Testează toate
        </button>
      </div>

      {/* Lista API-uri */}
      {API_DEFINITIONS.map(api => {
        const state    = apiState[api.id] || {};
        const isExpand = expanded[api.id];

        return (
          <div
            key={api.id}
            className="rounded-xl border border-white/8 bg-white/3 overflow-hidden
              hover:border-white/12 transition-colors"
          >
            {/* Rândul principal */}
            <div className="flex items-center gap-3 px-4 py-3">
              <CategoryIcon category={api.category} />

              {/* Info API */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white/85">{api.label}</span>
                  {api.isStub && !api.alwaysStub && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15
                      text-amber-400 border border-amber-500/20 font-medium">
                      STUB
                    </span>
                  )}
                  {api.alwaysStub && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20
                      text-slate-400 border border-slate-500/20 font-medium">
                      MANUAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-0.5 truncate">{api.description}</p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge
                  status={state.status}
                  isStub={api.isStub}
                  alwaysStub={api.alwaysStub}
                />

                {/* Buton Test */}
                {!api.alwaysStub && (
                  <button
                    type="button"
                    onClick={() => handleTest(api)}
                    disabled={state.status === "testing"}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                      state.status === "testing"
                        ? "opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-white/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white/80",
                    )}
                  >
                    {state.status === "testing" ? "…" : "Test"}
                  </button>
                )}

                {/* Expand toggle (pentru API cu cheie sau note) */}
                {(api.requiresKey || state.note || api.alwaysStub) && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(api.id)}
                    className="opacity-40 hover:opacity-70 transition-opacity"
                    title={isExpand ? "Restrânge" : "Extinde"}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ transform: isExpand ? "rotate(180deg)" : "", transition: "transform 0.15s" }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Detalii extinse */}
            {isExpand && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 flex flex-col gap-3">
                {/* Nota rezultat test */}
                {state.note && (
                  <div className={cn(
                    "text-xs px-3 py-2 rounded-lg border",
                    state.status === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-300"
                      : state.status === "ok_stub"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
                  )}>
                    {state.note}
                    {state.link && (
                      <a
                        href={state.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 underline opacity-70 hover:opacity-100"
                      >
                        → {state.link}
                      </a>
                    )}
                  </div>
                )}

                {/* URL API */}
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span className="opacity-60">Endpoint:</span>
                  <a
                    href={api.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400/60 hover:text-amber-400 transition-colors font-mono"
                  >
                    {api.url}
                  </a>
                </div>

                {/* Câmp API key */}
                {api.requiresKey && (
                  <ApiKeyField
                    keyId={api.keyId}
                    keyLabel={api.keyLabel}
                    keyPlaceholder={api.keyPlaceholder}
                    onSave={() => {
                      // Re-testează după salvarea cheii
                      setTimeout(() => handleTest(api), 300);
                    }}
                  />
                )}

                {/* Ultima testare */}
                {state.lastTested && (
                  <p className="text-xs text-white/25">
                    Ultima testare:{" "}
                    {new Date(state.lastTested).toLocaleString("ro-RO", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}

                {/* Instrucțiuni MDLPA */}
                {api.id === "mdlpa" && (
                  <div className="text-xs text-white/40 space-y-1 bg-white/3 rounded-lg p-3 border border-white/5">
                    <p className="font-medium text-white/60 mb-1">Pași depunere manuală CPE:</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Exportați CPE din Zephren (Export → CPE Complet PDF)</li>
                      <li>Accesați <a href="https://registru.mdlpa.ro" target="_blank" rel="noopener noreferrer" className="text-amber-400/70 hover:text-amber-400 underline">registru.mdlpa.ro</a></li>
                      <li>Autentificați-vă cu contul de auditor energetic</li>
                      <li>Completați formularul și atașați PDF-ul CPE</li>
                      <li>Semnați digital și înregistrați numărul CPE primit</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer notă */}
      <p className="text-xs text-white/25 mt-1 text-center">
        Cheile API se salvează doar local (localStorage). Nu se transmit serverului Zephren.
      </p>
    </div>
  );
}
