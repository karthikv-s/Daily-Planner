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
