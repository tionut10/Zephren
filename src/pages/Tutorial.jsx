// ═════════════════════════════════════════════════════════════════════════════
// src/pages/Tutorial.jsx — Tutorial complet Zephren (8 pași, 20+ secțiuni/pas)
//
// Acces: /tutorial sau #tutorial
// Demo primar: M2 (casă RI Cluj-Napoca) cu BranchSelector pentru M1/M3/M4/M5.
// Filozofie: educație detaliată pentru auditori care descoperă Zephren — explică
// FIECARE pas al programului, DE CE există, CE decizii ia auditorul, CUM se propagă
// datele între pași și CARE este baza normativă (Mc 001-2022, SR EN, EPBD 2024).
//
// Structură: TutorialLayout (sidebar + progress + content + nav) consumă conținutul
// din src/tutorial/content/pas{1..8}-*.js. Fiecare secțiune e un obiect de date —
// SectionRenderer alege componenta vizuală în funcție de `type`.
//
// Conformitate: Mc 001-2022, Ord. MDLPA 16/2023, Ord. MDLPA 348/2026,
// EPBD 2024/1275/UE, ISO 13790, EN 16798-1, EN 15232, EN 15193-1, ISO 6946.
// ═════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react";
import TutorialLayout from "../components/tutorial/TutorialLayout.jsx";

// Demos: M1-M5 — auditorul poate comuta pentru a vedea cum se schimbă tutorialul
// pe categorie funcțională (RI/RC/RA/BI/ED → limite nZEB diferite în Mc 001-2022).
const DEMO_OPTIONS = [
  { id: "M1", label: "M1 · Apartament bloc 1975 — Constanța (RA · Zona I · clasă G)", category: "RA", zone: "I" },
  { id: "M2", label: "M2 · Casă unifamilială 1965 — Cluj-Napoca (RI · Zona III · clasă E)", category: "RI", zone: "III", primary: true },
  { id: "M3", label: "M3 · Birouri 2005 — București (BI · Zona II · clasă C)", category: "BI", zone: "II" },
  { id: "M4", label: "M4 · Școală gimnazială — Brașov (ED · Zona IV · clasă F)", category: "ED", zone: "IV" },
  { id: "M5", label: "M5 · Casă ZEB nouă — Sibiu (RI nou · Zona III · clasă A+)", category: "RI", zone: "III" },
];

// 8 pași — meta info pentru navigare (titluri + iconi + culori).
// Conținutul detaliat e încărcat lazy din src/tutorial/content/pas{N}-*.js.
const STEPS_META = [
  { id: 1, title: "Identificare clădire",       icon: "📋", subtitle: "Date generale, geometrie, climă",                color: "amber" },
  { id: 2, title: "Anvelopa termică",           icon: "🏗️", subtitle: "Elemente opace, vitraje, punți termice",         color: "sky" },
  { id: 3, title: "Instalații tehnice",         icon: "⚙️", subtitle: "Încălzire, ACM, climatizare, ventilare, iluminat", color: "orange" },
  { id: 4, title: "Surse regenerabile",         icon: "☀️", subtitle: "Solar termic, fotovoltaic, pompă de căldură",     color: "emerald" },
  { id: 5, title: "Calcul energetic",           icon: "📊", subtitle: "EP total, clasare A+–G, CO₂, costuri",            color: "violet" },
  { id: 6, title: "Certificat CPE",             icon: "📜", subtitle: "Export PDF/A-3, DOCX, XML MDLPA, PAdES",          color: "amber" },
  { id: 7, title: "Audit energetic",            icon: "🔍", subtitle: "Scenarii reabilitare, NPV, cost-optim, pașaport", color: "red" },
  { id: 8, title: "Instrumente avansate",       icon: "🔬", subtitle: "nZEB, MEPS, BACS, SRI, BIM, EPBD 2030/2033",     color: "purple" },
];

// Lazy-load content per pas pentru a păstra bundle mic la încărcare inițială
const stepLoaders = {
  1: () => import("../tutorial/content/pas1-identificare.js"),
  2: () => import("../tutorial/content/pas2-anvelopa.js"),
  3: () => import("../tutorial/content/pas3-instalatii.js"),
  4: () => import("../tutorial/content/pas4-surse-regen.js"),
  5: () => import("../tutorial/content/pas5-calcul-energetic.js"),
  6: () => import("../tutorial/content/pas6-certificat-cpe.js"),
  7: () => import("../tutorial/content/pas7-audit-energetic.js"),
  8: () => import("../tutorial/content/pas8-instrumente.js"),
};

export default function Tutorial() {
  // Pas curent (1-8) — persistăm în URL hash #pas-N pentru deep-link
  const [currentStep, setCurrentStep] = useState(() => {
    const hash = window.location.hash; // ex: #pas-3
    const m = hash.match(/#pas-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 8) return n;
    }
    return 1;
  });

  // Demo activ — implicit M2 (rezidențial individual, cazul cel mai frecvent)
  const [activeDemo, setActiveDemo] = useState("M2");

  // Conținutul pasului curent (încărcat lazy)
  const [stepContent, setStepContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Secțiunea vizibilă (1-N în cadrul pasului) — pentru ProgressBar interior
  const [activeSection, setActiveSection] = useState(0);

  // Încarcă conținutul când se schimbă pasul
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    stepLoaders[currentStep]()
      .then((module) => {
        if (!cancelled) {
          setStepContent(module.default || module);
          setActiveSection(0);
        }
      })
      .catch((err) => {
        console.error(`[Tutorial] Eroare la încărcarea pasului ${currentStep}:`, err);
        if (!cancelled) setStepContent({ error: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentStep]);

  // Sincronizează URL hash cu pasul curent (deep-link friendly)
  useEffect(() => {
    const newHash = `#pas-${currentStep}`;
    if (window.location.hash !== newHash) {
      // Folosim replaceState pentru a nu polua history
      window.history.replaceState(null, "", `${window.location.pathname}${newHash}`);
    }
  }, [currentStep]);

  // Navigare pași
  const goToStep = useCallback((n) => {
    if (n >= 1 && n <= 8) {
      setCurrentStep(n);
      // Scroll to top la schimbarea pasului
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const goNext = useCallback(() => goToStep(currentStep + 1), [currentStep, goToStep]);
  const goPrev = useCallback(() => goToStep(currentStep - 1), [currentStep, goToStep]);

  // Aplică demo & deschide aplicația cu datele pre-completate
  // Folosim localStorage ca semnal — energy-calc.jsx îl citește pe mount
  const applyDemoAndOpenApp = useCallback(() => {
    try {
      localStorage.setItem("zephren-tutorial-apply-demo", activeDemo);
      localStorage.setItem("zephren-tutorial-completed", "true");
    } catch (e) {
      console.warn("[Tutorial] localStorage indisponibil:", e);
    }
    // Deschide aplicația — același tab dacă utilizatorul vrea să continue de aici
    window.location.href = "/#app";
  }, [activeDemo]);

  // Închide tutorialul — revine la landing sau la ultimul tab
  const closeTutorial = useCallback(() => {
    // Dacă există referrer din aceeași origine, mergem back; altfel landing
    if (document.referrer && document.referrer.startsWith(window.location.origin)) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  }, []);

  // Calcul progres global (pas curent / 8 + progres în pas)
  const globalProgress = useMemo(() => {
    const totalSections = stepContent?.sections?.length || 1;
    const stepProgress = activeSection / Math.max(1, totalSections);
    return Math.round(((currentStep - 1 + stepProgress) / 8) * 100);
  }, [currentStep, activeSection, stepContent]);

  // Fix sticky: index.css setează `html, body { overflow-x: hidden }` global pentru
  // anti-overflow orizontal — DAR aceasta creează un nou scroll containing block care
  // anulează position:sticky pe topbar și sidebar. Suprapunem overflow:visible pentru
  // ruta /tutorial doar (layoutul Tutorial e safe — max-w-[1400px] + mx-auto).
  // Restaurăm valorile vechi la unmount ca să nu afectăm restul aplicației.
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevHtmlOverflowX = htmlEl.style.overflowX;
    const prevBodyOverflow = bodyEl.style.overflow;
    const prevBodyOverflowX = bodyEl.style.overflowX;
    htmlEl.style.overflow = "visible";
    htmlEl.style.overflowX = "clip"; // 'clip' previne scroll orizontal FĂRĂ să creeze scroll container (spre deosebire de 'hidden')
    bodyEl.style.overflow = "visible";
    bodyEl.style.overflowX = "clip";
    return () => {
      htmlEl.style.overflow = prevHtmlOverflow;
      htmlEl.style.overflowX = prevHtmlOverflowX;
      bodyEl.style.overflow = prevBodyOverflow;
      bodyEl.style.overflowX = prevBodyOverflowX;
    };
  }, []);

  // Keyboard shortcuts: ← / → pentru navigare pași, Esc pentru închidere
  useEffect(() => {
    const onKey = (e) => {
      // Nu interferăm dacă utilizatorul tastează într-un input/textarea
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowRight" && currentStep < 8) { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft" && currentStep > 1) { e.preventDefault(); goPrev(); }
      else if (e.key === "Escape") { e.preventDefault(); closeTutorial(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentStep, goNext, goPrev, closeTutorial]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TutorialLayout
        stepsMeta={STEPS_META}
        currentStep={currentStep}
        stepContent={stepContent}
        loading={loading}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        globalProgress={globalProgress}
        demoOptions={DEMO_OPTIONS}
        activeDemo={activeDemo}
        setActiveDemo={setActiveDemo}
        onGoToStep={goToStep}
        onNext={goNext}
        onPrev={goPrev}
        onClose={closeTutorial}
        onApplyDemo={applyDemoAndOpenApp}
      />
    </div>
  );
}
