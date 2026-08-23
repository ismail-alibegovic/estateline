export const MAX_BULK_IDS = 200
export const MAX_STAGE_LENGTH = 100

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate a client-supplied list of record ids for a bulk operation.
 * Returns null when the payload is not a usable id list.
 */
export function parseBulkIds(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null
  if (input.length === 0 || input.length > MAX_BULK_IDS) return null
  const ids: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string' || !UUID_RE.test(raw)) return null
    ids.push(raw)
  }
  return ids
}

export const LEAD_BULK_STATUSES = ['open', 'won', 'lost', 'junk'] as const

export const PROPERTY_BULK_STATUSES = [
  'active',
  'inactive',
  'sold',
  'rented',
  'draft',
] as const

export type BulkResult = {
  updated: number
}
