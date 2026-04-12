// ===============================================================
// GRILE CLASARE ENERGETICA — Cap. 5 Mc 001-2022
// ===============================================================

export const ENERGY_CLASSES_DB = {
  RI_cool: { label:"Case individuale (cu răcire)", thresholds:[91,129,257,390,522,652,783] },
  RI_nocool: { label:"Case individuale (fără răcire)", thresholds:[78,110,220,340,460,575,690] },
  RC_cool: { label:"Bloc locuințe colective (cu răcire)", thresholds:[73,101,198,297,396,495,595] },
  RC_nocool: { label:"Bloc locuințe colective (fără răcire)", thresholds:[60,84,168,260,352,440,528] },
  RA_cool: { label:"Apartament (cu răcire)", thresholds:[73,101,198,297,396,495,595] },
  RA_nocool: { label:"Apartament (fără răcire)", thresholds:[60,84,168,260,352,440,528] },
  BI: { label:"Birouri", thresholds:[68,97,193,302,410,511,614] },
  ED: { label:"Educație", thresholds:[55,78,157,248,340,425,510] },
  SA: { label:"Sănătate", thresholds:[130,190,380,570,760,950,1140] },
  HC: { label:"Hotel / Cazare", thresholds:[85,120,240,370,500,625,750] },
  CO: { label:"Comercial", thresholds:[75,107,213,330,447,558,670] },
  SP: { label:"Sport", thresholds:[70,100,200,310,420,525,630] },
  AL: { label:"Altele", thresholds:[68,97,193,302,410,511,614] },
};

export const CLASS_LABELS = ["A+","A","B","C","D","E","F","G"];
export const CLASS_COLORS = ["#009B00","#32C831","#00FF00","#FFFF00","#F39C00","#FF6400","#FE4101","#FE0000"];

// Praguri nZEB per categorie [kWh/(m2·an)] energie primara + RER minim
// Praguri nZEB conform Mc 001-2022 Tabel 2.10a — diferentiate pe zone climatice I-V
// ep_max: [zona I, zona II, zona III, zona IV, zona V] kWh/(m2·an) energie primara totala
// rer_min: 30% minim surse regenerabile (Legea 238/2024 Art.6)
// rer_onsite_min: 10% pe amplasament (Legea 238/2024 + 20% prin garantii de origine)
// ZEB (EPBD 2024/1275): ep_max * 0.9, fara emisii fosile on-site — termen transpunere 29 mai 2026
export const NZEB_THRESHOLDS = {
  RI: { ep_max: [120, 128, 133, 141, 148], rer_min: 30, rer_onsite_min: 10 },
  RC: { ep_max: [99, 104, 106, 110, 113], rer_min: 30, rer_onsite_min: 10 },
  RA: { ep_max: [99, 104, 106, 110, 113], rer_min: 30, rer_onsite_min: 10 },
  BI: { ep_max: [95, 98, 99, 101, 103], rer_min: 30, rer_onsite_min: 10 },
  ED: { ep_max: [62, 67, 71, 77, 82], rer_min: 30, rer_onsite_min: 10 },
  SA: { ep_max: [163, 169, 171, 175, 179], rer_min: 30, rer_onsite_min: 10 },
  HC: { ep_max: [97, 101, 104, 107, 112], rer_min: 30, rer_onsite_min: 10 },
  CO: { ep_max: [96, 103, 108, 115, 121], rer_min: 30, rer_onsite_min: 10 },
  SP: { ep_max: [93, 98, 100, 104, 108], rer_min: 30, rer_onsite_min: 10 },
  AL: { ep_max: [95, 98, 99, 101, 103], rer_min: 30, rer_onsite_min: 10 },
};

// Praguri CO2 per categorie [kg CO2/(m2·an)] — A+ la G (7 praguri)
// Conform Mc 001-2022 Tabele 5.7-5.14 (valorile TOTAL CO2)
export const CO2_CLASSES_DB = {
  RI: { thresholds: [16.1, 22.8, 45.5, 70.1, 94.8, 118.4, 142.1] },
  RC: { thresholds: [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9] },
  RA: { thresholds: [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9] },
  BI: { thresholds: [10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4] },
  ED: { thresholds: [8.5, 12.0, 24.0, 37.0, 50.0, 62.5, 75.0] },
  SA: { thresholds: [19.0, 27.0, 54.0, 83.0, 112.0, 140.0, 168.0] },
  HC: { thresholds: [13.0, 18.5, 37.0, 57.0, 77.0, 96.0, 115.0] },
  CO: { thresholds: [11.5, 16.4, 32.8, 50.5, 68.5, 85.5, 102.5] },
  SP: { thresholds: [10.7, 15.3, 30.5, 47.5, 64.5, 80.5, 96.5] },
  AL: { thresholds: [10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4] },
};

export const WATER_TEMP_MONTH = [5, 5, 7, 9, 12, 15, 17, 17, 14, 11, 8, 6];
