/**
 * RampFile (anvelopă) — SCAFFOLD S2.
 *
 * Conținut complet în Sesiunea 3:
 *   ├─ Import IFC (.ifc) — parser gbXML actual + roadmap parser IFC real (Pro)
 *   ├─ Import gbXML (.gbxml / .xml) — extracție walls/windows/zones
 *   ├─ Import CSV pereți — template cu coloane (name, type, area, orientation, U)
 *   ├─ Import CSV vitraje — template cu coloane (name, area, U, g, framing%)
 *   ├─ Import CSV punți — template cu coloane (name, cat, length, psi)
 *   ├─ Import foaie Excel .xlsx cu sheet-uri pereți/vitraje/punți
 *   ├─ Import planșă PDF/imagine (AI OCR) — detectare pereți din plan
 *   └─ Import catalog producător (fișe tehnice PDF) → materiale + U
 *
 * Stare S2: butoane către callback-uri existente (IFC + CSV) + placeholder-uri.
 */

function PlaceholderAction({ icon, title, description, sessionTag = "S3" }) {
  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-sky-500/15 bg-sky-500/[0.02] text-left opacity-50 cursor-not-allowed">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-sky-200/80 flex items-center gap-2">
          {title}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300/80 font-normal">
            {sessionTag}
          </span>
        </div>
        <div className="text-[10px] text-sky-100/50 mt-0.5 leading-snug">{description}</div>
      </div>
      <span className="text-sky-300/40 text-xs shrink-0">🔒</span>
    </div>
  );
}

function ActiveAction({ icon, title, description, tooltip, onClick, accent = "sky" }) {
  const colors = {
    sky: "border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 text-sky-300",
  };
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all group ${colors[accent]}`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold group-hover:brightness-110">{title}</div>
        <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{description}</div>
      </div>
      <span className="opacity-40 group-hover:opacity-80 text-xs shrink-0 transition-opacity">→</span>
    </button>
  );
}

export default function RampFile({
  building,
  onOpenIFC,
  onGbxmlImport,
  onCSVImport,
  onOpenJSONImport,
  showToast,
}) {
  const csvInputRef = { current: null };

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-sky-200/70 mb-2">
        📁 Import din fișiere BIM/CAD/CSV. Parser IFC complet în roadmap Pro.
      </div>

      {/* Import IFC/gbXML — funcțional din S2 (reutilizează IFCImport existent) */}
      <ActiveAction
        icon="🏢"
        title="IFC / gbXML"
        description="Import din BIM — extrage pereți, ferestre, zone. Momentan doar gbXML (roadmap: parser IFC complet)."
        tooltip="Momentan suportă doar gbXML. Import IFC complet în roadmap Pro."
        onClick={() => onOpenIFC?.()}
      />

      {/* Import CSV — funcțional din S2 */}
      <ActiveAction
        icon="📊"
        title="CSV / TXT pereți"
        description="Template cu coloane: name, type (PE/PT/PP/PL/PB), area, orientation, U."
        onClick={() => {
          if (!csvInputRef.current) return;
          csvInputRef.current.click();
        }}
      />
      <input
        ref={el => { csvInputRef.current = el; }}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={e => { onCSVImport?.(e); e.target.value = ""; }}
      />

      {/* TODO S3: Excel multi-sheet */}
      <PlaceholderAction
        icon="📗"
        title="Excel .xlsx multi-sheet"
        description="Un singur fișier cu 3 sheet-uri: Pereți / Vitraje / Punți. Parser openpyxl serverless."
      />

      {/* TODO S3: planșă PDF/imagine AI */}
      <PlaceholderAction
        icon="🖼️"
        title="Planșă PDF / imagine (AI)"
        description="Detectează pereți exteriori și dimensiuni din plan arhitectural scanat sau PDF."
      />

      {/* TODO S3: catalog producător */}
      <PlaceholderAction
        icon="📑"
        title="Catalog producător (fișe PDF)"
        description="Import materiale și coeficienți U direct din fișe tehnice producător."
      />

      {/* Import JSON proiect complet — funcțional din S2 dacă callback dat */}
      {onOpenJSONImport && (
        <div className="pt-2 mt-2 border-t border-white/[0.06]">
          <ActiveAction
            icon="📦"
            title="Proiect complet (.json)"
            description="Import proiect Zephren întreg — înlocuiește Step 1 + 2 + 3..."
            onClick={() => {
              if (!csvInputRef.current) return;
              // Reutilizăm același input (dar cu filtru schimbat ar fi ideal — S3)
              showToast?.("Folosește drop zone pentru JSON (până în S3)", "info");
            }}
          />
        </div>
      )}
    </div>
  );
}
