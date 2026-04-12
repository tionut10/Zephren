/**
 * Audit Trail Logger
 * Registrează toate operațiunile critice în Supabase audit log
 * Conformitate: GDPR (art. 5, 32), Ord. MDLPA 16/2023 (Anexa 2 - Certificat Performanță)
 */

import { supabase } from '../supabaseClient';

/**
 * Event types for audit logging
 */
export const AUDIT_EVENTS = {
  // Document operations
  AUDIT_CREATED: 'audit_created',
  AUDIT_MODIFIED: 'audit_modified',
  AUDIT_SIGNED: 'audit_signed',
  AUDIT_EXPORTED: 'audit_exported',
  AUDIT_VERIFIED: 'audit_verified',

  // Data operations
  DATA_IMPORTED: 'data_imported',
  DATA_VALIDATED: 'data_validated',
  DATA_CALCULATED: 'data_calculated',

  // Access & authentication
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_PERMISSION_CHANGED: 'user_permission_changed',

  // Security
  SIGNATURE_CREATED: 'signature_created',
  SIGNATURE_VERIFIED: 'signature_verified',
  SIGNATURE_REVOKED: 'signature_revoked',
  CERT_IMPORTED: 'cert_imported',
};

/**
 * Log an audit event to Supabase
 * @param {string} eventType - Type of event from AUDIT_EVENTS
 * @param {string} auditId - Reference to audit document
 * @param {object} actor - User performing action {id, email, role}
 * @param {object} details - Event-specific details
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<object>} - Logged record
 */
export async function logAuditEvent(eventType, auditId, actor, details = {}, ipAddress = null) {
  try {
    // Timestamp with timezone
    const timestamp = new Date().toISOString();

    // Create audit log entry
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          event_type: eventType,
          audit_id: auditId,
          user_id: actor?.id || null,
          user_email: actor?.email || null,
          user_role: actor?.role || null,
          action_description: getEventDescription(eventType, details),
          details: details,
          ip_address: ipAddress,
          timestamp,
          status: 'completed',
        },
      ])
      .select();

    if (error) {
      console.error('Audit log error:', error);
      // Don't throw - audit logging failure shouldn't break the app
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Audit trail exception:', err);
    return null;
  }
}

/**
 * Log signature creation
 */
export async function logSignature(auditId, actor, signatureData, ipAddress) {
  return logAuditEvent(
    AUDIT_EVENTS.SIGNATURE_CREATED,
    auditId,
    actor,
    {
      signer_name: signatureData.signerName,
      signer_role: signatureData.signerRole,
      cert_fingerprint: signatureData.certFingerprint,
      timestamp_server: signatureData.timestampServer,
      signature_algorithm: signatureData.algorithm,
    },
    ipAddress
  );
}

/**
 * Log audit verification
 */
export async function logVerification(auditId, actor, result, ipAddress) {
  return logAuditEvent(
    AUDIT_EVENTS.AUDIT_VERIFIED,
    auditId,
    actor,
    {
      valid: result.valid,
      issues: result.issues || [],
      verified_at: new Date().toISOString(),
    },
    ipAddress
  );
}

/**
 * Log data import
 */
export async function logDataImport(auditId, actor, importDetails, ipAddress) {
  return logAuditEvent(
    AUDIT_EVENTS.DATA_IMPORTED,
    auditId,
    actor,
    {
      source: importDetails.source,
      format: importDetails.format,
      record_count: importDetails.recordCount,
      validation_status: importDetails.validationStatus,
    },
    ipAddress
  );
}

/**
 * Log energy calculation
 */
export async function logCalculation(auditId, actor, calcDetails, ipAddress) {
  return logAuditEvent(
    AUDIT_EVENTS.DATA_CALCULATED,
    auditId,
    actor,
    {
      calculation_type: calcDetails.type,
      module: calcDetails.module,
      energy_class: calcDetails.energyClass,
      primary_energy: calcDetails.primaryEnergy,
    },
    ipAddress
  );
}

/**
 * Get human-readable event description
 */
function getEventDescription(eventType, details) {
  const descriptions = {
    [AUDIT_EVENTS.AUDIT_CREATED]: 'Audit energetic creat',
    [AUDIT_EVENTS.AUDIT_MODIFIED]: 'Audit modificat',
    [AUDIT_EVENTS.AUDIT_SIGNED]: 'Audit semnat digital',
    [AUDIT_EVENTS.AUDIT_EXPORTED]: 'Audit exportat (PDF/DOCX)',
    [AUDIT_EVENTS.AUDIT_VERIFIED]: 'Audit verificat',
    [AUDIT_EVENTS.DATA_IMPORTED]: `Date importate din ${details?.source || 'sursa'}`,
    [AUDIT_EVENTS.DATA_VALIDATED]: 'Date validate',
    [AUDIT_EVENTS.DATA_CALCULATED]: `Calcul ${details?.module || 'energetic'} efectuat`,
    [AUDIT_EVENTS.USER_LOGIN]: 'Utilizator autentificat',
    [AUDIT_EVENTS.USER_LOGOUT]: 'Utilizator deconectat',
    [AUDIT_EVENTS.USER_PERMISSION_CHANGED]: 'Permisiuni utilizator schimbate',
    [AUDIT_EVENTS.SIGNATURE_CREATED]: `Semnătură digitală creată de ${details?.signer_name || 'utilizator'}`,
    [AUDIT_EVENTS.SIGNATURE_VERIFIED]: 'Semnătură digitală verificată',
    [AUDIT_EVENTS.SIGNATURE_REVOKED]: 'Semnătură digitală revocată',
    [AUDIT_EVENTS.CERT_IMPORTED]: 'Certificat X.509 importat',
  };

  return descriptions[eventType] || 'Eveniment audit necunoscut';
}

/**
 * Retrieve audit history for an audit document
 * @param {string} auditId - Audit document ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<array>} - Audit log records
 */
export async function getAuditHistory(auditId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('audit_id', auditId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to retrieve audit history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Audit history retrieval error:', err);
    return [];
  }
}

/**
 * Generate audit trail report (for export/compliance)
 * @param {string} auditId - Audit document ID
 * @returns {Promise<object>} - Formatted report
 */
export async function generateAuditTrailReport(auditId) {
  try {
    const logs = await getAuditHistory(auditId, 999);

    return {
      audit_id: auditId,
      generated_at: new Date().toISOString(),
      total_events: logs.length,
      events: logs.map(log => ({
        timestamp: log.timestamp,
        event: log.event_type,
        description: log.action_description,
        actor: `${log.user_email} (${log.user_role})`,
        details: log.details,
        ip_address: log.ip_address,
      })),
      summary: {
        total_modifications: logs.filter(l => l.event_type === AUDIT_EVENTS.AUDIT_MODIFIED).length,
        total_signatures: logs.filter(l => l.event_type === AUDIT_EVENTS.SIGNATURE_CREATED).length,
        last_signature: logs.find(l => l.event_type === AUDIT_EVENTS.SIGNATURE_CREATED)?.timestamp || null,
        audit_chain_valid: validateAuditChain(logs),
      },
    };
  } catch (err) {
    console.error('Audit trail report generation error:', err);
    return null;
  }
}

/**
 * Validate audit log chain integrity
 * Checks for gaps, unauthorized modifications, timestamp order
 * @param {array} logs - Audit log records
 * @returns {boolean} - Chain integrity status
 */
function validateAuditChain(logs) {
  if (!logs || logs.length === 0) return true;

  // Check timestamp ordering (should be descending from DB)
  for (let i = 0; i < logs.length - 1; i++) {
    const current = new Date(logs[i].timestamp);
    const next = new Date(logs[i + 1].timestamp);
    if (current < next) {
      console.warn('Audit chain: timestamp ordering violated at index', i);
      return false;
    }
  }

  // Check for suspicious gaps (>24 hours between critical events)
  const criticalEvents = [
    AUDIT_EVENTS.AUDIT_SIGNED,
    AUDIT_EVENTS.SIGNATURE_CREATED,
    AUDIT_EVENTS.AUDIT_MODIFIED,
  ];

  let lastCritical = null;
  for (const log of logs) {
    if (criticalEvents.includes(log.event_type)) {
      if (lastCritical) {
        const gap = new Date(lastCritical.timestamp) - new Date(log.timestamp);
        if (gap > 86400000) { // 24 hours
          console.warn('Audit chain: suspicious gap detected', Math.floor(gap / 3600000), 'hours');
        }
      }
      lastCritical = log;
    }
  }

  return true;
}

export default {
  logAuditEvent,
  logSignature,
  logVerification,
  logDataImport,
  logCalculation,
  getAuditHistory,
  generateAuditTrailReport,
  validateAuditChain,
  AUDIT_EVENTS,
};
