// ═══════════════════════════════════════════════════════════════════════════
// IFC Parser — IFC 2x3 / IFC4 (STEP ISO 10303-21 format ASCII)
// Extras din IFCImport.jsx pentru reutilizare (componenta UI + handler import).
// Parser minimal fără dependențe externe.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split inteligent păstrând paranteze și string-uri intacte.
 * @param {string} str - parametrii IFC separați prin virgulă
 * @returns {string[]}
 */
function smartSplit(str) {
  const parts = [];
  let depth = 0, current = "", inStr = false;
  for (const ch of str) {
    if (ch === "'" && !inStr) { inStr = true; current += ch; continue; }
    if (ch === "'" && inStr) { inStr = false; current += ch; continue; }
    if (inStr) { current += ch; continue; }
    if (ch === "(" || ch === ")") { depth += ch === "(" ? 1 : -1; current += ch; continue; }
    if (ch === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function getStr(val) {
  if (!val) return "";
  return val.replace(/^'|'$/g, "").replace(/\\X2\\[^\\]+\\X0\\/g, "");
}

/**
 * Parsează text IFC și returnează date structurate pentru calculator energetic.
 * @param {string} ifcText - conținutul fișierului .ifc
 * @returns {Object} structură cu proiect, clădire, spații, pereți, ferestre, uși, buildingData
 */
export function parseIFC(ifcText) {
  const lines = ifcText.split(/\r?\n/);
  const entities = {};

  // Pas 1: parsăm toate entitățile (#ID = IFCTYPE(...))
  for (const line of lines) {
    const m = line.match(/^#(\d+)\s*=\s*(\w+)\s*\((.+)\)\s*;?\s*$/i);
    if (!m) continue;
    const [, id, type, params] = m;
    entities[`#${id}`] = { type: type.toUpperCase(), raw: params, id: `#${id}` };
  }

  const result = {
    projectName: "", buildingName: "", address: "",
    stories: [], spaces: [], walls: [], slabs: [], roofs: [],
    windows: [], doors: [], columns: [], buildingData: {},
  };

  // Pas 2: extragere elemente arhitecturale + metadata
  for (const [, ent] of Object.entries(entities)) {
    const p = smartSplit(ent.raw);
    switch (ent.type) {
      case "IFCPROJECT":
        result.projectName = getStr(p[2] || "");
        break;
      case "IFCBUILDING":
        result.buildingName = getStr(p[2] || "");
        break;
      case "IFCPOSTALADDRESS":
        result.address = [getStr(p[4] || ""), getStr(p[5] || ""), getStr(p[6] || "")].filter(Boolean).join(", ");
        break;
      case "IFCBUILDINGSTOREY":
        result.stories.push({ name: getStr(p[2] || ""), elevation: parseFloat(p[6]) || 0 });
        break;
      case "IFCSLAB": {
        const slabType = getStr(p[8] || "").toUpperCase();
        result.slabs.push({ name: getStr(p[2] || ""), type: slabType, id: ent.id });
        break;
      }
      case "IFCROOF":
        result.roofs.push({ name: getStr(p[2] || ""), id: ent.id });
        break;
      case "IFCWALL":
      case "IFCWALLSTANDARDCASE":
        result.walls.push({ name: getStr(p[2] || ""), id: ent.id });
        break;
      case "IFCWINDOW": {
        const w = parseFloat(p[6]) || 0;
        const h = parseFloat(p[7]) || 0;
        result.windows.push({ name: getStr(p[2] || ""), width: w, height: h, area: w * h, id: ent.id });
        break;
      }
      case "IFCDOOR": {
        const w = parseFloat(p[6]) || 0;
        const h = parseFloat(p[7]) || 0;
        result.doors.push({ name: getStr(p[2] || ""), width: w, height: h, area: w * h, id: ent.id });
        break;
      }
      case "IFCSPACE":
        result.spaces.push({ name: getStr(p[2] || ""), id: ent.id });
        break;
    }
  }

  // Pas 3: extragere cantități (IfcQuantityArea, Volume, Length)
  const qAreas = {};
  for (const [, ent] of Object.entries(entities)) {
    const p = smartSplit(ent.raw);
    if (ent.type === "IFCQUANTITYAREA") {
      qAreas[ent.id] = { name: getStr(p[0] || ""), value: parseFloat(p[3]) || 0 };
    } else if (ent.type === "IFCQUANTITYVOLUME") {
      qAreas[ent.id] = { name: getStr(p[0] || ""), value: parseFloat(p[3]) || 0, isVol: true };
    } else if (ent.type === "IFCQUANTITYLENGTH") {
      qAreas[ent.id] = { name: getStr(p[0] || ""), value: parseFloat(p[3]) || 0, isLen: true };
    }
  }

  // Pas 4: agregare cantități per tip
  let totalWallArea = 0, totalWindowArea = 0, totalRoofArea = 0, totalFloorArea = 0, totalVolume = 0;
  for (const [, ent] of Object.entries(entities)) {
    if (ent.type === "IFCELEMENTQUANTITY") {
      const p = smartSplit(ent.raw);
      const listStr = p[4] || "";
      const refs = listStr.match(/#\d+/g) || [];
      refs.forEach(ref => {
        const q = qAreas[ref];
        if (!q) return;
        const qname = q.name.toLowerCase();
        if (qname.includes("netsurface") || qname.includes("net side face")) totalWallArea += q.value;
        if (qname.includes("grossfloor") || qname.includes("net floor")) totalFloorArea += q.value;
        if (qname.includes("roof") && !q.isVol) totalRoofArea += q.value;
        if (q.isVol) totalVolume += q.value;
      });
    }
  }

  result.windows.forEach(w => { totalWindowArea += w.area; });

  // Pas 5: fallback estimări când cantități explicite lipsesc
  if (totalFloorArea === 0 && result.spaces.length > 0) totalFloorArea = result.spaces.length * 25;
  if (totalWallArea === 0 && result.walls.length > 0) totalWallArea = result.walls.length * 12;
  if (totalWindowArea === 0 && result.windows.length > 0) totalWindowArea = result.windows.length * 2;

  result.buildingData = {
    nStories: Math.max(1, result.stories.length),
    nSpaces: result.spaces.length,
    nWalls: result.walls.length,
    nWindows: result.windows.length,
    nDoors: result.doors.length,
    totalFloorArea_m2: Math.round(totalFloorArea * 10) / 10,
    totalWallArea_m2: Math.round(totalWallArea * 10) / 10,
    totalWindowArea_m2: Math.round(totalWindowArea * 10) / 10,
    totalRoofArea_m2: Math.round(totalRoofArea * 10) / 10,
    totalVolume_m3: Math.round(totalVolume * 10) / 10,
    windowWallRatio: totalWallArea > 0 ? Math.round(totalWindowArea / totalWallArea * 1000) / 10 : 0,
  };

  return result;
}

/**
 * Mapează rezultatul IFC în câmpuri compatibile cu state-ul Zephren.
 * @param {Object} parsed - output din parseIFC
 * @returns {Object} { address, areaUseful, volume, suggestedElements[], suggestedGlazing[], nStories }
 */
export function mapIFCToZephren(parsed) {
  const bd = parsed.buildingData;
  return {
    address: parsed.address || parsed.buildingName || parsed.projectName || "",
    areaUseful: bd.totalFloorArea_m2 > 0 ? String(bd.totalFloorArea_m2) : "",
    volume: bd.totalVolume_m3 > 0 ? String(bd.totalVolume_m3) : "",
    suggestedElements: [
      bd.totalWallArea_m2 > 0 && {
        type: "PE", name: "Pereți exteriori (din IFC)",
        area: String(bd.totalWallArea_m2), autoFromIFC: true,
      },
      bd.totalRoofArea_m2 > 0 && {
        type: "PT", name: "Terasă/Acoperiș (din IFC)",
        area: String(bd.totalRoofArea_m2), autoFromIFC: true,
      },
    ].filter(Boolean),
    suggestedGlazing: bd.totalWindowArea_m2 > 0 ? [{
      name: `${parsed.buildingData.nWindows} ferestre (din IFC)`,
      area: String(bd.totalWindowArea_m2), autoFromIFC: true,
    }] : [],
    nStories: bd.nStories,
  };
}
