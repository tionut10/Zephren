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

// Romania border SVG path — generated from real geographic coordinates
// Source: Natural Earth simplified border, ~55 points, Mercator projection
// viewBox calibration: lon [20.2..29.8] -> x [10..490], lat [43.5..48.5] -> y [370..10]
export const ROMANIA_BORDER_PATH = "M107,17 L145,39 L168,42 L200,50 L230,50 L253,46 L275,52 L300,30 L325,32 L340,37 L365,59 L378,60 L400,75 L410,104 L405,129 L410,147 L405,158 L413,176 L407,194 L405,219 L428,226 L435,244 L455,248 L470,251 L482,273 L453,291 L432,334 L430,352 L429,352 L400,334 L375,335 L355,330 L325,330 L305,335 L275,359 L250,357 L225,357 L200,350 L175,348 L150,345 L135,348 L125,330 L120,305 L105,304 L80,287 L70,276 L57,262 L50,240 L40,227 L38,208 L25,179 L20,165 L38,172 L55,168 L72,143 L85,132 L90,111 L100,89 L107,75 L107,46 L107,17 Z";
