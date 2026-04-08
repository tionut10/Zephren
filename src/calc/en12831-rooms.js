// ═══════════════════════════════════════════════════════════════
// EN 12831-3:2017 — Sarcini termice per cameră
// Dimensionare corpuri de încălzire / pardoseală caldă per spațiu
// ═══════════════════════════════════════════════════════════════

// Temperaturi interioare de calcul per tip cameră [°C]
export const ROOM_THETA_INT = {
  living:    20,
  bedroom:   18,
  kitchen:   20,
  bathroom:  24,
  hallway:   18,
  office:    20,
  classroom: 20,
  other:     18,
};

export const ROOM_TYPE_LABELS = {
  living:    "Living / Sufragerie",
  bedroom:   "Dormitor",
  kitchen:   "Bucătărie",
  bathroom:  "Baie / Grup sanitar",
  hallway:   "Hol / Coridor",
  office:    "Birou",
  classroom: "Sală de clasă",
  other:     "Altul",
};

// Câștiguri interne per tip cameră [W/m²]
const Q_INT_GAIN = {
  living: 3, bedroom: 1, kitchen: 6, bathroom: 2,
  hallway: 1, office: 10, classroom: 15, other: 2,
};

// Corecție expunere față exterioară (număr fețe expuse)
function exposureCorrection(exposedWalls) {
  // 0 fețe = cameră interioară, 4 = cameră de colț expusă
  return 1 + (exposedWalls || 1) * 0.05;
}

/**
 * calcRoomLoad — sarcina termică per cameră EN 12831-3
 * @param {object} room - { name, type, area, height, exposedWalls, floorType, adjacentTemp }
 * @param {object} building - { U_wall, U_roof, U_floor, U_window, windowPct, n50 }
 * @param {object} climate - { theta_e, alt }
 * @returns {object} rezultate per cameră
 */
export function calcRoomLoad(room, building, climate) {
  const area = parseFloat(room.area) || 15;
  const h = parseFloat(room.height) || 2.7;
  const tInt = ROOM_THETA_INT[room.type] || 20;
  const tExt = parseFloat(climate?.theta_e) || -15;
  const tAdj = parseFloat(room.adjacentTemp) || 10; // temperatura spațiu adiacent neîncălzit
  const exposedWalls = parseInt(room.exposedWalls) || 1;

  // Suprafețe estimate din parametrii clădirii
  const perimeterEst = 2 * (Math.sqrt(area) + Math.sqrt(area)); // pătrat aproximativ
  const wallArea = exposedWalls * Math.sqrt(area) * h; // pereți exteriori expuși
  const winArea = wallArea * (parseFloat(building.windowPct) || 20) / 100;
  const wallOpaqueArea = wallArea - winArea;

  // U-values preluate din parametrii clădirii globali
  const U_wall = parseFloat(building.U_wall) || 0.4;
  const U_win  = parseFloat(building.U_window) || 1.4;
  const U_roof = parseFloat(building.U_roof) || 0.25;
  const U_floor = parseFloat(building.U_floor) || 0.35;

  // ─── Transmisie ───
  const H_wall  = wallOpaqueArea * U_wall;
  const H_win   = winArea * U_win;
  const H_roof  = (room.floorType === "top") ? area * U_roof : 0;
  const H_floor = (room.floorType === "ground") ? area * U_floor * (tInt - tAdj) / Math.max(1, tInt - tExt) : 0;
  const H_T = (H_wall + H_win + H_roof) * exposureCorrection(exposedWalls) + H_floor;

  // ─── Ventilație / Infiltrații ───
  const n50 = parseFloat(building.n50) || 4.0;
  const n_inf = 0.07 * n50; // EN 12831-1 Ec. 9
  const volume = area * h;
  const H_V = 0.34 * n_inf * volume; // W/K (ρcp·aer = 0.34 Wh/(m³·K))

  // ─── Sarcina totală ───
  const deltaT = tInt - tExt;
  const phi_T = H_T * deltaT; // W — transmisie
  const phi_V = H_V * deltaT; // W — ventilație
  const phi_RH = area * 10;   // W — reîncălzire după pauză noapte (10 W/m²)
  const phi_int_gain = area * (Q_INT_GAIN[room.type] || 2); // câștiguri interne
  const phi_total = Math.max(0, phi_T + phi_V + phi_RH - phi_int_gain);

  // ─── Sarcina specifică [W/m²] ───
  const phi_specific = area > 0 ? phi_total / area : 0;

  // ─── Recomandare corp de încălzire ───
  const deltaT_radiator = 20; // ΔT radiator față de încăpere [K]
  const Q_radiator = phi_total; // W necesari
  const typeRec = phi_specific > 80
    ? "Convector sau fan-coil (sarcină mare)"
    : phi_specific > 50
      ? "Radiator panou + termostat"
      : "Pardoseală caldă recomandată";

  return {
    name: room.name || "Cameră",
    type: room.type,
    area, height: h, volume,
    tInt, tExt, deltaT,
    H_T: Math.round(H_T * 10) / 10,
    H_V: Math.round(H_V * 10) / 10,
    phi_T: Math.round(phi_T),
    phi_V: Math.round(phi_V),
    phi_RH: Math.round(phi_RH),
    phi_int_gain: Math.round(phi_int_gain),
    phi_total: Math.round(phi_total),
    phi_specific: Math.round(phi_specific * 10) / 10,
    Q_radiator: Math.round(Q_radiator),
    typeRec,
    wallArea: Math.round(wallArea * 10) / 10,
    winArea: Math.round(winArea * 10) / 10,
  };
}

/**
 * calcBuildingRooms — agregare sarcini toate camerele
 */
export function calcBuildingRooms(rooms, building, climate) {
  if (!rooms?.length || !climate) return null;
  const results = rooms.map(r => calcRoomLoad(r, building, climate));
  const phi_total_kW = results.reduce((s, r) => s + r.phi_total, 0) / 1000;
  const phi_specific_avg = results.reduce((s, r) => s + r.phi_specific * r.area, 0) /
    Math.max(1, results.reduce((s, r) => s + r.area, 0));
  return {
    rooms: results,
    phi_total_kW: Math.round(phi_total_kW * 100) / 100,
    phi_specific_avg: Math.round(phi_specific_avg * 10) / 10,
    totalArea: results.reduce((s, r) => s + r.area, 0),
    recommendation: phi_total_kW < 5
      ? "Clădire bine izolată — sistem radiant (pardoseală) recomandat"
      : phi_total_kW < 15
        ? "Sarcina medie — radiatoare panou cu termostat per cameră"
        : "Sarcina ridicată — verificați izolarea; fan-coil sau convector activ",
  };
}
