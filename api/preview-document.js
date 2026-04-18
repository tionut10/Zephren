/**
 * Vercel Serverless Function — Preview document (DOCX → PDF sau Viewer).
 *
 * Consolidare P0-01 (Sprint 19, 19 apr 2026):
 *   Înlocuiește `preview-docx.js` + `preview-pdf.js` (cod duplicat). Eliberează 1 slot
 *   Vercel Hobby (12/12 → 11/12) pentru viitoare endpoint-uri (SmartBill webhook,
 *   MDLPA submit, analyze-drawing split, etc.). Ref: AUDIT_21 §P0-01.
 *
 * Contract identic cu endpoint-urile anterioare:
 *   - POST body = DOCX binary stream (max 10 MB)
 *   - Răspuns:
 *       a) `application/pdf` — dacă GOTENBERG_URL configurat (preferat GDPR, date
 *          rămân în UE prin LibreOffice)
 *       b) `application/json` — `{ viewerUrl, blobUrl, _gdprWarning }` pentru Office
 *          Online Viewer (fallback). ⚠️ GDPR: transfer DOCX la Microsoft US —
 *          necesită DPA semnat sau menționare în Privacy Policy.
 *
 * Sprint 20 (18 apr 2026):
 *   - auth + rate-limit + CORS allowlist
 *   - filename randomUUID (nu mai e ghicibil timestamp)
 *   - size limit streaming 10 MB
 *
 * P0-4 (18 apr 2026):
 *   - TTL 1 oră pe headerul Cache-Control al Vercel Blob (reduce fereastra de
 *     expunere a datelor personale la Microsoft Office Online).
 */
import { requireAuth } from "./_middleware/auth.js";
import { checkRateLimit, sendRateLimitError } from "./_middleware/rateLimit.js";
import { applyCors } from "./_middleware/cors.js";
import { randomUUID } from "crypto";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth + rate-limit (Sprint 20)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const limit = checkRateLimit(auth.user.id, 30);
  if (!limit.allowed) return sendRateLimitError(res, limit);

  // Citim body-ul cu limită streaming (max 10 MB)
  const chunks = [];
  let totalSize = 0;
  const MAX_SIZE = 10 * 1024 * 1024;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_SIZE) {
      return res.status(413).json({ error: "File too large (max 10 MB)" });
    }
    chunks.push(chunk);
  }
  const docxBuffer = Buffer.concat(chunks);

  if (docxBuffer.length === 0) {
    return res.status(400).json({ error: "Empty body" });
  }

  // ── Calea 1: Gotenberg (dacă e configurat) — preferat GDPR ──
  const gotenbergUrl = process.env.GOTENBERG_URL;
  if (gotenbergUrl) {
    try {
      const boundary = "----GotenbergBoundary" + Date.now();
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="document.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;
      const body = Buffer.concat([Buffer.from(header, "utf-8"), docxBuffer, Buffer.from(footer, "utf-8")]);

      const pdfResp = await fetch(gotenbergUrl + "/forms/libreoffice/convert", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": String(body.length),
        },
        body: body,
      });

      if (pdfResp.ok) {
        const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer());
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", String(pdfBuffer.length));
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(pdfBuffer);
      }
    } catch (err) {
      console.error("Gotenberg error:", err.message);
    }
  }

  // ── Calea 2: Vercel Blob → Office Online Viewer ──
  // ⚠️ SPRINT 20 NOTE: această cale transferă DOCX la Microsoft (US). Datele conținute
  //   (nume, adresă, telefon, cadastru client) ajung la Microsoft Office Online. Obligație
  //   GDPR: DPA semnat cu Microsoft SAU dezactivare această cale în producție și folosire
  //   exclusiv Gotenberg (GOTENBERG_URL configurat).
  try {
    const { put } = await import("@vercel/blob");

    // Sprint 20: filename randomUUID — NU mai e ghicibil `cpe-preview-${Date.now()}.docx`
    const filename = `cpe-preview-${randomUUID()}.docx`;

    // P0-4 (18 apr 2026) — TTL 1 oră pe CDN (default Vercel Blob = 24h).
    // Reduce fereastra de expunere a datelor personale la Microsoft Office Online.
    // Notă: `cacheControlMaxAge` setează max-age pe headerul Cache-Control al CDN-ului —
    // fișierul rămâne în storage până la ștergere explicită (cleanup job recomandat).
    const BLOB_TTL_SECONDS = 3600; // 1 oră
    const blob = await put(filename, docxBuffer, {
      access: "public",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      addRandomSuffix: true, // protecție suplimentară
      cacheControlMaxAge: BLOB_TTL_SECONDS,
    });

    const viewerUrl =
      "https://view.officeapps.live.com/op/embed.aspx?src=" +
      encodeURIComponent(blob.url);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      viewerUrl,
      blobUrl: blob.url,
      _gdprWarning: "DOCX transferat la Microsoft Office Online (US). Pentru GDPR compliance folosiți GOTENBERG_URL.",
    });
  } catch (blobErr) {
    console.error("Blob upload error:", blobErr.message);
    return res.status(500).json({ error: "Preview unavailable: " + blobErr.message });
  }
}
