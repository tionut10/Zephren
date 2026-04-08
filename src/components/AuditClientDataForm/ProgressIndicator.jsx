import React, { useState, useEffect } from "react";
import { cn, Card, Badge } from "../ui.jsx";

/**
 * ProgressIndicator - Indicator vizual progres formular
 * Desktop: Bară orizontală cu milestone
 * Mobile: Bară verticală simplă
 */

export default function ProgressIndicator({
  completionStatus,
  sections,
  className
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculează totale
  const totalCompleted = Object.values(completionStatus).reduce(
    (sum, s) => sum + (s.completed || 0),
    0
  );
  const totalRequired = Object.values(completionStatus).reduce(
    (sum, s) => sum + (s.required || 0),
    0
  );
  const overallPercentage = totalRequired > 0
    ? Math.round((totalCompleted / totalRequired) * 100)
    : 0;

  // Culoare progres
  const getProgressColor = () => {
    if (overallPercentage === 100) return "bg-green-500";
    if (overallPercentage >= 75) return "bg-green-400";
    if (overallPercentage >= 50) return "bg-yellow-500";
    if (overallPercentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getProgressBadgeColor = () => {
    if (overallPercentage === 100) return "bg-green-100 text-green-800";
    if (overallPercentage >= 75) return "bg-green-100 text-green-800";
    if (overallPercentage >= 50) return "bg-yellow-100 text-yellow-800";
    if (overallPercentage >= 25) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  // Desktop: Bară orizontală cu milestone-uri
  if (!isMobile) {
    return (
      <Card className={cn("p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200", className)}>
        <div className="space-y-4">
          {/* Titlu și statistici */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Progres Completare Formular</h3>
              <p className="text-sm text-gray-600 mt-1">
                {totalCompleted} din {totalRequired} câmpuri obligatorii completate
              </p>
            </div>
            <Badge className={cn("text-lg font-bold px-4 py-2", getProgressBadgeColor())}>
              {overallPercentage}%
            </Badge>
          </div>

          {/* Bară progres principală */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(getProgressColor(), "h-full transition-all duration-500 rounded-full")}
                style={{ width: `${overallPercentage}%` }}
              />
            </div>

            {/* Milestone indicators */}
            <div className="flex justify-between text-xs text-gray-600">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Progres per secțiune */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {sections.map((section) => {
              const status = completionStatus[section.key];
              const percentage = status?.percentage || 0;
              const isComplete = status?.isComplete;

              return (
                <div
                  key={section.key}
                  className={cn(
                    "p-3 rounded-lg text-center transition-all",
                    isComplete
                      ? "bg-green-100 border border-green-300"
                      : "bg-white border border-gray-200"
                  )}
                >
                  <div className="text-lg mb-1">{section.icon}</div>
                  <div className="text-xs font-bold text-gray-800 truncate mb-2">
                    {section.label.split(" ")[0]}
                  </div>
                  <div className="text-xs font-bold mb-2">
                    <span className={isComplete ? "text-green-700" : "text-gray-600"}>
                      {status?.completed}/{status?.required}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all rounded-full",
                        isComplete ? "bg-green-500" : "bg-blue-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status mesaj */}
          <div className="text-sm text-gray-700 p-3 bg-white rounded border border-gray-200">
            {overallPercentage === 100 ? (
              <span className="text-green-700 font-bold">✓ Formular complet! Gata pentru export.</span>
            ) : (
              <span>
                {totalRequired - totalCompleted} câmpuri obligatorii
                {totalRequired - totalCompleted === 1 ? " rămâne" : " rămân"} de completat
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Mobile: Bară verticală compactă
  return (
    <Card className={cn("p-4 bg-gradient-to-b from-blue-50 to-indigo-50 border-b-2 border-blue-200", className)}>
      <div className="space-y-3">
        {/* Titlu și procent */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Progres</h3>
            <p className="text-xs text-gray-600">{totalCompleted}/{totalRequired}</p>
          </div>
          <Badge className={cn("text-base font-bold px-3 py-1", getProgressBadgeColor())}>
            {overallPercentage}%
          </Badge>
        </div>

        {/* Bară progres */}
        <div className="w-full h-2.5 bg-gray-300 rounded-full overflow-hidden">
          <div
            className={cn(getProgressColor(), "h-full transition-all duration-500 rounded-full")}
            style={{ width: `${overallPercentage}%` }}
          />
        </div>

        {/* Mini secțiuni */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section) => {
            const status = completionStatus[section.key];
            const isComplete = status?.isComplete;

            return (
              <div
                key={section.key}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded whitespace-nowrap flex-shrink-0",
                  isComplete ? "bg-green-100" : "bg-white border border-gray-200"
                )}
              >
                <span className="text-sm">{section.icon}</span>
                <span className="text-xs font-bold text-gray-700">
                  {status?.completed}/{status?.required}
                </span>
              </div>
            );
          })}
        </div>

        {/* Status */}
        {overallPercentage === 100 && (
          <div className="text-xs font-bold text-green-700 text-center p-2 bg-green-100 rounded">
            ✓ Formular complet!
          </div>
        )}
      </div>
    </Card>
  );
}
