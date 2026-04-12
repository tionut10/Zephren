export const TYPICAL_BUILDINGS_EXTRA = [];

export const TYPICAL_BUILDINGS = [

  // ═══════════════════════════════════════════════════════════════
  //  REZIDENȚIAL INDIVIDUAL (RI)
  // ═══════════════════════════════════════════════════════════════

  // 1. Casă P, anii '60-'70, sat — cărămidă plină 50cm, fără izolație
  { id:"CASA_SAT_60", label:"Casă P sat, anii '60-'70 (cărămidă 50cm, neizolată)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"3.50", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. cărămidă plină 50cm", type:"PE", area:"130", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"500", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu lemn sub pod (fără izolație)", type:"PP", area:"95", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"30", lambda:0.14, rho:500 },
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
      ]},
      { name:"Placă pe sol (fără izolație)", type:"PL", area:"95", layers:[
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"100", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj", u:"2.80", g:"0.75", area:"12", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Soclu/fundație", psi:"0.25", length:"40" },
      { name:"PE — Cornișă acoperiș", psi:"0.10", length:"40" },
      { name:"Glaf ferestre lemn", psi:"0.08", length:"24" },
    ],
  },

  // 2. Casă P+1, anii '90 — GVP 25cm + BCA, izolație parțială sau fără
  { id:"CASA_P1_90", label:"Casă P+1, anii '90 (GVP 25cm, fără izolație)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"6.50", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. GVP 25cm", type:"PE", area:"165", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă cu goluri (GVP)", thickness:"250", lambda:0.46, rho:1200 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod (vată 5cm)", type:"PP", area:"90", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"50", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol", type:"PL", area:"90", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC dublu vitraj", u:"1.60", g:"0.65", area:"20", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"38" },
      { name:"PE — Soclu/fundație", psi:"0.20", length:"38" },
      { name:"PE — Cornișă acoperiș", psi:"0.10", length:"38" },
      { name:"Glaf ferestre", psi:"0.08", length:"32" },
    ],
  },

  // 3. Vilă P+1+M, post-2005 — BCA 30cm + EPS 10cm, bine izolată
  { id:"VILA_P1M_2005", label:"Vilă P+1+M, post-2005 (BCA 30cm + EPS 10cm)", cat:"RI",
    building:{ category:"RI", structure:"Cadre beton armat", floors:"P+1+M", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"8.50", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. BCA 30cm + EPS 10cm", type:"PE", area:"220", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș înclinat (vată 20cm)", type:"PP", area:"100", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"OSB", thickness:"18", lambda:0.13, rho:600 },
      ]},
      { name:"Placă pe sol izolată", type:"PL", area:"90", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC tripan Low-E", u:"1.10", g:"0.50", area:"32", orientation:"Mixt", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.06", length:"38" },
      { name:"PE — Cornișă acoperiș", psi:"0.08", length:"38" },
      { name:"Glaf ferestre", psi:"0.04", length:"52" },
      { name:"Stâlpi beton", psi:"0.15", length:"28" },
    ],
  },

  // 4. Casă pasivă P+1, 2024 — Porotherm 44 T + vată 20cm, nZEB
  { id:"CASA_PASIVA_2024", label:"Casă pasivă P+1, 2024 (Porotherm 44T + vată 20cm, nZEB)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"6.20", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. Porotherm 44T + vată 20cm", type:"PE", area:"175", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Bloc ceramic Porotherm 44 T Profi", thickness:"440", lambda:0.12, rho:680 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș plat izolat 25cm", type:"PT", area:"85", layers:[
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"150", lambda:0.034, rho:35 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol izolată 20cm XPS", type:"PL", area:"85", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"65", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E argon Sud", u:"0.70", g:"0.42", area:"18", orientation:"S", frameRatio:"20" },
      { name:"Tripan Low-E argon E/V/N", u:"0.70", g:"0.42", area:"14", orientation:"Mixt", frameRatio:"20" },
    ],
    bridges:[
      { name:"PE — Placă pe sol (izolat perimetral)", psi:"0.08", length:"37" },
      { name:"PE — Acoperiș (izolat continuu)", psi:"0.06", length:"37" },
      { name:"Glaf ferestre montaj RAL", psi:"0.02", length:"52" },
      { name:"Colț exterior", psi:"0.05", length:"25" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  REZIDENȚIAL COLECTIV (RC)
  // ═══════════════════════════════════════════════════════════════

  // 5. Apartament 2 cam bloc P+4, anii '70, panouri BCA 30cm, nereabilitat
  { id:"APT2_BLOC_P4_70", label:"Apt. 2 cam bloc P+4, anii '70 (BCA 30cm, nereabilitat)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+4", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"16.5", heightFloor:"2.75" },
    opaque:[
      { name:"Pereți ext. panouri BCA 30cm", type:"PE", area:"38", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu peste subsol neîncălzit", type:"PB", area:"52", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj vechi", u:"2.80", g:"0.75", area:"7.5", orientation:"S", frameRatio:"30" },
      { name:"Ferestre lemn dublu vitraj N", u:"2.80", g:"0.75", area:"3.0", orientation:"N", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"13" },
      { name:"Glaf ferestre vechi", psi:"0.08", length:"16" },
      { name:"Consolă balcon beton", psi:"0.70", length:"3.5" },
    ],
  },

  // 6. Apartament 3 cam bloc P+8, anii '80, panouri prefabricate, reabilitat ETICS EPS 10cm
  { id:"APT3_BLOC_P8_80", label:"Apt. 3 cam bloc P+8, anii '80 (reabilitat EPS 10cm)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+8", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"27", heightFloor:"2.75" },
    opaque:[
      { name:"Pereți ext. prefab. + EPS 10cm (reabilitat)", type:"PE", area:"52", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"60", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 80", thickness:"40", lambda:0.039, rho:20 },
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"75", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 80", thickness:"50", lambda:0.039, rho:20 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC dublu vitraj (înlocuite)", u:"1.40", g:"0.60", area:"14", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.08", length:"18" },
      { name:"Glaf ferestre PVC", psi:"0.05", length:"22" },
      { name:"Consolă balcon beton (izolat parțial)", psi:"0.40", length:"3.5" },
    ],
  },

  // 7. Bloc nou P+6, 2025 — beton armat + EPS grafitat 15cm, nZEB
  { id:"BLOC_NOU_P6_2025", label:"Bloc nou P+6, 2025 (EPS grafitat 15cm, nZEB)", cat:"RC",
    building:{ category:"RC", structure:"Cadre beton armat", floors:"P+6", basement:true, attic:false, units:"48", stairs:"2", heightBuilding:"21", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. beton armat + EPS grafitat 15cm", type:"PE", area:"1600", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren grafitat EPS Neo", thickness:"150", lambda:0.031, rho:17 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă necirculabilă", type:"PT", area:"450", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol izolat", type:"PB", area:"450", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E argon", u:"0.80", g:"0.45", area:"650", orientation:"Mixt", frameRatio:"20" },
    ],
    bridges:[
      { name:"PE — Planșee ×7", psi:"0.06", length:"420" },
      { name:"PE — Terasă", psi:"0.08", length:"90" },
      { name:"Glaf ferestre", psi:"0.03", length:"520" },
      { name:"Balcon izolat termic", psi:"0.15", length:"180" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  BIROURI (BI)
  // ═══════════════════════════════════════════════════════════════

  // 8. Birouri P+3, post-2010 — fațadă cortină + beton, tripan Low-E
  { id:"BIROURI_P3_2010", label:"Birouri P+3, post-2010 (fațadă cortină, tripan Low-E)", cat:"BI",
    building:{ category:"BI", structure:"Cadre beton armat", floors:"P+3", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"14", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți opaci beton + vată 12cm", type:"PE", area:"480", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă", type:"PT", area:"700", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"120", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"700", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"80", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Perete cortină tripan Low-E", u:"0.90", g:"0.40", area:"800", orientation:"Mixt", frameRatio:"15" },
    ],
    bridges:[
      { name:"PE — Planșee ×4", psi:"0.06", length:"280" },
      { name:"Glaf ferestre cortină", psi:"0.04", length:"380" },
    ],
  },

  // 9. Birouri vechi P+2, anii '80 — cărămidă 38cm, nereabilitat
  { id:"BIROURI_P2_80", label:"Birouri P+2, anii '80 (cărămidă 38cm, nereabilitat)", cat:"BI",
    building:{ category:"BI", structure:"Cadre beton armat", floors:"P+2", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"11.5", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți ext. cărămidă 38cm", type:"PE", area:"580", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă (izolație degradată)", type:"PT", area:"400", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 80", thickness:"30", lambda:0.039, rho:20 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"400", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre aluminiu dublu vitraj", u:"2.50", g:"0.65", area:"320", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșee ×3", psi:"0.10", length:"180" },
      { name:"PE — Terasă", psi:"0.15", length:"82" },
      { name:"Stâlpi beton", psi:"0.15", length:"72" },
      { name:"Glaf ferestre aluminiu", psi:"0.08", length:"260" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  EDUCAȚIE (ED)
  // ═══════════════════════════════════════════════════════════════

  // 10. Școală/grădiniță P+1, anii '80 — cărămidă 38cm, reabilitată EPS 15cm
  { id:"SCOALA_P1_80", label:"Școală P+1, anii '80 (cărămidă 38cm, reabilitată EPS 15cm)", cat:"ED",
    building:{ category:"ED", structure:"Cadre beton armat", floors:"P+1", basement:true, attic:false, units:"1", stairs:"2", heightBuilding:"8.00", heightFloor:"3.50" },
    opaque:[
      { name:"Pereți ext. cărămidă 38cm + EPS 15cm (reab.)", type:"PE", area:"520", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"150", lambda:0.036, rho:25 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă reabilitată (EPS 15cm)", type:"PT", area:"380", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 100", thickness:"150", lambda:0.036, rho:25 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol (EPS 10cm)", type:"PB", area:"380", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC dublu vitraj (înlocuite)", u:"1.40", g:"0.60", area:"150", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.08", length:"100" },
      { name:"PE — Terasă", psi:"0.10", length:"80" },
      { name:"PE — Soclu izolat", psi:"0.12", length:"80" },
      { name:"Glaf ferestre", psi:"0.05", length:"195" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  COMERCIAL (CO)
  // ═══════════════════════════════════════════════════════════════

  // 11. Supermarket P, structură metalică, sandwich 10cm
  { id:"SUPERMARKET_P", label:"Supermarket P, structură metalică (sandwich 10cm)", cat:"CO",
    building:{ category:"CO", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"6.00", heightFloor:"5.50" },
    opaque:[
      { name:"Pereți panouri sandwich 10cm (vată)", type:"PE", area:"480", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Acoperiș sandwich 10cm (vată)", type:"PT", area:"900", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Placă beton pe sol", type:"PL", area:"900", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"80", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Vitrine Low-E dublu vitraj", u:"1.10", g:"0.35", area:"110", orientation:"S", frameRatio:"10" },
      { name:"Uși automate intrare", u:"2.00", g:"0.60", area:"12", orientation:"S", frameRatio:"40" },
    ],
    bridges:[
      { name:"PE — Soclu", psi:"0.15", length:"125" },
      { name:"Joncțiune perete-acoperiș", psi:"0.10", length:"125" },
      { name:"Glaf vitrine", psi:"0.04", length:"60" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  REZIDENȚIAL TRADIȚIONAL (RI)
  // ═══════════════════════════════════════════════════════════════

  // 10b. Casă lemn/piatră pre-1960 — structură lemn + chirpici, fără izolație
  { id:"CASA_LEMN_1950", label:"Casă P tradiționala pre-1960 (lemn + chirpici/piatră, fără izolație)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"3.30", heightFloor:"2.70" },
    opaque:[
      { name:"Pereți chirpici + tencuiala lut 45cm", type:"PE", area:"95", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"400", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu lemn sub pod (scânduri fără izolație)", type:"PP", area:"60", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"40", lambda:0.14, rho:500 },
        { material:"Parchet lemn", thickness:"20", lambda:0.18, rho:600 },
      ]},
      { name:"Placă pe pământ (fără izolație)", type:"PL", area:"60", layers:[
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"30", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn simplu vitraj (vechi)", u:"5.20", g:"0.85", area:"8", orientation:"Mixt", frameRatio:"35" },
    ],
    bridges:[
      { name:"PE — Cornișă lemn", psi:"0.15", length:"32" },
      { name:"PE — Soclu piatră/fundatie", psi:"0.30", length:"32" },
      { name:"Glaf ferestre lemn vechi", psi:"0.12", length:"18" },
    ],
  },

  // 10c. Bloc cărămidă 1960–1972 — cadre BA + zidărie GVP, neizolat (tipic Bucuresti/Cluj)
  { id:"BLOC_CARAMIDA_1965", label:"Bloc P+4 cărămidă 1960–1972 (GVP 30cm, nereabilitat)", cat:"RC",
    building:{ category:"RC", structure:"Cadre beton armat", floors:"P+4", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"16", heightFloor:"2.75" },
    opaque:[
      { name:"Pereți ext. GVP 30cm (neizolat)", type:"PE", area:"45", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă cu goluri (GVP)", thickness:"300", lambda:0.46, rho:1200 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă (izolație degradată 3cm)", type:"PT", area:"60", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 80", thickness:"30", lambda:0.039, rho:20 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol neîncălzit", type:"PB", area:"60", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj vechi", u:"2.80", g:"0.75", area:"8", orientation:"S", frameRatio:"30" },
      { name:"Ferestre lemn dublu vitraj N", u:"2.80", g:"0.75", area:"4", orientation:"N", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.12", length:"14" },
      { name:"Glaf ferestre lemn", psi:"0.10", length:"20" },
      { name:"Consolă balcon", psi:"0.80", length:"3" },
      { name:"PE — Terasă (neisolat)", psi:"0.15", length:"14" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  GRĂDINIȚĂ / CREȘĂ (GR)
  // ═══════════════════════════════════════════════════════════════

  // 11b. Grădiniță P, anii '80 — cărămidă 38cm, nereabilitată
  { id:"GRADINITA_P_80", label:"Grădiniță P, anii '80 (cărămidă 38cm, nereabilitată)", cat:"GR",
    building:{ category:"GR", structure:"Cadre beton armat", floors:"P", basement:false, attic:false, units:"1", stairs:"2", heightBuilding:"4.50", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți ext. cărămidă 38cm (fără izolație)", type:"PE", area:"380", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă (fără izolație funcțională)", type:"PT", area:"600", layers:[
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 80", thickness:"20", lambda:0.039, rho:20 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol (fără izolație)", type:"PL", area:"600", layers:[
        { material:"Parchet lemn", thickness:"20", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj (originale)", u:"2.80", g:"0.70", area:"180", orientation:"S", frameRatio:"30" },
      { name:"Ferestre lemn dublu vitraj N", u:"2.80", g:"0.70", area:"60", orientation:"N", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Terasă (neprevăzut izolat)", psi:"0.15", length:"120" },
      { name:"PE — Soclu/fundație", psi:"0.25", length:"120" },
      { name:"Glaf ferestre lemn", psi:"0.10", length:"280" },
    ],
  },

  // 11c. Grădiniță P nouă, post-2010 — BCA 30cm + EPS 15cm, nZEB-ready
  { id:"GRADINITA_P_NOU", label:"Grădiniță P nouă, post-2010 (BCA 30cm + EPS 15cm)", cat:"GR",
    building:{ category:"GR", structure:"Cadre beton armat", floors:"P", basement:false, attic:false, units:"1", stairs:"2", heightBuilding:"4.20", heightFloor:"3.40" },
    opaque:[
      { name:"Pereți ext. BCA 30cm + EPS 15cm", type:"PE", area:"340", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"150", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă termoizolată (XPS 15cm)", type:"PT", area:"500", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"150", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol izolată (XPS 10cm)", type:"PL", area:"500", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"100", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC tripan Low-E (mari, S+E)", u:"0.80", g:"0.50", area:"200", orientation:"S", frameRatio:"20" },
      { name:"Ferestre PVC dublu vitraj N", u:"1.10", g:"0.45", area:"40", orientation:"N", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Terasă", psi:"0.10", length:"92" },
      { name:"PE — Soclu izolat", psi:"0.12", length:"92" },
      { name:"Glaf ferestre PVC", psi:"0.04", length:"290" },
      { name:"Stâlpi beton (cadre)", psi:"0.15", length:"64" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  SĂNĂTATE (SPA_H / CL)
  // ═══════════════════════════════════════════════════════════════

  // 13. Spital P+3, anii '70 — cadre BA + cărămidă 38cm, nereabilitat
  { id:"SPITAL_P3_70", label:"Spital P+3, anii '70 (cărămidă 38cm, nereabilitat)", cat:"SPA_H",
    building:{ category:"SPA_H", structure:"Cadre beton armat", floors:"P+3", basement:true, attic:false, units:"1", stairs:"3", heightBuilding:"16", heightFloor:"3.50" },
    opaque:[
      { name:"Pereți ext. cărămidă 38cm (nereabilitat)", type:"PE", area:"2200", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă (izolație degradată)", type:"PT", area:"1800", layers:[
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 80", thickness:"40", lambda:0.039, rho:20 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol neîncălzit", type:"PB", area:"1800", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre aluminiu fără RPT dublu vitraj", u:"3.20", g:"0.65", area:"680", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Planșee ×4", psi:"0.12", length:"840" },
      { name:"PE — Terasă", psi:"0.15", length:"280" },
      { name:"Glaf ferestre aluminiu (fără RPT)", psi:"0.12", length:"620" },
    ],
  },

  // 14. Policlinică P+1, reabilitată, post-2000 — BCA + EPS 12cm
  { id:"POLICLINICA_P1_2005", label:"Policlinică P+1, reabilitată (BCA 25cm + EPS 12cm)", cat:"CL",
    building:{ category:"CL", structure:"Cadre beton armat", floors:"P+1", basement:false, attic:false, units:"1", stairs:"2", heightBuilding:"8.00", heightFloor:"3.50" },
    opaque:[
      { name:"Pereți ext. BCA 25cm + EPS 12cm", type:"PE", area:"580", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"120", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"250", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă reabilitată (XPS 12cm)", type:"PT", area:"600", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"120", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol izolată", type:"PL", area:"600", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC dublu vitraj Low-E", u:"1.10", g:"0.55", area:"220", orientation:"Mixt", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.08", length:"120" },
      { name:"PE — Terasă", psi:"0.10", length:"90" },
      { name:"Glaf ferestre PVC", psi:"0.04", length:"280" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  HOTELURI & TURISM (HO)
  // ═══════════════════════════════════════════════════════════════

  // 15. Hotel P+5, post-comunism 1995 — cărămidă GVP 25cm, ferestre schimbate
  { id:"HOTEL_P5_1995", label:"Hotel P+5, 1995 (GVP 25cm, parțial reabilitat)", cat:"HO",
    building:{ category:"HO", structure:"Cadre beton armat", floors:"P+5", basement:true, attic:false, units:"60", stairs:"2", heightBuilding:"20", heightFloor:"3.00" },
    opaque:[
      { name:"Pereți ext. GVP 25cm (fără izolație)", type:"PE", area:"1400", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă cu goluri (GVP)", thickness:"250", lambda:0.46, rho:1200 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă (parțial reabilitată, EPS 8cm)", type:"PT", area:"600", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 100", thickness:"80", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"600", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC dublu vitraj (înlocuite)", u:"1.40", g:"0.60", area:"520", orientation:"Mixt", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Planșee ×6", psi:"0.10", length:"720" },
      { name:"PE — Terasă", psi:"0.12", length:"130" },
      { name:"Glaf ferestre PVC", psi:"0.05", length:"560" },
    ],
  },

  // 16. Hotel modern P+8, 2015 — fațadă ventilată + tripan Low-E
  { id:"HOTEL_MODERN_2015", label:"Hotel modern P+8, 2015 (fațadă ventilată + tripan Low-E)", cat:"HO",
    building:{ category:"HO", structure:"Cadre beton armat", floors:"P+8", basement:true, attic:false, units:"120", stairs:"3", heightBuilding:"30", heightFloor:"3.20" },
    opaque:[
      { name:"Fațadă ventilată (vată 18cm + placaj)", type:"PE", area:"3200", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"180", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă circulabilă (XPS 20cm)", type:"PT", area:"1100", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol izolat", type:"PB", area:"1100", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Perete cortină tripan Low-E argon", u:"0.80", g:"0.40", area:"1800", orientation:"Mixt", frameRatio:"15" },
    ],
    bridges:[
      { name:"PE — Planșee ×9", psi:"0.06", length:"1260" },
      { name:"PE — Terasă circulabilă", psi:"0.08", length:"170" },
      { name:"Glaf ferestre cortină", psi:"0.03", length:"840" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  INDUSTRIAL / DEPOZITE (IN)
  // ═══════════════════════════════════════════════════════════════

  // 17. Hală industrială P, comunistă 1975 — beton prefabricat, neizolată
  { id:"HALA_INDUSTRIALA_75", label:"Hală industrială P, 1975 (beton prefab. panou, neizolată)", cat:"IN",
    building:{ category:"IN", structure:"Cadre beton prefabricate", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"8.00", heightFloor:"7.50" },
    opaque:[
      { name:"Pereți panou beton prefabricat 24cm (neizolat)", type:"PE", area:"1600", layers:[
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
        { material:"Vată minerală bazaltică", thickness:"30", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"90", lambda:1.74, rho:2400 },
      ]},
      { name:"Acoperiș panel beton (fără izolație)", type:"PT", area:"3000", layers:[
        { material:"Bitum (membrană)", thickness:"5", lambda:0.17, rho:1050 },
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă industrială pe sol", type:"PL", area:"3000", layers:[
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
        { material:"Nisip", thickness:"100", lambda:0.40, rho:1700 },
      ]},
    ],
    glazing:[
      { name:"Luminatoare + geamuri vechi industriale", u:"4.50", g:"0.75", area:"180", orientation:"Orizontal", frameRatio:"20" },
      { name:"Ferestre metalice simplu vitraj", u:"5.80", g:"0.85", area:"120", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"Joncțiune perete-acoperiș (neisolat)", psi:"0.25", length:"280" },
      { name:"PE — Soclu beton", psi:"0.30", length:"280" },
      { name:"Stâlpi prefabricați", psi:"0.20", length:"360" },
    ],
  },

  // 18. Hală logistică modernă P, 2020 — structură metalică, sandwich PIR 12cm
  { id:"HALA_LOGISTICA_2020", label:"Hală logistică P, 2020 (structură metalică, sandwich PIR 12cm)", cat:"IN",
    building:{ category:"IN", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"10.00", heightFloor:"9.50" },
    opaque:[
      { name:"Pereți panouri sandwich PIR 12cm", type:"PE", area:"2400", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Acoperiș sandwich PIR 15cm", type:"PT", area:"5000", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"150", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Placă industrială izolată (XPS 8cm)", type:"PL", area:"5000", layers:[
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
        { material:"Nisip", thickness:"150", lambda:0.40, rho:1700 },
      ]},
    ],
    glazing:[
      { name:"Luminatoare policarbonat dublu", u:"2.20", g:"0.55", area:"250", orientation:"Orizontal", frameRatio:"10" },
      { name:"Uși secționale industriale", u:"1.80", g:"0.10", area:"80", orientation:"Mixt", frameRatio:"60" },
    ],
    bridges:[
      { name:"Joncțiune perete-acoperiș (sandwich)", psi:"0.08", length:"320" },
      { name:"PE — Soclu metalic izolat", psi:"0.12", length:"320" },
      { name:"Ancoraje panouri sandwich", psi:"0.05", length:"880" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  ADMINISTRATIV / INSTITUȚIE PUBLICĂ (AD)
  // ═══════════════════════════════════════════════════════════════

  // 19. Clădire administrativă P+3, 1975 — cărămidă plină 38cm, nereabilitată
  { id:"CLADIRE_ADM_1975", label:"Clădire administrativă P+3, 1975 (cărămidă 38cm, nereabilitată)", cat:"AD",
    building:{ category:"AD", structure:"Cadre beton armat", floors:"P+3", basement:true, attic:false, units:"1", stairs:"2", heightBuilding:"16", heightFloor:"3.50" },
    opaque:[
      { name:"Pereți ext. cărămidă plină 38cm (fără izolație)", type:"PE", area:"1800", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă (izolație degradată 3cm)", type:"PT", area:"900", layers:[
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 80", thickness:"30", lambda:0.039, rho:20 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol neîncălzit", type:"PB", area:"900", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj (originale 1975)", u:"2.80", g:"0.75", area:"380", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșee ×4", psi:"0.12", length:"720" },
      { name:"PE — Terasă (neizolat)", psi:"0.18", length:"180" },
      { name:"PE — Soclu/fundație", psi:"0.22", length:"180" },
      { name:"Glaf ferestre lemn vechi", psi:"0.10", length:"520" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  ALTELE (SA/AL) — Pensiune turism rural
  // ═══════════════════════════════════════════════════════════════

  // 20. Pensiune P+1, reabilitată — zidărie 50cm + vată 15cm
  { id:"PENSIUNE_P1", label:"Pensiune P+1, reabilitată (zidărie 50cm + vată 15cm)", cat:"SA",
    building:{ category:"SA", structure:"Zidărie portantă", floors:"P+1", basement:true, attic:true, units:"8", stairs:"1", heightBuilding:"7.50", heightFloor:"3.00" },
    opaque:[
      { name:"Pereți ext. cărămidă 50cm + vată 15cm", type:"PE", area:"250", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"150", lambda:0.040, rho:100 },
        { material:"Cărămidă plină", thickness:"500", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod izolat (vată 20cm)", type:"PP", area:"130", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Lemn moale (brad/molid)", thickness:"200", lambda:0.14, rho:500 },
      ]},
      { name:"Planșeu peste subsol izolat", type:"PB", area:"130", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"80", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC tripan", u:"1.10", g:"0.50", area:"40", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.08", length:"46" },
      { name:"PE — Soclu izolat", psi:"0.12", length:"46" },
      { name:"PE — Cornișă", psi:"0.08", length:"46" },
      { name:"Glaf ferestre", psi:"0.04", length:"56" },
    ],
  },
];
