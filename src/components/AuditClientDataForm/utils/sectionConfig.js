/**
 * sectionConfig.js - Configurație secțiuni formular audit energetic
 * 6 secțiuni cu câmpuri și validare
 */

export const SECTIONS = {
  documentation: {
    label: "Documentație Clădire",
    icon: "📋",
    description: "Proprietăți și documente clădire",
    color: "blue",
    fields: [
      { id: "ownerName", label: "Nume proprietar", type: "text", required: true },
      { id: "ownerEmail", label: "Email proprietar", type: "email", required: true },
      { id: "ownerPhone", label: "Telefon proprietar", type: "tel", required: true },
      { id: "buildingAddress", label: "Adresă clădire", type: "text", required: true },
      { id: "propertyAct", label: "Act de proprietate (nr/anul)", type: "text" },
      { id: "constructionYear", label: "Anul construcției", type: "number", min: 1800, max: new Date().getFullYear() },
      { id: "urbanismCert", label: "Certificat de urbanism (dispozitie)", type: "text" },
      { id: "buildingAuthority", label: "Autorizație de construire (nr/anul)", type: "text" },
      { id: "technicalBook", label: "Cartă tehnică disponibilă?", type: "select", options: ["Da", "Nu", "Parțial"] },
      { id: "planArchitectural", label: "Planuri arhitecturale disponibile?", type: "select", options: ["Parter+niveluri", "Doar parter", "Doar secțiuni", "Nu"] },
    ]
  },
  envelope: {
    label: "Anvelopa Clădirii",
    icon: "🏠",
    description: "Izolație, ferestre, acoperiș",
    color: "green",
    fields: [
      { id: "totalBuildingArea", label: "Arie totală clădire (m²)", type: "number", min: 10, required: true },
      { id: "usefulArea", label: "Arie utilă (m²)", type: "number", min: 5 },
      { id: "buildingVolume", label: "Volum încălzit (m³)", type: "number", min: 20 },
      { id: "externalWallMaterial", label: "Material pereți exteriori", type: "text", placeholder: "ex: cărămidă, beton, piatră" },
      { id: "externalWallThickness", label: "Grosime pereți (cm)", type: "number", min: 5 },
      { id: "insulationThickness", label: "Grosime izolație (cm)", type: "number", min: 0 },
      { id: "windowsType", label: "Tip ferestre", type: "select", options: ["Simplu vitraj", "Dublu vitraj", "Triplu vitraj", "Dublu low-e", "Mixte"] },
      { id: "windowsYear", label: "Anul înlocuirii ferestrelor", type: "number", min: 1900 },
      { id: "frameProfile", label: "Profil cadru ferestre", type: "select", options: ["Lemn", "PVC", "Aluminiu", "Aluminiu cu barieră termică", "Necunoscut"] },
      { id: "roofType", label: "Tip acoperis", type: "text", placeholder: "ex: țiglă, tablă, beton" },
      { id: "roofInsulation", label: "Izolație acoperiș (cm)", type: "number", min: 0 },
      { id: "thermalBridgesPresent", label: "Punți termice vizibile?", type: "select", options: ["Da", "Nu", "Parțial izolate", "Nu stiu"] },
    ]
  },
  thermal: {
    label: "Instalații Termice",
    icon: "🔥",
    description: "Încălzire, apă caldă, ventilație",
    color: "red",
    fields: [
      { id: "heatingSystem", label: "Sistem încălzire", type: "select", options: ["Cazan gaz", "Cazan petrol", "Pompă de căldură", "Încălzire electrică", "Lemn/biomasa", "Centralizată"], required: true },
      { id: "boilerYear", label: "Anul cazanului", type: "number", min: 1900 },
      { id: "boilerPower", label: "Putere cazan (kW)", type: "number", min: 5 },
      { id: "boilerEfficiency", label: "Randament cazan (%)", type: "number", min: 50, max: 100 },
      { id: "hotWaterSystem", label: "Sistem apă caldă", type: "select", options: ["Individual (gaz)", "Individual (electric)", "Individual (solar)", "Centralizată", "Nu are"], required: true },
      { id: "hotWaterStorage", label: "Volum acumulator (litri)", type: "number", min: 0 },
      { id: "hasCooling", label: "Sistem răcire?", type: "select", options: ["Nu", "Aer condiționat", "Ventilatoare", "Ventilație naturală"] },
      { id: "coolingSystemType", label: "Tip sistem răcire", type: "text" },
      { id: "gasConsumptionYearly", label: "Consum anual gaz (m³/an)", type: "number", min: 0 },
      { id: "heatingOilConsumption", label: "Consum anual ulei (litri/an)", type: "number", min: 0 },
      { id: "ventilationType", label: "Tip ventilație", type: "select", options: ["Naturală", "Mecanică cu recuperare", "Mecanică fără recuperare"], required: true },
      { id: "ventilationDetails", label: "Detalii ventilație", type: "text", placeholder: "ex: număr extractoare, locații" },
    ]
  },
  electrical: {
    label: "Instalații Electrice",
    icon: "⚡",
    description: "Consum, fotovoltaic, iluminare",
    color: "yellow",
    fields: [
      { id: "electricityConsumptionYearly", label: "Consum anual electricitate (kWh/an)", type: "number", min: 0, required: true },
      { id: "hasPV", label: "Sistem fotovoltaic?", type: "select", options: ["Nu", "Da"] },
      { id: "pvInstalledPower", label: "Putere PV instalată (kWp)", type: "number", min: 0 },
      { id: "pvYearInstalled", label: "Anul instalării PV", type: "number", min: 2000 },
      { id: "pvAnnualProduction", label: "Producție anuală PV (kWh/an)", type: "number", min: 0 },
      { id: "hasSolarThermal", label: "Sistem solar termic?", type: "select", options: ["Nu", "Da"] },
      { id: "solarThermalArea", label: "Suprafață panouri solare (m²)", type: "number", min: 0 },
      { id: "solarThermalYear", label: "Anul instalării panouri solare", type: "number", min: 1980 },
      { id: "lightingType", label: "Tip iluminare", type: "select", options: ["Incandescență", "Halogeni", "Fluoreșcente", "LED", "Mixă"] },
      { id: "hasSmartMetering", label: "Contor inteligent?", type: "select", options: ["Nu", "Da"] },
    ]
  },
  measurements: {
    label: "Măsurători și Inspecție",
    icon: "📏",
    description: "Măsurători pe teren și stare constructivă",
    color: "purple",
    fields: [
      { id: "inspectionDate", label: "Data inspecției", type: "date", required: true },
      { id: "interiorTemperature", label: "Temperatură interioară (°C)", type: "number", min: 10, max: 35 },
      { id: "exteriorTemperature", label: "Temperatură exterioară (°C)", type: "number", min: -30, max: 50 },
      { id: "relativeHumidity", label: "Umiditate relativă (%)", type: "number", min: 0, max: 100 },
      { id: "envelopeCondition", label: "Starea anvelopei", type: "select", options: ["Bună", "Satisfăcătoare", "Precară", "Distrugere avansată"] },
      { id: "roofCondition", label: "Starea acoperișului", type: "select", options: ["Bună", "Necesită reparații minore", "Necesită reparații majore", "Schimbare necesară"] },
      { id: "windowsCondition", label: "Starea ferestrelor", type: "select", options: ["Bună", "Necessită reglare", "Necesită înlocuire"] },
      { id: "moistureIssues", label: "Probleme de umiditate?", type: "select", options: ["Nu", "Ușoare", "Moderate", "Grave"] },
      { id: "thermalPhotosAvailable", label: "Camera termică disponibilă?", type: "select", options: ["Nu", "Da"] },
      { id: "infiltrationTests", label: "Test infiltrații (blower door)?", type: "select", options: ["Nu", "Planificat", "Făcut"] },
    ]
  },
  admin: {
    label: "Informații Administrative",
    icon: "📄",
    description: "Date auditor și clasificare audit",
    color: "indigo",
    fields: [
      { id: "auditorName", label: "Nume auditor energetic", type: "text", required: true },
      { id: "auditorRegistry", label: "Nr. înregistrare auditor", type: "text", required: true },
      { id: "auditorCompany", label: "Companie auditor", type: "text" },
      { id: "auditType", label: "Tip audit", type: "select", options: ["CPE obligatoriu", "Audit energetic complet", "Audit simplified", "Diagnostic", "Urmărire rehab"], required: true },
      { id: "occupancyType", label: "Tip ocupare clădire", type: "select", options: ["Rezidență permanentă", "Rezidență sezonieră", "Birou", "Comercial", "Instituție", "Mixt"], required: true },
      { id: "occupantsNumber", label: "Numărul de ocupanți", type: "number", min: 1 },
      { id: "hasElectricHeating", label: "Încălzire electrică?", type: "select", options: ["Nu", "Parțial", "Total"] },
      { id: "financialDocumentsAvailable", label: "Documente financiare disponibile (facturi)?", type: "select", options: ["Ultimele 3 luni", "Ultimul an", "Ultimii 3 ani", "Nu"] },
      { id: "budgetForRehab", label: "Buget estimat pentru reabilitare (RON)", type: "number", min: 0 },
      { id: "notesAndObservations", label: "Note și observații suplimentare", type: "textarea", maxLength: 500 },
    ]
  }
};

// Obține toate secțiunile ca array pentru iterare
export const SECTIONS_ARRAY = Object.entries(SECTIONS).map(([key, section]) => ({
  key,
  ...section
}));

// Obține lista ordinelor secțiunilor pentru navigație
export const SECTION_KEYS = Object.keys(SECTIONS);

// Obține numărul total de câmpuri
export const TOTAL_FIELDS_COUNT = Object.values(SECTIONS).reduce((sum, section) => sum + section.fields.length, 0);

// Obține numărul total de câmpuri obligatorii
export const TOTAL_REQUIRED_FIELDS_COUNT = Object.values(SECTIONS).reduce(
  (sum, section) => sum + section.fields.filter(f => f.required).length,
  0
);
