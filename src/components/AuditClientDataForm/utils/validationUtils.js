/**
 * validationUtils.js - Validare câmpuri formular
 */

/**
 * Validează email
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validează telefon (format acceptat: +40..., 07..., etc.)
 */
export function validatePhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validează câmp obligatoriu
 */
export function validateRequired(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined && value !== '';
}

/**
 * Validează număr în interval
 */
export function validateNumber(value, min, max) {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

/**
 * Validează dată
 */
export function validateDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Validează lungimea text
 */
export function validateLength(value, minLength, maxLength) {
  const length = String(value).length;
  if (minLength !== undefined && length < minLength) return false;
  if (maxLength !== undefined && length > maxLength) return false;
  return true;
}

/**
 * Validează o valoare select (să existe în options)
 */
export function validateSelect(value, options) {
  if (!value) return true; // select nu obligatoriu implicit
  return options.includes(value);
}

/**
 * Validează um domeniu complet pe baza configurației
 */
export function validateField(field, value) {
  // Câmp obligatoriu gol?
  if (field.required && !validateRequired(value)) {
    return {
      valid: false,
      error: `${field.label} este obligatoriu`
    };
  }

  // Dacă nu e obligatoriu și e gol, e valid
  if (!value) {
    return { valid: true };
  }

  // Validări specifice pe tip
  switch (field.type) {
    case 'email':
      if (!validateEmail(value)) {
        return {
          valid: false,
          error: `${field.label} nu este o adresă email validă`
        };
      }
      break;

    case 'tel':
      if (!validatePhone(value)) {
        return {
          valid: false,
          error: `${field.label} nu este un telefon valid`
        };
      }
      break;

    case 'number':
      if (!validateNumber(value, field.min, field.max)) {
        const rangMsg = field.min || field.max
          ? ` (interval: ${field.min || 'fără minim'} - ${field.max || 'fără maxim'})`
          : '';
        return {
          valid: false,
          error: `${field.label} trebuie să fie un număr valid${rangMsg}`
        };
      }
      break;

    case 'date':
      if (!validateDate(value)) {
        return {
          valid: false,
          error: `${field.label} nu este o dată validă`
        };
      }
      break;

    case 'select':
      if (!validateSelect(value, field.options || [])) {
        return {
          valid: false,
          error: `${field.label} are valoare nevalidă`
        };
      }
      break;

    case 'textarea':
      if (field.maxLength && !validateLength(value, undefined, field.maxLength)) {
        return {
          valid: false,
          error: `${field.label} depășește ${field.maxLength} caractere`
        };
      }
      break;

    default:
      if (field.minLength && !validateLength(value, field.minLength)) {
        return {
          valid: false,
          error: `${field.label} trebuie să aibă minim ${field.minLength} caractere`
        };
      }
  }

  return { valid: true };
}

/**
 * Validează o întreagă secțiune
 */
export function validateSection(section, formData) {
  const errors = {};
  let validFieldsCount = 0;

  section.fields.forEach(field => {
    const validation = validateField(field, formData[field.id]);
    if (!validation.valid) {
      errors[field.id] = validation.error;
    } else {
      validFieldsCount++;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    validFieldsCount,
    totalFields: section.fields.length
  };
}

/**
 * Validează întregul formular
 */
export function validateForm(formData, SECTIONS) {
  const allErrors = {};
  let totalValid = 0;

  Object.values(SECTIONS).forEach(section => {
    section.fields.forEach(field => {
      const validation = validateField(field, formData[field.id]);
      if (!validation.valid) {
        allErrors[field.id] = validation.error;
      } else {
        totalValid++;
      }
    });
  });

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
    validFieldsCount: totalValid,
    totalFields: Object.values(SECTIONS).reduce((sum, s) => sum + s.fields.length, 0)
  };
}

/**
 * Calculează completion status pentru o secțiune
 */
export function calculateSectionCompletion(section, formData) {
  const requiredFields = section.fields.filter(f => f.required);
  const completedRequired = requiredFields.filter(f => formData[f.id]).length;
  const completedAll = section.fields.filter(f => formData[f.id]).length;

  return {
    completed: completedRequired,
    required: requiredFields.length,
    total: section.fields.length,
    completedTotal: completedAll,
    isComplete: completedRequired === requiredFields.length,
    percentage: requiredFields.length > 0
      ? Math.round((completedRequired / requiredFields.length) * 100)
      : 0
  };
}

/**
 * Calculează completion status pentru intreg formular
 */
export function calculateFormCompletion(formData, SECTIONS) {
  const completionStatus = {};
  let totalCompleted = 0;
  let totalRequired = 0;

  Object.entries(SECTIONS).forEach(([sectionKey, section]) => {
    completionStatus[sectionKey] = calculateSectionCompletion(section, formData);
    totalCompleted += completionStatus[sectionKey].completed;
    totalRequired += completionStatus[sectionKey].required;
  });

  const overallPercentage = totalRequired > 0
    ? Math.round((totalCompleted / totalRequired) * 100)
    : 0;

  return {
    bySection: completionStatus,
    totalCompleted,
    totalRequired,
    overallPercentage,
    isFormComplete: totalCompleted === totalRequired
  };
}
