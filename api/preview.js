/**
 * Unified Preview Handler
 * Serves document previews (DOCX, PDF) on demand
 * Consolidates preview-docx.js + preview-pdf.js
 */

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { type = 'docx', file } = req.query;

  if (!file) {
    return res.status(400).json({
      error: 'Missing file parameter',
      supported_types: ['docx', 'pdf'],
    });
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'documents', file);

    // Security: prevent directory traversal
    if (!filePath.startsWith(path.join(process.cwd(), 'public'))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType =
      type.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Return file with appropriate headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    res.setHeader('Cache-Control', 'no-cache');

    return res.send(fileBuffer);
  } catch (error) {
    console.error('Preview error:', error);
    return res.status(500).json({
      error: 'Preview failed',
      details: error.message,
    });
  }
}
