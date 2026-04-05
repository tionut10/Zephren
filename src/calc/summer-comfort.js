// ═══════════════════════════════════════════════════════════════
// CONFORT TERMIC VARĂ — C107/7-2002, SR EN ISO 7730
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
    var s = Math.sqrt(lam * rho * c); // coef. asimilare termică
    var R = d > 0 && lam > 0 ? d / lam : 0;
    totalD += R * s;
    rCum += R;
  }

  // Factor amortizare ν = e^(-D/2) — aproximare C107/7-2002 Anexa F
  // D = totalD = Σ(d_i) unde d_i = R_i × s_i (rezistență × coef. stocaj termic)
  // Factorul /2 corespunde perioadei de 24h cu ω = 2π/T, T = 24h
  var dampingFactor = Math.exp(-totalD / 2);
  // Defazaj Δφ ≈ D / (2π) × 24 [ore]
  var phaseShift = (totalD / (2 * Math.PI)) * 24;

  // Temperatura maximă pe suprafața interioară
  var tExtMax = Math.max.apply(null, climate.temp_month.slice(5, 8)) + 12; // temp max zilnică vara
  var tInt = 24; // temperatura medie interioară
  var amplitudeExt = (tExtMax - tInt);
  var amplitudeInt = amplitudeExt * dampingFactor;
  var tSurfMax = tInt + amplitudeInt;

  // Sarcină solară prin orientare
  var solarGain = (climate.solar[orientation] || climate.solar.S || 400) * 0.15; // factor transmisie estimat

  // Categorii confort SR EN 16798-1
  var category = tSurfMax <= 25 ? "I" : tSurfMax <= 26 ? "II" : tSurfMax <= 27 ? "III" : "IV";
  var ok = tSurfMax <= 27; // maxim cat. III

  return {
    D: Math.round(totalD * 100) / 100,
    dampingFactor: Math.round(dampingFactor * 1000) / 1000,
    phaseShift: Math.round(phaseShift * 10) / 10,
    tSurfMax: Math.round(tSurfMax * 10) / 10,
    tExtMax: Math.round(tExtMax * 10) / 10,
    amplitudeExt: Math.round(amplitudeExt * 10) / 10,
    amplitudeInt: Math.round(amplitudeInt * 10) / 10,
    solarGain: Math.round(solarGain),
    comfortCategory: category,
    ok: ok,
    verdict: ok ? "OK — confort termic asigurat vara" : "ATENȚIE — risc supraîncălzire",
  };
}
