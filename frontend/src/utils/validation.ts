/**
 * Validation and masking utilities for phone and email fields.
 */

// ── Phone mask: (11) 91234-5678 ──────────────────────────────────────────────

/**
 * Formats a raw digits string into the Brazilian phone mask.
 * - 10 digits → (11) 1234-5678  (landline)
 * - 11 digits → (11) 91234-5678 (mobile)
 * - fewer     → formats what it can
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Validates a phone string (after unmasking).
 * Returns true if it has 10 or 11 digits (valid Brazilian phone with DDD).
 */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}

// ── Email validation ─────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates an email string — basic format check (something@something.something).
 */
export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim())
}
