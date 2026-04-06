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

  // Temperatura maximă exterioară de calcul pentru confort vară (C107/7-2002 §3.2)
  // Valoarea de referință: media lunilor calde (iun-aug) + amplitudine diurnă zilnică
  // Amplitudinea diurnă tipică pentru România: 8-12°C (funcție de zonă)
  var tExtSummerAvg = Math.max.apply(null, climate.temp_month.slice(5, 8)); // max medie lunară vară
  var tExtWinterAvg = Math.min.apply(null, climate.temp_month.slice(0, 3));
  // Amplitudine diurnă estimată din variabilitatea climatică (mai mare în zone continentale)
  var climaticRange = tExtSummerAvg - tExtWinterAvg;
  var diurnalAmp = climaticRange > 40 ? 12 : climaticRange > 30 ? 10 : 8; // °C
  var tExtMax = tExtSummerAvg + diurnalAmp; // temperatura de vârf zilnică vara
  var tInt = 24; // temperatura medie interioară de referință (C107/7)
  var amplitudeExt = Math.max(0, tExtMax - tInt);
  var amplitudeInt = amplitudeExt * dampingFactor;
  var tSurfMax = tInt + amplitudeInt;

  // Câștig solar prin element (estimat din iradianța pe orientare × absorbție × rezistență termică ext.)
  var solarGain = (climate.solar[orientation] || climate.solar.S || 400) * 0.15; // kWh/(m²·an) estim. absorbit

  // Categorii confort vară SR EN 16798-1:2019 (echivalent C107/7-2002 Cat. I-IV)
  var category = tSurfMax <= 25 ? "I" : tSurfMax <= 26 ? "II" : tSurfMax <= 27 ? "III" : "IV";
  var ok = tSurfMax <= 27; // maxim Cat. III (acceptabil)

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
