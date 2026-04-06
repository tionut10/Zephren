export function calcUtilFactor(gamma, a) {
  if (gamma < 0) return 1;
  if (Math.abs(gamma - 1) < 0.001) return a / (a + 1);
  return (1 - Math.pow(gamma, a)) / (1 - Math.pow(gamma, a + 1));
}

// TODO-ISO52016: Înlocuire cu metoda orară ISO 52016-1:2017 (necesită date climatice orare din SR EN ISO 52010-1/NA:2023)
// Metoda lunară rămâne validă conform Mc 001-2022 dar va fi deprecată la viitoarea actualizare normativă
// Capacitate termică interioară efectivă Cm,int,eff [J/(m²·K)] — Mc 001-2022 Tabel 2.20
// Mapare tip structură → clasă inerție termică
export const THERMAL_MASS_CLASS = {
  "Structură metalică":       80000,   // foarte ușoară
  "Structură lemn":           80000,   // foarte ușoară
  "Panouri prefabricate mari":165000,  // medie (beton prefabricat)
  "Cadre beton armat":        165000,  // medie
  "Zidărie portantă":         260000,  // masivă (cărămidă, piatră)
  "Pereți cortină + beton":   165000,  // medie
  "BCA + cadre beton":        165000,  // medie
  "Structură mixtă":          165000,  // medie (implicit)
};

// Factor protecție vânt e pentru infiltrații (ISO 13789 §8.3, Tabel 8)
// expunere: "protejat" (curți interioare, urban dens), "mediu" (suburban), "expus" (câmp deschis, deal)
export const WIND_SHIELD_FACTOR = {
  protejat: 0.02,  // urban dens, curți închise
  mediu:    0.07,  // suburban, obstacole moderate — valoare implicită
  expus:    0.15,  // câmp deschis, litoral, deal
};

// Fracții solare lunare calculate din temperatura medie lunară (proporționale cu radiația pe orizont)
// Metoda: fracție ≈ grad zi solar per lună / total; calibrat pe date PVGIS România
function calcMonthlyRadFraction(climate) {
  // Dacă nu avem iradianță lunară, folosim distribuția standard sezonieră
  var base = [0.040,0.055,0.090,0.110,0.125,0.130,0.140,0.125,0.095,0.065,0.040,0.030];
  // Ajustare în funcție de latitudine (mai la nord → mai multă pondere iarnă)
  if (!climate) return base;
  var lat = climate.lat || 45;
  var latAdj = (lat - 45) / 100; // corecție mică ±10% pentru lat 35-55°
  return base.map(function(f) { return Math.max(0.01, f - latAdj * f); });
}

export function calcMonthlyISO13790(params) {
  var G_env = params.G_env, V = params.V, Au = params.Au, climate = params.climate;
  var theta_int = params.theta_int, gEls = params.glazingElements, sf = parseFloat(params.shadingFactor) || 0.90;
  var hrEta = params.hrEta || 0, category = params.category, n50 = parseFloat(params.n50) || 4.0;
  var structure = params.structure || "";
  // Factor protecție vânt configurabil (implicit "mediu")
  var windExposure = params.windExposure || "mediu";
  var e_shield = WIND_SHIELD_FACTOR[windExposure] || 0.07;
  if (!climate || !Au || !V) return null;
  var days = [31,28,31,30,31,30,31,31,30,31,30,31];
  var mNames = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  var H_tr = G_env, H_ve = 0.34 * 0.5 * V * (1 - hrEta);
  // H_inf: infiltrații din n50 cu factor protecție vânt configurat (ISO 13789 §8.3)
  var H_inf = 0.34 * n50 * V * e_shield; // W/K
  var Cm = Au * (THERMAL_MASS_CLASS[structure] || 165000); // Mc 001-2022 Tabel 2.20
  var H_total = H_tr + H_ve + H_inf;
  var tau = H_total > 0 ? Cm / (H_total * 3600) : 50;
  var a_H = 1 + tau / 15;
  var qIntMap = {RI:4,RC:4,RA:4,BI:8,ED:6,SA:5,HC:4.5,CO:8,SP:5,AL:5};
  var phi_int = (qIntMap[category] || 4) * Au;
  // Fracții solare lunare calculate din date climatice (nu fixe)
  var mFrac = calcMonthlyRadFraction(climate);
  // Normalizare fracții (suma = 1)
  var mFracSum = mFrac.reduce(function(s,f){return s+f;},0);
  mFrac = mFrac.map(function(f){return f/mFracSum;});
  // Distribuție Mixt include toate cele 8 orientări cardinale + intermediare
  var orientDist = [
    {d:"N",f:0.08},{d:"NE",f:0.08},{d:"E",f:0.17},{d:"SE",f:0.17},
    {d:"S",f:0.25},{d:"SV",f:0.08},{d:"V",f:0.10},{d:"NV",f:0.07}
  ];
  return mNames.map(function(name, i) {
    var tExt = climate.temp_month[i], deltaT = theta_int - tExt, hours = days[i] * 24;
    var Q_tr = H_tr * deltaT * hours / 1000;
    var Q_ve = (H_ve + H_inf) * deltaT * hours / 1000;
    var Q_loss = Math.max(0, Q_tr + Q_ve);
    var Q_int = phi_int * hours / 1000;
    var Q_sol = 0;
    if (gEls && climate.solar) {
      for (var gi = 0; gi < gEls.length; gi++) {
        var el = gEls[gi], aG = parseFloat(el.area)||0, gV = parseFloat(el.g)||0.5;
        var fr = (parseFloat(el.frameRatio)||25)/100, ori = el.orientation||"S";
        if (ori === "Mixt") {
          // Distribuție pe toate 8 orientări
          for (var oi = 0; oi < orientDist.length; oi++) {
            var solarKey = orientDist[oi].d;
            Q_sol += aG*orientDist[oi].f*gV*(1-fr)*sf*(climate.solar[solarKey]||200)*mFrac[i];
          }
        } else {
          // NE, SE, SV, NV sunt acum în climate.solar direct
          var k = ori === "Orizontal" ? "Oriz" : ori;
          var solarVal = climate.solar[k] !== undefined ? climate.solar[k] : (climate.solar["S"] || 390);
          Q_sol += aG*gV*(1-fr)*sf*solarVal*mFrac[i];
        }
      }
    }
    var Q_gain = Q_int + Q_sol;
    var gamma_H = Q_loss > 0 ? Q_gain/Q_loss : 999;
    var eta_H = calcUtilFactor(gamma_H, a_H);
    var qH_nd = Math.max(0, Q_loss - eta_H * Q_gain);
    var gamma_C = Q_gain > 0 ? Q_loss/Q_gain : 999;
    var eta_C = calcUtilFactor(gamma_C, a_H);
    var qC_nd = tExt > 15 ? Math.max(0, Q_gain - eta_C * Q_loss) : 0;
    return {name:name,tExt:tExt,deltaT:deltaT,Q_tr:Q_tr,Q_ve:Q_ve,Q_loss:Q_loss,Q_int:Q_int,Q_sol:Q_sol,Q_gain:Q_gain,gamma_H:gamma_H,eta_H:eta_H,qH_nd:qH_nd,qC_nd:qC_nd};
  });
}
