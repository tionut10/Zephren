/**
 * EnvelopeAIReviewModal — Sprint Pas 2 AI-First (16 mai 2026)
 *
 * Modal review-and-confirm STRICT pentru toate rezultatele AI orchestrate
 * (vision fațadă, planșă PDF, chat envelope-fill).
 *
 * Filozofie:
 *  - NIMIC nu intră în state-ul Step 2 fără click manual user
 *  - Per element: ConfidenceBadge + 3 acțiuni (Acceptă / Editează / Respinge)
 *  - Bulk: „Selectează tot" / „Selectează doar HIGH" / „Acceptă selectate"
 *  - Edit deschide modal-ul existent (OpaqueModal/GlazingModal/BridgeModal)
 *    pre-populat cu draft AI
 *
 * Props:
 *  - results: { opaqueElements, glazingElements, thermalBridges,
 *               building, confidence, source, notes, assumptions }
 *  - onAcceptOpaque(arr), onAcceptGlazing(arr), onAcceptBridges(arr)
 *  - onEditOpaque(el), onEditGlazing(el), onEditBridge(br) — optional callbacks
 *  - onClose()
 */

import { useState, useMemo, useCallback } from "react";

const ORIENTATIONS_RO = {
  N: "Nord", NE: "Nord-Est", E: "Est", SE: "Sud-Est",
  S: "Sud", SV: "Sud-Vest", V: "Vest", NV: "Nord-Vest",
};

const TYPE_LABELS = {
  PE: "Perete exterior",
  PT: "Terasă",
  PP: "Pod / acoperiș",
  PL: "Planșeu pe sol",
  PB: "Planșeu peste subsol",
  PI: "Perete interior",
  COL_EXT: "Colț exterior",
  COL_INT: "Colț interior",
  PE_PT: "Intersecție perete-terasă",
  GLAF: "Glaf fereastră",
  SOCLU: "Soclu",
};

function ConfidenceBadge({ value }) {
  const v = (value || "medium").toLowerCase();
  const cfg = {
    high:    { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40", label: "🟢 ÎNCREDERE MARE" },
    medium:  { bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/40",   label: "🟡 MEDIE" },
    low:     { bg: "bg-rose-500/15",    text: "text-rose-300",    border: "border-rose-500/40",    label: "🔴 SCĂZUTĂ — verifică manual" },
    inferred:{ bg: "bg-slate-500/15",   text: "text-slate-300",   border: "border-slate-500/40",   label: "⚪ INFERAT" },
  };
  const c = cfg[v] || cfg.medium;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <span className="text-[10px] text-white/60 italic">
      📡 {source}
    </span>
  );
}

function ElementCard({ kind, element, selected, onToggleSelect, onAccept, onEdit, onReject }) {
  const conf = (element.confidence || "medium").toLowerCase();
  const isRisky = conf === "low";
  const isOpaque = kind === "opaque";
  const isGlazing = kind === "glazing";
  const isBridge = kind === "bridge";

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      selected
        ? "border-sky-500/50 bg-sky-500/[0.04]"
        : isRisky
        ? "border-rose-500/30 bg-rose-500/[0.02]"
        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
    }`}>
      {/* Header row: select + badges + value */}
      <div className="flex items-start gap-2 mb-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 cursor-pointer accent-sky-500"
          aria-label="Selectează acest element"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 items-center mb-1">
            <ConfidenceBadge value={conf} />
            {element._sourceBadge && <SourceBadge source={element._sourceBadge} />}
          </div>
          <div className="text-sm font-medium text-white/90 truncate">
            {element.name || (isOpaque ? "Element opac fără nume" : isGlazing ? "Vitraj fără nume" : "Punte fără nume")}
          </div>
        </div>
      </div>

      {/* Data row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-white/70 mb-2 pl-7">
        {isOpaque && (
          <>
            <div><span className="text-white/40">Tip:</span> {TYPE_LABELS[element.type] || element.type || "PE"}</div>
            <div><span className="text-white/40">Arie:</span> {element.area || "?"} m²</div>
            <div><span className="text-white/40">Orientare:</span> {ORIENTATIONS_RO[element.orientation] || element.orientation || "—"}</div>
            {element.layers && Array.isArray(element.layers) && element.layers.length > 0 && (
              <div className="col-span-full">
                <span className="text-white/40">Straturi:</span> {element.layers.map((l) => `${l.matName || "?"} ${l.thickness || "?"}mm`).join(" · ")}
              </div>
            )}
          </>
        )}
        {isGlazing && (
          <>
            <div><span className="text-white/40">Arie:</span> {element.area || "?"} m²</div>
            <div><span className="text-white/40">U:</span> {element.u || "?"} W/m²K</div>
            <div><span className="text-white/40">g:</span> {element.g || "?"}</div>
            <div><span className="text-white/40">Orientare:</span> {ORIENTATIONS_RO[element.orientation] || element.orientation || "—"}</div>
            {element.type && <div className="col-span-2"><span className="text-white/40">Tip:</span> {element.type}</div>}
          </>
        )}
        {isBridge && (
          <>
            <div><span className="text-white/40">Tip:</span> {TYPE_LABELS[element.type] || element.type || "—"}</div>
            <div><span className="text-white/40">Ψ:</span> {element.psi || "?"} W/mK</div>
            <div><span className="text-white/40">Lungime:</span> {element.length || "?"} m</div>
          </>
        )}
      </div>

      {/* Notes */}
      {element.notes && (
        <div className="text-[10px] text-amber-200/70 italic mb-2 pl-7">
          💬 {element.notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 pl-7">
        <button
          onClick={onAccept}
          className="flex-1 text-[11px] font-medium px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
        >
          ☑️ Acceptă
        </button>
        <button
          onClick={onEdit}
          className="flex-1 text-[11px] font-medium px-2 py-1 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition-colors"
        >
          🔧 Editează
        </button>
        <button
          onClick={onReject}
          className="flex-1 text-[11px] font-medium px-2 py-1 rounded bg-white/5 text-white/60 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-colors"
        >
          🗑️ Respinge
        </button>
      </div>
    </div>
  );
}

export default function EnvelopeAIReviewModal({
  results,
  onAcceptOpaque,
  onAcceptGlazing,
  onAcceptBridges,
  onEditOpaque,
  onEditGlazing,
  onEditBridge,
  onClose,
}) {
  const opaqueList = useMemo(() => results?.opaqueElements || [], [results]);
  const glazingList = useMemo(() => results?.glazingElements || [], [results]);
  const bridgeList = useMemo(() => results?.thermalBridges || [], [results]);

  const totalElements = opaqueList.length + glazingList.length + bridgeList.length;

  // Selected state per element index per kind
  const [selectedOpaque, setSelectedOpaque] = useState(() => new Set(opaqueList.map((_, i) => i)));
  const [selectedGlazing, setSelectedGlazing] = useState(() => new Set(glazingList.map((_, i) => i)));
  const [selectedBridges, setSelectedBridges] = useState(() => new Set(bridgeList.map((_, i) => i)));

  // Rejected indices (visually hidden + excluded from accept)
  const [rejectedOpaque, setRejectedOpaque] = useState(() => new Set());
  const [rejectedGlazing, setRejectedGlazing] = useState(() => new Set());
  const [rejectedBridges, setRejectedBridges] = useState(() => new Set());

  const [showRawJson, setShowRawJson] = useState(false);

  const toggleSet = useCallback((setter, idx) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const selectByConfidence = useCallback((conf) => {
    const filterFn = (list) =>
      new Set(
        list
          .map((el, i) => [el, i])
          .filter(([el]) => (el.confidence || "medium").toLowerCase() === conf)
          .map(([, i]) => i),
      );
    setSelectedOpaque(filterFn(opaqueList));
    setSelectedGlazing(filterFn(glazingList));
    setSelectedBridges(filterFn(bridgeList));
  }, [opaqueList, glazingList, bridgeList]);

  const selectAll = useCallback(() => {
    setSelectedOpaque(new Set(opaqueList.map((_, i) => i)));
    setSelectedGlazing(new Set(glazingList.map((_, i) => i)));
    setSelectedBridges(new Set(bridgeList.map((_, i) => i)));
  }, [opaqueList, glazingList, bridgeList]);

  const deselectAll = useCallback(() => {
    setSelectedOpaque(new Set());
    setSelectedGlazing(new Set());
    setSelectedBridges(new Set());
  }, []);

  const acceptSelected = useCallback(() => {
    const acceptedO = opaqueList.filter((_, i) => selectedOpaque.has(i) && !rejectedOpaque.has(i));
    const acceptedG = glazingList.filter((_, i) => selectedGlazing.has(i) && !rejectedGlazing.has(i));
    const acceptedB = bridgeList.filter((_, i) => selectedBridges.has(i) && !rejectedBridges.has(i));
    if (acceptedO.length > 0) onAcceptOpaque?.(acceptedO);
    if (acceptedG.length > 0) onAcceptGlazing?.(acceptedG);
    if (acceptedB.length > 0) onAcceptBridges?.(acceptedB);
    onClose?.();
  }, [opaqueList, glazingList, bridgeList, selectedOpaque, selectedGlazing, selectedBridges,
      rejectedOpaque, rejectedGlazing, rejectedBridges, onAcceptOpaque, onAcceptGlazing, onAcceptBridges, onClose]);

  const acceptAll = useCallback(() => {
    selectAll();
    // Use setTimeout to ensure state update before accept
    setTimeout(() => {
      const allO = opaqueList.filter((_, i) => !rejectedOpaque.has(i));
      const allG = glazingList.filter((_, i) => !rejectedGlazing.has(i));
      const allB = bridgeList.filter((_, i) => !rejectedBridges.has(i));
      if (allO.length > 0) onAcceptOpaque?.(allO);
      if (allG.length > 0) onAcceptGlazing?.(allG);
      if (allB.length > 0) onAcceptBridges?.(allB);
      onClose?.();
    }, 0);
  }, [opaqueList, glazingList, bridgeList, rejectedOpaque, rejectedGlazing, rejectedBridges,
      onAcceptOpaque, onAcceptGlazing, onAcceptBridges, onClose, selectAll]);

  if (!results) return null;

  const selectedCount = selectedOpaque.size + selectedGlazing.size + selectedBridges.size;
  const rejectedCount = rejectedOpaque.size + rejectedGlazing.size + rejectedBridges.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">
              🤖 Rezultate AI propuse — Pas 2 anvelopă
            </h2>
            <div className="text-xs text-white/60 mt-0.5">
              {opaqueList.length} pereți · {glazingList.length} vitraje · {bridgeList.length} punți
              {results.source && <span className="ml-2 italic">· sursă: {results.source}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none px-2"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        {/* Strict warning banner */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-[11px] text-amber-200">
          ⚠️ <strong>Review manual obligatoriu.</strong> AI propune date — TU decizi ce intră în CPE.
          Marchează „Editează" pentru orice element cu confidence scăzută. Toate orientările și ariile rămân editabile după acceptare.
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap gap-2 p-3 border-b border-white/5 text-xs">
          <button
            onClick={selectAll}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
          >
            ☑️ Selectează tot ({totalElements})
          </button>
          <button
            onClick={() => selectByConfidence("high")}
            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          >
            🟢 Doar HIGH
          </button>
          <button
            onClick={deselectAll}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
          >
            ⊘ Deselectează tot
          </button>
          <span className="ml-auto text-white/50 self-center">
            {selectedCount} selectate · {rejectedCount} respinse
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {results.assumptions && results.assumptions.length > 0 && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/[0.05] p-3">
              <div className="text-[11px] font-semibold text-violet-300 mb-1">💡 Ipoteze AI</div>
              <ul className="text-[11px] text-white/70 space-y-0.5">
                {results.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            </div>
          )}

          {results.notes && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/[0.05] p-3">
              <div className="text-[11px] font-semibold text-sky-300 mb-1">📝 Observații AI</div>
              <div className="text-[11px] text-white/70">{results.notes}</div>
            </div>
          )}

          {opaqueList.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2">🧱 Elemente opace ({opaqueList.length})</h3>
              <div className="space-y-2">
                {opaqueList.map((el, i) =>
                  rejectedOpaque.has(i) ? null : (
                    <ElementCard
                      key={`o-${i}`}
                      kind="opaque"
                      element={el}
                      selected={selectedOpaque.has(i)}
                      onToggleSelect={() => toggleSet(setSelectedOpaque, i)}
                      onAccept={() => { onAcceptOpaque?.([el]); setRejectedOpaque((s) => new Set([...s, i])); }}
                      onEdit={() => onEditOpaque?.(el)}
                      onReject={() => setRejectedOpaque((s) => new Set([...s, i]))}
                    />
                  ),
                )}
              </div>
            </section>
          )}

          {glazingList.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2">🪟 Vitraje ({glazingList.length})</h3>
              <div className="space-y-2">
                {glazingList.map((el, i) =>
                  rejectedGlazing.has(i) ? null : (
                    <ElementCard
                      key={`g-${i}`}
                      kind="glazing"
                      element={el}
                      selected={selectedGlazing.has(i)}
                      onToggleSelect={() => toggleSet(setSelectedGlazing, i)}
                      onAccept={() => { onAcceptGlazing?.([el]); setRejectedGlazing((s) => new Set([...s, i])); }}
                      onEdit={() => onEditGlazing?.(el)}
                      onReject={() => setRejectedGlazing((s) => new Set([...s, i]))}
                    />
                  ),
                )}
              </div>
            </section>
          )}

          {bridgeList.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2">⚡ Punți termice ({bridgeList.length})</h3>
              <div className="space-y-2">
                {bridgeList.map((br, i) =>
                  rejectedBridges.has(i) ? null : (
                    <ElementCard
                      key={`b-${i}`}
                      kind="bridge"
                      element={br}
                      selected={selectedBridges.has(i)}
                      onToggleSelect={() => toggleSet(setSelectedBridges, i)}
                      onAccept={() => { onAcceptBridges?.([br]); setRejectedBridges((s) => new Set([...s, i])); }}
                      onEdit={() => onEditBridge?.(br)}
                      onReject={() => setRejectedBridges((s) => new Set([...s, i]))}
                    />
                  ),
                )}
              </div>
            </section>
          )}

          {totalElements === 0 && (
            <div className="text-center py-8 text-white/40">
              AI nu a putut extrage elemente din input. Încearcă o sursă mai detaliată sau folosește un nivel inferior (wizard / CSV).
            </div>
          )}

          {/* Raw JSON debug toggle */}
          <button
            onClick={() => setShowRawJson((s) => !s)}
            className="text-[10px] text-white/40 hover:text-white/70 underline"
          >
            {showRawJson ? "▲ Ascunde" : "▼ Vezi"} JSON raw (debug)
          </button>
          {showRawJson && (
            <pre className="text-[10px] text-white/50 bg-black/40 p-2 rounded overflow-x-auto max-h-48">
              {JSON.stringify(results, null, 2)}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-sm text-white/70 hover:bg-white/5 border border-white/10"
          >
            Anulează
          </button>
          <div className="flex-1" />
          <button
            onClick={acceptSelected}
            disabled={selectedCount === 0}
            className="px-4 py-1.5 rounded text-sm font-medium bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ☑️ Adaugă selectate ({selectedCount})
          </button>
          <button
            onClick={acceptAll}
            disabled={totalElements === 0}
            className="px-4 py-1.5 rounded text-sm font-medium bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40 border border-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✅ Adaugă toate ({totalElements - rejectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}
