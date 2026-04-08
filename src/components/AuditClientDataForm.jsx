import React, { useState, useEffect } from "react";
import { cn, Card, Input, Select, Badge, Button } from "./ui.jsx";
import TabNavigation from "./AuditClientDataForm/TabNavigation.jsx";
import ProgressIndicator from "./AuditClientDataForm/ProgressIndicator.jsx";
import { SECTIONS, SECTIONS_ARRAY } from "./AuditClientDataForm/utils/sectionConfig.js";
import { exportToJSON, exportToCSV, downloadChecklist } from "./AuditClientDataForm/utils/exportUtils.js";
import { calculateFormCompletion } from "./AuditClientDataForm/utils/validationUtils.js";
import { saveToStorage, loadFromStorage } from "./AuditClientDataForm/utils/storageUtils.js";

/**
 * AuditClientDataForm — Formular structurat audit energetic cu tab navigation
 * ✓ 6 categorii organizate în taburi (responsive)
 * ✓ Validare de date cu feedback vizual
 * ✓ Salvare automată localStorage
 * ✓ Export JSON/CSV/Checklist
 * ✓ Responsive design (desktop, tablet, mobile)
 */

export default function AuditClientDataForm({ onDataChange, initialData = {} }) {
  // State management
  const [formData, setFormData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("documentation");
  const [completionStatus, setCompletionStatus] = useState({});
  const [showChecklistOnly, setShowChecklistOnly] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Effect: Încarcă date din localStorage la montare
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.success && stored.data && Object.keys(initialData).length === 0) {
      setFormData(stored.data);
    }
  }, []);

  // Effect: Sincronizare localStorage și notificare onChange
  useEffect(() => {
    // Salvează în localStorage
    const saveResult = saveToStorage(formData);
    if (saveResult.success) {
      setSaveMessage("Salvat");
      setTimeout(() => setSaveMessage(""), 2000);
    }

    // Notifică parent component
    if (onDataChange) onDataChange(formData);

    // Actualizează completion status
    updateCompletionStatus();
  }, [formData, onDataChange]);

  /**
   * Calculează starea completare pentru fiecare secțiune
   */
  const updateCompletionStatus = () => {
    const completion = calculateFormCompletion(formData, SECTIONS);
    setCompletionStatus(completion.bySection);
  };

  /**
   * Handler schimbare câmp formular
   */
  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  /**
   * Handler schimbare tab activ
   */
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
  };

  /**
   * Handler ștergere date
   */
  const clearForm = () => {
    if (window.confirm("Sigur doriți să ștergeți toate datele colectate?")) {
      setFormData({});
      setActiveTab("documentation");
    }
  };

  // Secțiunea activă curentă
  const currentSection = SECTIONS[activeTab];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <Card className="m-0 p-4 md:p-6 bg-gradient-to-r from-blue-50 to-green-50 border-0 rounded-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                📋 Formular Audit Energetic
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Colectare date structurată pentru CPE și Audit Energetic (v3.4)
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowChecklistOnly(!showChecklistOnly)}
                className={cn(
                  "px-3 py-2 rounded text-sm font-medium transition whitespace-nowrap",
                  showChecklistOnly
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                )}
              >
                {showChecklistOnly ? "Ascunde Checklist" : "📊 Checklist"}
              </button>
              <button
                onClick={() => exportToJSON(formData)}
                className="px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 transition whitespace-nowrap"
              >
                📥 JSON
              </button>
              <button
                onClick={() => exportToCSV(formData)}
                className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition whitespace-nowrap"
              >
                📊 CSV
              </button>
              <button
                onClick={() => downloadChecklist(completionStatus, SECTIONS)}
                className="px-3 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 transition whitespace-nowrap"
              >
                ✓ Check
              </button>
              <button
                onClick={clearForm}
                className="px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition whitespace-nowrap"
              >
                🗑️ Șterge
              </button>
              {saveMessage && (
                <span className="px-3 py-2 text-sm text-green-600 font-medium">
                  ✓ {saveMessage}
                </span>
              )}
            </div>
          </div>
        </Card>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* TAB NAVIGATION - Sidebar pe desktop, top pe mobile */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white lg:overflow-y-auto lg:sticky lg:top-20">
          <TabNavigation
            sections={SECTIONS_ARRAY}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            completionStatus={completionStatus}
          />
        </div>

        {/* FORM CONTENT */}
        <main className="flex-1 overflow-y-auto">
          {showChecklistOnly ? (
            // CHECKLIST VIEW
            <div className="p-4 md:p-6 space-y-4">
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <h3 className="font-bold text-lg mb-4 text-gray-800">✓ Progres Colectare Date</h3>
                <div className="space-y-3">
                  {SECTIONS_ARRAY.map((section) => {
                    const status = completionStatus[section.key] || { completed: 0, required: 0 };
                    const percentage = status.required > 0 ? Math.round((status.completed / status.required) * 100) : 0;
                    return (
                      <div key={section.key} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">
                            {section.icon} {section.label}
                          </span>
                          <Badge className={cn(
                            "text-white font-bold",
                            status.isComplete ? "bg-green-500" : percentage > 50 ? "bg-yellow-500" : "bg-red-500"
                          )}>
                            {status.completed}/{status.required} ({percentage}%)
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={cn("h-2 rounded-full transition-all",
                              status.isComplete ? "bg-green-500" : percentage > 50 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ) : (
            // FORM SECTIONS VIEW
            <div className="p-4 md:p-6 space-y-6">
              {/* Secțiune activă */}
              <Card className={cn(
                "p-4 md:p-6 transition-all border-2 animated",
                completionStatus[activeTab]?.isComplete
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-white"
              )}>
                {/* Titlu secțiune */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {currentSection.icon} {currentSection.label}
                    </h2>
                    <p className="text-gray-600 text-sm mt-2">
                      {currentSection.description}
                    </p>
                    {completionStatus[activeTab] && (
                      <p className="text-xs text-gray-500 mt-2">
                        {completionStatus[activeTab].completed}/{completionStatus[activeTab].required} câmpuri obligatorii completate
                      </p>
                    )}
                  </div>
                  {completionStatus[activeTab]?.isComplete && (
                    <Badge className="bg-green-500 text-white font-bold text-base px-4 py-2 flex-shrink-0">
                      ✓ COMPLET
                    </Badge>
                  )}
                </div>

                {/* Câmpuri formular - responsive grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentSection.fields.map(field => {
                    const value = formData[field.id] || "";
                    const isEmpty = !value || value === "";

                    return (
                      <div key={field.id} className="space-y-1">
                        <label className={cn(
                          "block text-sm font-medium",
                          field.required && isEmpty ? "text-red-600" : "text-gray-700"
                        )}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>

                        {field.type === "select" ? (
                          <Select
                            value={value}
                            onChange={e => handleFieldChange(field.id, e.target.value)}
                            className={cn(
                              "w-full px-3 py-2 border rounded text-sm",
                              field.required && isEmpty ? "border-red-500" : "border-gray-300"
                            )}
                          >
                            <option value="">-- Selectați --</option>
                            {field.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </Select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            value={value}
                            onChange={e => handleFieldChange(field.id, e.target.value)}
                            maxLength={field.maxLength}
                            rows={3}
                            className={cn(
                              "w-full px-3 py-2 border rounded text-sm",
                              field.required && isEmpty ? "border-red-500" : "border-gray-300"
                            )}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            value={value}
                            onChange={e => handleFieldChange(field.id, e.target.value)}
                            min={field.min}
                            max={field.max}
                            placeholder={field.placeholder}
                            className={cn(
                              "w-full px-3 py-2 border rounded text-sm",
                              field.required && isEmpty ? "border-red-500" : "border-gray-300"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Navigare taburi */}
              <div className="flex flex-col md:flex-row justify-between gap-4 pb-6">
                <button
                  onClick={() => {
                    const currentIndex = SECTIONS_ARRAY.findIndex(s => s.key === activeTab);
                    if (currentIndex > 0) {
                      handleTabChange(SECTIONS_ARRAY[currentIndex - 1].key);
                    }
                  }}
                  disabled={SECTIONS_ARRAY[0].key === activeTab}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ← Precedent
                </button>

                <span className="text-center text-gray-600 font-medium py-2">
                  Etapa {SECTIONS_ARRAY.findIndex(s => s.key === activeTab) + 1} / {SECTIONS_ARRAY.length}
                </span>

                <button
                  onClick={() => {
                    const currentIndex = SECTIONS_ARRAY.findIndex(s => s.key === activeTab);
                    if (currentIndex < SECTIONS_ARRAY.length - 1) {
                      handleTabChange(SECTIONS_ARRAY[currentIndex + 1].key);
                    }
                  }}
                  disabled={SECTIONS_ARRAY[SECTIONS_ARRAY.length - 1].key === activeTab}
                  className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Următor →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* PROGRESS INDICATOR - FOOTER */}
      <footer className="border-t border-gray-200 bg-white">
        <ProgressIndicator
          completionStatus={completionStatus}
          sections={SECTIONS_ARRAY}
          className="m-0 border-0 rounded-0"
        />
      </footer>
    </div>
  );
}
