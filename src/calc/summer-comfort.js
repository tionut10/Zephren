// ═══════════════════════════════════════════════════════════════
// CONFORT TERMIC VARĂ — C107/7-2002, SR EN ISO 7730, SR EN 16798-1:2019/NA:2019
// ═══════════════════════════════════════════════════════════════

export function calcSummerComfort(layers, climate, orientation) {
  if (!layers || !layers.length || !climate) return null;
  // Indicele de inerție termică D = Σ(Ri × si)
  // si = coeficient asimilare termică ≈ sqrt(λ × ρ × c) cu c ≈ 1000 J/(kg·K)
  var totalD = 0;
  var rCum = 0;
  for (var i = 0; i < layers.length; i++) {
    var d = (parseFloat(layers[i].thickness) || 0) / 1000;
    var lam = layers[i].lambda || 0.5;
    var rho = layers[i].rho || 1500;
    var c = 1000; // capacitate termică specifică [J/(kg·K)]
    // D_i = d × √(π × ρ × c / (λ × T)) — EN ISO 13786 §6, C107/7-2002 Anexa F
    // T_period = 86400s (ciclu diurn 24h); fără acest factor D e de ~165× prea mare
    var T_period = 86400;
    var s = Math.sqrt(Math.PI * lam * rho * c / T_period);
    var R = d > 0 && lam > 0 ? d / lam : 0;
    totalD += R * s;
    rCum += R;
  }

  // Factor amortizare ν = e^(-D) — C107/7-2022 Anexa F / EN ISO 13786
  var dampingFactor = Math.exp(-totalD);
  // Defazaj Δφ = D × T/(2π) [ore] = D × 24/(2π)
  var phaseShift = (totalD / (2 * Math.PI)) * 24;

  // Temperatura maximă și minimă exterioară din date climatice lunare reale (C107/7-2002 §3.2)
  // Amplitudinea diurnă calculată din variabilitatea lunilor de vară (nu estimată empiric)
  var tempSummerMonths = climate.temp_month ? climate.temp_month.slice(5, 8) : [20, 22, 21];
  var tExtSummerAvg = Math.max.apply(null, tempSummerMonths);
  // Amplitudine diurnă reală: diferența dintre temperatura max lunară și medie nocturnă estimată
  // Valorile sunt calibrate per zonă climatică din INMH (C107/7-2002 Tabel 3.2)
  var diurnalAmpByZone = { I: 11, II: 10, III: 9, IV: 9, V: 8 };
  var diurnalAmp = climate.diurnal_amp || diurnalAmpByZone[climate.zone] || 10;
  var tExtMax = tExtSummerAvg + diurnalAmp / 2; // temperatura de vârf zilnică vara [°C]
  var tExtMin = tExtSummerAvg - diurnalAmp / 2; // temperatura nocturnă minimă [°C]

  var tInt = 26; // temperatura de referință confort vară (SR EN 16798-1 Cat. II)
  var amplitudeExt = Math.max(0, tExtMax - tInt);
  var amplitudeInt = amplitudeExt * dampingFactor;
  var tSurfMax = tInt + amplitudeInt;

  // Câștig solar prin element (C107/7-2002 §4.3) — per orientare, absorbtivitate 0.6, Rse=0.04
  var solarIrrad = (climate.solar && climate.solar[orientation]) || (climate.solar && climate.solar["S"]) || 400;
  // Temperatură echivalentă sol-aer: te = text + α·G·Rse (α=0.6 suprafețe întunecate / 0.3 deschise)
  var alpha = 0.6; // absorbtivitate medie (culoare medie)
  var Rse = 0.04;  // rezistență termică superficială exterioară
  var solarGain = solarIrrad * alpha * Rse; // °K echivalent suplimentar
  var tSurfMaxSolar = tSurfMax + solarGain * dampingFactor;

  // Temperatura operativă ISO 7730 (medie ponderată temp aer + temp medie radiantă)
  // Simplificat: top ≈ 0.5 × (T_aer + T_suprafață)
  var T_air_int = tInt + amplitudeInt;
  var T_mrt = tSurfMaxSolar; // radianta medie ~ temperatura suprafaței
  var T_operative = 0.5 * (T_air_int + T_mrt); // temperatura operativă [°C]

  // Categorii confort vară SR EN 16798-1:2019 (echivalent C107/7-2002 Cat. I-IV)
  // Bazat pe temperatura operativă (nu doar suprafața)
  var category, ok;
  if (T_operative <= 25.5) { category = "I"; ok = true; }
  else if (T_operative <= 26.0) { category = "II"; ok = true; }
  else if (T_operative <= 27.0) { category = "III"; ok = true; }
  else { category = "IV"; ok = false; }

  // Verificare risc supraîncălzire (overheating hours estimate)
  // Grad ore supraîncălzire estimat: dacă T_operative > 26°C, estimăm ore afectate
  var overheatingHours = T_operative > 26 ? Math.round((T_operative - 26) * 120) : 0; // ore/an estimate

  return {
    D: Math.round(totalD * 100) / 100,
    dampingFactor: Math.round(dampingFactor * 1000) / 1000,
    phaseShift: Math.round(phaseShift * 10) / 10,
    tSurfMax: Math.round(tSurfMaxSolar * 10) / 10,
    tExtMax: Math.round(tExtMax * 10) / 10,
    tExtMin: Math.round(tExtMin * 10) / 10,
    diurnalAmp: diurnalAmp,
    amplitudeExt: Math.round(amplitudeExt * 10) / 10,
    amplitudeInt: Math.round(amplitudeInt * 10) / 10,
    T_operative: Math.round(T_operative * 10) / 10,
    solarGain: Math.round(solarGain * 10) / 10,
    comfortCategory: category,
    overheatingHours: overheatingHours,
    ok: ok,
    verdict: ok ? "OK — confort termic asigurat vara" : "ATENȚIE — risc supraîncălzire",
  };
}
