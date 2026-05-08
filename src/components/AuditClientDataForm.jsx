import React, { useState, useEffect } from "react";
import { cn, Card, Input, Badge } from "./ui.jsx";
import TabNavigation from "./AuditClientDataForm/TabNavigation.jsx";
import ProgressIndicator from "./AuditClientDataForm/ProgressIndicator.jsx";
import { SECTIONS, SECTIONS_ARRAY } from "./AuditClientDataForm/utils/sectionConfig.js";
import { exportToJSON, exportToCSV, downloadChecklist, exportToDOCX, DEMO_DATA } from "./AuditClientDataForm/utils/exportUtils.js";
import { calculateFormCompletion } from "./AuditClientDataForm/utils/validationUtils.js";
import { saveToStorage, loadFromStorage } from "./AuditClientDataForm/utils/storageUtils.js";

export default function AuditClientDataForm({ onDataChange, initialData = {} }) {
  const [formData, setFormData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("identity");
  const [completionStatus, setCompletionStatus] = useState({});
  const [showChecklistOnly, setShowChecklistOnly] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.success && stored.data && Object.keys(initialData).length === 0) {
      setFormData(stored.data);
    }
  }, []);

  useEffect(() => {
    const saveResult = saveToStorage(formData);
    if (saveResult.success) {
      setSaveMessage("Salvat");
      setTimeout(() => setSaveMessage(""), 2000);
    }
    if (onDataChange) onDataChange(formData);
    updateCompletionStatus();
  }, [formData, onDataChange]);

  const updateCompletionStatus = () => {
    const completion = calculateFormCompletion(formData, SECTIONS);
    setCompletionStatus(completion.bySection);
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleTabChange = (tabKey) => setActiveTab(tabKey);

  const loadDemoData = () => {
    if (Object.keys(formData).length > 0) {
      if (!window.confirm("Formularul conține deja date. Le înlocuiți cu datele demo?")) return;
    }
    setFormData(DEMO_DATA);
  };

  const clearForm = () => {
    if (window.confirm("Sigur doriți să ștergeți toate datele colectate?")) {
      setFormData({});
      setActiveTab("identity");
    }
  };

  const handleGenerateCerere = async () => {
    try {
      const { generateClientRequestPdf } = await import("../lib/client-request-pdf.js");
      await generateClientRequestPdf({
        client: {
          name: formData.ownerName,
          type: formData.ownerType?.includes("PJ") ? "PJ" : "PF",
          cnp: formData.ownerCNP,
          cui: formData.ownerCUI,
          address: formData.ownerAddress,
          city: formData.ownerCity,
          email: formData.ownerEmail,
          phone: formData.ownerPhone,
        },
        building: {
          address: formData.buildingAddress,
          locality: formData.buildingLocality,
          county: formData.buildingCounty,
          cadastralNumber: formData.cadastralNumber,
          landBook: formData.landBook,
          category: formData.buildingType,
          areaUseful: formData.usefulArea,
          yearBuilt: formData.constructionYear,
          scopCpe: formData.scopCpe,
          nFloors: formData.nFloors,
        },
        services: {
          cpe: true,
          audit: formData.servicesNeeded?.includes("Audit"),
          passport: false,
          nzebRoadmap: false,
        },
        documents: _buildDocumentsList(formData),
        requestDate: new Date(),
      });
    } catch (e) {
      console.error("[ClientRequest] Eroare:", e);
      alert("Eroare generare cerere: " + (e?.message || "necunoscut"));
    }
  };

  const currentSection = SECTIONS[activeTab];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <Card className="m-0 p-4 md:p-6 bg-gradient-to-r from-blue-50 to-green-50 border-0 rounded-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Formular Solicitare Client
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Certificat de Performanță Energetică și/sau Audit Energetic — completați în 5-7 minute
              </p>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={loadDemoData}
                className="px-3 py-2 bg-teal-500 text-white rounded text-sm font-medium hover:bg-teal-600 transition whitespace-nowrap"
                title="Pre-populează cu date fictive pentru testare"
              >
                🧪 Demo
              </button>
              <button
                onClick={() => setShowChecklistOnly(!showChecklistOnly)}
                className={cn(
                  "px-3 py-2 rounded text-sm font-medium transition whitespace-nowrap",
                  showChecklistOnly
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                )}
              >
                {showChecklistOnly ? "Ascunde Progres" : "📊 Progres"}
              </button>
              <button
                onClick={() => exportToDOCX(formData, SECTIONS)}
                className="px-3 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 transition whitespace-nowrap"
                title="Descarcă fișă sinteză în format DOCX"
              >
                📄 DOCX
              </button>
              <button
                onClick={handleGenerateCerere}
                className="px-3 py-2 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 transition whitespace-nowrap"
                title="Generează cerere oficială client → auditor (PDF)"
              >
                📜 Cerere oficială
              </button>
              <button
                onClick={() => exportToJSON(formData)}
                className="px-3 py-2 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600 transition whitespace-nowrap"
                title="Export date brute JSON"
              >
                ⬇ JSON
              </button>
              <button
                onClick={clearForm}
                className="px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition whitespace-nowrap"
              >
                🗑️ Șterge
              </button>
              {saveMessage && (
                <span className="px-3 py-2 text-sm text-green-600 font-medium">✓ {saveMessage}</span>
              )}
            </div>
          </div>
        </Card>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* TAB NAVIGATION */}
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
            <div className="p-4 md:p-6 space-y-4">
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <h3 className="font-bold text-lg mb-4 text-gray-800">Progres completare formular</h3>
                <div className="space-y-3">
                  {SECTIONS_ARRAY.map((section) => {
                    const status = completionStatus[section.key] || { completed: 0, required: 0 };
                    const percentage = status.required > 0 ? Math.round((status.completed / status.required) * 100) : 100;
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
                            {status.completed}/{status.required}
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
            <div className="p-4 md:p-6 space-y-6">
              <Card className={cn(
                "p-4 md:p-6 transition-all border-2",
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
                    <p className="text-gray-500 text-sm mt-1">{currentSection.description}</p>
                    {completionStatus[activeTab] && (
                      <p className="text-xs text-gray-400 mt-1">
                        {completionStatus[activeTab].completed}/{completionStatus[activeTab].required} câmpuri obligatorii completate
                      </p>
                    )}
                  </div>
                  {completionStatus[activeTab]?.isComplete && (
                    <Badge className="bg-green-500 text-white font-bold text-sm px-4 py-2 flex-shrink-0">
                      ✓ COMPLET
                    </Badge>
                  )}
                </div>

                {/* Câmpuri formular */}
                <div className="space-y-4">
                  {currentSection.fields.map(field => {
                    const value = formData[field.id];
                    const isEmpty = value === undefined || value === null || value === "" || value === false;

                    // ── CHECKBOX
                    if (field.type === "checkbox") {
                      return (
                        <div key={field.id} className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                          value
                            ? "bg-green-50 border-green-300"
                            : field.required && isEmpty
                              ? "bg-red-50 border-red-300"
                              : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200"
                        )}
                          onClick={() => handleFieldChange(field.id, !value)}
                        >
                          <div className={cn(
                            "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors",
                            value ? "bg-green-500 border-green-500" : "border-gray-400 bg-white"
                          )}>
                            {value && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <label className="text-sm text-gray-700 leading-relaxed cursor-pointer select-none">
                            {field.required && (
                              <span className="text-red-500 mr-1 font-bold">*</span>
                            )}
                            {field.label}
                          </label>
                        </div>
                      );
                    }

                    // ── GRID pentru câmpuri non-checkbox
                    return (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 items-start">
                        <label className={cn(
                          "block text-sm font-medium pt-2 md:text-right",
                          field.required && isEmpty ? "text-red-600" : "text-gray-700"
                        )}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          {field.hint && (
                            <span className="block text-xs text-gray-400 font-normal mt-0.5">{field.hint}</span>
                          )}
                        </label>

                        <div className="md:col-span-2">
                          {field.type === "select" ? (
                            <select
                              value={value || ""}
                              onChange={e => handleFieldChange(field.id, e.target.value)}
                              className={cn(
                                "w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition",
                                field.required && isEmpty ? "border-red-400 bg-red-50" : "border-gray-300"
                              )}
                            >
                              <option value="">— Selectați —</option>
                              {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <textarea
                              value={value || ""}
                              onChange={e => handleFieldChange(field.id, e.target.value)}
                              maxLength={field.maxLength}
                              rows={3}
                              className={cn(
                                "w-full px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition",
                                field.required && isEmpty ? "border-red-400 bg-red-50" : "border-gray-300"
                              )}
                              placeholder={field.placeholder}
                            />
                          ) : (
                            <Input
                              type={field.type}
                              value={value || ""}
                              onChange={e => handleFieldChange(field.id, e.target.value)}
                              min={field.min}
                              max={field.max}
                              placeholder={field.placeholder}
                              className={cn("text-gray-900 bg-white",
                                "w-full",
                                field.required && isEmpty ? "border-red-400 bg-red-50" : ""
                              )}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Navigare taburi */}
              <div className="flex justify-between gap-4 pb-6">
                <button
                  onClick={() => {
                    const idx = SECTIONS_ARRAY.findIndex(s => s.key === activeTab);
                    if (idx > 0) handleTabChange(SECTIONS_ARRAY[idx - 1].key);
                  }}
                  disabled={SECTIONS_ARRAY[0].key === activeTab}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Înapoi
                </button>

                <span className="text-sm text-gray-500 py-2 self-center">
                  Etapa {SECTIONS_ARRAY.findIndex(s => s.key === activeTab) + 1} / {SECTIONS_ARRAY.length}
                </span>

                <button
                  onClick={() => {
                    const idx = SECTIONS_ARRAY.findIndex(s => s.key === activeTab);
                    if (idx < SECTIONS_ARRAY.length - 1) handleTabChange(SECTIONS_ARRAY[idx + 1].key);
                  }}
                  disabled={SECTIONS_ARRAY[SECTIONS_ARRAY.length - 1].key === activeTab}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Următor →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FOOTER — progress indicator */}
      <footer className="border-t border-gray-200 bg-white">
        <ProgressIndicator
          completionStatus={completionStatus}
          sections={SECTIONS_ARRAY}
          className="m-0 border-0 rounded-none"
        />
      </footer>
    </div>
  );
}

// ── Helpers

function _buildDocumentsList(formData) {
  return [
    { label: "Act de proprietate (titlu, contract)", available: formData.hasPropertyAct === "Da — disponibil" },
    { label: "Extras Carte Funciară (CF) recent", available: formData.hasCF?.startsWith("Da") },
    { label: "Plan / releveu arhitectural", available: formData.hasArchitecturalPlan?.startsWith("Da") },
    { label: "Cartea tehnică a construcției", available: formData.hasTechnicalBook?.startsWith("Da") },
    { label: "Facturi energie (electricitate / gaz / lemn)", available: formData.hasEnergyBills?.startsWith("Da") },
    { label: "Autorizație de construire / renovare", available: formData.hasBuildingPermit === "Da" },
  ];
}
