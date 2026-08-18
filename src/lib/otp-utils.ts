export type IdentifierType = 'email' | 'phone'

/**
 * Determines whether the given string is an email address or a phone number.
 */
export function detectIdentifierType(identifier: string): IdentifierType {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) {
    return 'email'
  }
  return 'phone'
}

/**
 * Normalizes email or phone number for consistent lookup.
 */
export function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase()
  }
  return trimmed.replace(/(?!^\+)\D/g, '')
}

/**
 * Robustly checks if two email strings match.
 */
export function emailMatches(email1?: string, email2?: string): boolean {
  if (!email1 || !email2) return false
  return email1.trim().toLowerCase() === email2.trim().toLowerCase()
}

/**
 * Robustly checks if two phone strings match, accounting for country code / formatting.
 */
export function phoneMatches(phone1?: string, phone2?: string): boolean {
  if (!phone1 || !phone2) return false
  const digits1 = phone1.replace(/\D/g, '')
  const digits2 = phone2.replace(/\D/g, '')
  if (digits1 === digits2) return true
  if (digits1.length >= 10 && digits2.length >= 10) {
    return digits1.slice(-10) === digits2.slice(-10)
  }
  return false
}

