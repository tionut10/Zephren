/**
 * storageUtils.js - Gestionare localStorage pentru date audit
 */

const STORAGE_KEY = "auditClientData";
const STORAGE_VERSION = "1.0";

/**
 * Salveaza date în localStorage
 */
export function saveToStorage(formData, metadata = {}) {
  try {
    const storageData = {
      version: STORAGE_VERSION,
      lastModified: new Date().toISOString(),
      data: formData,
      metadata: {
        auditorName: formData.auditorName || "Unknown",
        buildingAddress: formData.buildingAddress || "Unknown",
        inspectionDate: formData.inspectionDate || new Date().toISOString().split('T')[0],
        ...metadata
      }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    return { success: true, message: "Date salvate cu succes" };
  } catch (error) {
    console.error("Eroare salvare localStorage:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Incarca date din localStorage
 */
export function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { success: false, data: null, message: "Nicio dato salvată anterior" };
    }

    const parsed = JSON.parse(stored);

    // Verifică versiune
    if (parsed.version !== STORAGE_VERSION) {
      console.warn(`Storage version mismatch: ${parsed.version} vs ${STORAGE_VERSION}`);
      // Poți implementa migrace de date dacă versiunea nu se potrivește
    }

    return {
      success: true,
      data: parsed.data,
      metadata: parsed.metadata,
      lastModified: parsed.lastModified
    };
  } catch (error) {
    console.error("Eroare încărcare localStorage:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Șterge date din localStorage
 */
export function deleteFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true, message: "Date șterse cu succes" };
  } catch (error) {
    console.error("Eroare ștergere localStorage:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica dacă există date salvate
 */
export function hasStoredData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null;
  } catch (error) {
    console.error("Eroare verificare localStorage:", error);
    return false;
  }
}

/**
 * Obține timestamp modificării ultime
 */
export function getLastModifiedTime() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return new Date(parsed.lastModified);
  } catch (error) {
    console.error("Eroare citire timestamp:", error);
    return null;
  }
}

/**
 * Exportă backup complet cu metadate
 */
export function exportBackup() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { success: false, error: "Nicio dato de exportat" };
    }

    const parsed = JSON.parse(stored);
    const backupStr = JSON.stringify(parsed, null, 2);

    // Creează link pentru download
    const element = document.createElement("a");
    element.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(backupStr));
    element.setAttribute("download", `audit-backup-${new Date().toISOString().split('T')[0]}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    return { success: true, message: "Backup exportat cu succes" };
  } catch (error) {
    console.error("Eroare export backup:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Importa backup din fișier JSON
 * Retuează funcție de callback pentru <input type="file">
 */
export function createImportHandler() {
  return function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        const parsed = JSON.parse(content);

        // Validează structură
        if (!parsed.version || !parsed.data) {
          throw new Error("Format backup invalid");
        }

        // Salvează
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return { success: true, message: "Backup importat cu succes", data: parsed.data };
      } catch (error) {
        console.error("Eroare import backup:", error);
        return { success: false, error: error.message };
      }
    };

    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };
}

/**
 * Șterge date mai vechi de X zile (cleanup)
 */
export function cleanupOldData(daysThreshold = 30) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { success: true, message: "Nicio dato de cleanup" };

    const parsed = JSON.parse(stored);
    const lastModified = new Date(parsed.lastModified);
    const daysOld = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

    if (daysOld > daysThreshold) {
      localStorage.removeItem(STORAGE_KEY);
      return {
        success: true,
        message: `Date șterse (${Math.floor(daysOld)} zile vechi)`
      };
    }

    return {
      success: true,
      message: `Date sunt recente (${Math.floor(daysOld)} zile)`
    };
  } catch (error) {
    console.error("Eroare cleanup:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obține statistici storage
 */
export function getStorageStats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        hasData: false,
        sizeBytes: 0,
        sizeMB: 0,
        fieldsCount: 0
      };
    }

    const parsed = JSON.parse(stored);
    const sizeBytes = new Blob([stored]).size;
    const fieldsCount = Object.keys(parsed.data || {}).length;

    return {
      hasData: true,
      sizeBytes,
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
      fieldsCount,
      lastModified: parsed.lastModified,
      version: parsed.version
    };
  } catch (error) {
    console.error("Eroare citire stats:", error);
    return { error: error.message };
  }
}
