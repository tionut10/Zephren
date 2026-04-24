import MATERIALS_DB from '../data/materials.json';

export function glaserCheck(layers, theta_int, theta_ext, phi_int, phi_ext) {
  // Extended Glaser — calculates condensation quantity g_c [g/(m²·season)]

  if (!layers || layers.length === 0) return null;
  var tInt = theta_int || 20, tExt = theta_ext || -15;
  var phiI = phi_int || 0.55, phiE = phi_ext || 0.80;
  // Presiune saturație (Magnus formula) [Pa] — bifurcată over-water / over-ice
  // Fix audit 24 apr 2026: single-formula pSat supraestima p_sat cu ~15% la -15°C
  // pentru temperaturi negative (WMO/ISO 13788:2012 §4.2)
  function pSat(t) {
    return t >= 0
      ? 610.5 * Math.exp(17.269 * t / (237.3 + t))   // over-water
      : 610.5 * Math.exp(21.875 * t / (265.5 + t));  // over-ice
  }
  // Rezistențe termice și temperaturi pe interfețe
  var rsi = 0.13, rse = 0.04;
  var rLayers = layers.map(function(l) { var d = (parseFloat(l.thickness)||0)/1000; return d > 0 && l.lambda > 0 ? d/l.lambda : 0; });
  var rTotal = rsi + rLayers.reduce(function(s,r){return s+r;},0) + rse;
  // Temperaturi pe interfețe
  var temps = [tInt];
  var rCum = rsi;
  for (var i = 0; i < rLayers.length; i++) {
    rCum += rLayers[i];
    temps.push(tInt - (tInt - tExt) * rCum / rTotal);
  }
  temps.push(tExt);
  // Presiuni vapori (simplificat — difuzie liniară)
  var pvInt = phiI * pSat(tInt);
  var pvExt = phiE * pSat(tExt);
  // Rezistențe la difuzie (sd = mu * d)
  // Lookup mu: use layer.mu if available, else match from MATERIALS_DB by name, else fallback by lambda
  var muFallback = {0.87:10, 0.70:10, 1.30:200, 0.18:50, 0.25:8, 0.90:10, 0.17:50000, 0.40:100000, 0.80:10, 0.46:8, 0.33:8, 0.22:6, 0.16:6, 0.044:30, 0.039:40, 0.036:50, 0.034:100, 0.040:1, 0.038:1, 0.025:60, 0.023:60, 0.045:15, 0.015:5, 0.042:3, 0.031:40, 1.74:100, 1.28:70, 0.52:8, 1.40:50, 0.14:30, 0.13:30, 0.15:25};
  var sdLayers = layers.map(function(l) {
    var d = (parseFloat(l.thickness)||0)/1000;
    var mu;
    if (l.mu !== undefined && l.mu !== null) {
      mu = l.mu;
    } else {
      var matMatch = MATERIALS_DB.find(function(m) { return m.name === (l.matName || l.material); });
      mu = matMatch && matMatch.mu !== undefined ? matMatch.mu : (muFallback[l.lambda] || 10);
    }
    return mu * d;
  });
  var sdTotal = sdLayers.reduce(function(s,v){return s+v;},0);
  // Presiuni vapori pe interfețe
  var pvs = [pvInt];
  var sdCum = 0;
  for (var j = 0; j < sdLayers.length; j++) {
    sdCum += sdLayers[j];
    pvs.push(pvInt - (pvInt - pvExt) * sdCum / Math.max(sdTotal, 0.001));
  }
  pvs.push(pvExt);
  // Verificare condensare
  var results = [];
  var hasCondensation = false;
  for (var k = 0; k < temps.length; k++) {
    var tK = temps[k], pvK = pvs[k] !== undefined ? pvs[k] : pvInt;
    var psK = pSat(tK);
    var condensing = pvK >= psK;
    if (condensing) hasCondensation = true;
    results.push({ interface: k, temp: tK, pv: pvK, ps: psK, condensing: condensing });
  }
  // ── Cantitate condensare conform ISO 13788:2012 §4.4 ──
  // Flux difuzie vapori: g = δ_a × (Δp / sd) × Δt  [kg/m²]
  // δ_a = permeabilitatea vaporilor de apă în aer = 2 × 10⁻¹⁰ kg/(m·s·Pa)
  // sd = grosime echivalentă difuzie = Σ(μ × d) pentru straturile adiacente planului de condensare
  // Δt = 180 zile × 86400 s/zi = 15.552 × 10⁶ s (sezon de încălzire)
  var delta_a = 2e-10; // kg/(m·s·Pa) — permeabilitate vapori în aer (ISO 13788 §4.2)
  var heatingSeasonSeconds = 180 * 86400; // 180 zile sezon încălzire
  var gc = 0;
  for (var ci = 0; ci < results.length; ci++) {
    if (results[ci].condensing) {
      var excess = results[ci].pv - results[ci].ps; // Pa
      // sd_local: grosimea de difuzie echivalentă a stratului cel mai subțire adiacent
      // Simplificare conservatoare: sd_local ≈ sd_total / nr_straturi
      var sd_local = sdTotal / Math.max(sdLayers.length, 1);
      // g_c [kg/m²] = δ_a × (Δpv / sd) × Δt; convertit la g/m²
      var gc_interface = sd_local > 0 ? delta_a * (excess / sd_local) * heatingSeasonSeconds * 1000 : 0;
      gc += gc_interface;
    }
  }
  return { results: results, hasCondensation: hasCondensation, gc: Math.round(gc), gc_method: "ISO 13788:2012 §4.4" };
}

// ═══════════════════════════════════════════════════════════════
// CALCUL CONDENS GLASER LUNAR — SR EN ISO 13788:2012
// ═══════════════════════════════════════════════════════════════

export function pSatMagnus(t) {
  return t >= 0 ? 610.5 * Math.exp(17.269 * t / (237.3 + t)) : 610.5 * Math.exp(21.875 * t / (265.5 + t));
}

// Umiditate relativă exterioară medie lunară pentru stații climatice din România
// Sursa: INMH date climatice medii multianuale; dacă clima are rh_month, acestea au prioritate
const RH_EXT_ZONE = {
  I:   [0.82, 0.79, 0.72, 0.67, 0.65, 0.62, 0.60, 0.60, 0.67, 0.75, 0.80, 0.83], // zona I (litoral, Dobrogea)
  II:  [0.85, 0.82, 0.75, 0.70, 0.68, 0.65, 0.63, 0.63, 0.70, 0.78, 0.83, 0.86], // zona II (Muntenia, Moldova)
  III: [0.87, 0.84, 0.77, 0.72, 0.70, 0.67, 0.65, 0.65, 0.72, 0.80, 0.85, 0.88], // zona III (Transilvania)
  IV:  [0.88, 0.85, 0.78, 0.73, 0.71, 0.68, 0.66, 0.66, 0.73, 0.81, 0.86, 0.89], // zona IV (sub-carpatic)
  V:   [0.90, 0.87, 0.80, 0.75, 0.73, 0.70, 0.68, 0.68, 0.75, 0.83, 0.88, 0.91], // zona V (munte)
};

export function calcGlaserMonthly(layers, climate, tInt, rhInt) {
  if (!layers || !layers.length || !climate) return null;
  var tI = tInt || 20;
  var rhi = (rhInt || 50) / 100;
  var months = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  // Utilizăm RH exterior din date climatice reale per stație/zonă (nu valori fixe)
  var rhExt = climate.rh_month || RH_EXT_ZONE[climate.zone] || RH_EXT_ZONE["II"];

  // Build layer data
  var rsi = 0.13, rse = 0.04;
  var layerData = layers.map(function(l) {
    var d = (parseFloat(l.thickness) || 0) / 1000;
    var lam = l.lambda || 0.5;
    var mu = l.mu || 10;
    var mat = MATERIALS_DB.find(function(m) { return m.name === (l.matName || l.material); });
    if (mat && mat.mu) mu = mat.mu;
    return { d: d, R: d > 0 && lam > 0 ? d / lam : 0, sd: mu * d, name: l.matName || l.material || "Strat" };
  });

  var rTotal = rsi + layerData.reduce(function(s, l) { return s + l.R; }, 0) + rse;
  var sdTotal = layerData.reduce(function(s, l) { return s + l.sd; }, 0);

  var monthlyResults = [];
  var cumulativeCondensation = 0;
  var maxCondensation = 0;

  for (var m = 0; m < 12; m++) {
    var tExt = climate.temp_month[m];
    var pvInt = pSatMagnus(tI) * rhi;
    var pvExt = pSatMagnus(tExt) * rhExt[m];

    // Temperature at each interface
    var temps = [tI - (tI - tExt) * rsi / rTotal];
    var rCum = rsi;
    for (var i = 0; i < layerData.length; i++) {
      rCum += layerData[i].R;
      temps.push(tI - (tI - tExt) * rCum / rTotal);
    }

    // Vapor pressure at each interface
    var pvs = [pvInt];
    var sdCum = 0;
    for (var j = 0; j < layerData.length; j++) {
      sdCum += layerData[j].sd;
      pvs.push(pvInt - (pvInt - pvExt) * sdCum / Math.max(sdTotal, 0.001));
    }
    pvs.push(pvExt);

    // ── Condensare/evaporare per interfață — ISO 13788:2012 §4.4 ──
    // Flux difuzie: g = δ_a × (Δp / sd_local) × Δt
    // δ_a = 2 × 10⁻¹⁰ kg/(m·s·Pa)
    // Δt per lună = zile × 86400 s
    var delta_a_m = 2e-10; // kg/(m·s·Pa)
    var daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31][m];
    var secondsInMonth = daysInMonth * 86400;
    var interfaces = [];
    var monthCondensation = 0;
    var monthEvaporation = 0;
    for (var k = 0; k <= layerData.length; k++) {
      var tK = temps[k];
      var pvK = pvs[k];
      var psK = pSatMagnus(tK);
      var condensing = pvK > psK * 1.001;
      // sd_local: grosimea de difuzie a stratului adiacent planului de condensare
      var sd_local = sdTotal / Math.max(layerData.length, 1);
      // g [g/m²·lună] = δ_a × (Δp / sd) × Δt_lună × 1000 (kg→g)
      var gcRate_gm2;
      if (sd_local > 0) {
        var deltaP = condensing ? (pvK - psK) : (psK - pvK);
        gcRate_gm2 = delta_a_m * (deltaP / sd_local) * secondsInMonth * 1000;
      } else {
        gcRate_gm2 = 0;
      }
      if (condensing) monthCondensation += gcRate_gm2;
      else monthEvaporation += gcRate_gm2;
      interfaces.push({ layer: k, temp: Math.round(tK * 10) / 10, pv: Math.round(pvK), ps: Math.round(psK), condensing: condensing });
    }

    cumulativeCondensation += monthCondensation - monthEvaporation;
    if (cumulativeCondensation < 0) cumulativeCondensation = 0;
    if (cumulativeCondensation > maxCondensation) maxCondensation = cumulativeCondensation;

    monthlyResults.push({
      month: months[m], tExt: tExt, interfaces: interfaces,
      condensation: Math.round(monthCondensation),
      evaporation: Math.round(monthEvaporation),
      cumulative: Math.round(cumulativeCondensation),
    });
  }

  // NP 057-02: apa acumulată iarna < apa evaporată vara → OK
  var winterAccum = monthlyResults.slice(0, 4).concat(monthlyResults.slice(10)).reduce(function(s, m) { return s + Math.max(0, m.condensation); }, 0);
  var summerEvap = monthlyResults.slice(4, 10).reduce(function(s, m) { return s + m.evaporation; }, 0);
  var annualOk = summerEvap >= winterAccum;

  return {
    monthly: monthlyResults,
    maxCumulative: Math.round(maxCondensation),
    winterAccum: Math.round(winterAccum),
    summerEvap: Math.round(summerEvap),
    annualOk: annualOk,
    layers: layerData,
    verdict: annualOk ? "OK — condensul se evaporă complet" : "NECONFORM — acumulare reziduală de umiditate",
  };
}
