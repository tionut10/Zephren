export const TYPICAL_BUILDINGS_EXTRA = [
  { id:"GARS_P_60", label:"Garsonieră bloc P+4 (anii '60-'70)", cat:"RA",
    building:{ category:"RA", structure:"Panouri prefabricate mari", floors:"P+4", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"16.5", heightFloor:"2.75" },
    opaque:[
      { name:"Perete ext. GVP 25cm", type:"PE", area:"28", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă cu goluri (GVP)", thickness:"250", lambda:0.46, rho:1200 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC dublu", u:"1.60", g:"0.65", area:"4", orientation:"Mixt", frameRatio:"25" }],
    bridges:[{ name:"Glaf ferestre", psi:"0.08", length:"6" }],
  },
  { id:"DUPLEX_2010", label:"Duplex P+1, post-2010", cat:"RI",
    building:{ category:"RI", structure:"Cadre beton armat", floors:"P+1", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"6.80", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. BCA 30cm + EPS 10cm", type:"PE", area:"140", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș șarpantă + vată 20cm", type:"PP", area:"80", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"OSB", thickness:"18", lambda:0.13, rho:600 },
      ]},
      { name:"Placă pe sol", type:"PL", area:"75", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC tripan", u:"1.10", g:"0.55", area:"25", orientation:"Mixt", frameRatio:"22" }],
    bridges:[{ name:"PE — Planșeu intermediar", psi:"0.06", length:"36" }, { name:"Glaf ferestre", psi:"0.05", length:"50" }],
  },
  { id:"HALA_IND", label:"Hală industrială metalică", cat:"AL",
    building:{ category:"AL", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"0", heightBuilding:"8.00", heightFloor:"8.00" },
    opaque:[
      { name:"Pereți panouri sandwich 8cm", type:"PE", area:"600", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"80", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Acoperiș panouri sandwich 10cm", type:"PT", area:"800", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Placă beton pe sol", type:"PL", area:"800", layers:[
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Luminatoare policarbonat", u:"2.50", g:"0.60", area:"80", orientation:"Oriz", frameRatio:"15" }],
    bridges:[{ name:"Soclu hală", psi:"0.20", length:"120" }],
  },
  { id:"SCOALA_70", label:"Școală P+2 (anii '70)", cat:"ED",
    building:{ category:"ED", structure:"Cadre beton armat", floors:"P+2", basement:true, attic:false, units:"1", stairs:"2", heightBuilding:"11.50", heightFloor:"3.50" },
    opaque:[
      { name:"Pereți ext. cărămidă 38cm", type:"PE", area:"900", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă", type:"PT", area:"450", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 60", thickness:"30", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre aluminiu dublu", u:"2.50", g:"0.65", area:"250", orientation:"Mixt", frameRatio:"30" }],
    bridges:[{ name:"PE — Planșee ×3", psi:"0.10", length:"240" }, { name:"Stâlpi beton", psi:"0.15", length:"80" }],
  },
  { id:"SPITAL_80", label:"Spital P+4 (anii '80)", cat:"SA",
    building:{ category:"SA", structure:"Cadre beton armat", floors:"P+4", basement:true, attic:false, units:"1", stairs:"3", heightBuilding:"18.50", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți ext. BCA 30cm", type:"PE", area:"1800", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă", type:"PT", area:"600", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 60", thickness:"50", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC dublu", u:"1.80", g:"0.65", area:"450", orientation:"Mixt", frameRatio:"28" }],
    bridges:[{ name:"PE — Planșee", psi:"0.10", length:"400" }, { name:"Balcoane", psi:"0.20", length:"60" }],
  },
];

export const TYPICAL_BUILDINGS = [
  { id:"BLOC_P4_70", label:"Bloc P+4, anii '70 (panouri BCA)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+4", basement:true, attic:false, units:"40", stairs:"2", heightBuilding:"16.5", heightFloor:"2.75" },
    opaque:[
      { name:"Pereți ext. panouri BCA 30cm", type:"PE", area:"1200", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă necirculabilă", type:"PT", area:"350", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 60", thickness:"50", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"350", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC dublu", u:"1.60", g:"0.65", area:"280", orientation:"Mixt", frameRatio:"25" }],
    bridges:[
      { name:"PE — Planșeu intermediar ×5", psi:"0.10", length:"200" },
      { name:"PE — Terasă", psi:"0.15", length:"76" },
      { name:"Glaf ferestre", psi:"0.08", length:"420" },
      { name:"Stâlpi beton", psi:"0.15", length:"120" },
    ],
  },
  { id:"CASA_INTER", label:"Casă interbelică (zidărie 50cm)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1", basement:true, attic:true, units:"1", stairs:"1", heightBuilding:"7.5", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți ext. cărămidă plină 50cm", type:"PE", area:"180", layers:[
        { material:"Tencuială var-ciment", thickness:"30", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"500", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"30", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu lemn sub pod", type:"PP", area:"95", layers:[
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
        { material:"Lemn moale (brad/molid)", thickness:"200", lambda:0.14, rho:500 },
        { material:"Strat de aer neventilat (5cm)", thickness:"50", lambda:0.18, rho:1.2 },
      ]},
      { name:"Planșeu beton peste subsol", type:"PB", area:"95", layers:[
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
        { material:"Beton simplu", thickness:"200", lambda:1.28, rho:2200 },
      ]},
    ],
    glazing:[{ name:"Ferestre lemn simplu vitraj", u:"3.50", g:"0.85", area:"22", orientation:"Mixt", frameRatio:"35" }],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"40" },
      { name:"PE — Soclu/fundație", psi:"0.25", length:"40" },
      { name:"Cornișă acoperiș", psi:"0.10", length:"40" },
      { name:"Glaf ferestre lemn", psi:"0.08", length:"55" },
    ],
  },
  { id:"VILA_P1_2000", label:"Vilă P+1, post-2000 (GVP + EPS)", cat:"RI",
    building:{ category:"RI", structure:"Cadre beton armat", floors:"P+1", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"6.50", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. GVP 25cm + EPS 10cm", type:"PE", area:"160", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Cărămidă cu goluri (GVP)", thickness:"250", lambda:0.46, rho:1200 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș înclinat (vată 20cm)", type:"PP", area:"100", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"OSB", thickness:"18", lambda:0.13, rho:600 },
      ]},
      { name:"Placă pe sol", type:"PL", area:"85", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"50", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC Low-E", u:"1.10", g:"0.50", area:"30", orientation:"Mixt", frameRatio:"25" }],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"36" },
      { name:"Cornișă acoperiș", psi:"0.10", length:"36" },
      { name:"Glaf ferestre — izolat", psi:"0.04", length:"48" },
      { name:"Stâlpi beton", psi:"0.15", length:"30" },
    ],
  },
  { id:"BLOC_P10_80", label:"Bloc P+10, anii '80 (panouri prefab)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+10", basement:true, attic:false, units:"120", stairs:"4", heightBuilding:"33", heightFloor:"2.75" },
    opaque:[
      { name:"Panouri sandwich GBN 60cm", type:"PE", area:"3200", layers:[
        { material:"Beton armat", thickness:"60", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 60", thickness:"60", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
      ]},
      { name:"Terasă inversată", type:"PT", area:"420", layers:[
        { material:"Pietriș", thickness:"50", lambda:0.70, rho:1700 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC termopan", u:"1.60", g:"0.65", area:"950", orientation:"Mixt", frameRatio:"25" }],
    bridges:[
      { name:"PE — Planșee ×11", psi:"0.10", length:"880" },
      { name:"PE — Terasă", psi:"0.15", length:"84" },
      { name:"Consolă balcon beton ×80", psi:"0.70", length:"320" },
      { name:"Glaf ferestre", psi:"0.08", length:"1100" },
    ],
  },
  { id:"BIROURI_2010", label:"Clădire birouri post-2010", cat:"BI",
    building:{ category:"BI", structure:"Cadre beton armat", floors:"P+3", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"14", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți cortină + izolație", type:"PE", area:"800", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă", type:"PT", area:"400", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"100", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Perete cortină tripan", u:"0.90", g:"0.45", area:"600", orientation:"Mixt", frameRatio:"15" }],
    bridges:[
      { name:"PE — Planșee ×4", psi:"0.10", length:"240" },
      { name:"Glaf ferestre", psi:"0.04", length:"380" },
    ],
  },

  // ===============================================================
  // DEMO-URI NOI — diverse categorii, clase energetice, nZEB
  // ===============================================================

  // ── Clasa E-F: Apartament nerenovat, anii '80, București ──
  { id:"APT_NERENOVAT_80", label:"Apt. 2 cam nerenovat '80 (clasa E-F)", cat:"RA",
    building:{ category:"RA", structure:"Panouri prefabricate mari", floors:"P+8", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"27", heightFloor:"2.75",
      yearBuilt:"1982", address:"Bd. Timișoara nr. 50, Bl. C3, Sc. 2, Et. 4, Ap. 18", city:"București", county:"București", postalCode:"061344", locality:"București" },
    opaque:[
      { name:"Pereți ext. GBN 30cm fără izolație", type:"PE", area:"42", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Beton armat", thickness:"60", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 60", thickness:"40", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu peste subsol neîncălzit", type:"PB", area:"52", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj vechi", u:"2.80", g:"0.75", area:"8.5", orientation:"S", frameRatio:"30" },
      { name:"Ferestre lemn dublu vitraj N", u:"2.80", g:"0.75", area:"3.2", orientation:"N", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"14" },
      { name:"Glaf ferestre vechi", psi:"0.08", length:"18" },
      { name:"Consolă balcon beton", psi:"0.70", length:"3.5" },
    ],
  },

  // ── Clasa A nZEB: Casă pasivă nouă 2024, Cluj ──
  { id:"CASA_PASIVA_2024", label:"Casă pasivă nouă 2024 (clasa A, nZEB)", cat:"RI",
    building:{ category:"RI", structure:"Cadre lemn (CLT/timberframe)", floors:"P+1", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"6.20", heightFloor:"2.80",
      yearBuilt:"2024", yearRenov:"", address:"Str. Fânațelor nr. 12A", city:"Cluj-Napoca", county:"Cluj", postalCode:"400608", locality:"Cluj-Napoca", n50:"0.6" },
    opaque:[
      { name:"Pereți ext. CLT + vată minerală 25cm", type:"PE", area:"145", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"250", lambda:0.035, rho:80 },
        { material:"OSB", thickness:"15", lambda:0.13, rho:600 },
        { material:"Lemn moale (brad/molid)", thickness:"100", lambda:0.14, rho:500 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Acoperiș plat verde (30cm vată)", type:"PT", area:"75", layers:[
        { material:"Substrat vegetal", thickness:"80", lambda:1.00, rho:1500 },
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.032, rho:35 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.035, rho:80 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol izolată 20cm XPS", type:"PL", area:"75", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"65", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.032, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E argon Sud", u:"0.70", g:"0.42", area:"18", orientation:"S", frameRatio:"20" },
      { name:"Tripan Low-E argon Est/Vest", u:"0.70", g:"0.42", area:"8", orientation:"E", frameRatio:"20" },
      { name:"Tripan Low-E argon Nord (mic)", u:"0.70", g:"0.42", area:"4", orientation:"N", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Placă pe sol (izolat perimetral)", psi:"0.08", length:"34" },
      { name:"PE — Acoperiș (izolat continuu)", psi:"0.06", length:"34" },
      { name:"Glaf ferestre montaj RAL", psi:"0.02", length:"52" },
      { name:"Colț exterior", psi:"0.05", length:"25" },
    ],
  },

  // ── Clasa C-D: Grădiniță (învățământ), anii '90, Iași ──
  { id:"GRADINITA_90", label:"Grădiniță anii '90 Iași (clasa C-D)", cat:"ED",
    building:{ category:"ED", structure:"Zidărie portantă", floors:"P", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"4.50", heightFloor:"3.50",
      yearBuilt:"1993", address:"Str. Profesor Ion Creangă nr. 8", city:"Iași", county:"Iași", postalCode:"700100", locality:"Iași" },
    opaque:[
      { name:"Pereți ext. BCA 30cm + EPS 5cm", type:"PE", area:"260", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 80", thickness:"50", lambda:0.040, rho:20 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod neîncălzit (vată 10cm)", type:"PP", area:"420", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol", type:"PL", area:"420", layers:[
        { material:"Linoleum", thickness:"5", lambda:0.17, rho:1200 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton simplu", thickness:"150", lambda:1.28, rho:2200 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC dublu vitraj", u:"1.40", g:"0.60", area:"85", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Soclu/fundație", psi:"0.20", length:"84" },
      { name:"PE — Cornișă acoperiș", psi:"0.10", length:"84" },
      { name:"Glaf ferestre", psi:"0.08", length:"110" },
    ],
  },

  // ── Clasa B: Hotel boutique renovat, Sibiu ──
  { id:"HOTEL_SIBIU", label:"Hotel boutique renovat Sibiu (clasa B)", cat:"HC",
    building:{ category:"HC", structure:"Zidărie portantă", floors:"P+2", basement:true, attic:true, units:"18", stairs:"1", heightBuilding:"12", heightFloor:"3.20",
      yearBuilt:"1920", yearRenov:"2021", address:"Str. Mitropoliei nr. 5", city:"Sibiu", county:"Sibiu", postalCode:"550179", locality:"Sibiu" },
    opaque:[
      { name:"Pereți ext. cărămidă 60cm + vată 12cm", type:"PE", area:"480", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Cărămidă plină", thickness:"600", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod (vată 20cm)", type:"PP", area:"180", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Lemn moale (brad/molid)", thickness:"200", lambda:0.14, rho:500 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"180", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"80", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn tripan (reabilitate)", u:"1.10", g:"0.50", area:"95", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșee ×3", psi:"0.10", length:"120" },
      { name:"PE — Soclu izolat", psi:"0.12", length:"56" },
      { name:"Glaf ferestre", psi:"0.04", length:"125" },
      { name:"PE — Cornișă", psi:"0.10", length:"56" },
    ],
  },

  // ── Clasa A-B nZEB: Supermarket nou 2025, Timișoara ──
  { id:"SUPERMARKET_2025", label:"Supermarket nou 2025 Timișoara (clasa A-B, nZEB)", cat:"CO",
    building:{ category:"CO", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"6.00", heightFloor:"5.50",
      yearBuilt:"2025", address:"Calea Aradului nr. 95", city:"Timișoara", county:"Timiș", postalCode:"300088", locality:"Timișoara" },
    opaque:[
      { name:"Panouri sandwich 15cm PU", type:"PE", area:"650", layers:[
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
        { material:"Spumă poliuretanică (PUR/PIR)", thickness:"150", lambda:0.024, rho:40 },
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
      ]},
      { name:"Acoperiș sandwich 20cm PU", type:"PT", area:"1200", layers:[
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
        { material:"Spumă poliuretanică (PUR/PIR)", thickness:"200", lambda:0.024, rho:40 },
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
      ]},
      { name:"Placă pe sol izolată 15cm XPS", type:"PL", area:"1200", layers:[
        { material:"Beton lustruit", thickness:"20", lambda:1.28, rho:2200 },
        { material:"Șapă ciment", thickness:"80", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"150", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Vitrină dublu vitraj selectiv", u:"1.10", g:"0.35", area:"120", orientation:"S", frameRatio:"10" },
      { name:"Uși automate", u:"2.00", g:"0.60", area:"15", orientation:"S", frameRatio:"40" },
    ],
    bridges:[
      { name:"PE — Soclu", psi:"0.15", length:"140" },
      { name:"Joncțiune perete-acoperiș", psi:"0.10", length:"140" },
      { name:"Glaf vitrine", psi:"0.04", length:"65" },
    ],
  },

  // ── Clasa D-E: Dispensar sătesc, Vaslui ──
  { id:"DISPENSAR_VASLUI", label:"Dispensar sătesc '70 Vaslui (clasa D-E)", cat:"SA",
    building:{ category:"SA", structure:"Zidărie portantă", floors:"P", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"4.00", heightFloor:"3.20",
      yearBuilt:"1975", address:"Str. Principală nr. 45", city:"Vaslui", county:"Vaslui", postalCode:"730008", locality:"Vaslui" },
    opaque:[
      { name:"Pereți ext. cărămidă 38cm fără izolație", type:"PE", area:"155", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod (fără izolație)", type:"PP", area:"220", layers:[
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol (fără izolație)", type:"PL", area:"220", layers:[
        { material:"Linoleum", thickness:"5", lambda:0.17, rho:1200 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton simplu", thickness:"150", lambda:1.28, rho:2200 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj vechi", u:"2.80", g:"0.75", area:"32", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Soclu/fundație", psi:"0.25", length:"60" },
      { name:"PE — Cornișă acoperiș", psi:"0.10", length:"60" },
      { name:"Glaf ferestre", psi:"0.08", length:"48" },
    ],
  },

  // ── Clasa B-C: Sală sport școală, Brașov ──
  { id:"SALA_SPORT_BV", label:"Sală sport școală Brașov (clasa B-C)", cat:"SP",
    building:{ category:"SP", structure:"Cadre beton armat", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"8.00", heightFloor:"7.50",
      yearBuilt:"2018", address:"Str. Sportivilor nr. 2", city:"Brașov", county:"Brașov", postalCode:"500200", locality:"Brașov" },
    opaque:[
      { name:"Pereți ext. BCA 30cm + vată 15cm", type:"PE", area:"320", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"150", lambda:0.040, rho:100 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș metalic izolat (vată 20cm)", type:"PT", area:"800", layers:[
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Barieră de vapori", thickness:"0.5", lambda:0.40, rho:900 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Placă pe sol izolată", type:"PL", area:"800", layers:[
        { material:"Parchet sport", thickness:"20", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"80", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"100", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre aluminiu dublu vitraj", u:"1.40", g:"0.55", area:"65", orientation:"Mixt", frameRatio:"20" },
    ],
    bridges:[
      { name:"PE — Soclu", psi:"0.15", length:"120" },
      { name:"PE — Joncțiune acoperiș", psi:"0.10", length:"120" },
      { name:"Glaf ferestre", psi:"0.06", length:"70" },
    ],
  },
];
