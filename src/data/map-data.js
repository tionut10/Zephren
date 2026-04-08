// NOTE: ROMANIA_MAP_POINTS depends on CLIMATE_DB and geoToSvg() from the main module.
// It is built dynamically at runtime. This file exports the builder function and the static border path.

export function buildRomaniaMapPoints(CLIMATE_DB, geoToSvg) {
  const ROMANIA_MAP_POINTS = {};
  var lonMap = {
    "București":26.10,"Cluj-Napoca":23.60,"Constanța":28.65,"Iași":27.58,"Timișoara":21.23,
    "Brașov":25.60,"Sibiu":24.15,"Oradea":21.92,"Craiova":23.80,"Bacău":26.92,
    "Suceava":26.25,"Miercurea Ciuc":25.80,"Galați":28.05,"Pitești":24.87,"Ploiești":26.03,
    "Brăila":27.97,"Arad":21.31,"Baia Mare":23.58,"Târgu Mureș":24.55,"Deva":22.90,
    "Bistrița":24.50,"Satu Mare":22.88,"Buzău":26.83,"Focșani":27.18,"Alba Iulia":23.57,
    "Drobeta-Turnu Severin":22.66,"Reșița":21.88,"Slobozia":26.63,"Vaslui":27.73,
    "Tulcea":28.80,"Predeal":25.58,"Câmpulung":25.04,"Făgăraș":24.97,
    "Sfântu Gheorghe":25.79,"Toplița":25.35,"Zalău":23.06,"Piatra Neamț":26.37,
    "Roman":26.92,"Botoșani":26.67,"Mediaș":24.35,"Petroșani":23.37,"Turda":23.78,
    "Dorohoi":26.40,"Câmpulung Moldovenesc":25.55,"Sighetu Marmației":23.89,
    "Reghin":24.71,"Odorheiu Secuiesc":25.30,"Bușteni":25.54,"Sinaia":25.55,
    "Mangalia":28.58,"Hunedoara":22.90,"Lugoj":21.90,"Campina":25.73,
    "Râmnicu Vâlcea":24.37,"Caracal":24.35,"Tecuci":27.43,"Adjud":27.18,
    "Târgoviște":25.46,"Slatina":24.36,"Alexandria":25.33,"Giurgiu":25.97,
    "Călărași":27.00,
  };
  CLIMATE_DB.forEach(function(c) {
    var lon = lonMap[c.name];
    if (lon && c.lat) ROMANIA_MAP_POINTS[c.name] = geoToSvg(c.lat, lon);
  });
  return ROMANIA_MAP_POINTS;
}

// Romania border SVG path — traced from real geographic coordinates
// ~64 points: Northern (Ukraine), Eastern (Prut/Moldova), SE (Delta + Black Sea),
// Southern (Danube/Bulgaria), SW (Iron Gate/Serbia), Western (Hungary)
// viewBox calibration: lon [20.2..29.8] -> x [10..490], lat [43.5..48.5] -> y [370..10]
// x = 10 + (lon - 20.2) * 50  |  y = 370 - (lat - 43.5) * 72
export const ROMANIA_BORDER_PATH =
  // N border (Ukraine): Halmeu → Sighetu M. → Borșa → Cârlibaba → Siret → Stânca
  "M154,48 L194,51 L205,52 L228,62 L247,69 L257,66 L269,61 L273,51 L301,49 L326,48 L333,49 L353,48 L369,50 " +
  // E border (Prut/Moldova): Stânca → Iași → Galați
  "L358,59 L362,65 L369,77 L370,84 L384,107 L394,119 L402,137 L403,156 L403,167 L403,193 L403,210 L402,229 " +
  // SE: Delta Dunării (brațul Chilia) + Sulina + Sf. Gheorghe
  "L428,237 L463,233 L468,244 L489,230 L483,251 L480,269 " +
  // Litoralul Mării Negre: Gura Portiței → Constanța → Mangalia → Vama Veche
  "L454,284 L439,308 L432,321 L432,338 L429,347 L429,351 " +
  // S border (Dunăre/Bulgaria): Ostrov → Giurgiu → Zimnicea → Calafat → Drobeta
  "L409,346 L364,327 L332,328 L299,341 L268,359 L244,352 L225,350 L197,348 L147,336 L136,325 L133,289 " +
  // SW: Cazanele Mari / Clisura Dunării (Serbia) → Baziaș
  "L119,282 L105,286 L98,288 L86,285 " +
  // V border (Serbia → Ungaria): Baziaș → Timișoara → Oradea → Satu Mare → Halmeu
  "L82,281 L81,275 L86,258 L94,241 L63,242 L55,242 L46,226 L36,205 L38,178 L66,164 L82,131 L96,106 L107,80 L144,64 L154,48 Z";
