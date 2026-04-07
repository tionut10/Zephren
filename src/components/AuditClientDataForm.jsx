import React, { useState, useEffect } from "react";
import { cn, Card, Input, Select, Badge, Button } from "./ui.jsx";

/**
 * AuditClientDataForm — Formular structurat pentru colectare date audit energetic
 * - 6 categorii: Documentație, Anvelopa, Termică, Electrice, Măsurători, Admin
 * - Validare de date
 * - Salvare localStorage
 * - Export JSON
 */

const SECTIONS = {
  documentation: {
    label: "Documentație Clădire",
    icon: "📋",
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
      { id: "thermalBridgesPresent", label: "Punți termice vizibile?", type: "select", options: ["Да", "Nu", "Parțial izolate", "Nu stiu"] },
    ]
  },
  thermal: {
    label: "Instalații Termice",
    icon: "🔥",
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

export default function AuditClientDataForm({ onDataChange, initialData = {} }) {
  const [formData, setFormData] = useState(initialData);
  const [completionStatus, setCompletionStatus] = useState({});
  const [showChecklistOnly, setShowChecklistOnly] = useState(false);

  // Sincronizare localStorage la fiecare schimbare
  useEffect(() => {
    localStorage.setItem("auditClientData", JSON.stringify(formData));
    updateCompletionStatus();
    if (onDataChange) onDataChange(formData);
  }, [formData, onDataChange]);

  // Calculează care câmpuri sunt completate
  const updateCompletionStatus = () => {
    const status = {};
    Object.entries(SECTIONS).forEach(([sectionKey, section]) => {
      const requiredFields = section.fields.filter(f => f.required);
      const completedRequired = requiredFields.filter(f => formData[f.id]).length;
      const completedAll = section.fields.filter(f => formData[f.id]).length;

      status[sectionKey] = {
        completed: completedRequired,
        required: requiredFields.length,
        total: section.fields.length,
        completedTotal: completedAll,
        isComplete: completedRequired === requiredFields.length,
      };
    });
    setCompletionStatus(status);
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const element = document.createElement("a");
    element.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(dataStr));
    element.setAttribute("download", `audit-client-data-${new Date().toISOString().split('T')[0]}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToCSV = () => {
    const flatData = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        flatData[key] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    });

    const headers = Object.keys(flatData);
    const values = headers.map(h => `"${flatData[h]}"`);
    const csv = [headers.join(","), values.join(",")].join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", `audit-client-data-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const clearForm = () => {
    if (window.confirm("Sigur doriți să ștergeți toate datele colectate?")) {
      setFormData({});
      localStorage.removeItem("auditClientData");
    }
  };

  const downloadChecklist = () => {
    const checklistText = Object.entries(SECTIONS)
      .map(([key, section]) => {
        const status = completionStatus[key] || {};
        const percentage = status.required > 0 ? Math.round((status.completed / status.required) * 100) : 0;
        return `${section.label}: ${status.completed}/${status.required} câmpuri obligatorii (${percentage}%)`;
      })
      .join("\n");

    const doc = `CHECKLIST AUDIT ENERGETIC
Data: ${new Date().toLocaleDateString('ro-RO')}
${new Array(40).fill("=").join("")}

${checklistText}

PROGRES TOTAL: ${Object.values(completionStatus).reduce((a, b) => a + (b.completed || 0), 0)} / ${Object.values(completionStatus).reduce((a, b) => a + (b.required || 0), 0)} câmpuri obligatorii

`;

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(doc));
    element.setAttribute("download", `checklist-audit-${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header cu opțiuni */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📋 Formular Audit Energetic</h2>
            <p className="text-gray-600 text-sm mt-1">Colectare date structurată pentru CPE și Audit Energetic</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowChecklistOnly(!showChecklistOnly)}
              className={cn(
                "px-3 py-2 rounded text-sm font-medium transition",
                showChecklistOnly
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              )}
            >
              {showChecklistOnly ? "Ascunde Checklist" : "Arată Checklist"}
            </button>
            <button onClick={exportToJSON} className="px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600">
              📥 JSON
            </button>
            <button onClick={exportToCSV} className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600">
              📊 CSV
            </button>
            <button onClick={downloadChecklist} className="px-3 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600">
              📋 Checklist
            </button>
            <button onClick={clearForm} className="px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600">
              🗑️ Șterge
            </button>
          </div>
        </div>
      </Card>

      {/* Checklist View */}
      {showChecklistOnly && (
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <h3 className="font-bold text-lg mb-4 text-gray-800">✓ Progres Colectare Date</h3>
          <div className="space-y-3">
            {Object.entries(SECTIONS).map(([sectionKey, section]) => {
              const status = completionStatus[sectionKey] || { completed: 0, required: 0 };
              const percentage = status.required > 0 ? Math.round((status.completed / status.required) * 100) : 0;
              return (
                <div key={sectionKey} className="space-y-1">
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
      )}

      {/* Form Sections */}
      {!showChecklistOnly && Object.entries(SECTIONS).map(([sectionKey, section]) => {
        const status = completionStatus[sectionKey];
        const isComplete = status?.isComplete;

        return (
          <Card key={sectionKey} className={cn(
            "p-6 transition-all border-2",
            isComplete ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
          )}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{section.icon} {section.label}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {status?.completed || 0}/{status?.required || 0} câmpuri obligatorii completate
                </p>
              </div>
              {isComplete && (
                <Badge className="bg-green-500 text-white font-bold">✓ COMPLET</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map(field => {
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
        );
      })}

      {/* Footer Summary */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="text-center space-y-2">
          <h4 className="font-bold text-gray-800">Rezumat Completare</h4>
          <p className="text-2xl font-bold text-purple-600">
            {Object.values(completionStatus).reduce((a, b) => a + (b.completed || 0), 0)} / {Object.values(completionStatus).reduce((a, b) => a + (b.required || 0), 0)}
          </p>
          <p className="text-sm text-gray-600">câmpuri obligatorii completate</p>
        </div>
      </Card>
    </div>
  );
}
