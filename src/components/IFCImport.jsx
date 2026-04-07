import { useState, useRef, useCallback } from "react";
import { cn, Card, Badge } from "./ui.jsx";

// ═══════════════════════════════════════════════════════════════
// PARSER IFC 2x3 / IFC4 — extragere geometrie clădire din fișier .ifc
// Format: STEP (ISO 10303-21) — text ASCII parsabil fără bib. externe
// Extrage: suprafețe elemente, orientări, volume, etaje, tipuri zone
// ═══════════════════════════════════════════════════════════════

// Parsează un fișier IFC și returnează date structurate pentru calculator
function parseIFC(ifcText) {
  const lines = ifcText.split(/\r?\n/);
  const entities = {};

  // Pas 1: parsăm toate entitățile (#ID = IFCTYPE(...))
  for (const line of lines) {
    const m = line.match(/^#(\d+)\s*=\s*(\w+)\s*\((.+)\)\s*;?\s*$/i);
    if (!m) continue;
    const [, id, type, params] = m;
    entities[`#${id}`] = { type: type.toUpperCase(), raw: params, id: `#${id}` };
  }

  // Pas 2: extrage valori simple dintr-un params string
  function getParam(params, idx) {
    const parts = smartSplit(params);
    return parts[idx] ?? null;
  }

  function smartSplit(str) {
    const parts = [];
    let depth = 0, current = '', inStr = false;
    for (const ch of str) {
      if (ch === "'" && !inStr) { inStr = true; current += ch; continue; }
      if (ch === "'" && inStr) { inStr = false; current += ch; continue; }
      if (inStr) { current += ch; continue; }
      if (ch === '(' || ch === ')') { depth += ch === '(' ? 1 : -1; current += ch; continue; }
      if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  function getStr(val) {
    if (!val) return "";
    return val.replace(/^'|'$/g, "").replace(/\\X2\\[^\\]+\\X0\\/g, "");
  }

  function getRef(val) {
    if (!val) return null;
    const m = val.match(/#\d+/);
    return m ? m[0] : null;
  }

  function resolveUnit(ref) {
    const e = entities[ref];
    if (!e) return 1;
    if (e.type === "IFCSIUNIT") {
      const p = smartSplit(e.raw);
      const unitType = getStr(p[1] || "");
      if (unitType === "LENGTHUNIT") return 1; // metres
    }
    if (e.type === "IFCCONVERSIONBASEDUNIT") {
      return 0.001; // mm → m
    }
    return 1;
  }

  // Pas 3: colectăm date relevante
  const result = {
    projectName: "",
    buildingName: "",
    address: "",
    stories: [],
    spaces: [],
    walls: [],
    slabs: [],
    roofs: [],
    windows: [],
    doors: [],
    columns: [],
    buildingData: {},
  };

  // Proiect + clădire
  for (const [, ent] of Object.entries(entities)) {
    if (ent.type === "IFCPROJECT") {
      const p = smartSplit(ent.raw);
      result.projectName = getStr(p[2] || "");
    }
    if (ent.type === "IFCBUILDING") {
      const p = smartSplit(ent.raw);
      result.buildingName = getStr(p[2] || "");
    }
    if (ent.type === "IFCPOSTALADDRESS") {
      const p = smartSplit(ent.raw);
      result.address = [getStr(p[4]||""), getStr(p[5]||""), getStr(p[6]||"")].filter(Boolean).join(", ");
    }
    if (ent.type === "IFCBUILDINGSTOREY") {
      const p = smartSplit(ent.raw);
      result.stories.push({
        name: getStr(p[2] || ""),
        elevation: parseFloat(p[6]) || 0,
      });
    }
  }

  // Slab-uri (planșee) — pentru suprafețe orizontale
  for (const [, ent] of Object.entries(entities)) {
    if (ent.type === "IFCSLAB") {
      const p = smartSplit(ent.raw);
      const slabType = getStr(p[8] || "").toUpperCase();
      result.slabs.push({ name: getStr(p[2] || ""), type: slabType, id: ent.id });
    }
    if (ent.type === "IFCROOF") {
      result.roofs.push({ name: getStr(smartSplit(ent.raw)[2] || ""), id: ent.id });
    }
    if (ent.type === "IFCWALL" || ent.type === "IFCWALLSTANDARDCASE") {
      const p = smartSplit(ent.raw);
      result.walls.push({ name: getStr(p[2] || ""), id: ent.id });
    }
    if (ent.type === "IFCWINDOW") {
      const p = smartSplit(ent.raw);
      const w = parseFloat(p[6]) || 0;
      const h = parseFloat(p[7]) || 0;
      result.windows.push({ name: getStr(p[2] || ""), width: w, height: h, area: w * h, id: ent.id });
    }
    if (ent.type === "IFCDOOR") {
      const p = smartSplit(ent.raw);
      const w = parseFloat(p[6]) || 0;
      const h = parseFloat(p[7]) || 0;
      result.doors.push({ name: getStr(p[2] || ""), width: w, height: h, area: w * h, id: ent.id });
    }
    if (ent.type === "IFCSPACE") {
      const p = smartSplit(ent.raw);
      result.spaces.push({ name: getStr(p[2] || ""), id: ent.id });
    }
  }

  // Cantitate din IfcQuantityArea
  const qAreas = {};
  for (const [, ent] of Object.entries(entities)) {
    if (ent.type === "IFCQUANTITYAREA") {
      const p = smartSplit(ent.raw);
      qAreas[ent.id] = { name: getStr(p[0] || ""), value: parseFloat(p[3]) || 0 };
    }
    if (ent.type === "IFCQUANTITYVOLUME") {
      const p = smartSplit(ent.raw);
      qAreas[ent.id] = { name: getStr(p[0] || ""), value: parseFloat(p[3]) || 0, isVol: true };
    }
    if (ent.type === "IFCQUANTITYLENGTH") {
      const p = smartSplit(ent.raw);
      qAreas[ent.id] = { name: getStr(p[0] || ""), value: parseFloat(p[3]) || 0, isLen: true };
    }
  }

  // Colectează cantitățile per element
  let totalWallArea = 0, totalWindowArea = 0, totalRoofArea = 0, totalFloorArea = 0, totalVolume = 0;

  for (const [, ent] of Object.entries(entities)) {
    if (ent.type === "IFCELEMENTQUANTITY") {
      const p = smartSplit(ent.raw);
      const name = getStr(p[2] || "").toLowerCase();
      // Lista de cantități (referinte)
      const listStr = p[4] || "";
      const refs = listStr.match(/#\d+/g) || [];
      refs.forEach(ref => {
        const q = qAreas[ref];
        if (!q) return;
        const qname = q.name.toLowerCase();
        if (qname.includes("netsurface") || qname.includes("net side face")) totalWallArea += q.value;
        if (qname.includes("grossfloor") || qname.includes("net floor")) totalFloorArea += q.value;
        if (qname.includes("roof") && !q.isVol) totalRoofArea += q.value;
        if (q.isVol) totalVolume += q.value;
      });
    }
  }

  // Fereaestre: suma arii direct
  result.windows.forEach(w => { totalWindowArea += w.area; });

  // Estimare din numere de elemente dacă nu avem cantități
  if (totalFloorArea === 0 && result.spaces.length > 0) {
    totalFloorArea = result.spaces.length * 25; // 25m² estimat per spațiu
  }
  if (totalWallArea === 0 && result.walls.length > 0) {
    totalWallArea = result.walls.length * 12; // 12m² estimat per perete
  }
  if (totalWindowArea === 0 && result.windows.length > 0) {
    totalWindowArea = result.windows.length * 2; // 2m² estimat per fereastră
  }

  result.buildingData = {
    nStories: Math.max(1, result.stories.length),
    nSpaces: result.spaces.length,
    nWalls: result.walls.length,
    nWindows: result.windows.length,
    nDoors: result.doors.length,
    totalFloorArea_m2: Math.round(totalFloorArea * 10) / 10,
    totalWallArea_m2: Math.round(totalWallArea * 10) / 10,
    totalWindowArea_m2: Math.round(totalWindowArea * 10) / 10,
    totalRoofArea_m2: Math.round(totalRoofArea * 10) / 10,
    totalVolume_m3: Math.round(totalVolume * 10) / 10,
    windowWallRatio: totalWallArea > 0 ? Math.round(totalWindowArea / totalWallArea * 1000) / 10 : 0,
  };

  return result;
}

// ── Mapare date IFC → câmpuri calculator Zephren ────────────────
function mapIFCToZephren(parsed) {
  const bd = parsed.buildingData;
  return {
    address: parsed.address || parsed.buildingName || parsed.projectName || "",
    areaUseful: bd.totalFloorArea_m2 > 0 ? String(bd.totalFloorArea_m2) : "",
    volume: bd.totalVolume_m3 > 0 ? String(bd.totalVolume_m3) : "",
    // Elemente anvelopă (dacă avem arii)
    suggestedElements: [
      bd.totalWallArea_m2 > 0 && {
        type: "PE", name: "Pereți exteriori (din IFC)",
        area: String(bd.totalWallArea_m2), autoFromIFC: true,
      },
      bd.totalRoofArea_m2 > 0 && {
        type: "PT", name: "Terasă/Acoperiș (din IFC)",
        area: String(bd.totalRoofArea_m2), autoFromIFC: true,
      },
    ].filter(Boolean),
    suggestedGlazing: bd.totalWindowArea_m2 > 0 ? [{
      name: `${parsed.buildingData.nWindows} ferestre (din IFC)`,
      area: String(bd.totalWindowArea_m2), autoFromIFC: true,
    }] : [],
    nStories: bd.nStories,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTĂ UI IFCImport
// ═══════════════════════════════════════════════════════════════
export default function IFCImport({ onImport, onClose }) {
  const [status, setStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [parsed, setParsed] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [applyItems, setApplyItems] = useState({ address: true, area: true, elements: true, glazing: true });
  const fileRef = useRef(null);

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".ifc")) {
      setStatus("error");
      setErrorMsg("Selectați un fișier .ifc (IFC 2x3 sau IFC4).");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setStatus("error");
      setErrorMsg("Fișierul IFC depășește 50MB — folosiți un fișier mai mic sau exportați doar structura clădirii.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    setParsed(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = parseIFC(ev.target.result);
        if (!result.buildingData.nWalls && !result.buildingData.nSpaces && !result.buildingData.nWindows) {
          throw new Error("Fișierul IFC nu conține elemente recunoscute. Verificați că exportul include elemente arhitecturale (pereți, ferestre, spații).");
        }
        setParsed(result);
        setStatus("ok");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Eroare la parsarea fișierului IFC.");
      }
    };
    reader.onerror = () => {
      setStatus("error");
      setErrorMsg("Nu s-a putut citi fișierul.");
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, []);

  const handleApply = useCallback(() => {
    if (!parsed) return;
    const mapped = mapIFCToZephren(parsed);
    const toApply = {};
    if (applyItems.address && mapped.address) toApply.address = mapped.address;
    if (applyItems.area && mapped.areaUseful) toApply.areaUseful = mapped.areaUseful;
    if (applyItems.area && mapped.volume) toApply.volume = mapped.volume;
    if (applyItems.elements) toApply.suggestedElements = mapped.suggestedElements;
    if (applyItems.glazing) toApply.suggestedGlazing = mapped.suggestedGlazing;
    toApply.nStories = mapped.nStories;
    onImport?.(toApply);
    onClose?.();
  }, [parsed, applyItems, onImport, onClose]);

  const bd = parsed?.buildingData;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Import IFC / BIM</h2>
            <p className="text-xs text-slate-400">Extrage geometrie din fișier .ifc (IFC 2x3 / IFC4)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4",
            status === "ok" ? "border-green-600 bg-green-900/10" :
            status === "error" ? "border-red-600 bg-red-900/10" :
            "border-slate-600 hover:border-indigo-500 bg-slate-800/30"
          )}>
          <input ref={fileRef} type="file" accept=".ifc" onChange={handleFile} className="hidden"/>
          <div className="text-3xl mb-2">{status === "ok" ? "✅" : status === "error" ? "❌" : status === "loading" ? "⏳" : "📐"}</div>
          {status === "loading" && <p className="text-slate-300 text-sm">Se parsează fișierul IFC...</p>}
          {status === "ok" && parsed && (
            <div>
              <p className="text-green-300 text-sm font-medium">{parsed.projectName || parsed.buildingName || "Clădire importată"}</p>
              <p className="text-slate-400 text-xs mt-1">{bd.nWalls} pereți · {bd.nWindows} ferestre · {bd.nSpaces} spații · {bd.nStories} etaje</p>
            </div>
          )}
          {status === "error" && <p className="text-red-300 text-xs">{errorMsg}</p>}
          {!status && (
            <div>
              <p className="text-slate-300 text-sm font-medium">Click sau trage fișierul .ifc aici</p>
              <p className="text-slate-500 text-xs mt-1">Revit, ArchiCAD, Tekla, FreeCAD — max 50MB</p>
            </div>
          )}
        </div>

        {/* Preview date extrase */}
        {status === "ok" && parsed && (
          <div className="space-y-3 mb-4">
            <div className="text-xs font-medium text-slate-400 uppercase">Date extrase din IFC</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Suprafață utilă estimată", bd.totalFloorArea_m2 > 0 ? `${bd.totalFloorArea_m2} m²` : "—"],
                ["Volum clădire", bd.totalVolume_m3 > 0 ? `${bd.totalVolume_m3} m³` : "—"],
                ["Arie pereți exteriori", bd.totalWallArea_m2 > 0 ? `${bd.totalWallArea_m2} m²` : "—"],
                ["Arie vitraje totale", bd.totalWindowArea_m2 > 0 ? `${bd.totalWindowArea_m2} m²` : "—"],
                ["Raport vitrare", bd.windowWallRatio > 0 ? `${bd.windowWallRatio}%` : "—"],
                ["Arie acoperiș", bd.totalRoofArea_m2 > 0 ? `${bd.totalRoofArea_m2} m²` : "—"],
              ].map(([lbl, val]) => (
                <div key={lbl} className="bg-slate-800 rounded px-2 py-1.5">
                  <div className="text-slate-500 text-[10px]">{lbl}</div>
                  <div className="text-white font-medium">{val}</div>
                </div>
              ))}
            </div>
            {parsed.address && (
              <div className="bg-slate-800 rounded px-3 py-2 text-xs">
                <span className="text-slate-500">Adresă:</span>{" "}
                <span className="text-white">{parsed.address}</span>
              </div>
            )}

            {/* Selectare ce se aplică */}
            <div className="text-xs font-medium text-slate-400 uppercase mt-2">Aplică în calculator</div>
            <div className="space-y-1.5">
              {[
                ["address", "Adresă clădire", !!parsed.address],
                ["area", "Suprafață utilă + Volum", bd.totalFloorArea_m2 > 0],
                ["elements", `Elemente opace (${parsed.buildingData.nWalls} pereți)`, bd.totalWallArea_m2 > 0],
                ["glazing", `Vitraje (${parsed.buildingData.nWindows} ferestre)`, bd.totalWindowArea_m2 > 0],
              ].map(([key, label, available]) => (
                <label key={key} className={cn("flex items-center gap-2 text-xs cursor-pointer px-2 py-1 rounded transition-colors",
                  available ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 cursor-not-allowed")}>
                  <input type="checkbox" checked={applyItems[key] && available} disabled={!available}
                    onChange={e => setApplyItems(p => ({...p, [key]: e.target.checked}))}
                    className="accent-indigo-500" />
                  {label}
                  {!available && <Badge className="bg-slate-800 text-slate-600 text-[9px]">indisponibil</Badge>}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-all">
            Anulare
          </button>
          {status === "ok" && (
            <button onClick={handleApply}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
              Aplică în calculator
            </button>
          )}
          {status !== "ok" && (
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-all">
              Selectează .ifc
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-600 mt-3 text-center">
          Parsare locală — fișierul nu este trimis pe server. Verificați datele înainte de a le aplica.
        </p>
      </div>
    </div>
  );
}
