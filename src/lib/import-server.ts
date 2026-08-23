import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type ImportEntity,
  type ParsedSheet,
  type PreviewRow,
  dedupeKey,
  mapHeaders,
  normalizeRow,
  parseCsv,
  parseWorkbook,
} from './import'

export const MAX_IMPORT_ROWS = 2000

const ENTITIES: ImportEntity[] = ['contacts', 'leads', 'properties']

export async function readSheetFromRequest(
  req: NextRequest
): Promise<{ error: string; status: number } | { entity: ImportEntity; sheet: ParsedSheet }> {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return { error: 'expected multipart/form-data with a file field', status: 400 }
  }
  const entity = String(form.get('entity') || '')
  if (!ENTITIES.includes(entity as ImportEntity)) {
    return { error: 'entity must be contacts, leads, or properties', status: 400 }
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return { error: 'file field is required', status: 400 }
  }
  const name = file.name.toLowerCase()
  let sheet: ParsedSheet
  try {
    if (name.endsWith('.csv') || file.type === 'text/csv') {
      sheet = parseCsv(await file.text())
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      sheet = await parseWorkbook(await file.arrayBuffer())
    } else {
      return { error: 'unsupported file type — use .csv or .xlsx', status: 400 }
    }
  } catch (err) {
    return { error: `could not parse file: ${(err as Error).message}`, status: 422 }
  }
  if (!sheet.headers.length) return { error: 'file has no header row', status: 422 }
  return { entity: entity as ImportEntity, sheet }
}

function sheetToArray(sheet: ParsedSheet): CellMatrix {
  return sheet.rows.map((row) => sheet.headers.map((h) => row[h] ?? null))
}

type CellMatrix = (string | number | boolean | null)[][]

export function buildPreview(
  entity: ImportEntity,
  sheet: ParsedSheet,
  existingKeys: Set<string>
): {
  mapped: Record<number, string>
  unmapped: string[]
  rows: PreviewRow[]
  summary: { total: number; valid: number; errors: number; duplicatesInFile: number; duplicatesExisting: number }
} {
  const { mapped, unmapped } = mapHeaders(entity, sheet.headers)
  const matrix = sheetToArray(sheet)
  const seenInFile = new Map<string, number>()
  const rows: PreviewRow[] = []
  let valid = 0
  let errors = 0
  let duplicatesInFile = 0
  let duplicatesExisting = 0

  matrix.forEach((cells, i) => {
    const n = normalizeRow(entity, i + 2, cells, mapped)
    const key = dedupeKey(n)
    const duplicates: PreviewRow['duplicates'] = []

    if (!n.errors.length && key) {
      const firstAt = seenInFile.get(key)
      if (firstAt !== undefined) {
        duplicates.push({ kind: 'in-file', rowNumber: firstAt })
        duplicatesInFile++
      } else {
        seenInFile.set(key, i + 2)
      }
      if (existingKeys.has(key)) {
        duplicates.push({ kind: 'existing' })
        duplicatesExisting++
      }
    }

    const status: PreviewRow['status'] = n.errors.length ? 'error' : duplicates.length ? 'duplicate' : 'valid'
    if (status === 'error') errors++
    else if (status === 'valid') valid++
    rows.push({
      rowNumber: n.rowNumber,
      status,
      errors: n.errors,
      warnings: n.warnings,
      duplicates,
      values: n.values,
    })
  })

  return { mapped, unmapped, rows, summary: { total: rows.length, valid, errors, duplicatesInFile, duplicatesExisting } }
}

export async function collectExistingKeys(
  client: SupabaseClient,
  entity: ImportEntity
): Promise<Set<string>> {
  const keys = new Set<string>()
  const table = entity === 'properties' ? 'properties' : entity
  const selectCols =
    entity === 'properties' ? ['reference_number'] : ['email', 'phone']
  const { data, error } = await client.from(table).select(selectCols.join(','))
  if (error) throw new Error(error.message)
  for (const rec of data ?? []) {
    if ('email' in rec && rec.email) keys.add(`e:${String(rec.email).toLowerCase()}`)
    if ('phone' in rec && rec.phone) keys.add(`p:${normalizeKeyPhone(String(rec.phone))}`)
    if ('reference_number' in rec && rec.reference_number) keys.add(`r:${String(rec.reference_number).toLowerCase()}`)
  }
  return keys
}

function normalizeKeyPhone(p: string): string {
  return p.replace(/[^\d+]/g, '')
}

export function propertyDedupeKey(values: Record<string, unknown>): string | null {
  const ref = values.reference_number as string | null | undefined
  if (ref) return `r:${String(ref).toLowerCase()}`
  return null
}
