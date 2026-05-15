// ═══════════════════════════════════════════════════════════════════════════
//  TYPICAL_BUILDINGS_EXTRA — Tipologii suplimentare cercetate web (mai 2026)
//  Surse: TABULA EPISCOPE RO, BPIE iBROAD, MDLPA, NP 010/011/015-2022,
//         Mc 001-2022, C 107-2005, CBRE/Colliers RO 2025, ANT 65/2013,
//         CTPark/P3/WDP standard logistic 2024+, AAECR Strategia Națională 2050.
//  Fiecare tipologie are yearBuilt explicit pentru sortare/filtrare epocă.
// ═══════════════════════════════════════════════════════════════════════════

export const TYPICAL_BUILDINGS_EXTRA_LIST = [

  // ═══════════════════════════════════════════════════════════════
  //  REZIDENȚIAL INDIVIDUAL (RI) — completări epoci lipsă
  // ═══════════════════════════════════════════════════════════════

  // RI-EX1. Casă chirpici/paiantă pre-1945 (rural Muntenia/Oltenia)
  { id:"CASA_CHIRPICI_1935", label:"Casă P chirpici/paiantă pre-1945 (rural, neizolată)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"3.20", heightFloor:"2.50", yearBuilt:1935 },
    opaque:[
      { name:"Pereți chirpici 50cm + tencuială lut", type:"PE", area:"110", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"500", lambda:0.50, rho:1500 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu lemn cu lut+paie sub pod", type:"PP", area:"75", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"30", lambda:0.14, rho:500 },
        { material:"Cărămidă plină", thickness:"100", lambda:0.50, rho:1400 },
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
      ]},
      { name:"Pământ bătut + scândură", type:"PL", area:"75", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"40", lambda:0.14, rho:500 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn simplu vitraj (vechi)", u:"5.00", g:"0.85", area:"7", orientation:"Mixt", frameRatio:"40" },
    ],
    bridges:[
      { name:"PE — Soclu piatră", psi:"0.40", length:"38" },
      { name:"PE — Cornișă lemn", psi:"0.30", length:"38" },
    ],
  },

  // RI-EX2. Casă post-război 1945-65 (cărămidă plină 38cm)
  { id:"CASA_POSTRAZBOI_1955", label:"Casă P+1, 1945-1965 (cărămidă plină 37,5cm, var stins)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1", basement:true, attic:true, units:"1", stairs:"1", heightBuilding:"6.00", heightFloor:"2.70", yearBuilt:1955 },
    opaque:[
      { name:"Pereți cărămidă plină 37,5cm (1½)", type:"PE", area:"160", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"375", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu BA pod + zgură 8cm", type:"PP", area:"85", layers:[
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
        { material:"Vată minerală bazaltică", thickness:"80", lambda:0.080, rho:300 },
      ]},
      { name:"Beton simplu pe sol + dușumea", type:"PL", area:"85", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"30", lambda:0.14, rho:500 },
        { material:"Beton armat", thickness:"100", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn cuplate 2 foi geam", u:"3.10", g:"0.78", area:"15", orientation:"Mixt", frameRatio:"35" },
    ],
    bridges:[
      { name:"PE — Centură b.a. neizolată", psi:"0.45", length:"35" },
      { name:"PE — Soclu", psi:"0.30", length:"35" },
      { name:"Glaf ferestre lemn vechi", psi:"0.10", length:"24" },
    ],
  },

  // RI-EX3. Casă 1980-1990 (GVP 29cm, fără izolație, decret economie)
  { id:"CASA_GVP_1985", label:"Casă P+1, 1980-1990 (GVP 29cm, fără izolație, decret economie)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"5.80", heightFloor:"2.55", yearBuilt:1985 },
    opaque:[
      { name:"Pereți GVP 29cm (cărămidă cu goluri)", type:"PE", area:"185", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă cu goluri (GVP)", thickness:"290", lambda:0.46, rho:1400 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu pod + vată 8cm", type:"PP", area:"95", layers:[
        { material:"Beton armat", thickness:"130", lambda:1.74, rho:2400 },
        { material:"Vată minerală bazaltică", thickness:"80", lambda:0.040, rho:100 },
      ]},
      { name:"Placă beton 10cm fără izolație", type:"PL", area:"95", layers:[
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"100", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Termopan PVC primă generație (retrofit)", u:"2.80", g:"0.75", area:"24", orientation:"Mixt", frameRatio:"28" },
    ],
    bridges:[
      { name:"PE — Centură b.a.", psi:"0.55", length:"42" },
      { name:"PE — Atic/buiandrug b.a.", psi:"0.45", length:"42" },
      { name:"PE — Soclu", psi:"0.40", length:"42" },
    ],
  },

  // RI-EX4. Casă 2010-2018 (Porotherm + EPS 10cm, post C 107)
  { id:"CASA_POSTC107_2014", label:"Casă P+1+M, 2010-2018 (Porotherm 30 + EPS grafitat 10cm)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1+M", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"8.20", heightFloor:"2.80", yearBuilt:2014 },
    opaque:[
      { name:"Pereți Porotherm 30 + EPS grafitat 10cm", type:"PE", area:"230", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren grafitat EPS Neo", thickness:"100", lambda:0.031, rho:17 },
        { material:"Bloc ceramic Porotherm 30", thickness:"300", lambda:0.22, rho:850 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș înclinat (vată 20cm)", type:"PP", area:"110", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
      ]},
      { name:"Placă pe sol XPS 10cm", type:"PL", area:"95", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"100", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"PVC tripan începător Low-E argon", u:"1.10", g:"0.55", area:"42", orientation:"Mixt", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Centură izolată", psi:"0.12", length:"45" },
      { name:"PE — Soclu", psi:"0.10", length:"45" },
      { name:"Glaf ferestre PVC", psi:"0.04", length:"58" },
    ],
  },

  // RI-EX5. Casă pasivă EnerPHit certificată 2025 (Porotherm 25 + vată 30cm)
  { id:"CASA_ENERPHIT_2025", label:"Casă P+1 EnerPHit PHI 2025 (vată 30cm, Uw≤0,85)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"6.30", heightFloor:"2.75", yearBuilt:2025 },
    opaque:[
      { name:"Porotherm 25 + vată bazaltică 30cm", type:"PE", area:"160", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"300", lambda:0.035, rho:100 },
        { material:"Bloc ceramic Porotherm 25", thickness:"250", lambda:0.22, rho:850 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș plat (celuloză 40cm)", type:"PT", area:"80", layers:[
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"400", lambda:0.038, rho:60 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol XPS 25cm", type:"PL", area:"80", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"250", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan PH-cert Internorm Uw≤0,85", u:"0.70", g:"0.50", area:"22", orientation:"S", frameRatio:"18" },
      { name:"Tripan PH-cert N/E/V", u:"0.70", g:"0.50", area:"14", orientation:"Mixt", frameRatio:"18" },
    ],
    bridges:[
      { name:"PE — Colț PH thermal-bridge-free", psi:"0.02", length:"22" },
      { name:"PE — Fundație Isokorb", psi:"0.04", length:"35" },
      { name:"Glaf ferestre montaj RAL warm-edge", psi:"0.01", length:"48" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  REZIDENȚIAL COLECTIV (RC) — extensii panouri prefabricate
  // ═══════════════════════════════════════════════════════════════

  // RC-EX1. Bloc P+4 panou prefabricat IPCT T744R (1972-1982)
  { id:"BLOC_PANOU_T744R", label:"Bloc P+4 panou prefab. IPCT T744R, 1972-1982 (EPS 5cm degradat)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+4", basement:true, attic:false, units:"20", stairs:"1", heightBuilding:"12.75", heightFloor:"2.55", yearBuilt:1978 },
    opaque:[
      { name:"Panou tristrat 27cm (BA6+EPS5+BA16)", type:"PE", area:"850", layers:[
        { material:"Beton armat", thickness:"60", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 80", thickness:"50", lambda:0.044, rho:18 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Terasă necirculabilă (zgură 12cm)", type:"PT", area:"380", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"380", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn cuplate 4-16-4", u:"2.60", g:"0.70", area:"320", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Rosturi panou-panou (linii vertic.)", psi:"0.55", length:"480" },
      { name:"PE — Centură planșeu", psi:"0.55", length:"180" },
      { name:"PE — Atic", psi:"0.50", length:"95" },
      { name:"PE — Console balcon BA fără rupere termică", psi:"1.20", length:"36" },
    ],
  },

  // RC-EX2. Bloc P+10 panou mare IPCT 1340 (1985-1990)
  { id:"BLOC_PANOU_1340", label:"Bloc P+10 panou mare IPCT 1340, 1985-1990 (EPS 7cm)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+10", basement:true, attic:false, units:"66", stairs:"2", heightBuilding:"28.05", heightFloor:"2.55", yearBuilt:1988 },
    opaque:[
      { name:"Panou tristrat 35cm (BA8+EPS7+BA20)", type:"PE", area:"2400", layers:[
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 100", thickness:"70", lambda:0.040, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
      { name:"Terasă (zgură 15cm)", type:"PT", area:"480", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"150", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"480", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn cuplate", u:"2.60", g:"0.72", area:"850", orientation:"Mixt", frameRatio:"28" },
    ],
    bridges:[
      { name:"PE — Rosturi panou planșeu (orizontale)", psi:"0.55", length:"1100" },
      { name:"PE — Console balcon BA continui", psi:"1.20", length:"180" },
      { name:"PE — Atic", psi:"0.55", length:"110" },
      { name:"PE — Casa scării/lift", psi:"0.30", length:"60" },
    ],
  },

  // RC-EX3. Bloc P+12 cadre BA + închideri BCA (anii 1980)
  { id:"BLOC_P12_CADRE_BA_85", label:"Bloc P+12 cadre BA + închideri BCA 25, 1985 (stâlpi expuși)", cat:"RC",
    building:{ category:"RC", structure:"Cadre beton armat", floors:"P+12", basement:true, attic:false, units:"78", stairs:"2", heightBuilding:"35.10", heightFloor:"2.70", yearBuilt:1985 },
    opaque:[
      { name:"Pereți BCA 25cm + tencuială (fără izolație)", type:"PE", area:"2800", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"BCA (beton celular autoclavizat)", thickness:"250", lambda:0.21, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă BA + zgură 12cm", type:"PT", area:"540", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"130", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"540", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn termopan original 4-12-4", u:"2.60", g:"0.68", area:"1100", orientation:"Mixt", frameRatio:"28" },
    ],
    bridges:[
      { name:"PE — Stâlpi BA expuși vertical", psi:"0.95", length:"480" },
      { name:"PE — Grinzi BA marginale", psi:"1.05", length:"320" },
      { name:"PE — Centuri planșee", psi:"0.65", length:"850" },
    ],
  },

  // RC-EX4. Condominiu modern P+8 (post-2010)
  { id:"BLOC_CONDOMINIU_P8_2015", label:"Condominiu modern P+8, 2015 (BCA Ytong + EPS 10cm + Isokorb)", cat:"RC",
    building:{ category:"RC", structure:"Cadre beton armat", floors:"P+8", basement:true, attic:false, units:"54", stairs:"2", heightBuilding:"25.50", heightFloor:"2.80", yearBuilt:2015 },
    opaque:[
      { name:"BCA Ytong 30cm + EPS 10cm", type:"PE", area:"2200", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.037, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.10, rho:500 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă circulabilă XPS 15cm", type:"PT", area:"500", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"150", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste parter comercial EPS 10cm", type:"PB", area:"500", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"PVC 6 camere termopan 4-16Ar-4 Low-E", u:"1.10", g:"0.58", area:"950", orientation:"Mixt", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Stâlpi tratate cu EPS 6cm", psi:"0.10", length:"180" },
      { name:"PE — Balcoane Schöck Isokorb", psi:"0.18", length:"280" },
      { name:"PE — Planșee", psi:"0.06", length:"720" },
    ],
  },

  // RC-EX5. Bloc apartamente premium P+15 fațadă cortină (post-2020)
  { id:"BLOC_LUX_P15_2022", label:"Bloc lux P+15, 2022 (fațadă cortină tripan + Isokorb XT)", cat:"RC",
    building:{ category:"RC", structure:"Cadre beton armat", floors:"P+15", basement:true, attic:false, units:"96", stairs:"1", heightBuilding:"48.00", heightFloor:"2.95", yearBuilt:2022 },
    opaque:[
      { name:"Fațadă ventilată HPL + vată 16cm", type:"PE", area:"3200", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"160", lambda:0.035, rho:100 },
        { material:"BCA (beton celular autoclavizat)", thickness:"250", lambda:0.10, rho:500 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă grădină + XPS 20cm", type:"PT", area:"420", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol garaj EPS 14cm", type:"PB", area:"420", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"140", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Cortină tripan Low-E dublu strat U=0,7", u:"0.75", g:"0.30", area:"2100", orientation:"Mixt", frameRatio:"15" },
    ],
    bridges:[
      { name:"PE — Planșee tratate ψ_total<0,10", psi:"0.08", length:"1450" },
      { name:"PE — Balcoane Isokorb XT", psi:"0.10", length:"380" },
      { name:"PE — Atic verde extensiv", psi:"0.06", length:"95" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  BIROURI (BI) — Class A / A++ post-2015
  // ═══════════════════════════════════════════════════════════════

  // BI-EX1. Birouri P+10 Class A 2015 (Globalworth Tower-tip BREEAM Excellent)
  { id:"OFFICE_CLASS_A_2015", label:"Birouri P+10 Class A, 2015 (cortină dublă Schüco, BREEAM Excellent)", cat:"BI",
    building:{ category:"BI", structure:"Cadre beton armat", floors:"P+10", basement:true, attic:false, units:"1", stairs:"4", heightBuilding:"35", heightFloor:"3.40", yearBuilt:2015 },
    opaque:[
      { name:"Spandrel opac vată 10cm + BA", type:"PE", area:"600", layers:[
        { material:"Aluminiu", thickness:"3", lambda:160.0, rho:2700 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă tehnică XPS 18cm", type:"PT", area:"1800", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"180", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol parking EPS 10cm", type:"PB", area:"1800", layers:[
        { material:"Mochetă", thickness:"10", lambda:0.06, rho:200 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Cortină DV 6-16Ar-6 Low-E selectiv solar", u:"1.10", g:"0.35", area:"3500", orientation:"Mixt", frameRatio:"15" },
    ],
    bridges:[
      { name:"PE — Planșee ×11", psi:"0.06", length:"1320" },
      { name:"Glaf cortină Schüco", psi:"0.04", length:"1800" },
    ],
  },

  // BI-EX2. Birouri P+15 Class A++ 2022 (One Tower / Queens District tip)
  { id:"OFFICE_CLASS_APP_2022", label:"Birouri P+15 Class A++, 2022 (cortină tripan, BREEAM Outstanding)", cat:"BI",
    building:{ category:"BI", structure:"Cadre beton armat", floors:"P+15", basement:true, attic:false, units:"1", stairs:"6", heightBuilding:"52.50", heightFloor:"3.50", yearBuilt:2022 },
    opaque:[
      { name:"Spandrel ventilat MW 12cm + BA", type:"PE", area:"800", layers:[
        { material:"Aluminiu", thickness:"3", lambda:160.0, rho:2700 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.035, rho:100 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă verde extensivă + PV 200kWp", type:"PT", area:"2200", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"220", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"220", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol parking", type:"PB", area:"2200", layers:[
        { material:"Mochetă", thickness:"10", lambda:0.06, rho:200 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"120", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"220", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Cortină Schüco FWS 50 SI tripan 6-12Ar-4-12Ar-6", u:"0.75", g:"0.30", area:"5500", orientation:"Mixt", frameRatio:"12" },
    ],
    bridges:[
      { name:"PE — Planșee ×16", psi:"0.05", length:"2400" },
      { name:"Glaf cortină Schüco SI", psi:"0.03", length:"2800" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  EDUCAȚIE (ED) — extensii multiple
  // ═══════════════════════════════════════════════════════════════

  // ED-EX1. Școală P+1 cărămidă, 1965 (proiect tipizat IPCT)
  { id:"SCOALA_P1_65", label:"Școală P+1, 1960-1970 (cărămidă 38cm IPCT, lambriu lemn)", cat:"ED",
    building:{ category:"ED", structure:"Cadre beton armat", floors:"P+1", basement:true, attic:false, units:"1", stairs:"2", heightBuilding:"7.60", heightFloor:"3.30", yearBuilt:1968 },
    opaque:[
      { name:"Pereți cărămidă 38cm (1½ cărămidă)", type:"PE", area:"650", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă necirculabilă (zgură 15cm)", type:"PT", area:"850", layers:[
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"150", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol neîncălzit", type:"PB", area:"850", layers:[
        { material:"Parchet lemn", thickness:"20", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn cuplate 2 foi simplu (1.80×2.40)", u:"2.80", g:"0.78", area:"380", orientation:"S", frameRatio:"30" },
      { name:"Lemn cuplate coridor N", u:"2.80", g:"0.78", area:"120", orientation:"N", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Atic terasă", psi:"0.18", length:"110" },
      { name:"PE — Centură BA orizontală", psi:"0.20", length:"220" },
      { name:"PE — Buiandrugi BA peste ferestre lungi", psi:"0.15", length:"180" },
    ],
  },

  // ED-EX2. Liceu P+2 panou prefabricat, 1982
  { id:"LICEU_P2_PANOU_82", label:"Liceu P+2 panou prefabricat, 1982 (vitraje benzi orizontale)", cat:"ED",
    building:{ category:"ED", structure:"Panouri prefabricate mari", floors:"P+2", basement:true, attic:false, units:"1", stairs:"3", heightBuilding:"10.90", heightFloor:"3.30", yearBuilt:1982 },
    opaque:[
      { name:"Panou prefab. BA 27cm + BCA 5cm intern", type:"PE", area:"1200", layers:[
        { material:"Beton armat", thickness:"60", lambda:1.74, rho:2400 },
        { material:"BCA (beton celular autoclavizat)", thickness:"50", lambda:0.21, rho:600 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Terasă (zgură expandată 8cm)", type:"PT", area:"1500", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"80", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"1500", layers:[
        { material:"Mozaic", thickness:"15", lambda:1.30, rho:2200 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn/metal cuplate benzi orizontale", u:"2.80", g:"0.72", area:"650", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Rosturi panou-panou", psi:"0.55", length:"720" },
      { name:"PE — Atic", psi:"0.20", length:"160" },
      { name:"PE — Buiandrugi", psi:"0.18", length:"380" },
    ],
  },

  // ED-EX3. Școală nouă P+1 nZEB, 2024 (PNRR „Școli Verzi")
  { id:"SCOALA_NZEB_2024", label:"Școală P+1 nZEB, 2024 (Porotherm 30 + vată 20cm + PV 30kWp)", cat:"ED",
    building:{ category:"ED", structure:"Zidărie portantă", floors:"P+1", basement:false, attic:false, units:"1", stairs:"3", heightBuilding:"7.60", heightFloor:"3.30", yearBuilt:2024 },
    opaque:[
      { name:"Porotherm 30 + vată minerală 20cm", type:"PE", area:"950", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.035, rho:100 },
        { material:"Bloc ceramic Porotherm 30", thickness:"300", lambda:0.22, rho:850 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă vată 25cm + EPS 5cm", type:"PT", area:"1200", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 100", thickness:"50", lambda:0.036, rho:25 },
        { material:"Vată minerală bazaltică", thickness:"250", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol XPS 12cm", type:"PL", area:"1200", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"120", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E argon U=0,9 cu brisolaire S", u:"0.90", g:"0.45", area:"380", orientation:"S", frameRatio:"22" },
      { name:"Tripan N coridor", u:"0.90", g:"0.45", area:"120", orientation:"N", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Atic izolat", psi:"0.08", length:"140" },
      { name:"PE — Soclu izolat", psi:"0.10", length:"140" },
      { name:"PE — Glaf montaj RAL", psi:"0.03", length:"320" },
    ],
  },

  // ED-EX4. Universitate corp brutalist 1975 (Politehnica tip)
  { id:"UNIV_BRUTALIST_75", label:"Universitate P+4 brutalist, 1975 (BA aparent + cortină simplă)", cat:"ED",
    building:{ category:"ED", structure:"Cadre beton armat", floors:"P+4", basement:true, attic:false, units:"1", stairs:"4", heightBuilding:"18.00", heightFloor:"3.80", yearBuilt:1975 },
    opaque:[
      { name:"BA aparent 25cm (panou portant)", type:"PE", area:"3200", layers:[
        { material:"Beton armat", thickness:"250", lambda:1.74, rho:2400 },
      ]},
      { name:"Terasă BA grea + zgură", type:"PT", area:"2800", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol amfiteatre", type:"PB", area:"2800", layers:[
        { material:"Mozaic", thickness:"20", lambda:1.30, rho:2200 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Cortină simplu vitraj metal cuplate", u:"3.50", g:"0.78", area:"2100", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Console BA aparente", psi:"1.20", length:"320" },
      { name:"PE — Ramificații BA", psi:"0.85", length:"450" },
      { name:"PE — Planșee continui spre exterior", psi:"0.95", length:"680" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  SĂNĂTATE (SPA_H) — extensii spitale
  // ═══════════════════════════════════════════════════════════════

  // SPA_H-EX1. Spital monobloc P+8 panou prefab. (1980-1985, model Floreasca/Fundeni)
  { id:"SPITAL_MONOBLOC_P8_82", label:"Spital monobloc P+8, 1982 (panou prefab. BA, blocuri operator)", cat:"SPA_H",
    building:{ category:"SPA_H", structure:"Panouri prefabricate mari", floors:"P+8", basement:true, attic:false, units:"1", stairs:"6", heightBuilding:"32", heightFloor:"3.30", yearBuilt:1982 },
    opaque:[
      { name:"Panou prefab. BA 30cm + EPS 5cm", type:"PE", area:"5800", layers:[
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 80", thickness:"50", lambda:0.044, rho:18 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Terasă BA grea + zgură 8cm", type:"PT", area:"3500", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"80", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol tehnologic", type:"PB", area:"3500", layers:[
        { material:"Linoleum medical", thickness:"5", lambda:0.18, rho:1100 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Metal/lemn cuplate benzi orizontale saloane", u:"2.80", g:"0.72", area:"2100", orientation:"Mixt", frameRatio:"28" },
    ],
    bridges:[
      { name:"PE — Rosturi panou (50% perimetru)", psi:"0.55", length:"3200" },
      { name:"PE — Console balcoane saloane", psi:"1.15", length:"480" },
      { name:"PE — Atic", psi:"0.55", length:"260" },
    ],
  },

  // SPA_H-EX2. Spital nou P+5 modern, 2018 (BCA + EPS 15cm + AHU HEPA)
  { id:"SPITAL_P5_MODERN_2018", label:"Spital P+5, 2018 (BCA + EPS 15cm + AHU HEPA blocuri operator)", cat:"SPA_H",
    building:{ category:"SPA_H", structure:"Cadre beton armat", floors:"P+5", basement:true, attic:false, units:"1", stairs:"5", heightBuilding:"22", heightFloor:"3.40", yearBuilt:2018 },
    opaque:[
      { name:"BCA 30cm + EPS 15cm + finisaj antimicrobian", type:"PE", area:"3800", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"150", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.21, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă vată 20cm", type:"PT", area:"2400", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"2400", layers:[
        { material:"Linoleum medical", thickness:"5", lambda:0.18, rho:1100 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"PVC/Al tripan Low-E (deschidere limitată siguranță)", u:"1.10", g:"0.50", area:"1450", orientation:"Mixt", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Planșee ×6", psi:"0.06", length:"1820" },
      { name:"PE — Atic izolat", psi:"0.08", length:"230" },
      { name:"Glaf ferestre", psi:"0.03", length:"880" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  CLINICI (CL) — extensii
  // ═══════════════════════════════════════════════════════════════

  // CL-EX1. Centru medical privat P+3 modern (Regina Maria/MedLife tip)
  { id:"CENTRU_MED_PRIVAT_P3", label:"Centru medical privat P+3, 2020 (cortină tripan + VRF + LED)", cat:"CL",
    building:{ category:"CL", structure:"Cadre beton armat", floors:"P+3", basement:true, attic:false, units:"1", stairs:"3", heightBuilding:"14.50", heightFloor:"3.30", yearBuilt:2020 },
    opaque:[
      { name:"BCA 25cm + EPS 12cm + plăci HPL", type:"PE", area:"950", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"120", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"250", lambda:0.21, rho:600 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă vată 22cm", type:"PT", area:"650", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"220", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol XPS 12cm", type:"PL", area:"650", layers:[
        { material:"Linoleum medical", thickness:"5", lambda:0.18, rho:1100 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"120", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Cortină Al tripan Low-E + brisolaire automate", u:"0.90", g:"0.38", area:"850", orientation:"Mixt", frameRatio:"15" },
    ],
    bridges:[
      { name:"PE — Planșee ×4", psi:"0.06", length:"480" },
      { name:"Glaf cortină", psi:"0.04", length:"620" },
    ],
  },

  // CL-EX2. Policlinică P+2 cărămidă, 1975
  { id:"POLICLINICA_P2_75", label:"Policlinică P+2, 1975 (cărămidă 38cm, fereastră bandă coridor)", cat:"CL",
    building:{ category:"CL", structure:"Cadre beton armat", floors:"P+2", basement:true, attic:false, units:"1", stairs:"2", heightBuilding:"10.40", heightFloor:"3.30", yearBuilt:1975 },
    opaque:[
      { name:"Pereți cărămidă 38cm", type:"PE", area:"1100", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă (zgură 12cm)", type:"PT", area:"850", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"850", layers:[
        { material:"Mozaic", thickness:"15", lambda:1.30, rho:2200 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"160", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn cuplate cabinete + bandă coridor", u:"2.80", g:"0.75", area:"420", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșee ×3", psi:"0.12", length:"360" },
      { name:"PE — Atic", psi:"0.18", length:"160" },
      { name:"PE — Buiandrugi BA", psi:"0.15", length:"320" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  ADMINISTRATIVE (AD) — extensii
  // ═══════════════════════════════════════════════════════════════

  // AD-EX1. Primărie/Palat administrativ '70 cu sală festivități
  { id:"PRIMARIE_70_FESTIV", label:"Primărie monobloc, 1973 (cărămidă 38 + sală festivități double-height)", cat:"AD",
    building:{ category:"AD", structure:"Cadre beton armat", floors:"P+2", basement:true, attic:false, units:"1", stairs:"3", heightBuilding:"14", heightFloor:"3.50", yearBuilt:1973 },
    opaque:[
      { name:"Pereți cărămidă 38cm + placaj travertin", type:"PE", area:"1450", layers:[
        { material:"Marmură", thickness:"30", lambda:2.80, rho:2700 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă BA grea (sala festivități double-height)", type:"PT", area:"1200", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.080, rho:300 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol arhivă", type:"PB", area:"1200", layers:[
        { material:"Mozaic", thickness:"20", lambda:1.30, rho:2200 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn/metal cuplate birouri (1.80×2.40)", u:"2.80", g:"0.75", area:"420", orientation:"Mixt", frameRatio:"30" },
      { name:"Vitraj mare sala festivități (5×4m)", u:"3.00", g:"0.75", area:"60", orientation:"S", frameRatio:"15" },
    ],
    bridges:[
      { name:"PE — Cadre BA expuși", psi:"0.65", length:"380" },
      { name:"PE — Planșeu sala festivități continuu", psi:"0.45", length:"95" },
      { name:"PE — Atic", psi:"0.18", length:"165" },
    ],
  },

  // AD-EX2. Sediu instituție publică nou nZEB 2023 (PNRR)
  { id:"SEDIU_INST_NZEB_2023", label:"Sediu instituție publică nZEB, 2023 (BCA + EPS 18cm + BMS A + PV)", cat:"AD",
    building:{ category:"AD", structure:"Cadre beton armat", floors:"P+5", basement:true, attic:false, units:"1", stairs:"4", heightBuilding:"19", heightFloor:"3.20", yearBuilt:2023 },
    opaque:[
      { name:"BCA 25cm + EPS grafitat 18cm", type:"PE", area:"2200", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren grafitat EPS Neo", thickness:"180", lambda:0.031, rho:17 },
        { material:"BCA (beton celular autoclavizat)", thickness:"250", lambda:0.10, rho:500 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă vată 22cm + EPS 5cm + verde extensiv parțial", type:"PT", area:"800", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren expandat EPS 100", thickness:"50", lambda:0.036, rho:25 },
        { material:"Vată minerală bazaltică", thickness:"220", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol parking EPS 12cm", type:"PB", area:"800", layers:[
        { material:"Mochetă", thickness:"10", lambda:0.06, rho:200 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"120", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E argon + brisolaire automate S/V", u:"0.90", g:"0.38", area:"1300", orientation:"Mixt", frameRatio:"18" },
    ],
    bridges:[
      { name:"PE — Planșee ×6 (Isokorb)", psi:"0.05", length:"1100" },
      { name:"PE — Atic izolat", psi:"0.08", length:"180" },
      { name:"Glaf ferestre PH-cert", psi:"0.02", length:"680" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  COMERȚ (CO) — extensii
  // ═══════════════════════════════════════════════════════════════

  // CO-EX1. Magazin stradă cărămidă anii '70 (parter retail + locuit deasupra)
  { id:"MAGAZIN_STRADA_70", label:"Magazin parter de stradă, 1973 (cărămidă 30cm + vitrină metal)", cat:"CO",
    building:{ category:"CO", structure:"Zidărie portantă", floors:"P", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"4.20", heightFloor:"4.00", yearBuilt:1973 },
    opaque:[
      { name:"Pereți cărămidă 30cm", type:"PE", area:"180", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"300", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu lemn + țiglă", type:"PT", area:"160", layers:[
        { material:"Bitum (membrană)", thickness:"5", lambda:0.17, rho:1050 },
        { material:"Lemn moale (brad/molid)", thickness:"100", lambda:0.14, rho:500 },
      ]},
      { name:"Placă beton subsol", type:"PB", area:"160", layers:[
        { material:"Mozaic", thickness:"20", lambda:1.30, rho:2200 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Vitrină metal antichizat dublu vitraj (U≈3,0)", u:"3.00", g:"0.65", area:"45", orientation:"S", frameRatio:"15" },
    ],
    bridges:[
      { name:"PE — Cornișă lemn", psi:"0.20", length:"36" },
      { name:"PE — Soclu", psi:"0.30", length:"36" },
    ],
  },

  // CO-EX2. Hipermarket parter mare (Carrefour/Auchan tip)
  { id:"HIPERMARKET_PARTER", label:"Hipermarket parter, 2008 (sandwich PUR 12cm + luminatoare 10%)", cat:"CO",
    building:{ category:"CO", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"2", heightBuilding:"7.50", heightFloor:"7.00", yearBuilt:2008 },
    opaque:[
      { name:"Sandwich PUR 12cm + zidărie BCA galerie", type:"PE", area:"2800", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Acoperiș sandwich PIR 12cm + luminatoare", type:"PT", area:"8500", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Placă industrială pe sol + XPS 8cm", type:"PL", area:"8500", layers:[
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
      ]},
    ],
    glazing:[
      { name:"Cortină Al termorupt DV Low-E (galerie)", u:"1.50", g:"0.40", area:"450", orientation:"Mixt", frameRatio:"20" },
      { name:"Luminatoare zenitale policarbonat alveolar 25mm", u:"2.20", g:"0.55", area:"850", orientation:"Orizontal", frameRatio:"10" },
      { name:"Uși automate intrare", u:"2.00", g:"0.60", area:"35", orientation:"S", frameRatio:"40" },
    ],
    bridges:[
      { name:"PE — Joncțiune perete-acoperiș sandwich", psi:"0.10", length:"380" },
      { name:"PE — Soclu metalic", psi:"0.15", length:"380" },
      { name:"PE — Glaf luminatoare", psi:"0.05", length:"680" },
    ],
  },

  // CO-EX3. Mall P+2 anii 2000 (AFI Cotroceni/Promenada tip)
  { id:"MALL_P2_2009", label:"Mall P+2, 2009 (atrium sticlă + chiller centralizat 4MW)", cat:"CO",
    building:{ category:"CO", structure:"Cadre beton armat", floors:"P+2", basement:true, attic:false, units:"1", stairs:"8", heightBuilding:"14.50", heightFloor:"4.50", yearBuilt:2009 },
    opaque:[
      { name:"BCA 25cm + EPS 10cm + Alucobond", type:"PE", area:"3200", layers:[
        { material:"Aluminiu", thickness:"4", lambda:160.0, rho:2700 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"250", lambda:0.21, rho:600 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă XPS 14cm + skylight atrium 12%", type:"PT", area:"15000", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"140", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"220", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste 2 niv. parkare", type:"PB", area:"15000", layers:[
        { material:"Gresie ceramică", thickness:"15", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"80", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"220", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Cortină DV Low-E zone fațadă", u:"1.30", g:"0.38", area:"2200", orientation:"Mixt", frameRatio:"18" },
      { name:"Atrium ETFE acoperit", u:"2.00", g:"0.45", area:"1800", orientation:"Orizontal", frameRatio:"10" },
    ],
    bridges:[
      { name:"PE — Planșee ×3", psi:"0.08", length:"680" },
      { name:"PE — Cortină atrium", psi:"0.06", length:"850" },
    ],
  },

  // CO-EX4. Retail park parter modern (Prime Kapital/MAS REI tip, post-2020)
  { id:"RETAIL_PARK_2022", label:"Retail park parter, 2022 (PIR 12cm + PV 500kWp + LED DALI)", cat:"CO",
    building:{ category:"CO", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"3", heightBuilding:"6.00", heightFloor:"5.50", yearBuilt:2022 },
    opaque:[
      { name:"Sandwich PIR 12cm Bilka", type:"PE", area:"1800", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.022, rho:40 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Acoperiș PIR 15cm + PV 500kWp", type:"PT", area:"6500", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"150", lambda:0.022, rho:40 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Placă industrială + XPS 10cm", type:"PL", area:"6500", layers:[
        { material:"Gresie ceramică", thickness:"15", lambda:1.30, rho:2300 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Polistiren extrudat XPS", thickness:"100", lambda:0.034, rho:35 },
      ]},
    ],
    glazing:[
      { name:"Vitrină Al termorupt DV Low-E", u:"1.20", g:"0.42", area:"480", orientation:"S", frameRatio:"18" },
      { name:"Uși automate", u:"1.80", g:"0.55", area:"35", orientation:"Mixt", frameRatio:"40" },
    ],
    bridges:[
      { name:"PE — Joncțiune perete-acoperiș", psi:"0.08", length:"320" },
      { name:"PE — Soclu", psi:"0.10", length:"320" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  HOTELURI (HO) — extensii
  // ═══════════════════════════════════════════════════════════════

  // HO-EX1. Hotel modern 4* eco post-2020 (heat pump + solar termic)
  { id:"HOTEL_4ST_ECO_2021", label:"Hotel P+5 4* eco, 2021 (BCA + EPS grafitat 15cm + heat pump)", cat:"HO",
    building:{ category:"HO", structure:"Cadre beton armat", floors:"P+5", basement:true, attic:false, units:"110", stairs:"3", heightBuilding:"19.50", heightFloor:"3.10", yearBuilt:2021 },
    opaque:[
      { name:"BCA 30cm + EPS grafitat 15cm + HPL ventilat parțial", type:"PE", area:"2400", layers:[
        { material:"Aluminiu", thickness:"3", lambda:160.0, rho:2700 },
        { material:"Polistiren grafitat EPS Neo", thickness:"150", lambda:0.031, rho:17 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.10, rho:500 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă verde extensivă + solar termic", type:"PT", area:"850", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"180", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol parking + spa", type:"PB", area:"850", layers:[
        { material:"Gresie ceramică", thickness:"15", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E dublu coating + balcoane sticlă", u:"0.80", g:"0.38", area:"1450", orientation:"Mixt", frameRatio:"18" },
    ],
    bridges:[
      { name:"PE — Planșee ×6 Isokorb", psi:"0.05", length:"950" },
      { name:"PE — Balcoane sticlă", psi:"0.10", length:"380" },
      { name:"Glaf ferestre montaj RAL", psi:"0.03", length:"680" },
    ],
  },

  // HO-EX2. Pensiune montană P+1 (Voineasa/Bran/Apuseni tip)
  { id:"PENSIUNE_MONTANA_P1", label:"Pensiune montană P+1, 2018 (CLT + vată 25cm + solar termic)", cat:"HO",
    building:{ category:"HO", structure:"Lemn lamelar/CLT", floors:"P+1", basement:false, attic:true, units:"12", stairs:"1", heightBuilding:"7.20", heightFloor:"2.85", yearBuilt:2018 },
    opaque:[
      { name:"Schelet lemn + vată 25cm + EPS 8cm", type:"PE", area:"380", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"22", lambda:0.14, rho:500 },
        { material:"Polistiren expandat EPS 100", thickness:"80", lambda:0.036, rho:25 },
        { material:"Vată minerală bazaltică", thickness:"250", lambda:0.038, rho:100 },
        { material:"OSB", thickness:"18", lambda:0.13, rho:600 },
      ]},
      { name:"Acoperiș șarpantă + vată 30cm", type:"PP", area:"180", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"300", lambda:0.038, rho:100 },
        { material:"Lemn moale (brad/molid)", thickness:"180", lambda:0.14, rho:500 },
      ]},
      { name:"Placă pe sol XPS 12cm + lemn", type:"PL", area:"180", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"22", lambda:0.18, rho:600 },
        { material:"Polistiren extrudat XPS", thickness:"120", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lemn stratificat tripan Low-E argon", u:"0.85", g:"0.50", area:"58", orientation:"Mixt", frameRatio:"20" },
    ],
    bridges:[
      { name:"PE — Colț lemn", psi:"0.05", length:"28" },
      { name:"PE — Soclu", psi:"0.10", length:"42" },
      { name:"PE — Cornișă", psi:"0.08", length:"42" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  INDUSTRIAL (IN) — extensii
  // ═══════════════════════════════════════════════════════════════

  // IN-EX1. Hală depozit anii '80 (cadre metalice + sandwich vechi)
  { id:"HALA_DEPOZIT_85", label:"Hală depozit P, 1985 (cadre OL37 + sandwich MW 60mm)", cat:"IN",
    building:{ category:"IN", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"7.50", heightFloor:"7.00", yearBuilt:1985 },
    opaque:[
      { name:"Sandwich vată 60mm degradat", type:"PE", area:"1400", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"60", lambda:0.060, rho:80 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Acoperiș tablă + vată 80mm", type:"PT", area:"2400", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"80", lambda:0.060, rho:80 },
        { material:"Lemn moale (brad/molid)", thickness:"22", lambda:0.14, rho:500 },
      ]},
      { name:"Placă industrială neizolată", type:"PL", area:"2400", layers:[
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
        { material:"Nisip", thickness:"100", lambda:0.40, rho:1700 },
      ]},
    ],
    glazing:[
      { name:"Luminatoare policarbonat opac vechi", u:"3.20", g:"0.45", area:"95", orientation:"Orizontal", frameRatio:"15" },
      { name:"Uși secționale neizolante", u:"4.20", g:"0.10", area:"60", orientation:"Mixt", frameRatio:"60" },
    ],
    bridges:[
      { name:"PE — Joncțiune perete-acoperiș", psi:"0.20", length:"260" },
      { name:"PE — Soclu metalic", psi:"0.25", length:"260" },
    ],
  },

  // IN-EX2. Hală frig negativă (-25°C) PUR 200mm
  { id:"HALA_FRIG_NEG_2024", label:"Hală frig negativă -25°C, 2024 (PUR 200mm + amoniac NH3)", cat:"IN",
    building:{ category:"IN", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"11.00", heightFloor:"10.50", yearBuilt:2024 },
    opaque:[
      { name:"Sandwich PUR 200mm densitate 40kg/m³", type:"PE", area:"950", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.022, rho:40 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Acoperiș sandwich PUR 250mm", type:"PT", area:"2200", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"250", lambda:0.022, rho:40 },
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
      ]},
      { name:"Pardoseală XPS 200mm + încălzire anti-îngheț", type:"PL", area:"2200", layers:[
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"100", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Uși izolante 150mm rapide Hörmann", u:"0.45", g:"0.10", area:"45", orientation:"Mixt", frameRatio:"60" },
    ],
    bridges:[
      { name:"PE — Joncțiune lambă-uluc", psi:"0.04", length:"180" },
      { name:"PE — Soclu izolat", psi:"0.06", length:"180" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  SERVICII/AGREMENT (SA) — extensii multiple
  // ═══════════════════════════════════════════════════════════════

  // SA-EX1. Sală sport școală P, anii '80
  { id:"SALA_SPORT_SCOALA_80", label:"Sală sport școală P, 1985 (cărămidă 38 + ferme metal + ferestre fâșie sus)", cat:"SA",
    building:{ category:"SA", structure:"Zidărie portantă", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"8.50", heightFloor:"8.00", yearBuilt:1985 },
    opaque:[
      { name:"Pereți cărămidă 38cm + soclu beton", type:"PE", area:"480", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș ferme metal + tablă + vată 8cm", type:"PT", area:"560", layers:[
        { material:"Oțel", thickness:"0.5", lambda:58.0, rho:7850 },
        { material:"Vată minerală bazaltică", thickness:"80", lambda:0.060, rho:80 },
        { material:"Lemn moale (brad/molid)", thickness:"22", lambda:0.14, rho:500 },
      ]},
      { name:"Placă pe sol", type:"PL", area:"560", layers:[
        { material:"Lemn moale (brad/molid)", thickness:"22", lambda:0.18, rho:600 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre fâșie sus simplu vitraj armată", u:"5.50", g:"0.80", area:"75", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Cornișă", psi:"0.20", length:"95" },
      { name:"PE — Soclu", psi:"0.30", length:"95" },
    ],
  },

  // SA-EX2. Piscină acoperită municipală (bazin 25m)
  { id:"PISCINA_25M_MUNI", label:"Piscină municipală 25m, 2010 (BCA + EPS + UTA dezumidificare)", cat:"SA",
    building:{ category:"SA", structure:"Cadre beton armat", floors:"P", basement:true, attic:false, units:"1", stairs:"2", heightBuilding:"6.50", heightFloor:"6.00", yearBuilt:2010 },
    opaque:[
      { name:"BCA 30cm + EPS 10cm + barieră vapori", type:"PE", area:"680", layers:[
        { material:"Folie PE", thickness:"1", lambda:0.33, rho:920 },
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.21, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș lemn lamelar + vată 20cm + barieră PE", type:"PT", area:"1200", layers:[
        { material:"Folie PE", thickness:"1", lambda:0.33, rho:920 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Lemn moale (brad/molid)", thickness:"180", lambda:0.14, rho:500 },
      ]},
      { name:"Placă pe sol XPS 12cm", type:"PL", area:"1200", layers:[
        { material:"Gresie ceramică", thickness:"15", lambda:1.30, rho:2300 },
        { material:"Polistiren extrudat XPS", thickness:"120", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E argon S (câștig solar bazin)", u:"1.10", g:"0.55", area:"380", orientation:"S", frameRatio:"20" },
    ],
    bridges:[
      { name:"PE — Cornișă lemn", psi:"0.10", length:"140" },
      { name:"PE — Soclu izolat", psi:"0.12", length:"140" },
    ],
  },

  // SA-EX3. Teatru istoric anii '20-'30 (monument istoric)
  { id:"TEATRU_ISTORIC_1925", label:"Teatru istoric, 1925 (zidărie 70cm monument + restaurare ferestre)", cat:"SA",
    building:{ category:"SA", structure:"Zidărie portantă", floors:"P+2", basement:true, attic:true, units:"1", stairs:"4", heightBuilding:"22.00", heightFloor:"4.50", yearBuilt:1925 },
    opaque:[
      { name:"Zidărie piatră/cărămidă 70cm (monument)", type:"PE", area:"1850", layers:[
        { material:"Tencuială var-ciment", thickness:"30", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"700", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș șarpantă lemn + tablă + tavan stuc", type:"PP", area:"1100", layers:[
        { material:"Tablă (zinc/cupru)", thickness:"3", lambda:110.0, rho:7100 },
        { material:"Lemn moale (brad/molid)", thickness:"30", lambda:0.14, rho:500 },
        { material:"Vată minerală bazaltică", thickness:"50", lambda:0.080, rho:300 },
      ]},
      { name:"Placă subsol (pivniță)", type:"PB", area:"1100", layers:[
        { material:"Mozaic", thickness:"30", lambda:1.30, rho:2200 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn arc original (restaurate, geam secundar)", u:"4.50", g:"0.78", area:"180", orientation:"Mixt", frameRatio:"35" },
    ],
    bridges:[
      { name:"PE — Cornișă piatră ornamentală", psi:"0.30", length:"140" },
      { name:"PE — Soclu masiv", psi:"0.40", length:"140" },
    ],
  },

  // SA-EX4. Biserică ortodoxă tradițională
  { id:"BISERICA_TRADITION", label:"Biserică ortodoxă tradițională, 1900 (zidărie 80cm + pictură interioară)", cat:"SA",
    building:{ category:"SA", structure:"Zidărie portantă", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"15.00", heightFloor:"12.00", yearBuilt:1900 },
    opaque:[
      { name:"Zidărie cărămidă 80cm (pictură interior)", type:"PE", area:"650", layers:[
        { material:"Tencuială var-ciment", thickness:"30", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"800", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"30", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș șarpantă + tablă cupru + cupolă", type:"PP", area:"380", layers:[
        { material:"Tablă (zinc/cupru)", thickness:"3", lambda:110.0, rho:7100 },
        { material:"Lemn moale (brad/molid)", thickness:"30", lambda:0.14, rho:500 },
      ]},
      { name:"Placă pe sol cu lespezi", type:"PL", area:"380", layers:[
        { material:"Marmură", thickness:"40", lambda:2.80, rho:2700 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Vitralii ferestre înguste (păstrare strictă)", u:"4.80", g:"0.65", area:"35", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Cornișă", psi:"0.35", length:"95" },
      { name:"PE — Soclu masiv", psi:"0.45", length:"95" },
    ],
  },

  // SA-EX5. Bibliotecă modernă P+2
  { id:"BIBLIOTECA_MODERNA", label:"Bibliotecă modernă P+2, 2019 (BCA + EPS 15cm + lucarne nord)", cat:"SA",
    building:{ category:"SA", structure:"Cadre beton armat", floors:"P+2", basement:true, attic:false, units:"1", stairs:"3", heightBuilding:"11.50", heightFloor:"3.80", yearBuilt:2019 },
    opaque:[
      { name:"BCA 25cm + EPS 15cm", type:"PE", area:"1100", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"150", lambda:0.036, rho:25 },
        { material:"BCA (beton celular autoclavizat)", thickness:"250", lambda:0.21, rho:600 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă verde extensivă 8cm + vată 22cm", type:"PT", area:"850", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Vată minerală bazaltică", thickness:"220", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol depozit carte", type:"PB", area:"850", layers:[
        { material:"Mochetă", thickness:"10", lambda:0.06, rho:200 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"180", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Lucarne nord lumină difuză (UV-cut)", u:"1.10", g:"0.40", area:"180", orientation:"N", frameRatio:"20" },
      { name:"Tripan Low-E E (cu brisolaire)", u:"0.90", g:"0.42", area:"120", orientation:"E", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Atic verde", psi:"0.06", length:"160" },
      { name:"PE — Soclu", psi:"0.10", length:"160" },
      { name:"Glaf lucarne nord", psi:"0.04", length:"260" },
    ],
  },
];
