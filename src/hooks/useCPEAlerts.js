import { useState, useEffect, useCallback } from "react";

function monthsUntilExpiry(cert) {
  if (!cert?.issueDate) return null;
  const issued = new Date(cert.issueDate);
  if (isNaN(issued.getTime())) return null;
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + 10);
  const now = new Date();
  const diff = (expiry - now) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.round(diff * 10) / 10;
}

/**
 * Hook pentru alerte CPE pe cale de expirare.
 * @param {Array} certificates - lista de certificate CPE (fiecare cu { id, address, issueDate, ... })
 * @returns {{ urgentCount, requestPermission, permissionStatus, hasAlerts }}
 */
export function useCPEAlerts(certificates = []) {
  const [urgentCount, setUrgentCount] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    try {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      return result;
    } catch {
      setPermissionStatus("denied");
    }
  }, []);

  useEffect(() => {
    if (!certificates?.length) {
      setUrgentCount(0);
      return;
    }

    const urgent = certificates.filter(c => {
      const m = monthsUntilExpiry(c);
      return m !== null && m <= 6;
    });

    setUrgentCount(urgent.length);

    // Trimite notificări browser pentru certificatele urgente (o dată per sesiune)
    if (permissionStatus === "granted" && urgent.length > 0) {
      urgent.forEach(c => {
        const storageKey = `zephren_cpe_notif_${c.id || c.address}`;
        const lastNotif = localStorage.getItem(storageKey);
        const now = Date.now();
        // Nu mai trimite dacă am notificat în ultimele 24h
        if (lastNotif && now - parseInt(lastNotif) < 24 * 3600 * 1000) return;

        const months = monthsUntilExpiry(c);
        const msg = months != null && months <= 0
          ? `CPE EXPIRAT — ${c.address || "Clădire fără adresă"}`
          : `CPE expiră în ${months != null ? months.toFixed(0) : "?"} luni — ${c.address || "Clădire fără adresă"}`;

        try {
          new Notification("⚠️ Zephren — Alertă CPE", {
            body: msg,
            icon: "/favicon.ico",
            tag: `cpe-${c.id || c.address}`,
          });
          localStorage.setItem(storageKey, String(now));
        } catch {
          // Notificările pot fi blocate de browser — ignorăm silențios
        }
      });
    }
  }, [certificates, permissionStatus]);

  return {
    urgentCount,
    requestPermission,
    permissionStatus,
    hasAlerts: urgentCount > 0,
    monthsUntilExpiry,
  };
}
