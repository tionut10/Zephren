import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../components/ui.jsx";

const TOOLS = ["zonă", "text"];

function interpret(deltaT) {
  const d = parseFloat(deltaT);
  if (isNaN(d)) return null;
  if (d > 5) return "Pierdere termică majoră — verificați izolarea";
  if (d > 3) return "Posibilă punte termică semnificativă";
  if (d < -2) return "Posibil infiltrații aer rece";
  return null;
}

function annotationColor(deltaT) {
  const d = parseFloat(deltaT);
  if (isNaN(d)) return "#f59e0b";
  return d >= 0 ? "#ef4444" : "#3b82f6";
}

export default function ThermovisionModule({ onClose, onSave }) {
  const [photos, setPhotos] = useState([]);           // [{dataUrl, name, notes}]
  const [annotations, setAnnotations] = useState({}); // {idx: [{x,y,w,h,label,deltaT}]}
  const [selected, setSelected] = useState(null);
  const [tool, setTool] = useState("zonă");
  const [drawing, setDrawing] = useState(null);       // {x,y,w,h} in progress
  const [pendingRect, setPendingRect] = useState(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [pendingDeltaT, setPendingDeltaT] = useState("");
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  /* ── helpers ── */
  const ann = selected !== null ? (annotations[selected] || []) : [];

  const setAnn = (idx, val) =>
    setAnnotations(prev => ({ ...prev, [idx]: val }));

  /* ── canvas drawing ── */
  const getScaledRect = useCallback((canvas, img) => {
    if (!canvas || !img) return { offX: 0, offY: 0, scale: 1 };
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.min(cw / iw, ch / ih);
    const offX = (cw - iw * scale) / 2;
    const offY = (ch - ih * scale) / 2;
    return { offX, offY, scale };
  }, []);

  const toCanvas = (clientX, clientY, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || selected === null) return;
    const ctx = canvas.getContext("2d");
    const { offX, offY, scale } = getScaledRect(canvas, img);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offX, offY, img.naturalWidth * scale, img.naturalHeight * scale);

    const drawRect = (r, alpha = 1) => {
      const color = annotationColor(r.deltaT);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.strokeRect(
        offX + r.x * scale, offY + r.y * scale,
        r.w * scale, r.h * scale
      );
      if (r.label) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(offX + r.x * scale, offY + r.y * scale - 18, r.label.length * 7 + 8, 18);
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.globalAlpha = 1;
        ctx.fillText(r.label, offX + r.x * scale + 4, offY + r.y * scale - 4);
      }
      ctx.globalAlpha = 1;
    };

    ann.forEach(r => drawRect(r));

    if (drawing) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(
        offX + drawing.x * scale, offY + drawing.y * scale,
        drawing.w * scale, drawing.h * scale
      );
      ctx.setLineDash([]);
    }
  }, [selected, ann, drawing, getScaledRect]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  /* ── load image into hidden img tag ── */
  useEffect(() => {
    if (selected === null || !photos[selected]) return;
    const img = imgRef.current;
    if (img) img.src = photos[selected].dataUrl;
  }, [selected, photos]);

  /* ── mouse events ── */
  const mouseDown = (e) => {
    if (selected === null || pendingRect) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const { offX, offY, scale } = getScaledRect(canvas, img);
    const { x, y } = toCanvas(e.clientX, e.clientY, canvas);
    const ix = (x - offX) / scale;
    const iy = (y - offY) / scale;
    setDrawing({ x: ix, y: iy, w: 0, h: 0, _ox: ix, _oy: iy });
  };

  const mouseMove = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const { offX, offY, scale } = getScaledRect(canvas, img);
    const { x, y } = toCanvas(e.clientX, e.clientY, canvas);
    const ix = (x - offX) / scale;
    const iy = (y - offY) / scale;
    setDrawing(d => ({
      ...d,
      x: Math.min(d._ox, ix), y: Math.min(d._oy, iy),
      w: Math.abs(ix - d._ox), h: Math.abs(iy - d._oy),
    }));
  };

  const mouseUp = () => {
    if (!drawing) return;
    const { x, y, w, h } = drawing;
    if (w > 5 && h > 5) setPendingRect({ x, y, w, h });
    setDrawing(null);
  };

  const confirmAnnotation = () => {
    if (!pendingRect) return;
    const newAnn = { ...pendingRect, label: pendingLabel, deltaT: pendingDeltaT };
    setAnn(selected, [...ann, newAnn]);
    setPendingRect(null);
    setPendingLabel("");
    setPendingDeltaT("");
  };

  const deleteAnnotation = (i) => {
    setAnn(selected, ann.filter((_, idx) => idx !== i));
  };

  /* ── file upload ── */
  const readFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotos(prev => {
          const next = [...prev, { dataUrl: e.target.result, name: file.name, notes: "" }];
          if (prev.length === 0) setSelected(0);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    readFiles(e.dataTransfer.files);
  };

  /* ── export CSV ── */
  const exportCSV = () => {
    const rows = [["Fotografie", "Zonă", "Etichetă", "ΔT (°C)", "Interpretare"]];
    photos.forEach((p, i) => {
      (annotations[i] || []).forEach(a => {
        rows.push([p.name, `${Math.round(a.x)},${Math.round(a.y)} ${Math.round(a.w)}x${Math.round(a.h)}`,
          a.label, a.deltaT, interpret(a.deltaT) || ""]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "termoviziune.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── save ── */
  const handleSave = () => {
    const result = photos.map((p, i) => ({
      dataUrl: p.dataUrl,
      name: p.name,
      notes: p.notes,
      annotations: (annotations[i] || []).map(a => ({
        ...a,
        color: annotationColor(a.deltaT),
      })),
    }));
    onSave(result);
  };

  const updateNote = (val) => {
    if (selected === null) return;
    setPhotos(prev => prev.map((p, i) => i === selected ? { ...p, notes: val } : p));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* hidden img for canvas drawing */}
      <img ref={imgRef} className="hidden" alt="" onLoad={drawCanvas} />

      <div className="bg-[#12141f] border border-white/10 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M3 12h1M20 12h1M12 3v1M12 20v1M5.6 5.6l.7.7M17.7 17.7l.7.7M17.7 6.3l-.7.7M6.3 17.7l-.7.7"/></svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Modul Termoviziune</h2>
              <p className="text-xs text-white/40">Fotografii IR · Adnotare zone termice · Raport audit</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — photo list */}
          <div className="w-52 shrink-0 border-r border-white/10 flex flex-col overflow-hidden">
            <div
              className={cn("m-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 py-4 text-xs",
                dragging ? "border-amber-500/60 bg-amber-500/10" : "border-white/15 hover:border-amber-500/40")}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span className="text-white/50">Adaugă poze IR</span>
              <span className="text-white/25">drag & drop</span>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => readFiles(e.target.files)} />
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {photos.map((p, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  className={cn("w-full text-left rounded-lg overflow-hidden border transition-all",
                    selected === i ? "border-amber-500/50 bg-amber-500/10" : "border-white/5 hover:border-white/20 bg-white/3")}>
                  <img src={p.dataUrl} alt={p.name} className="w-full h-20 object-cover opacity-90" />
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-white/80 truncate">{p.name}</p>
                    <p className="text-[10px] text-white/35">{(annotations[i] || []).length} adnotări</p>
                  </div>
                </button>
              ))}
              {photos.length === 0 && (
                <p className="text-xs text-white/25 text-center py-4">Nicio fotografie încărcată</p>
              )}
            </div>
          </div>

          {/* Center — canvas */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f1a]">
            {selected !== null && photos[selected] ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 shrink-0">
                  <span className="text-xs text-white/40 mr-1">Instrument:</span>
                  {TOOLS.map(t => (
                    <button key={t} onClick={() => setTool(t)}
                      className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                        tool === t ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-white/40 hover:text-white/70 border border-transparent")}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Canvas area */}
                <div className="flex-1 relative overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={800} height={500}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    onMouseDown={mouseDown}
                    onMouseMove={mouseMove}
                    onMouseUp={mouseUp}
                    onMouseLeave={mouseUp}
                  />
                </div>

                {/* Pending annotation dialog */}
                {pendingRect && (
                  <div className="shrink-0 border-t border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-amber-300 font-medium">Zonă nouă —</span>
                    <input value={pendingLabel} onChange={e => setPendingLabel(e.target.value)}
                      placeholder="Etichetă (ex: colț perete)"
                      className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 w-44" />
                    <input value={pendingDeltaT} onChange={e => setPendingDeltaT(e.target.value)}
                      placeholder="ΔT °C (ex: 4.2)"
                      type="number" step="0.1"
                      className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 w-28" />
                    <button onClick={confirmAnnotation}
                      className="bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg px-3 py-1 text-xs hover:bg-amber-500/30 transition-colors">
                      Adaugă
                    </button>
                    <button onClick={() => setPendingRect(null)}
                      className="text-white/30 hover:text-white/60 text-xs transition-colors">Anulează</button>
                  </div>
                )}

                {/* Notes */}
                <div className="shrink-0 border-t border-white/10 px-4 py-2">
                  <textarea
                    rows={2}
                    value={photos[selected]?.notes || ""}
                    onChange={e => updateNote(e.target.value)}
                    placeholder="Observații despre această fotografie..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-white/25">Selectați o fotografie din listă</p>
              </div>
            )}
          </div>

          {/* Right panel — annotations + interpretation */}
          <div className="w-60 shrink-0 border-l border-white/10 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 shrink-0">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Adnotări</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {ann.length === 0 && (
                <p className="text-xs text-white/25 text-center py-6">
                  Desenați un dreptunghi<br/>pe fotografie
                </p>
              )}
              {ann.map((a, i) => {
                const hint = interpret(a.deltaT);
                const color = annotationColor(a.deltaT);
                return (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/3 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                        <span className="text-xs text-white/80 truncate font-medium">{a.label || `Zonă ${i + 1}`}</span>
                      </div>
                      <button onClick={() => deleteAnnotation(i)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    {a.deltaT !== "" && (
                      <p className="text-[11px] text-white/50">ΔT: <span className="font-mono" style={{ color }}>{a.deltaT}°C</span></p>
                    )}
                    {hint && (
                      <p className="text-[10px] leading-tight rounded-md px-2 py-1.5"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                        {hint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {photos.length > 0 && (
              <div className="shrink-0 border-t border-white/10 px-3 py-2">
                <p className="text-[10px] text-white/30 mb-1">Total fotografii: {photos.length}</p>
                <p className="text-[10px] text-white/30">
                  Total adnotări: {Object.values(annotations).reduce((s, a) => s + a.length, 0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 shrink-0">
          <button onClick={exportCSV} disabled={photos.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-white/50 hover:text-white/80 hover:border-white/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-white/15 text-xs text-white/50 hover:text-white/80 transition-colors">
              Anulează
            </button>
            <button onClick={handleSave} disabled={photos.length === 0}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Salvează în raport
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
