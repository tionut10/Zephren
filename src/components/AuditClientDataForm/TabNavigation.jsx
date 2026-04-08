import React, { useState, useEffect } from "react";
import { cn } from "../ui.jsx";

/**
 * TabNavigation - Navigație taburi responsive
 * Desktop: Taburi orizontale cu scroll
 * Tablet: Taburi orizontale compacte
 * Mobile: Taburi vertical (accordion)
 */

export default function TabNavigation({
  sections,
  activeTab,
  onTabChange,
  completionStatus,
  className
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTabletCompact, setIsTabletCompact] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTabletCompact(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Desktop: Taburi orizontale cu icoane și text
  if (!isMobile) {
    return (
      <nav
        className={cn(
          "flex gap-1 md:gap-2 overflow-x-auto border-b border-gray-200 bg-white p-3 md:p-4 sticky top-0 z-10",
          className
        )}
      >
        {sections.map((section, idx) => {
          const status = completionStatus[section.key];
          const isActive = activeTab === section.key;
          const isComplete = status?.isComplete;
          const percentage = status?.percentage || 0;

          return (
            <button
              key={section.key}
              onClick={() => onTabChange(section.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-all border-b-2",
                isActive
                  ? "border-b-blue-500 text-blue-600 bg-blue-50"
                  : "border-b-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                isComplete && "bg-green-50"
              )}
              title={`${section.label} - ${status?.completed || 0}/${status?.required || 0} câmpuri`}
            >
              <span className="text-lg">{section.icon}</span>

              {!isTabletCompact && (
                <span className="hidden sm:inline">{section.label}</span>
              )}

              {/* Badge progres */}
              {status && (
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    isComplete
                      ? "bg-green-200 text-green-800"
                      : percentage > 50
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-red-200 text-red-800"
                  )}
                >
                  {status.completed}/{status.required}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // Mobile: Taburi vertical (accordion-style)
  return (
    <nav className={cn("flex flex-col gap-2 bg-white p-3", className)}>
      {sections.map((section) => {
        const status = completionStatus[section.key];
        const isActive = activeTab === section.key;
        const isComplete = status?.isComplete;
        const percentage = status?.percentage || 0;

        return (
          <button
            key={section.key}
            onClick={() => onTabChange(section.key)}
            className={cn(
              "flex items-start justify-between p-3 rounded-lg border-2 transition-all text-left",
              isActive
                ? "border-blue-500 bg-blue-50"
                : isComplete
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xl flex-shrink-0">{section.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 text-sm">
                  {section.label}
                </div>
                {status && (
                  <div className="text-xs text-gray-600 mt-1">
                    {status.completed}/{status.required} obligatori
                  </div>
                )}
              </div>
            </div>

            {/* Badge status */}
            {status && (
              <div
                className={cn(
                  "ml-2 text-xs font-bold px-2 py-1 rounded-full flex-shrink-0",
                  isComplete
                    ? "bg-green-500 text-white"
                    : percentage > 50
                      ? "bg-yellow-500 text-white"
                      : "bg-red-500 text-white"
                )}
              >
                {percentage}%
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}
