/**
 * Vercel Serverless Function — DOCX to PDF preview (alias pentru preview-docx).
 *
 * Istoric: conținut identic cu preview-docx.js. Sprint 20 aliniază comportamentul:
 *   - auth + rate-limit + CORS allowlist
 *   - filename randomUUID (nu mai e ghicibil timestamp)
 *   - size limit streaming 10 MB
 *   - avertisment GDPR pentru calea Office Online
 *
 * Pentru PDF real generat server-side (fără transfer Microsoft), configurează
 * GOTENBERG_URL env var pe Vercel — request-ul va fi convertit prin Railway.
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

  // Streaming read cu limită
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

  // ── Calea 1: Gotenberg (preferat GDPR) ──
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
  // ⚠️ Sprint 20: transfer GDPR către Microsoft US. Folosiți GOTENBERG_URL pentru UE-only.
  try {
    const { put } = await import("@vercel/blob");

    const filename = `cpe-preview-${randomUUID()}.docx`;

    const blob = await put(filename, docxBuffer, {
      access: "public",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      addRandomSuffix: true,
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
