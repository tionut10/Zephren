/**
 * sectionConfig.js — Configurație secțiuni formular client
 *
 * Sprint Client-Form-v2 (8 mai 2026)
 *
 * Formular simplificat destinat CLIENTULUI (proprietar clădire) care solicită
 * CPE și/sau Audit Energetic. Conține exclusiv informații pe care clientul
 * le cunoaște fără pregătire tehnică: identitate, clădire, scop, dotări
 * de bază, documente disponibile și acord GDPR.
 *
 * 6 secțiuni · 22 câmpuri esențiale + 8 opționale = ~30 total
 * Timp completare estimat: 5-7 minute
 */

const COUNTIES_RO = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
  "Brăila", "Brașov", "București", "Buzău", "Călărași", "Caraș-Severin",
  "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș",
  "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Sălaj", "Satu Mare",
  "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea",
];

export const SECTIONS = {
  identity: {
    label: "Cine ești?",
    icon: "👤",
    description: "Date de identificare proprietar — din buletin sau certificat ONRC",
    color: "blue",
    fields: [
      {
        id: "ownerType",
        label: "Tip proprietar",
        type: "select",
        required: true,
        options: ["Persoană Fizică (PF)", "Persoană Juridică (PJ)"],
      },
      {
        id: "ownerName",
        label: "Nume complet / Denumire firmă",
        type: "text",
        required: true,
        placeholder: "ex: Ionescu Maria sau SC Exemplu SRL",
      },
      {
        id: "ownerCNP",
        label: "CNP (Persoană Fizică)",
        type: "text",
        placeholder: "13 cifre",
        hint: "Obligatoriu PF — mascat în documente (ultimele 6 cifre ascunse)",
      },
      {
        id: "ownerCUI",
        label: "CUI (Persoană Juridică)",
        type: "text",
        placeholder: "ex: RO12345678",
        hint: "Obligatoriu PJ",
      },
      {
        id: "ownerAddress",
        label: "Adresa de domiciliu / sediu",
        type: "text",
        required: true,
        placeholder: "Str. Florilor nr. 12, ap. 3",
      },
      {
        id: "ownerCity",
        label: "Localitate domiciliu",
        type: "text",
        required: true,
        placeholder: "ex: Cluj-Napoca",
      },
      {
        id: "ownerEmail",
        label: "Email contact",
        type: "email",
        required: true,
        placeholder: "email@exemplu.ro",
      },
      {
        id: "ownerPhone",
        label: "Telefon contact",
        type: "tel",
        required: true,
        placeholder: "07XX XXX XXX",
      },
    ],
  },

  building: {
    label: "Clădirea ta",
    icon: "🏠",
    description: "Identificare și date de bază ale clădirii — din acte de proprietate",
    color: "green",
    fields: [
      {
        id: "buildingAddress",
        label: "Adresă clădire",
        type: "text",
        required: true,
        placeholder: "Str. Principală nr. 5",
      },
      {
        id: "buildingLocality",
        label: "Localitate clădire",
        type: "text",
        required: true,
        placeholder: "ex: Brașov",
      },
      {
        id: "buildingCounty",
        label: "Județ clădire",
        type: "select",
        required: true,
        options: COUNTIES_RO,
      },
      {
        id: "buildingType",
        label: "Tip clădire",
        type: "select",
        required: true,
        options: [
          "Casă unifamilială",
          "Apartament",
          "Bloc de locuințe",
          "Spațiu comercial",
          "Birou / clădire de birouri",
          "Clădire industrială",
          "Instituție publică",
          "Altul",
        ],
      },
      {
        id: "usefulArea",
        label: "Suprafață utilă aproximativă (m²)",
        type: "number",
        required: true,
        min: 5,
        placeholder: "ex: 120",
      },
      {
        id: "constructionYear",
        label: "Anul construcției",
        type: "number",
        min: 1800,
        max: new Date().getFullYear(),
        placeholder: "ex: 1978",
      },
      {
        id: "nFloors",
        label: "Număr de etaje (inclusiv parter)",
        type: "number",
        min: 1,
        max: 50,
        placeholder: "ex: 2",
      },
      {
        id: "hasBasement",
        label: "Are subsol?",
        type: "select",
        options: ["Nu", "Da — neîncălzit", "Da — încălzit"],
      },
      {
        id: "hasMansard",
        label: "Are mansardă / pod amenajat?",
        type: "select",
        options: ["Nu", "Da"],
      },
      {
        id: "cadastralNumber",
        label: "Nr. cadastral ANCPI (opțional)",
        type: "text",
        placeholder: "ex: 123456",
      },
      {
        id: "landBook",
        label: "Carte Funciară (opțional)",
        type: "text",
        placeholder: "ex: CF nr. 123456 Brașov",
      },
    ],
  },

  purpose: {
    label: "Scopul solicitării",
    icon: "🎯",
    description: "De ce ai nevoie de certificat energetic și ce servicii dorești",
    color: "purple",
    fields: [
      {
        id: "scopCpe",
        label: "Scopul solicitării CPE",
        type: "select",
        required: true,
        options: [
          "Vânzare imobil",
          "Închiriere",
          "Recepție lucrări (construcție nouă sau renovare)",
          "Acces finanțare (AFM / PNRR / bancă)",
          "Informare personală",
          "Renovare majoră planificată",
          "Alt scop",
        ],
      },
      {
        id: "servicesNeeded",
        label: "Servicii dorite",
        type: "select",
        required: true,
        options: [
          "Doar CPE (Certificat de Performanță Energetică)",
          "CPE + Audit energetic complet",
          "Nu știu — vreau o recomandare",
        ],
      },
      {
        id: "urgency",
        label: "Urgența documentului",
        type: "select",
        options: [
          "Fără urgență (2-3 săptămâni)",
          "Moderat urgentă (1 săptămână)",
          "Urgentă (2-3 zile lucrătoare)",
        ],
      },
    ],
  },

  buildingInfo: {
    label: "Detalii clădire",
    icon: "🔧",
    description: "Informații opționale despre dotările clădirii — completează ce știi",
    color: "orange",
    fields: [
      {
        id: "heatingType",
        label: "Tip încălzire",
        type: "select",
        options: [
          "Gaz natural (centrală proprie)",
          "Gaz natural (centralizat / termoficare)",
          "Lemn / biomasă / peleți",
          "Electric (calorifere / pardoseală)",
          "Pompă de căldură",
          "Nu știu",
        ],
      },
      {
        id: "windowsReplaced",
        label: "Ferestrele au fost schimbate?",
        type: "select",
        options: [
          "Nu — ferestre originale",
          "Da — înainte de 2005",
          "Da — după 2005",
          "Da — recent (după 2015)",
          "Nu știu",
        ],
      },
      {
        id: "hasPV",
        label: "Are panouri fotovoltaice?",
        type: "select",
        options: ["Nu", "Da", "Nu știu"],
      },
      {
        id: "hasSolarThermal",
        label: "Are panouri solare termice?",
        type: "select",
        options: ["Nu", "Da", "Nu știu"],
      },
      {
        id: "hasAC",
        label: "Are aer condiționat?",
        type: "select",
        options: ["Nu", "Da — în unele camere", "Da — în toată clădirea"],
      },
      {
        id: "buildingCondition",
        label: "Starea generală a clădirii",
        type: "select",
        options: [
          "Bună — fără probleme vizibile",
          "Satisfăcătoare — necesită mici reparații",
          "Necesită renovare",
          "Degradată — probleme majore",
        ],
      },
      {
        id: "lastRenovationYear",
        label: "Ultimele lucrări majore de renovare (an aproximativ)",
        type: "number",
        min: 1950,
        max: new Date().getFullYear(),
        placeholder: "ex: 2010",
      },
    ],
  },

  documents: {
    label: "Documente disponibile",
    icon: "📎",
    description: "Bifează documentele pe care le ai la dispoziție — ajută la pregătirea auditorului",
    color: "indigo",
    fields: [
      {
        id: "hasPropertyAct",
        label: "Act de proprietate (titlu, contract vânzare-cumpărare)",
        type: "select",
        options: ["Da — disponibil", "Nu — nu am", "Parțial / în curs"],
      },
      {
        id: "hasCF",
        label: "Extras Carte Funciară (CF) — eliberat recent",
        type: "select",
        options: [
          "Da — eliberat recent (30 zile)",
          "Da — mai vechi de 30 zile",
          "Nu",
          "În curs de obținere",
        ],
      },
      {
        id: "hasArchitecturalPlan",
        label: "Plan / releveu arhitectural al clădirii",
        type: "select",
        options: ["Da — complet", "Da — parțial", "Nu"],
      },
      {
        id: "hasTechnicalBook",
        label: "Cartea tehnică a construcției",
        type: "select",
        options: ["Da — completă", "Da — parțială", "Nu", "Nu știu"],
      },
      {
        id: "hasEnergyBills",
        label: "Facturi energie (electricitate / gaz / lemn)",
        type: "select",
        options: [
          "Da — ultimii 3 ani",
          "Da — ultimul an",
          "Da — parțial",
          "Nu",
        ],
      },
      {
        id: "hasBuildingPermit",
        label: "Autorizație de construire / renovare",
        type: "select",
        options: ["Da", "Nu", "Nu este cazul"],
      },
    ],
  },

  confirmation: {
    label: "Confirmare",
    icon: "✅",
    description: "Acord GDPR și observații finale — obligatoriu înainte de trimitere",
    color: "teal",
    fields: [
      {
        id: "gdprConsent",
        label: "Sunt de acord cu prelucrarea datelor cu caracter personal de către auditorul energetic, conform Reg. UE 2016/679 (GDPR) și Legii 190/2018 RO. Datele vor fi folosite exclusiv pentru emiterea documentațiilor energetice solicitate.",
        type: "checkbox",
        required: true,
      },
      {
        id: "dataCorrect",
        label: "Confirm că informațiile completate sunt corecte și complete conform cunoștințelor mele.",
        type: "checkbox",
        required: true,
      },
      {
        id: "notesAndObservations",
        label: "Observații suplimentare pentru auditor (opțional)",
        type: "textarea",
        maxLength: 500,
        placeholder: "Orice informație relevantă: acces la clădire, probleme specifice cunoscute, preferințe...",
      },
    ],
  },
};

export const SECTIONS_ARRAY = Object.entries(SECTIONS).map(([key, section]) => ({
  key,
  ...section,
}));

export const SECTION_KEYS = Object.keys(SECTIONS);

export const TOTAL_FIELDS_COUNT = Object.values(SECTIONS).reduce(
  (sum, section) => sum + section.fields.length,
  0,
);

export const TOTAL_REQUIRED_FIELDS_COUNT = Object.values(SECTIONS).reduce(
  (sum, section) => sum + section.fields.filter(f => f.required).length,
  0,
);
