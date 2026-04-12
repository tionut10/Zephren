/**
 * Parse Building Data from JSON/IFC/CSV
 * Extrage geometrie și proprietăți termice din formate diverse
 * Scindre din import-document.js
 */

/**
 * Parse simple JSON format
 * { building: {address, Au, V, category}, opaqueElements: [], glazingElements: [], etc }
 */
function parseJSONFormat(data) {
  return {
    building: {
      address: data.building?.address || '',
      Au: parseFloat(data.building?.Au) || 0,
      V: parseFloat(data.building?.V) || 0,
      category: data.building?.category || 'RI',
      structure: data.building?.structure || 'Cadre beton armat',
    },
    opaqueElements: (data.opaqueElements || []).map(el => ({
      type: el.type || 'Wall',
      area: parseFloat(el.area) || 0,
      U: parseFloat(el.U) || null,
      layers: (el.layers || []).map(l => ({
        material: l.material || 'Unknown',
        thickness: parseFloat(l.thickness) || 0,
        lambda: parseFloat(l.lambda) || 0.5,
      })),
    })),
    glazingElements: (data.glazingElements || []).map(gl => ({
      type: gl.type || 'Window',
      area: parseFloat(gl.area) || 0,
      U: parseFloat(gl.U) || 1.5,
      orientation: gl.orientation || 'S',
      g: parseFloat(gl.g) || 0.6,
    })),
    thermalBridges: (data.thermalBridges || []).map(tb => ({
      type: tb.type || 'Corner',
      length: parseFloat(tb.length) || 0,
      psi: parseFloat(tb.psi) || 0.1,
    })),
  };
}

/**
 * Parse CSV format (simple table with columns)
 * Expected: type, area, U, orientation, g (for glazing) or thickness, lambda (for opaque)
 */
function parseCSVFormat(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const opaqueElements = [];
  const glazingElements = [];

  lines.slice(1).forEach(line => {
    const values = line.split(',').map(v => v.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));

    if (row.type?.toLowerCase().includes('window') || row.type?.toLowerCase().includes('glazing')) {
      glazingElements.push({
        type: row.type || 'Window',
        area: parseFloat(row.area) || 0,
        U: parseFloat(row.u) || 1.5,
        orientation: row.orientation || 'S',
        g: parseFloat(row.g) || 0.6,
      });
    } else {
      opaqueElements.push({
        type: row.type || 'Wall',
        area: parseFloat(row.area) || 0,
        U: parseFloat(row.u) || null,
        layers: row.material ? [{
          material: row.material,
          thickness: parseFloat(row.thickness) || 50,
          lambda: parseFloat(row.lambda) || 0.5,
        }] : [],
      });
    }
  });

  return {
    building: {
      address: 'CSV Import',
      Au: 100,
      V: 300,
      category: 'RI',
      structure: 'Cadre beton armat',
    },
    opaqueElements,
    glazingElements,
    thermalBridges: [],
  };
}

/**
 * Simple IFC parser (stub for basic geometry)
 * Real IFC parsing requires ifcjs library
 */
function parseIFCFormat(ifcData) {
  // TODO: integrate ifcjs for full IFC support
  // For now, accept pre-parsed IFC data (JSON representation)
  return parseJSONFormat(ifcData);
}

/**
 * Route detection & dispatcher
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { format, data } = req.body;

  if (!data || !format) {
    return res.status(400).json({
      error: 'Missing format and data. Supported: json, csv, ifc',
    });
  }

  try {
    let parsed;

    switch (format.toLowerCase()) {
      case 'json':
        parsed = parseJSONFormat(data);
        break;
      case 'csv':
        parsed = parseCSVFormat(typeof data === 'string' ? data : JSON.stringify(data));
        break;
      case 'ifc':
        parsed = parseIFCFormat(data);
        break;
      default:
        return res.status(400).json({ error: `Unsupported format: ${format}` });
    }

    // Validare bază
    if (!parsed.building.Au || !parsed.building.V) {
      return res.status(400).json({
        error: 'Building data incomplete: Au (useful area) and V (volume) required',
        received: parsed.building,
      });
    }

    return res.status(200).json({
      success: true,
      format,
      data: parsed,
      stats: {
        opaqueElements: parsed.opaqueElements.length,
        glazingElements: parsed.glazingElements.length,
        thermalBridges: parsed.thermalBridges.length,
        totalOpaqueArea: parsed.opaqueElements.reduce((s, e) => s + e.area, 0),
        totalGlazingArea: parsed.glazingElements.reduce((s, e) => s + e.area, 0),
      },
    });
  } catch (error) {
    console.error('Parse error:', error);
    return res.status(500).json({
      error: 'Parse failed',
      details: error.message,
    });
  }
}
