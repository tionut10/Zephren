import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf.min.mjs";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * PDFViewer — randare PDF cu PDF.js + canvas inline.
 *
 * Audit 2 mai 2026 — P0.5: pe Vercel HTTPS cu CSP strict, range requests pe
 * blob:// eșuează cu "Unexpected server response (0)". Soluția:
 *   1. Acceptă alternativ `data` (ArrayBuffer) pe lângă `url`. Pentru blob-uri
 *      generate local (preview CPE), apelantul transferă buffer-ul direct,
 *      evitând round-trip-ul HTTP cu range/stream.
 *   2. Setează `disableRange: true, disableStream: true` pentru ambele forme,
 *      ca PDF.js să facă o singură citire integrală în loc de range partials.
 *
 * Backward compat: prop-ul `url` rămâne suportat (când disponibil URL stabil
 * non-blob, ex. un PDF servit dintr-un endpoint regulat).
 */
export default function PDFViewer({ data, url, height = "85vh", title = "PDF" }) {
  const containerRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.25);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!data && !url) return;
    let cancelled = false;
    setLoadError(null);
    setPdf(null);
    setNumPages(0);

    const task = pdfjsLib.getDocument({
      ...(data ? { data } : { url }),
      isEvalSupported: false,
      disableRange: true,
      disableStream: true,
    });
    task.promise.then(
      (loadedPdf) => {
        if (cancelled) return;
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages);
      },
      (err) => {
        if (cancelled) return;
        setLoadError(err?.message || "Eroare la încărcarea PDF-ului");
      }
    );

    return () => {
      cancelled = true;
      try { task.destroy(); } catch { /* ignore */ }
    };
  }, [data, url]);

  useEffect(() => {
    if (!pdf || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";
    let cancelled = false;

    (async () => {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = "block";
        canvas.style.margin = "0 auto 12px auto";
        canvas.style.maxWidth = "100%";
        canvas.style.height = "auto";
        canvas.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
        canvas.style.background = "#fff";
        container.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })().catch((err) => {
      if (!cancelled) setLoadError(err?.message || "Eroare la randarea paginilor");
    });

    return () => { cancelled = true; };
  }, [pdf, scale]);

  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
  const zoomIn  = () => setScale((s) => Math.min(3, s + 0.25));
  const reset   = () => setScale(1.25);

  return (
    <div
      role="region"
      aria-label={title}
      style={{
        height,
        display: "flex",
        flexDirection: "column",
        background: "#3a3a3a",
        userSelect: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "#1f2937",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          color: "#f3f4f6",
          fontSize: "13px",
          flexShrink: 0,
        }}
      >
        <span style={{ opacity: 0.85, fontWeight: 500 }}>
          {numPages > 0 ? `${numPages} ${numPages === 1 ? "pagină" : "pagini"}` : "Se încarcă…"}
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={zoomOut}
            aria-label="Micșorează"
            title="Micșorează (zoom out)"
            style={btnStyle}
          >−</button>
          <button
            type="button"
            onClick={reset}
            aria-label="Zoom la 125%"
            title="Reset zoom la 125%"
            style={{ ...btnStyle, minWidth: "64px", fontVariantNumeric: "tabular-nums" }}
          >{Math.round(scale * 100)}%</button>
          <button
            type="button"
            onClick={zoomIn}
            aria-label="Mărește"
            title="Mărește (zoom in)"
            style={btnStyle}
          >+</button>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px",
        }}
      />
      {loadError && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(239,68,68,0.15)",
          color: "#fca5a5",
          fontSize: "12px",
          borderTop: "1px solid rgba(239,68,68,0.3)",
        }}>
          ⚠ {loadError}
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  background: "#374151",
  border: "1px solid #4b5563",
  color: "#f9fafb",
  padding: "5px 12px",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  lineHeight: 1.2,
  minWidth: "32px",
};
