// ═════════════════════════════════════════════════════════════════════════════
// MiniQuiz — 1-2 întrebări de validare înțelegere
//
// Format întrebare:
//   { question: "...", options: ["A", "B", "C", "D"], correct: 1, explanation: "..." }
// ═════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { cn } from "../ui.jsx";

export default function MiniQuiz({ body, questions = [] }) {
  const [answers, setAnswers] = useState({});

  const select = (qIdx, optIdx) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  return (
    <div className="rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <div className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400">
          Validare înțelegere
        </div>
      </div>
      {body && <p className="text-xs text-slate-300 mb-3 leading-relaxed">{body}</p>}

      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const selected = answers[qIdx];
          const isAnswered = selected !== undefined;
          const isCorrect = selected === q.correct;

          return (
            <div key={qIdx}>
              <div className="text-sm font-semibold text-white mb-2">
                <span className="text-fuchsia-400">Î{qIdx + 1}.</span> {q.question}
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = selected === optIdx;
                  const isThisCorrect = optIdx === q.correct;
                  let style = "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-fuchsia-500/50";
                  if (isAnswered) {
                    if (isThisCorrect) style = "bg-emerald-500/15 border-emerald-500/50 text-emerald-300";
                    else if (isThisSelected) style = "bg-red-500/15 border-red-500/50 text-red-300";
                    else style = "bg-slate-800/30 border-slate-700/50 text-slate-500";
                  }
                  return (
                    <button
                      key={optIdx}
                      onClick={() => !isAnswered && select(qIdx, optIdx)}
                      disabled={isAnswered}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded border text-xs transition-all flex items-start gap-2",
                        style,
                        !isAnswered && "cursor-pointer"
                      )}
                    >
                      <span className="font-bold shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                      <span className="flex-1">{opt}</span>
                      {isAnswered && isThisCorrect && <span className="shrink-0">✓</span>}
                      {isAnswered && isThisSelected && !isThisCorrect && <span className="shrink-0">✗</span>}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className={cn(
                  "mt-2 rounded px-3 py-2 text-xs leading-relaxed",
                  isCorrect ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-200"
                )}>
                  <span className="font-bold mr-1">{isCorrect ? "✓ Corect." : "ℹ Explicație:"}</span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
