/**
 * Vercel Serverless Function — DOCX to PDF/Viewer
 *
 * 1. Dacă GOTENBERG_URL e configurat → convertește DOCX→PDF via LibreOffice și returnează PDF.
 * 2. Altfel → uploadează DOCX pe Vercel Blob (URL public) și returnează JSON cu
 *    viewerUrl = https://view.officeapps.live.com/op/embed.aspx?src=...
 *    Acesta randează DOCX exact ca Microsoft Word (inclusiv forme floating).
 */

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Citim body-ul
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const docxBuffer = Buffer.concat(chunks);

  if (docxBuffer.length === 0) {
    return res.status(400).json({ error: "Empty body" });
  }

  // ── Calea 1: Gotenberg (dacă e configurat) ──
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
  try {
    const { put } = await import("@vercel/blob");

    // Filename unic per sesiune (înlocuiește fișierul vechi la fiecare preview)
    const filename = `cpe-preview-${Date.now()}.docx`;

    const blob = await put(filename, docxBuffer, {
      access: "public",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      addRandomSuffix: false,
    });

    const viewerUrl =
      "https://view.officeapps.live.com/op/embed.aspx?src=" +
      encodeURIComponent(blob.url);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ viewerUrl, blobUrl: blob.url });
  } catch (blobErr) {
    console.error("Blob upload error:", blobErr.message);
    return res.status(500).json({ error: "Preview unavailable: " + blobErr.message });
  }
}
