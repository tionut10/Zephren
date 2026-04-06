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

export function calcMonthlyISO13790(params) {
  var G_env = params.G_env, V = params.V, Au = params.Au, climate = params.climate;
  var theta_int = params.theta_int, gEls = params.glazingElements, sf = parseFloat(params.shadingFactor) || 0.90;
  var hrEta = params.hrEta || 0, category = params.category, n50 = parseFloat(params.n50) || 4.0;
  var structure = params.structure || "";
  if (!climate || !Au || !V) return null;
  var days = [31,28,31,30,31,30,31,31,30,31,30,31];
  var mNames = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  var H_tr = G_env, H_ve = 0.34 * 0.5 * V * (1 - hrEta);
  // H_inf: infiltrații din n50 cu factor protecție vânt e=0.07 (ISO 13789 §8.3)
  // Formula: H_inf = 0.34 * n_inf * V, unde n_inf = n50 * e_shield [h⁻¹]
  var H_inf = 0.34 * n50 * V * 0.07; // W/K — fără /3.6 (corectat: 0.34 include deja conversia ore→secunde)
  var Cm = Au * (THERMAL_MASS_CLASS[structure] || 165000); // Mc 001-2022 Tabel 2.20, implicit medie
  // H_total include infiltrații pentru calcul corect al constantei de timp τ
  var H_total = H_tr + H_ve + H_inf;
  var tau = H_total > 0 ? Cm / (H_total * 3600) : 50;
  var a_H = 1 + tau / 15;
  var qIntMap = {RI:4,RC:4,RA:4,BI:8,ED:6,SA:5,HC:4.5,CO:8,SP:5,AL:5};
  var phi_int = (qIntMap[category] || 4) * Au;
  var mFrac = [0.04,0.05,0.08,0.10,0.12,0.13,0.14,0.12,0.09,0.06,0.04,0.03];
  var orientDist = [{d:"N",f:0.10},{d:"E",f:0.25},{d:"S",f:0.40},{d:"V",f:0.25}];
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
          for (var oi = 0; oi < orientDist.length; oi++) Q_sol += aG*orientDist[oi].f*gV*(1-fr)*sf*(climate.solar[orientDist[oi].d]||200)*mFrac[i];
        } else {
          var k = ori === "Orizontal" ? "Oriz" : ori;
          Q_sol += aG*gV*(1-fr)*sf*(climate.solar[k]||390)*mFrac[i];
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
