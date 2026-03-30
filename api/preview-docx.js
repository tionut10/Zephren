import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const TEMP_DIR = '/tmp/cpe-preview';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function cleanOldFiles() {
  try {
    if (!existsSync(TEMP_DIR)) return;
    const now = Date.now();
    for (const file of readdirSync(TEMP_DIR)) {
      const filePath = join(TEMP_DIR, file);
      try {
        const stat = statSync(filePath);
        if (now - stat.mtimeMs > MAX_AGE_MS) unlinkSync(filePath);
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — serve a previously uploaded file
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id || !/^[a-f0-9]+$/.test(id)) return res.status(400).json({ error: 'Invalid ID' });

    const filePath = join(TEMP_DIR, id + '.docx');
    if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found or expired' });

    const buffer = readFileSync(filePath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `inline; filename="CPE_preview.docx"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(buffer);
  }

  // POST — upload a DOCX blob
  if (req.method === 'POST') {
    try {
      cleanOldFiles();
      if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

      // Read raw body
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      if (buffer.length < 100) return res.status(400).json({ error: 'Empty file' });
      if (buffer.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'File too large (max 5MB)' });

      const id = randomBytes(16).toString('hex');
      const filePath = join(TEMP_DIR, id + '.docx');
      writeFileSync(filePath, buffer);

      // Build public URL
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const publicUrl = `${protocol}://${host}/api/preview-docx?id=${id}`;

      return res.status(200).json({ url: publicUrl, id, expiresIn: '5 minutes' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
