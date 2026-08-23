/**
 * Form Validation Library.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Lightweight, type-safe validation tanpa dependencies (no Zod, Yup, dll).
 * Provides:
 * - Common validators (required, email, minLength, dll)
 * - Composable validation (compose multiple rules)
 * - Type-safe error structure
 * - i18n-friendly error messages
 * - Server-side validation (sync) & client-side (real-time)
 *
 * Usage:
 *   const validator = createValidator({
 *     email: [required(), email()],
 *     password: [required(), minLength(8)],
 *   });
 *   const result = validator.validate(formData);
 *   if (!result.valid) { setErrors(result.errors); }
 */

// ===== Types =====

export type ValidationRule<T = any> = (value: T, allValues?: Record<string, any>) => string | null;

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  firstError?: { field: string; message: string };
}

export interface Validator {
  validate: (values: Record<string, any>) => ValidationResult;
  validateField: (field: string, value: any, allValues?: Record<string, any>) => string | null;
}

// ===== Built-in Validators =====

/**
 * Required field - tidak boleh kosong.
 */
export function required(message?: string): ValidationRule {
  return (value) => {
    if (value === null || value === undefined) return message || "Field ini wajib diisi";
    if (typeof value === "string" && value.trim() === "") return message || "Field ini wajib diisi";
    if (Array.isArray(value) && value.length === 0) return message || "Pilih minimal satu item";
    return null;
  };
}

/**
 * Email validation (RFC 5322 simplified).
 */
export function email(message?: string): ValidationRule {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (value) => {
    if (!value) return null; // Skip if empty (use required() if needed)
    return re.test(String(value)) ? null : message || "Format email tidak valid";
  };
}

/**
 * Minimum length for strings.
 */
export function minLength(min: number, message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    const len = String(value).length;
    return len >= min ? null : message || `Minimal ${min} karakter (saat ini: ${len})`;
  };
}

/**
 * Maximum length for strings.
 */
export function maxLength(max: number, message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    const len = String(value).length;
    return len <= max ? null : message || `Maksimal ${max} karakter (saat ini: ${len})`;
  };
}

/**
 * Exact length.
 */
export function length(len: number, message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    return String(value).length === len
      ? null
      : message || `Harus tepat ${len} karakter`;
  };
}

/**
 * Numeric range.
 */
export function range(min: number, max: number, message?: string): ValidationRule<number> {
  return (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (isNaN(num)) return message || "Harus berupa angka";
    if (num < min || num > max) {
      return message || `Harus antara ${min} dan ${max}`;
    }
    return null;
  };
}

/**
 * Minimum value.
 */
export function min(min: number, message?: string): ValidationRule<number> {
  return (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (isNaN(num)) return message || "Harus berupa angka";
    return num >= min ? null : message || `Minimal ${min}`;
  };
}

/**
 * Maximum value.
 */
export function max(max: number, message?: string): ValidationRule<number> {
  return (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (isNaN(num)) return message || "Harus berupa angka";
    return num <= max ? null : message || `Maksimal ${max}`;
  };
}

/**
 * Pattern (regex) match.
 */
export function pattern(regex: RegExp, message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    return regex.test(String(value))
      ? null
      : message || "Format tidak valid";
  };
}

/**
 * ISBN-10 or ISBN-13 validation.
 */
export function isbn(message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    const cleaned = String(value).replace(/[-\s]/g, "");
    if (cleaned.length === 10) {
      // ISBN-10: 9 digits + check (digit or X)
      if (!/^\d{9}[\dX]$/.test(cleaned)) return message || "Format ISBN-10 tidak valid";
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i], 10) * (10 - i);
      const check = cleaned[9] === "X" ? 10 : parseInt(cleaned[9], 10);
      sum += check;
      return sum % 11 === 0 ? null : message || "ISBN-10 checksum tidak valid";
    }
    if (cleaned.length === 13) {
      if (!/^\d{13}$/.test(cleaned)) return message || "Format ISBN-13 tidak valid";
      let sum = 0;
      for (let i = 0; i < 13; i++) {
        sum += parseInt(cleaned[i], 10) * (i % 2 === 0 ? 1 : 3);
      }
      return sum % 10 === 0 ? null : message || "ISBN-13 checksum tidak valid";
    }
    return message || "ISBN harus 10 atau 13 digit";
  };
}

/**
 * Phone number (Indonesian format).
 */
export function phoneID(message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    const cleaned = String(value).replace(/[\s-]/g, "");
    // 08xx-xxxx-xxxx or +62xxx
    const re = /^(\+62|62|0)8[0-9]{8,11}$/;
    return re.test(cleaned) ? null : message || "Nomor telepon tidak valid (contoh: 081234567890)";
  };
}

/**
 * URL validation.
 */
export function url(message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    try {
      new URL(String(value));
      return null;
    } catch {
      return message || "URL tidak valid";
    }
  };
}

/**
 * Match another field (e.g. password confirmation).
 */
export function matches(field: string, message?: string): ValidationRule {
  return (value, allValues) => {
    if (!value) return null;
    return value === allValues?.[field]
      ? null
      : message || `Tidak cocok dengan ${field}`;
  };
}

/**
 * One-of (enum) validator.
 */
export function oneOf<T>(allowed: T[], message?: string): ValidationRule<T> {
  return (value) => {
    if (value === null || value === undefined || value === "") return null;
    return allowed.includes(value)
      ? null
      : message || `Nilai tidak valid`;
  };
}

/**
 * Custom validator.
 */
export function custom<T>(
  fn: (value: T, allValues?: Record<string, any>) => string | null | Promise<string | null>
): ValidationRule<T> {
  return fn as ValidationRule<T>;
}

// ===== Validator Builder =====

interface FieldRules {
  [field: string]: ValidationRule[];
}

/**
 * Create a validator dari field rules.
 */
export function createValidator(fieldRules: FieldRules): Validator {
  return {
    validate(values) {
      const errors: Record<string, string> = {};
      let firstError: { field: string; message: string } | undefined;

      for (const [field, rules] of Object.entries(fieldRules)) {
        const value = values[field];
        for (const rule of rules) {
          const error = rule(value, values);
          if (error) {
            errors[field] = error;
            if (!firstError) firstError = { field, message: error };
            break; // Stop at first error per field
          }
        }
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors,
        firstError,
      };
    },

    validateField(field, value, allValues) {
      const rules = fieldRules[field];
      if (!rules) return null;
      for (const rule of rules) {
        const error = rule(value, allValues);
        if (error) return error;
      }
      return null;
    },
  };
}

// ===== Helper Functions =====

/**
 * Convert errors object to readable string.
 */
export function formatErrors(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([field, msg]) => `${field}: ${msg}`)
    .join(", ");
}

/**
 * Get first error for a field (or empty string).
 */
export function getFieldError(
  errors: Record<string, string>,
  field: string
): string | undefined {
  return errors[field];
}

/**
 * Check if any field has error.
 */
export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}

// ===== Common Field Rules =====

/**
 * Common rules for email field.
 */
export const emailRules = (requiredMsg?: string) => [
  required(requiredMsg),
  email(),
];

/**
 * Common rules for password field.
 */
export const passwordRules = (min = 8) => [
  required("Password wajib diisi"),
  minLength(min, `Password minimal ${min} karakter`),
];

/**
 * Common rules for name field.
 */
export const nameRules = () => [
  required("Nama wajib diisi"),
  minLength(2, "Nama minimal 2 karakter"),
  maxLength(100, "Nama maksimal 100 karakter"),
];

/**
 * Common rules for member number (e.g., SIS-2024-001).
 */
export const memberNumberRules = () => [
  required("Nomor anggota wajib diisi"),
  pattern(/^[A-Z]{2,4}-?\d{3,}-?\d{3,}$/, "Format: ABC-2024-001"),
];

/**
 * Common rules for phone field.
 */
export const phoneRules = () => [
  required("Nomor telepon wajib diisi"),
  phoneID(),
];
