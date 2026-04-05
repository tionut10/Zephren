/**
 * Vercel Serverless Function — DOCX to PDF via Gotenberg (LibreOffice)
 * Primește DOCX blob ca binary body, trimite la Gotenberg, returnează PDF.
 */

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const gotenbergUrl = process.env.GOTENBERG_URL;
  if (!gotenbergUrl) {
    return res.status(500).json({ error: "GOTENBERG_URL not configured" });
  }

  try {
    // Read raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const docxBuffer = Buffer.concat(chunks);

    if (docxBuffer.length === 0) {
      return res.status(400).json({ error: "Empty body" });
    }

    // Build multipart form data manually (Node.js native fetch with FormData)
    const boundary = "----GotenbergBoundary" + Date.now();
    const filename = "document.docx";

    const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(header, "utf-8");
    const footerBuf = Buffer.from(footer, "utf-8");
    const body = Buffer.concat([headerBuf, docxBuffer, footerBuf]);

    const pdfResp = await fetch(gotenbergUrl + "/forms/libreoffice/convert", {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body: body,
    });

    if (!pdfResp.ok) {
      const errText = await pdfResp.text().catch(() => "Unknown error");
      console.error("Gotenberg error:", pdfResp.status, errText);
      return res.status(502).json({ error: "Gotenberg conversion failed: " + pdfResp.status });
    }

    const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer());

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdfBuffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error("preview-pdf error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
