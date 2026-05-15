// ═════════════════════════════════════════════════════════════════════════════
// SectionRenderer — randează o secțiune din tutorial bazată pe type
//
// Tipuri suportate (fiecare cu UI specifică):
//   "hero"              → titlu mare + descriere (intro pasului)
//   "decision"          → "Decizia arhitecturală" cu pro/contra
//   "fields"            → tabel câmpuri obligatorii/opționale
//   "branching"         → cum diferă conținutul pe categoria clădirii (RI/RC/BI/ED)
//   "normative"         → bază normativă cu badge-uri linkable
//   "glossary"          → glosar termeni cu pop-overs
//   "mistakes"          → top 3-5 greșeli frecvente
//   "propagation"       → săgeți "datele se duc în Pasul X → Y"
//   "what-if"           → simulator interactiv slider + math
//   "checks"            → ce verifică automatizat Zephren
//   "limits"            → ce NU acoperă pasul (limite cunoscute)
//   "demo-snapshot"     → snapshot al app-ului cu date demo
//   "quiz"              → 1-2 întrebări de validare înțelegere
//   "pro-tip"           → sfat practic teren
//   "legislation"       → diferențe legislative 2024→2026
//   "special-cases"     → cazuri speciale (monumente, multi-tenant, NCM)
//   "export"            → ce iese din pas (PDF/DOCX/XML)
//   "faq"               → întrebări frecvente
//   "resources"         → linkuri externe (Casa Verde, ANRE, MDLPA)
//   "recap"             → recapitulare + tranziție la pasul următor
//   "text"              → text generic (fallback)
// ═════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { cn } from "../ui.jsx";
import NormativeBadge from "./NormativeBadge.jsx";
import WhatIfSimulator from "./WhatIfSimulator.jsx";
import MiniQuiz from "./MiniQuiz.jsx";

export default function SectionRenderer({ section, index, isActive, onActivate, activeDemo, stepColor, colorMap }) {
  const c = colorMap[stepColor] || colorMap.amber;
  const anchorId = `section-${section.id || index}`;

  return (
    <section
      id={anchorId}
      onMouseEnter={onActivate}
      className={cn(
        "rounded-xl bg-slate-900/40 border transition-all scroll-mt-24",
        isActive ? "border-slate-700 shadow-lg" : "border-slate-800/50"
      )}
    >
      {/* Header secțiune */}
      <div className="flex items-start gap-3 p-4 sm:p-5 pb-3">
        <span className={cn("shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border", c.bg, c.border, c.text)}>
          {(index + 1).toString().padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          {section.kicker && (
            <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", c.text)}>
              {section.kicker}
            </div>
          )}
          <h2 className="text-base sm:text-lg font-bold text-white leading-tight">{section.title}</h2>
          {section.subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{section.subtitle}</p>
          )}
        </div>
      </div>

      {/* Conținut tip-specific */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <SectionBody section={section} activeDemo={activeDemo} stepColor={stepColor} colorMap={colorMap} />
      </div>
    </section>
  );
}

function SectionBody({ section, activeDemo, stepColor, colorMap }) {
  const c = colorMap[stepColor] || colorMap.amber;

  switch (section.type) {
    // ───────────────────────────────────────────────────────────────────────
    case "hero":
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">{section.body}</p>
          {section.highlight && (
            <div className={cn("mt-3 rounded-lg p-3 border", c.bg, c.border)}>
              <div className="text-xs text-slate-200 font-medium">{section.highlight}</div>
            </div>
          )}
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "decision":
      return (
        <div className="space-y-3">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed">{section.body}</p>}
          {section.options && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.options.map((opt, i) => (
                <div key={i} className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
                  <div className="font-semibold text-sm text-white mb-1">{opt.title}</div>
                  {opt.pros && (
                    <ul className="space-y-1 mb-2">
                      {opt.pros.map((p, j) => (
                        <li key={j} className="text-xs text-emerald-300 flex gap-1.5">
                          <span>✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {opt.cons && (
                    <ul className="space-y-1">
                      {opt.cons.map((p, j) => (
                        <li key={j} className="text-xs text-red-300 flex gap-1.5">
                          <span>✗</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {opt.recommendation && (
                    <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-amber-300">
                      <span className="font-semibold">Recomandare:</span> {opt.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "fields":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-3">{section.body}</p>}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="px-2 py-2 text-slate-400 font-semibold">Câmp</th>
                  <th className="px-2 py-2 text-slate-400 font-semibold">Tip</th>
                  <th className="px-2 py-2 text-slate-400 font-semibold">Obligatoriu</th>
                  <th className="px-2 py-2 text-slate-400 font-semibold">Validare / Notă</th>
                </tr>
              </thead>
              <tbody>
                {section.items?.map((f, i) => (
                  <tr key={i} className="border-b border-slate-900">
                    <td className="px-2 py-2 text-white font-medium align-top">{f.label}</td>
                    <td className="px-2 py-2 text-slate-400 font-mono align-top">{f.dataType}</td>
                    <td className="px-2 py-2 align-top">
                      {f.required
                        ? <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">DA</span>
                        : <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-[10px] font-bold">opt</span>}
                    </td>
                    <td className="px-2 py-2 text-slate-300 align-top">{f.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "branching":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-3">{section.body}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {section.branches?.map((b, i) => {
              const isHighlighted = b.appliesTo?.includes(activeDemo);
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg p-3 border transition-all",
                    isHighlighted
                      ? "bg-indigo-500/15 border-indigo-500/50 ring-1 ring-indigo-500/30"
                      : "bg-slate-800/30 border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-bold text-white">{b.category}</div>
                    {isHighlighted && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500 text-white rounded font-bold uppercase">
                        Demo curent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{b.description}</p>
                  {b.formula && (
                    <code className="block mt-1.5 text-[10px] font-mono bg-slate-900/80 px-2 py-1 rounded text-amber-300">
                      {b.formula}
                    </code>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "normative":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          <div className="flex flex-wrap gap-1.5">
            {section.refs?.map((ref, i) => (
              <NormativeBadge key={i} {...ref} />
            ))}
          </div>
          {section.quote && (
            <blockquote className="mt-3 pl-3 border-l-2 border-amber-500/50 italic text-xs text-amber-100/80">
              "{section.quote}"
              {section.quoteSource && (
                <div className="not-italic text-[10px] text-amber-300 mt-1">— {section.quoteSource}</div>
              )}
            </blockquote>
          )}
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "glossary":
      return <GlossaryTerms terms={section.terms || []} />;

    // ───────────────────────────────────────────────────────────────────────
    case "mistakes":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          <div className="space-y-2">
            {section.items?.map((m, i) => (
              <div key={i} className="rounded-lg bg-red-500/8 border border-red-500/20 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-red-300 mb-0.5">{m.title}</div>
                    {m.body && <p className="text-xs text-red-100/80 leading-relaxed">{m.body}</p>}
                    {m.fix && (
                      <div className="mt-1.5 text-xs text-emerald-300">
                        <span className="font-semibold">✓ Corect:</span> {m.fix}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "propagation":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          <div className="space-y-1.5">
            {section.flows?.map((flow, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <code className="px-2 py-1 bg-slate-800 rounded font-mono text-amber-300 shrink-0">{flow.from}</code>
                <span className="text-slate-500">→</span>
                <code className="px-2 py-1 bg-slate-800 rounded font-mono text-emerald-300 shrink-0">{flow.to}</code>
                {flow.description && <span className="text-slate-400">— {flow.description}</span>}
              </div>
            ))}
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "what-if":
      return <WhatIfSimulator {...section} />;

    // ───────────────────────────────────────────────────────────────────────
    case "checks":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          <ul className="space-y-1.5">
            {section.items?.map((ch, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-sky-400 mt-0.5 shrink-0 font-bold">✓</span>
                <span dangerouslySetInnerHTML={{ __html: ch }} />
              </li>
            ))}
          </ul>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "limits":
      return (
        <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
          {section.body && <p className="text-xs text-amber-100/90 leading-relaxed mb-2">{section.body}</p>}
          {section.items && (
            <ul className="space-y-1">
              {section.items.map((l, i) => (
                <li key={i} className="text-xs text-amber-100/80 flex gap-1.5">
                  <span className="text-amber-400 shrink-0">▸</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "demo-snapshot":
      return (
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
          {section.body && <p className="text-xs text-slate-300 mb-2">{section.body}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {section.values?.map((v, i) => (
              <div key={i} className="rounded bg-slate-900/70 p-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{v.label}</div>
                <div className="text-sm font-mono text-white">{v.value}</div>
                {v.note && <div className="text-[10px] text-slate-500 mt-0.5">{v.note}</div>}
              </div>
            ))}
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "quiz":
      return <MiniQuiz {...section} />;

    // ───────────────────────────────────────────────────────────────────────
    case "pro-tip":
      return (
        <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
            💡 Sfat profesional
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed">{section.body}</p>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "legislation":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {section.changes?.map((ch, i) => (
              <div key={i} className="rounded-lg bg-violet-500/8 border border-violet-500/20 p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">
                  {ch.period}
                </div>
                <div className="text-sm font-semibold text-white mb-0.5">{ch.title}</div>
                {ch.body && <p className="text-xs text-violet-100/80 leading-relaxed">{ch.body}</p>}
                {ch.refs && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ch.refs.map((r, j) => <NormativeBadge key={j} {...r} compact />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "special-cases":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          <div className="space-y-2">
            {section.cases?.map((sc, i) => (
              <details key={i} className="rounded-lg bg-slate-800/40 border border-slate-700 group">
                <summary className="px-3 py-2 cursor-pointer text-sm font-semibold text-white hover:bg-slate-800/70 transition-colors flex items-center justify-between">
                  <span>{sc.title}</span>
                  <span className="text-slate-500 text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-3 pb-3 text-xs text-slate-300 leading-relaxed border-t border-slate-700 pt-2">
                  {sc.body}
                </div>
              </details>
            ))}
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "export":
      return (
        <div className="space-y-2">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {section.outputs?.map((o, i) => (
              <div key={i} className="rounded-lg bg-slate-800/40 border border-slate-700 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{o.icon || "📄"}</span>
                  <div className="font-semibold text-sm text-white">{o.format}</div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{o.description}</p>
                {o.planRequired && (
                  <div className="mt-1 text-[10px] text-amber-300">Plan necesar: {o.planRequired}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "faq":
      return (
        <div className="space-y-2">
          {section.items?.map((f, i) => (
            <details key={i} className="rounded-lg bg-slate-800/30 border border-slate-700 group">
              <summary className="px-3 py-2 cursor-pointer text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-2">
                <span className="flex-1">❓ {f.q}</span>
                <span className="text-slate-500 group-open:rotate-180 transition-transform shrink-0">▼</span>
              </summary>
              <div className="px-3 pb-3 text-xs text-slate-300 leading-relaxed border-t border-slate-700 pt-2">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "resources":
      return (
        <div className="space-y-1.5">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed mb-2">{section.body}</p>}
          {section.links?.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700 hover:border-amber-500/50 transition-colors text-xs"
            >
              <span className="text-amber-400">🔗</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{l.title}</div>
                {l.description && <div className="text-slate-500 text-[10px] truncate">{l.description}</div>}
              </div>
              <span className="text-slate-500 shrink-0">↗</span>
            </a>
          ))}
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "recap":
      return (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-4">
          {section.body && <p className="text-sm text-slate-200 leading-relaxed mb-3">{section.body}</p>}
          {section.bullets && (
            <ul className="space-y-1.5 mb-3">
              {section.bullets.map((b, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-amber-400 font-bold">{i + 1}.</span>
                  <span dangerouslySetInnerHTML={{ __html: b }} />
                </li>
              ))}
            </ul>
          )}
          {section.nextStep && (
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-amber-300">
              <span className="font-bold">→ Următorul pas:</span> {section.nextStep}
            </div>
          )}
        </div>
      );

    // ───────────────────────────────────────────────────────────────────────
    case "text":
    default:
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          {section.body && <p className="text-sm text-slate-300 leading-relaxed">{section.body}</p>}
        </div>
      );
  }
}

// ─── Helper: Glossary cu pop-overs ────────────────────────────────────────
function GlossaryTerms({ terms }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
      {terms.map((t, i) => (
        <button
          key={i}
          onClick={() => setExpanded(expanded === i ? null : i)}
          className={cn(
            "text-left rounded-lg border p-2.5 transition-all",
            expanded === i
              ? "bg-purple-500/15 border-purple-500/50"
              : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
          )}
        >
          <div className="font-mono font-bold text-xs text-purple-300 mb-1">{t.term}</div>
          <div className="text-[10px] text-slate-400 leading-tight">{t.short}</div>
          {expanded === i && t.long && (
            <div className="mt-2 pt-2 border-t border-purple-500/30 text-[10px] text-slate-300 leading-relaxed">
              {t.long}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
