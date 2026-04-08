import { useState } from "react";
import { cn } from "../components/ui.jsx";

const STEPS = [
  {
    title: "Identificare clădire",
    text: "Pasul 1: Identificarea clădirii. Completați datele de identificare: adresă, tip (rezidențial/comercial), suprafață utilă, an construcție, localitate.",
    example: "Casa exemplu: Str. Independenței 14, Cluj-Napoca, rezidențial individual, Au = 120 m², construită în 1992, zona climatică II",
    tip: "Selectați zona climatică corectă — afectează temperatura exterioară de calcul!",
  },
  {
    title: "Anvelopă",
    text: "Pasul 2: Anvelopa clădirii. Introduceți straturile constructive pentru pereți, planșee, acoperișuri și vitraj.",
    example: "Pereți GVP 25cm (U=1.45 W/m²K), Planșeu sub pod vată 5cm (U=0.62), Ferestre PVC dublu vitraj (U=1.6)",
    tip: "Adăugați toate elementele opace și vitrate. U-value se calculează automat din straturi.",
  },
  {
    title: "Sisteme",
    text: "Pasul 3: Sistemele tehnice. Instalațiile de încălzire, răcire, ventilare și iluminat.",
    example: "Centrală termică pe gaz (η=92%), radiatoare, fără ventilare mecanică, iluminat mixt LED/incandescent",
    tip: "Eficiența sistemelor are impact major asupra consumului final de energie.",
  },
  {
    title: "Regenerabile",
    text: "Pasul 4: Surse regenerabile. Panouri solare, fotovoltaice, pompe de căldură.",
    example: "Fără regenerabile în varianta inițială → RER = 0%",
    tip: "nZEB necesită RER ≥ 30%. Adăugarea unui panou solar termic crește semnificativ RER.",
  },
  {
    title: "Calcul",
    text: "Pasul 5: Calculul energetic. Metodologie EN ISO 13790 — calcul lunar al necesarului de energie.",
    example: "EP_heating ≈ 185 kWh/m²an, EP_total ≈ 220 kWh/m²an → Clasa E",
    tip: "EP total include: încălzire + ACM + iluminat. Click pe 'Calculează' pentru rezultate.",
  },
  {
    title: "Certificat",
    text: "Pasul 6: Certificatul de Performanță Energetică (CPE). Clasa energetică + recomandări.",
    example: "Clasa E (220 kWh/m²an). Recomandare: termoizolație pereți 10cm EPS → economie 40%",
    tip: "Exportați CPE în format PDF sau XML pentru depunere la MDLPA.",
  },
  {
    title: "Audit",
    text: "Pasul 7: Auditul energetic. Consum măsurat vs. calculat + recomandări prioritizate.",
    example: "Consum facturi 2023: 18.000 kWh/an. Calculat: 22.000 kWh/an. Diferență acceptabilă (18%)",
    tip: "Introduceți consumul real din facturi pentru validarea modelului de calcul.",
  },
  {
    title: "Instrumente avansate",
    text: "Pasul 8: Instrumente avansate. Verificare nZEB, sarcina termică, finanțare PNRR, export XML.",
    example: "Verificare nZEB: NON-CONFORM (EP_max=125, EP_calc=220). PNRR: eligibil ~15.000 EUR",
    tip: "Folosiți tab-ul 'Comparativ reabilitare' pentru a evalua mai multe scenarii.",
  },
];

const EXAMPLE_DATA = {
  building: {
    address: "Str. Independenței 14",
    city: "Cluj-Napoca",
    county: "CJ",
    category: "RI",
    structure: "Zidărie portantă",
    floors: "P+1",
    areaUseful: "120",
    areaTotal: "135",
    heightFloor: "2.80",
    yearBuilt: "1992",
    units: "1",
  },
  climate: { id: "Cluj-Napoca", theta_e: -18, alt: 320 },
  note: "Clădire exemplu tutorial — date orientative",
};

export default function TutorialWizard({ onClose, onApplyExample }) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const progress = Math.round(((step + 1) / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 shadow-2xl border border-slate-700 flex flex-col min-h-[500px]">
        {/* Progress bar */}
        <div className="h-1.5 rounded-t-2xl bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Tutorial interactiv
            </span>
            <h2 className="text-lg font-bold text-slate-100 mt-0.5">
              Ghid calcul energetic clădiri
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-700"
            aria-label="Închide tutorialul"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 gap-0 px-6 pb-4">
          {/* Step indicator */}
          <div className="flex flex-col items-center gap-0 pr-5 pt-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex flex-col items-center">
                  <button
                    onClick={() => setStep(i)}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200",
                      done
                        ? "bg-green-600 border-green-500 text-white"
                        : active
                        ? "bg-amber-500 border-amber-400 text-slate-900 scale-110 shadow-lg shadow-amber-500/30"
                        : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500"
                    )}
                    title={s.title}
                  >
                    {done ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </button>
                  {i < total - 1 && (
                    <div
                      className={cn(
                        "w-0.5 h-5 transition-colors duration-200",
                        i < step ? "bg-green-600" : "bg-slate-700"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          <div className="flex-1 flex flex-col gap-3 pt-1">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Pasul {step + 1} din {total}
              </span>
              <h3 className="text-xl font-bold text-amber-400 mt-0.5">{current.title}</h3>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed">{current.text}</p>

            {/* Example box */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                Exemplu practic
              </p>
              <p className="text-sm text-amber-100 leading-relaxed">{current.example}</p>
            </div>

            {/* Tip box */}
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 py-3">
              <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
                Sfat
              </p>
              <p className="text-sm text-sky-100 leading-relaxed">{current.tip}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/60 gap-3">
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            Închide
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                step === 0
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              )}
            >
              Anterior
            </button>

            {step < total - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
              >
                Următor
              </button>
            ) : (
              <button
                onClick={() => onApplyExample(EXAMPLE_DATA)}
                className="px-5 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
              >
                Aplică exemplu clădire
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
