/**
 * BuildingPhotos — Modul fotografii clădire cu adnotări per categorie
 * Persistență: base64 în state (buildingPhotos) → localStorage via project save
 * Categorii: exterior, interior, termoviziune, instalații, defecte, altele
 */
import { useState, useRef, useCallback } from "react";

const PHOTO_CATEGORIES = [
  { id: "exterior",    icon: "🏠", label: "Exterior",         color: "blue" },
  { id: "interior",    icon: "🪟", label: "Interior",         color: "indigo" },
  { id: "ir",          icon: "🌡️", label: "Termoviziune IR",  color: "red" },
  { id: "instalatii",  icon: "⚙️", label: "Instalații",       color: "amber" },
  { id: "defecte",     icon: "⚠️",  label: "Defecte/Degradări", color: "orange" },
  { id: "altele",      icon: "📎", label: "Altele",           color: "slate" },
];

const CAT_STYLES = {
  blue:   { border: "border-blue-500/30",   bg: "bg-blue-500/10",   text: "text-blue-400",   badge: "bg-blue-500/20 text-blue-300" },
  indigo: { border: "border-indigo-500/30", bg: "bg-indigo-500/10", text: "text-indigo-400", badge: "bg-indigo-500/20 text-indigo-300" },
  red:    { border: "border-red-500/30",    bg: "bg-red-500/10",    text: "text-red-400",    badge: "bg-red-500/20 text-red-300" },
  amber:  { border: "border-amber-500/30",  bg: "bg-amber-500/10",  text: "text-amber-400",  badge: "bg-amber-500/20 text-amber-300" },
  orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-300" },
  slate:  { border: "border-slate-500/30",  bg: "bg-slate-500/10",  text: "text-slate-400",  badge: "bg-slate-500/20 text-slate-300" },
};

function PhotoCard({ photo, index, onDelete, onUpdate, cn }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(photo.label || "");
  const [note, setNote] = useState(photo.note || "");
  const cat = PHOTO_CATEGORIES.find(c => c.id === photo.zone) || PHOTO_CATEGORIES[5];
  const st = CAT_STYLES[cat.color];

  const save = () => {
    onUpdate(index, { label, note });
    setEditing(false);
  };

  return (
    <div className={cn("rounded-xl border overflow-hidden", st.border, "bg-slate-900/60 group")}>
      {/* Image */}
      <div className="relative">
        <img src={photo.url} alt={label || "Fotografie"} className="w-full h-40 object-cover" />
        {/* Overlay controls */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-start justify-end p-2 gap-1.5 opacity-0 group-hover:opacity-100">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white flex items-center justify-center text-sm transition-all"
            title="Editează adnotare">✎</button>
          <button onClick={() => onDelete(index)}
            className="w-7 h-7 rounded-lg bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center text-sm transition-all"
            title="Șterge fotografie">✕</button>
        </div>
        {/* Category badge */}
        <div className={cn("absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded font-medium", st.badge)}>
          {cat.icon} {cat.label}
        </div>
      </div>

      {/* Info / Edit */}
      {editing ? (
        <div className="p-2 space-y-1.5">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Titlu fotografie..."
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" />
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Adnotare / observații..."
            rows={2} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white resize-none" />
          <div className="flex gap-1.5">
            <button onClick={save} className="flex-1 py-1 rounded bg-blue-500/80 hover:bg-blue-500 text-white text-[10px] font-medium transition-all">Salvează</button>
            <button onClick={() => setEditing(false)} className="flex-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] transition-all">Anulează</button>
          </div>
        </div>
      ) : (
        <div className="px-2 py-1.5">
          {label ? (
            <div className="text-[10px] font-medium text-slate-200 truncate">{label}</div>
          ) : (
            <div className="text-[10px] text-slate-500 italic">Fără titlu — click ✎ pentru adnotare</div>
          )}
          {note && <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{note}</div>}
        </div>
      )}
    </div>
  );
}

export default function BuildingPhotos({ buildingPhotos, setBuildingPhotos, showToast, cn }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploadCategory, setUploadCategory] = useState("exterior");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  const photos = buildingPhotos || [];

  // Generator ID robust — crypto.randomUUID evită coliziuni la upload simultan masiv.
  const makeId = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Compresie canvas: max 1024px, 80% JPEG — reduce de la 3-5MB la ~150-300KB.
  // onerror pe reader + img previne freeze la fișiere HEIC în Chrome/Firefox/Edge.
  const compressImage = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => resolve(null);
        img.onload = () => {
          const MAX = 1024;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.80));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = useCallback(async (files, category) => {
    // Acceptă MIME image/* sau extensie .heic/.heif (Windows/Linux raportează uneori type vid).
    const fileArr = Array.from(files || []).filter(f =>
      f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)
    );
    if (!fileArr.length) return;

    // Procesare paralelă — mult mai rapidă la 20+ poze.
    const results = await Promise.all(fileArr.map(async (file) => {
      const url = await compressImage(file);
      if (!url) return { error: true, file };
      return {
        id: makeId(),
        url,
        label: file.name.replace(/\.[^.]+$/, ""),
        note: "",
        zone: category,
        date: new Date().toLocaleDateString("ro-RO"),
      };
    }));

    const ok = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);

    if (ok.length) {
      setBuildingPhotos(prev => [...prev, ...ok]);
      showToast(
        `${ok.length} fotografi${ok.length === 1 ? "e adăugată" : "i adăugate"} (compresate)`,
        "success"
      );
    }

    if (failed.length) {
      const heicCount = failed.filter(r => /\.(heic|heif)$/i.test(r.file.name)).length;
      const names = failed.slice(0, 3).map(r => r.file.name).join(", ") + (failed.length > 3 ? "…" : "");
      showToast(
        heicCount > 0
          ? `${failed.length} fișier(e) HEIC nedecodabil(e) în acest browser — convertiți în JPG (${names})`
          : `${failed.length} fișier(e) eșuate la procesare (${names})`,
        "error"
      );
    }
  }, [compressImage, setBuildingPhotos, showToast]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files, uploadCategory);
  }, [handleFiles, uploadCategory]);

  const handleDelete = useCallback((index) => {
    const filtered = photos.filter((_, i) => i !== index);
    setBuildingPhotos(filtered);
    showToast("Fotografie ștearsă", "info");
  }, [photos, setBuildingPhotos, showToast]);

  const handleUpdate = useCallback((index, fields) => {
    setBuildingPhotos(prev => prev.map((p, i) => i === index ? { ...p, ...fields } : p));
  }, [setBuildingPhotos]);

  const filtered = activeCategory === "all" ? photos : photos.filter(p => p.zone === activeCategory);

  const countByCategory = (catId) => photos.filter(p => p.zone === catId).length;

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div className="rounded-xl border border-dashed border-slate-600/50 bg-slate-800/30 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs text-slate-400 self-center">Categorie upload:</span>
          {PHOTO_CATEGORIES.map(cat => {
            const st = CAT_STYLES[cat.color];
            const isActive = uploadCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => setUploadCategory(cat.id)}
                className={cn("text-[10px] px-2 py-1 rounded-lg border transition-all",
                  isActive ? `${st.border} ${st.bg} ${st.text}` : "border-slate-700 text-slate-400 hover:border-slate-600")}>
                {cat.icon} {cat.label}
              </button>
            );
          })}
        </div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 py-6 cursor-pointer rounded-lg border-2 border-dashed transition-all",
            isDragging
              ? "border-blue-400 bg-blue-500/10 scale-[1.01]"
              : "border-slate-600/40 hover:border-slate-500/60 hover:bg-slate-700/20"
          )}>
          <span className="text-3xl">📷</span>
          <div className="text-xs text-slate-300 font-medium">
            {isDragging ? "Eliberați pentru încărcare" : "Click sau Drag & Drop imagini"}
          </div>
          <div className="text-[10px] text-slate-500">
            JPG, PNG, WEBP · HEIC doar în Safari (convertiți în JPG pentru Chrome/Firefox/Edge)
          </div>
          <div className={cn("text-[10px] px-2 py-0.5 rounded", CAT_STYLES[PHOTO_CATEGORIES.find(c=>c.id===uploadCategory)?.color]?.badge || "")}>
            Categorie: {PHOTO_CATEGORIES.find(c=>c.id===uploadCategory)?.icon} {PHOTO_CATEGORIES.find(c=>c.id===uploadCategory)?.label}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
          onChange={e => { handleFiles(e.target.files, uploadCategory); e.target.value = ""; }} />
      </div>

      {/* Filtru categorii */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setActiveCategory("all")}
            className={cn("text-[10px] px-2.5 py-1 rounded-lg border transition-all",
              activeCategory === "all" ? "border-white/20 bg-white/10 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600")}>
            Toate ({photos.length})
          </button>
          {PHOTO_CATEGORIES.map(cat => {
            const cnt = countByCategory(cat.id);
            if (!cnt) return null;
            const st = CAT_STYLES[cat.color];
            const isActive = activeCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={cn("text-[10px] px-2.5 py-1 rounded-lg border transition-all",
                  isActive ? `${st.border} ${st.bg} ${st.text}` : "border-slate-700 text-slate-400 hover:border-slate-600")}>
                {cat.icon} {cat.label} ({cnt})
              </button>
            );
          })}
        </div>
      )}

      {/* Galerie */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((photo, idx) => {
            const globalIdx = photos.indexOf(photo);
            return (
              <PhotoCard key={photo.id || idx} photo={photo} index={globalIdx}
                onDelete={handleDelete} onUpdate={handleUpdate} cn={cn} />
            );
          })}
        </div>
      ) : photos.length > 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          Nicio fotografie în categoria selectată.
        </div>
      ) : (
        <div className="text-center py-12 space-y-2">
          <div className="text-3xl opacity-30">📷</div>
          <div className="text-xs text-slate-500">Nicio fotografie adăugată.</div>
          <div className="text-[10px] text-slate-600">Adăugați fotografii pentru documentarea clădirii.</div>
        </div>
      )}

      {/* Statistici */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 text-[10px] text-slate-500">
          <span>Total: {photos.length} fotografii</span>
          {PHOTO_CATEGORIES.filter(c => countByCategory(c.id) > 0).map(cat => (
            <span key={cat.id}>{cat.icon} {cat.label}: {countByCategory(cat.id)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
