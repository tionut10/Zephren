export const PRODUCT_CATALOG = {
  // ─── FERESTRE / WINDOWS ───────────────────────────────────────────
  windows: [
    // Rehau
    { brand:"Rehau", model:"Brillant-Design 70mm", u:1.30, g:0.62, type:"PVC dublu", price:160 },
    { brand:"Rehau", model:"Synego 80mm", u:1.00, g:0.55, type:"PVC tripan", price:240 },
    { brand:"Rehau", model:"Geneo PHZ", u:0.70, g:0.50, type:"PVC tripan Passivhaus", price:380 },
    { brand:"Rehau", model:"Geneo MD", u:0.78, g:0.52, type:"PVC tripan design", price:360 },
    { brand:"Rehau", model:"Euro-Design 86+", u:0.86, g:0.53, type:"PVC tripan", price:280 },
    // Veka
    { brand:"Veka", model:"Softline 82 AD", u:0.95, g:0.53, type:"PVC tripan", price:250 },
    { brand:"Veka", model:"Alphaline 90", u:0.80, g:0.50, type:"PVC tripan", price:320 },
    { brand:"Veka", model:"Spectral", u:0.88, g:0.51, type:"PVC tripan design", price:340 },
    { brand:"Veka", model:"Softline 70 AD", u:1.20, g:0.60, type:"PVC dublu", price:170 },
    // Gealan
    { brand:"Gealan", model:"S 9000", u:0.90, g:0.52, type:"PVC tripan", price:260 },
    { brand:"Gealan", model:"Kubus", u:0.80, g:0.50, type:"PVC tripan design", price:350 },
    { brand:"Gealan", model:"Linear", u:0.85, g:0.51, type:"PVC tripan", price:300 },
    { brand:"Gealan", model:"S 8000 IQ+", u:1.10, g:0.58, type:"PVC dublu/tripan", price:200 },
    // Salamander
    { brand:"Salamander", model:"bluEvolution 82", u:0.90, g:0.52, type:"PVC tripan", price:270 },
    { brand:"Salamander", model:"bluEvolution 92", u:0.85, g:0.51, type:"PVC tripan", price:290 },
    { brand:"Salamander", model:"StreamLine 76", u:1.10, g:0.57, type:"PVC dublu/tripan", price:195 },
    // Internorm
    { brand:"Internorm", model:"KF 500", u:0.70, g:0.48, type:"PVC-aluminiu tripan", price:420 },
    { brand:"Internorm", model:"KF 520", u:0.67, g:0.47, type:"PVC-aluminiu tripan", price:460 },
    { brand:"Internorm", model:"HF 510", u:0.72, g:0.49, type:"Lemn-aluminiu tripan", price:520 },
    { brand:"Internorm", model:"AT 410", u:1.00, g:0.50, type:"Aluminiu tripan", price:480 },
    // Schuco
    { brand:"Schüco", model:"LivIng 82 MD", u:0.86, g:0.52, type:"PVC tripan", price:310 },
    { brand:"Schüco", model:"CT 70 Classic", u:1.30, g:0.62, type:"PVC dublu", price:175 },
    { brand:"Schüco", model:"AWS 75 SI+", u:1.20, g:0.50, type:"Aluminiu dublu/tripan", price:400 },
    // Kommerling
    { brand:"Kömmerling", model:"88+", u:0.82, g:0.51, type:"PVC tripan", price:295 },
    { brand:"Kömmerling", model:"76 MD", u:1.00, g:0.55, type:"PVC tripan", price:230 },
    { brand:"Kömmerling", model:"76 AD", u:1.10, g:0.58, type:"PVC dublu/tripan", price:210 },
    // Aluplast
    { brand:"Aluplast", model:"Ideal 4000", u:1.30, g:0.62, type:"PVC dublu", price:145 },
    { brand:"Aluplast", model:"Ideal 7000", u:0.95, g:0.54, type:"PVC tripan", price:220 },
    { brand:"Aluplast", model:"Ideal 8000", u:0.85, g:0.51, type:"PVC tripan", price:275 },
    // Deceuninck
    { brand:"Deceuninck", model:"Elegant", u:1.10, g:0.57, type:"PVC dublu/tripan", price:185 },
    { brand:"Deceuninck", model:"Zendow#neo", u:0.90, g:0.52, type:"PVC tripan", price:260 },
    // Cortizo (aluminiu)
    { brand:"Cortizo", model:"COR 80 Industrial", u:1.40, g:0.50, type:"Aluminiu dublu", price:350 },
    // Aluprof (aluminiu)
    { brand:"Aluprof", model:"MB-86 SI", u:0.90, g:0.50, type:"Aluminiu tripan", price:420 },
    { brand:"Aluprof", model:"MB-104 Passive", u:0.70, g:0.47, type:"Aluminiu tripan Passivhaus", price:550 },
    // FAKRO (ferestre mansardă)
    { brand:"FAKRO", model:"FTT U8 Thermo", u:0.58, g:0.47, type:"Lemn mansardă tripan", price:600 },
    // Velux (ferestre mansardă)
    { brand:"Velux", model:"GGL/GGU Premium", u:1.00, g:0.53, type:"Lemn/PVC mansardă tripan", price:550 },
  ],

  // ─── POMPE DE CĂLDURĂ / HEAT PUMPS ────────────────────────────────
  heatPumps: [
    // Daikin
    { brand:"Daikin", model:"Altherma 3 H HT 8kW", cop:4.30, type:"Aer-apă", power:8, price:8500 },
    { brand:"Daikin", model:"Altherma 3 H HT 12kW", cop:4.10, type:"Aer-apă", power:12, price:10500 },
    { brand:"Daikin", model:"Altherma 3 H HT 16kW", cop:3.95, type:"Aer-apă", power:16, price:12500 },
    { brand:"Daikin", model:"Altherma 3 R 4kW", cop:4.60, type:"Aer-apă", power:4, price:6500 },
    { brand:"Daikin", model:"Altherma 3 R 8kW", cop:4.35, type:"Aer-apă", power:8, price:8000 },
    // Viessmann
    { brand:"Viessmann", model:"Vitocal 250-A 6kW", cop:4.60, type:"Aer-apă", power:6, price:7800 },
    { brand:"Viessmann", model:"Vitocal 250-A 8kW", cop:4.50, type:"Aer-apă", power:8, price:9000 },
    { brand:"Viessmann", model:"Vitocal 250-A 10kW", cop:4.40, type:"Aer-apă", power:10, price:10200 },
    { brand:"Viessmann", model:"Vitocal 250-A 13kW", cop:4.20, type:"Aer-apă", power:13, price:12000 },
    { brand:"Viessmann", model:"Vitocal 252-A 8kW", cop:4.45, type:"Aer-apă + ACM", power:8, price:10500 },
    { brand:"Viessmann", model:"Vitocal 333-G 6kW", cop:5.10, type:"Sol-apă", power:6, price:15000 },
    // Bosch
    { brand:"Bosch", model:"Compress 7400i AW 5kW", cop:4.50, type:"Aer-apă", power:5, price:6800 },
    { brand:"Bosch", model:"Compress 7400i AW 7kW", cop:4.40, type:"Aer-apă", power:7, price:7500 },
    { brand:"Bosch", model:"Compress 7400i AW 9kW", cop:4.30, type:"Aer-apă", power:9, price:8800 },
    { brand:"Bosch", model:"Compress 7400i AW 12kW", cop:4.15, type:"Aer-apă", power:12, price:10000 },
    { brand:"Bosch", model:"Compress 6000 AW 7kW", cop:4.20, type:"Aer-apă", power:7, price:6200 },
    // Vaillant
    { brand:"Vaillant", model:"aroTHERM plus 5kW", cop:4.50, type:"Aer-apă", power:5, price:7200 },
    { brand:"Vaillant", model:"aroTHERM plus 8kW", cop:4.40, type:"Aer-apă", power:8, price:8500 },
    { brand:"Vaillant", model:"aroTHERM plus 10kW", cop:4.35, type:"Aer-apă", power:10, price:9500 },
    { brand:"Vaillant", model:"aroTHERM plus 12kW", cop:4.20, type:"Aer-apă", power:12, price:10800 },
    { brand:"Vaillant", model:"flexoTHERM exclusive 10kW", cop:5.00, type:"Sol-apă", power:10, price:14500 },
    // Nibe
    { brand:"Nibe", model:"F2120-8 8kW", cop:4.55, type:"Aer-apă", power:8, price:9500 },
    { brand:"Nibe", model:"F2120-12 12kW", cop:4.50, type:"Aer-apă", power:12, price:11000 },
    { brand:"Nibe", model:"F2120-16 16kW", cop:4.35, type:"Aer-apă", power:16, price:13000 },
    { brand:"Nibe", model:"F2120-20 20kW", cop:4.20, type:"Aer-apă", power:20, price:15000 },
    { brand:"Nibe", model:"S1255 PC 6kW", cop:5.20, type:"Sol-apă", power:6, price:14500 },
    { brand:"Nibe", model:"S1255 PC 8kW", cop:5.10, type:"Sol-apă", power:8, price:15500 },
    { brand:"Nibe", model:"S1255 PC 12kW", cop:5.00, type:"Sol-apă", power:12, price:17000 },
    { brand:"Nibe", model:"F1355-43 43kW", cop:4.80, type:"Sol-apă", power:43, price:28000 },
    // Mitsubishi
    { brand:"Mitsubishi", model:"Ecodan 6kW", cop:4.25, type:"Aer-apă", power:6, price:7000 },
    { brand:"Mitsubishi", model:"Ecodan 8.5kW", cop:4.15, type:"Aer-apă", power:8.5, price:8200 },
    { brand:"Mitsubishi", model:"Ecodan 11.2kW", cop:4.00, type:"Aer-apă", power:11.2, price:9800 },
    { brand:"Mitsubishi", model:"Ecodan 14kW", cop:3.90, type:"Aer-apă", power:14, price:11500 },
    // Panasonic
    { brand:"Panasonic", model:"Aquarea 5kW", cop:4.35, type:"Aer-apă", power:5, price:5800 },
    { brand:"Panasonic", model:"Aquarea 7kW", cop:4.25, type:"Aer-apă", power:7, price:6800 },
    { brand:"Panasonic", model:"Aquarea 9kW", cop:4.15, type:"Aer-apă", power:9, price:7800 },
    { brand:"Panasonic", model:"Aquarea 12kW", cop:4.00, type:"Aer-apă", power:12, price:9200 },
    { brand:"Panasonic", model:"Aquarea 16kW", cop:3.85, type:"Aer-apă", power:16, price:11000 },
    // Samsung
    { brand:"Samsung", model:"EHS Mono HT Quiet 8kW", cop:4.40, type:"Aer-apă", power:8, price:7500 },
    { brand:"Samsung", model:"EHS Mono HT Quiet 12kW", cop:4.20, type:"Aer-apă", power:12, price:9500 },
    { brand:"Samsung", model:"EHS Mono HT Quiet 16kW", cop:4.05, type:"Aer-apă", power:16, price:11500 },
    // LG
    { brand:"LG", model:"Therma V R290 9kW", cop:4.50, type:"Aer-apă", power:9, price:8000 },
    { brand:"LG", model:"Therma V R290 12kW", cop:4.35, type:"Aer-apă", power:12, price:9800 },
    { brand:"LG", model:"Therma V R290 16kW", cop:4.20, type:"Aer-apă", power:16, price:12000 },
    // Toshiba
    { brand:"Toshiba", model:"Estia 8kW", cop:4.20, type:"Aer-apă", power:8, price:7200 },
    { brand:"Toshiba", model:"Estia 11kW", cop:4.05, type:"Aer-apă", power:11, price:8800 },
    { brand:"Toshiba", model:"Estia 14kW", cop:3.90, type:"Aer-apă", power:14, price:10500 },
    // Buderus
    { brand:"Buderus", model:"Logatherm WLW196i 6kW", cop:4.40, type:"Aer-apă", power:6, price:7500 },
    { brand:"Buderus", model:"Logatherm WLW196i 8kW", cop:4.30, type:"Aer-apă", power:8, price:8500 },
    { brand:"Buderus", model:"Logatherm WLW196i 10kW", cop:4.20, type:"Aer-apă", power:10, price:9800 },
    { brand:"Buderus", model:"Logatherm WLW196i 12kW", cop:4.10, type:"Aer-apă", power:12, price:11000 },
    // Wolf
    { brand:"Wolf", model:"CHA-Monoblock 7kW", cop:4.35, type:"Aer-apă", power:7, price:7800 },
    { brand:"Wolf", model:"CHA-Monoblock 10kW", cop:4.25, type:"Aer-apă", power:10, price:9200 },
    { brand:"Wolf", model:"CHA-Monoblock 14kW", cop:4.10, type:"Aer-apă", power:14, price:11000 },
    // Stiebel Eltron
    { brand:"Stiebel Eltron", model:"WPL 15 AS", cop:4.30, type:"Aer-apă", power:15, price:12000 },
    { brand:"Stiebel Eltron", model:"WPL 25 A", cop:5.00, type:"Sol-apă", power:25, price:18000 },
    // Atlantic
    { brand:"Atlantic", model:"Alfea Excellia AI 8kW", cop:4.35, type:"Aer-apă", power:8, price:7800 },
    { brand:"Atlantic", model:"Alfea Excellia AI 11kW", cop:4.20, type:"Aer-apă", power:11, price:9200 },
    { brand:"Atlantic", model:"Alfea Excellia AI 14kW", cop:4.05, type:"Aer-apă", power:14, price:11000 },
  ],

  // ─── PANOURI FOTOVOLTAICE / PV PANELS ─────────────────────────────
  pvPanels: [
    // LONGi
    { brand:"LONGi", model:"Hi-MO 6 550W", power:550, efficiency:22.0, price:155, type:"Monocristalin PERC" },
    { brand:"LONGi", model:"Hi-MO 6 580W", power:580, efficiency:22.3, price:175, type:"Monocristalin PERC" },
    { brand:"LONGi", model:"Hi-MO X6 585W", power:585, efficiency:22.8, price:195, type:"Monocristalin HPC" },
    { brand:"LONGi", model:"Hi-MO 9 600W", power:600, efficiency:23.2, price:210, type:"Monocristalin HPBC", note:"Ultimă generație 2025" },
    // JA Solar
    { brand:"JA Solar", model:"DeepBlue 4.0 Pro 570W", power:570, efficiency:22.0, price:160, type:"Monocristalin n-type" },
    { brand:"JA Solar", model:"DeepBlue 4.0 Pro 580W", power:580, efficiency:22.3, price:170, type:"Monocristalin n-type" },
    { brand:"JA Solar", model:"JAM72D40 580W", power:580, efficiency:22.4, price:175, type:"Monocristalin TOPCon" },
    // Canadian Solar
    { brand:"Canadian Solar", model:"TOPBiHiKu7 600W", power:600, efficiency:22.5, price:190, type:"Monocristalin TOPCon", note:"Bifacial" },
    { brand:"Canadian Solar", model:"HiKu7 580W", power:580, efficiency:22.0, price:170, type:"Monocristalin TOPCon" },
    // Trina Solar
    { brand:"Trina Solar", model:"Vertex S+ 440W", power:440, efficiency:22.0, price:130, type:"Monocristalin n-type", note:"Rezidențial" },
    { brand:"Trina Solar", model:"Vertex S+ 450W", power:450, efficiency:22.3, price:140, type:"Monocristalin n-type", note:"Rezidențial" },
    { brand:"Trina Solar", model:"Vertex N 580W", power:580, efficiency:22.4, price:180, type:"Monocristalin TOPCon" },
    { brand:"Trina Solar", model:"Vertex N 600W", power:600, efficiency:22.8, price:200, type:"Monocristalin TOPCon" },
    // REC
    { brand:"REC", model:"Alpha Pure-R 430W", power:430, efficiency:22.6, price:210, type:"HJT", note:"Garanție 25 ani" },
    { brand:"REC", model:"TwinPeak 5 415W", power:415, efficiency:21.6, price:175, type:"Monocristalin PERC" },
    // SunPower
    { brand:"SunPower", model:"Maxeon 7 425W", power:425, efficiency:24.0, price:280, type:"IBC", note:"Eficiență maximă" },
    { brand:"SunPower", model:"Performance 6 420W", power:420, efficiency:21.8, price:180, type:"Monocristalin PERC" },
    // Jinko Solar
    { brand:"Jinko Solar", model:"Tiger Neo 580W", power:580, efficiency:22.5, price:165, type:"Monocristalin TOPCon" },
    { brand:"Jinko Solar", model:"Tiger Neo 600W", power:600, efficiency:23.0, price:185, type:"Monocristalin TOPCon" },
    { brand:"Jinko Solar", model:"Tiger Pro 550W", power:550, efficiency:21.3, price:145, type:"Monocristalin PERC" },
    // Risen Energy
    { brand:"Risen Energy", model:"Titan S 445W", power:445, efficiency:22.2, price:130, type:"Monocristalin TOPCon", note:"Rezidențial" },
    { brand:"Risen Energy", model:"HJT 440W", power:440, efficiency:22.5, price:160, type:"HJT" },
    // Q CELLS
    { brand:"Q CELLS", model:"Q.TRON 430W", power:430, efficiency:21.8, price:165, type:"Monocristalin TOPCon" },
    { brand:"Q CELLS", model:"Q.TRON BLK-M+ 400W", power:400, efficiency:21.4, price:155, type:"Monocristalin TOPCon", note:"All-black design" },
    // Meyer Burger
    { brand:"Meyer Burger", model:"Glass 390W", power:390, efficiency:21.0, price:220, type:"HJT", note:"Fabricat în UE" },
    // Hyundai
    { brand:"Hyundai", model:"HiE-S 445W", power:445, efficiency:22.2, price:155, type:"Monocristalin TOPCon" },
    // Astronergy
    { brand:"Astronergy", model:"ASTRO N 580W", power:580, efficiency:22.4, price:160, type:"Monocristalin TOPCon" },
    // DAS Solar
    { brand:"DAS Solar", model:"DAS-DH 600W", power:600, efficiency:22.6, price:175, type:"Monocristalin TOPCon", note:"Bifacial" },
  ],

  // ─── INVERTOARE / INVERTERS ───────────────────────────────────────
  inverters: [
    // Fronius
    { brand:"Fronius", model:"Symo GEN24 3.0 Plus", power:3, efficiency:97.0, price:1200, hybrid:true },
    { brand:"Fronius", model:"Symo GEN24 5.0 Plus", power:5, efficiency:97.2, price:1500, hybrid:true },
    { brand:"Fronius", model:"Symo GEN24 6.0 Plus", power:6, efficiency:97.3, price:1700, hybrid:true },
    { brand:"Fronius", model:"Symo GEN24 8.0 Plus", power:8, efficiency:97.4, price:2000, hybrid:true },
    { brand:"Fronius", model:"Symo GEN24 10.0 Plus", power:10, efficiency:97.5, price:2400, hybrid:true },
    { brand:"Fronius", model:"Primo GEN24 3.0", power:3, efficiency:97.0, price:1100, hybrid:true },
    { brand:"Fronius", model:"Primo GEN24 5.0", power:5, efficiency:97.2, price:1350, hybrid:true },
    { brand:"Fronius", model:"Primo GEN24 6.0", power:6, efficiency:97.3, price:1550, hybrid:true },
    // SMA
    { brand:"SMA", model:"Sunny Tripower 5.0", power:5, efficiency:97.5, price:1400, hybrid:false },
    { brand:"SMA", model:"Sunny Tripower 8.0", power:8, efficiency:97.8, price:2100, hybrid:false },
    { brand:"SMA", model:"Sunny Tripower 15.0", power:15, efficiency:98.0, price:3200, hybrid:false },
    { brand:"SMA", model:"Sunny Tripower 25.0", power:25, efficiency:98.2, price:4500, hybrid:false },
    { brand:"SMA", model:"Sunny Boy Storage 5.0", power:5, efficiency:96.5, price:1600, hybrid:true },
    // Huawei
    { brand:"Huawei", model:"SUN2000-3KTL-M1", power:3, efficiency:98.2, price:750, hybrid:false },
    { brand:"Huawei", model:"SUN2000-5KTL-M1", power:5, efficiency:98.4, price:1100, hybrid:false },
    { brand:"Huawei", model:"SUN2000-10KTL-M1", power:10, efficiency:98.6, price:1800, hybrid:false },
    { brand:"Huawei", model:"SUN2000-20KTL-M3", power:20, efficiency:98.7, price:2800, hybrid:false },
    { brand:"Huawei", model:"SUN2000-5KTL-M1 (SE)", power:5, efficiency:98.4, price:1400, hybrid:true },
    { brand:"Huawei", model:"SUN2000-10KTL-M1 (SE)", power:10, efficiency:98.6, price:2200, hybrid:true },
    // SolarEdge
    { brand:"SolarEdge", model:"SE3K", power:3, efficiency:97.5, price:1200, hybrid:false },
    { brand:"SolarEdge", model:"SE5K", power:5, efficiency:97.7, price:1500, hybrid:false },
    { brand:"SolarEdge", model:"SE8K", power:8, efficiency:97.8, price:2000, hybrid:false },
    { brand:"SolarEdge", model:"SE10K", power:10, efficiency:97.9, price:2300, hybrid:false },
    // GoodWe
    { brand:"GoodWe", model:"GW5048-EM", power:5, efficiency:97.0, price:1100, hybrid:true },
    { brand:"GoodWe", model:"GW10K-ET", power:10, efficiency:97.5, price:1800, hybrid:true },
    // Growatt
    { brand:"Growatt", model:"SPH 3000", power:3, efficiency:97.0, price:800, hybrid:true },
    { brand:"Growatt", model:"SPH 5000", power:5, efficiency:97.2, price:1000, hybrid:true },
    { brand:"Growatt", model:"SPH 10000", power:10, efficiency:97.5, price:1600, hybrid:true },
    { brand:"Growatt", model:"MIN 2500TL-XE", power:2.5, efficiency:97.0, price:500, hybrid:false },
    { brand:"Growatt", model:"MIN 6000TL-XE", power:6, efficiency:97.5, price:900, hybrid:false },
    // Deye
    { brand:"Deye", model:"SUN-5K-SG04LP3", power:5, efficiency:97.0, price:1000, hybrid:true },
    { brand:"Deye", model:"SUN-8K-SG04LP3", power:8, efficiency:97.2, price:1400, hybrid:true },
    { brand:"Deye", model:"SUN-12K-SG04LP3", power:12, efficiency:97.5, price:1900, hybrid:true },
    // Sungrow
    { brand:"Sungrow", model:"SG5.0RT", power:5, efficiency:98.3, price:1100, hybrid:false },
    { brand:"Sungrow", model:"SG10RT", power:10, efficiency:98.5, price:1700, hybrid:false },
    { brand:"Sungrow", model:"SG15RT", power:15, efficiency:98.6, price:2400, hybrid:false },
    // Victron
    { brand:"Victron", model:"MultiPlus-II 48/5000", power:5, efficiency:96.0, price:1800, hybrid:true },
  ],

  // ─── BATERII / BATTERIES ──────────────────────────────────────────
  batteries: [
    // BYD
    { brand:"BYD", model:"Battery-Box Premium HVS 5.1", capacity:5.1, power:5.1, cycles:10000, price:3200, chemistry:"LFP" },
    { brand:"BYD", model:"Battery-Box Premium HVS 10.2", capacity:10.2, power:5.1, cycles:10000, price:5800, chemistry:"LFP" },
    { brand:"BYD", model:"Battery-Box Premium HVS 12.8", capacity:12.8, power:5.1, cycles:10000, price:7200, chemistry:"LFP" },
    // Huawei
    { brand:"Huawei", model:"LUNA2000-5-S0", capacity:5, power:5, cycles:6000, price:3000, chemistry:"LFP" },
    { brand:"Huawei", model:"LUNA2000-10-S0", capacity:10, power:5, cycles:6000, price:5500, chemistry:"LFP" },
    { brand:"Huawei", model:"LUNA2000-15-S0", capacity:15, power:5, cycles:6000, price:7800, chemistry:"LFP" },
    // Pylontech
    { brand:"Pylontech", model:"Force H2 3.55", capacity:3.55, power:3.5, cycles:6000, price:2000, chemistry:"LFP" },
    { brand:"Pylontech", model:"Force H2 7.1", capacity:7.1, power:3.5, cycles:6000, price:3800, chemistry:"LFP" },
    { brand:"Pylontech", model:"Force H2 10.65", capacity:10.65, power:3.5, cycles:6000, price:5500, chemistry:"LFP" },
    // Tesla
    { brand:"Tesla", model:"Powerwall 3", capacity:13.5, power:11.5, cycles:5000, price:9500, chemistry:"LFP" },
    // LG
    { brand:"LG", model:"RESU Prime 10H", capacity:9.6, power:5, cycles:6000, price:5500, chemistry:"NMC" },
    { brand:"LG", model:"RESU Prime 16H", capacity:16, power:7, cycles:6000, price:8500, chemistry:"NMC" },
    // Sonnen
    { brand:"Sonnen", model:"sonnenbatterie 10 5.5", capacity:5.5, power:3.3, cycles:10000, price:5000, chemistry:"LFP" },
    { brand:"Sonnen", model:"sonnenbatterie 10 11", capacity:11, power:4.6, cycles:10000, price:8500, chemistry:"LFP" },
    { brand:"Sonnen", model:"sonnenbatterie 10 16.5", capacity:16.5, power:4.6, cycles:10000, price:12000, chemistry:"LFP" },
    // Alpha ESS
    { brand:"Alpha ESS", model:"SMILE-T10", capacity:10.1, power:5, cycles:6000, price:4800, chemistry:"LFP" },
  ],

  // ─── CENTRALE TERMICE / BOILERS ───────────────────────────────────
  boilers: [
    // Viessmann
    { brand:"Viessmann", model:"Vitodens 200-W 19kW", power:19, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:3200 },
    { brand:"Viessmann", model:"Vitodens 200-W 26kW", power:26, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:3600 },
    { brand:"Viessmann", model:"Vitodens 200-W 35kW", power:35, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:4200 },
    { brand:"Viessmann", model:"Vitodens 100-W 26kW", power:26, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:2400 },
    // Vaillant
    { brand:"Vaillant", model:"ecoTEC plus 20kW", power:20, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:2800 },
    { brand:"Vaillant", model:"ecoTEC plus 25kW", power:25, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:3000 },
    { brand:"Vaillant", model:"ecoTEC plus 34kW", power:34, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:3500 },
    { brand:"Vaillant", model:"ecoTEC exclusive 28kW", power:28, efficiency:0.99, fuel:"Gaz", type:"Condensare", price:4200 },
    // Bosch
    { brand:"Bosch", model:"Condens 7000 W 24kW", power:24, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:2800 },
    { brand:"Bosch", model:"Condens 2300i W 24kW", power:24, efficiency:0.96, fuel:"Gaz", type:"Condensare", price:1800 },
    // Buderus
    { brand:"Buderus", model:"Logamax plus GB192i 25kW", power:25, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:2600 },
    // Wolf
    { brand:"Wolf", model:"CGB-2 14kW", power:14, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:2400 },
    { brand:"Wolf", model:"CGB-2 20kW", power:20, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:2700 },
    { brand:"Wolf", model:"CGB-2 24kW", power:24, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:3000 },
    // Ariston
    { brand:"Ariston", model:"Clas One 24kW", power:24, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1600 },
    { brand:"Ariston", model:"Clas One 30kW", power:30, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1800 },
    { brand:"Ariston", model:"Clas One 35kW", power:35, efficiency:0.96, fuel:"Gaz", type:"Condensare", price:2000 },
    { brand:"Ariston", model:"Genus One 24kW", power:24, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:2000 },
    // Immergas
    { brand:"Immergas", model:"Victrix Tera 24kW", power:24, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1700 },
    { brand:"Immergas", model:"Victrix Tera 28kW", power:28, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1900 },
    { brand:"Immergas", model:"Victrix Tera 32kW", power:32, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:2100 },
    // Baxi
    { brand:"Baxi", model:"Luna Duo-Tec E+ 24kW", power:24, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1600 },
    { brand:"Baxi", model:"Luna Duo-Tec E+ 28kW", power:28, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1800 },
    { brand:"Baxi", model:"Luna Duo-Tec E+ 33kW", power:33, efficiency:0.96, fuel:"Gaz", type:"Condensare", price:2000 },
    // Ferroli
    { brand:"Ferroli", model:"Bluehelix Pro 25kW", power:25, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1500 },
    { brand:"Ferroli", model:"Bluehelix Pro 32kW", power:32, efficiency:0.96, fuel:"Gaz", type:"Condensare", price:1800 },
    // Protherm
    { brand:"Protherm", model:"Gepard Condens 12kW", power:12, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1300 },
    { brand:"Protherm", model:"Gepard Condens 18kW", power:18, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1500 },
    { brand:"Protherm", model:"Gepard Condens 25kW", power:25, efficiency:0.97, fuel:"Gaz", type:"Condensare", price:1700 },
    { brand:"Protherm", model:"Pantera Condens 25kW", power:25, efficiency:0.98, fuel:"Gaz", type:"Condensare", price:2200 },
  ],
};

export const STEPS = [
  { id:1, label:"Identificare", labelEN:"Identification", icon:"\u{1F4CB}", desc:"Date generale cl\u0103dire", descEN:"General building data" },
  { id:2, label:"Anvelop\u0103", labelEN:"Envelope", icon:"\u{1F3D7}\uFE0F", desc:"Elemente constructive", descEN:"Building elements" },
  { id:3, label:"Instala\u021Bii", labelEN:"Systems", icon:"\u2699\uFE0F", desc:"\u00CEnc\u0103lzire, ACM, clima", descEN:"Heating, DHW, HVAC" },
  { id:4, label:"Regenerabile", labelEN:"Renewables", icon:"\u2600\uFE0F", desc:"Surse energie verde", descEN:"Green energy" },
  { id:5, label:"Calcul", labelEN:"Calculation", icon:"\u{1F4CA}", desc:"Bilan\u021B energetic", descEN:"Energy balance" },
  { id:6, label:"Certificat", labelEN:"Certificate", icon:"\u{1F4DC}", desc:"Clasare & CPE", descEN:"Classification & EPC" },
  { id:7, label:"Audit", labelEN:"Audit", icon:"\u{1F50D}", desc:"Recomand\u0103ri", descEN:"Recommendations" },
];
