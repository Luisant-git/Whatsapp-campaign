/**
 * Canonical phone normalizer used by every WhatsAppMessage write point.
 *
 * Rules:
 *  - Strip all non-digit characters (removes +, spaces, dashes)
 *  - If exactly 10 digits and starts with 6-9 → prepend "91" (Indian mobile)
 *  - Otherwise return digits as-is (already has country code)
 *
 * Examples:
 *  "+919360999351" → "919360999351"
 *  "9360999351"    → "919360999351"
 *  "919360999351"  → "919360999351"
 *  "14155552671"   → "14155552671"
 */
export function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  return digits;
}
