/**
 * WhatsApp deep-link normalisation.
 *
 * The schema stores a single `phone` column on leads/contacts — there is no
 * separate whatsapp field, so WhatsApp uses the same number. Strip everything
 * that isn't a digit, prepend the default BA country code (+387) when the
 * caller didn't provide one, and return null when there's nothing to dial.
 *
 * `wa.me` rejects "+" and spaces; we return the bare international form.
 */
const DEFAULT_CC = '387'

/** Known BiH mobile/landline prefixes that already carry a country code. */
const COUNTRY_CODES = ['387', '385', '381', '386', '382', '389']

export function normalizeWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/[^\d]/g, '')
  if (!digits) return null
  if (COUNTRY_CODES.some((cc) => digits.startsWith(cc))) return digits
  // Leading "0" trunk prefix (Balkan convention) → drop it, add default CC.
  const stripped = digits.replace(/^0+/, '')
  if (!stripped) return null
  return `${DEFAULT_CC}${stripped}`
}

export function whatsappLink(raw: string | null | undefined): string | null {
  const num = normalizeWhatsApp(raw)
  return num ? `https://wa.me/${num}` : null
}
