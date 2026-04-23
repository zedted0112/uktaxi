/**
 * Strips spaces and formats a phone number for display.
 * "+91 98765 43210" → "+91 98765 43210" (already formatted)
 */
export function formatPhone(phone: string): string {
  return phone.trim();
}

/**
 * Normalises a raw phone input to E.164-ish format for the API.
 * Adds +91 prefix if missing.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return raw.trim();
}
