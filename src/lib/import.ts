import ExcelJS from 'exceljs'

export type ImportEntity = 'contacts' | 'leads' | 'properties'
export type CellValue = string | number | boolean | null

export type ParsedSheet = {
  sheetName?: string
  headers: string[]
  rows: Record<string, CellValue>[]
}

export type NormalizedRow = {
  rowNumber: number
  values: Record<string, CellValue>
  errors: string[]
  warnings: string[]
}

export type DuplicateInfo =
  | { kind: 'in-file'; rowNumber: number }
  | { kind: 'existing'; value?: string }

export type PreviewRow = {
  rowNumber: number
  status: 'valid' | 'error' | 'duplicate'
  errors: string[]
  warnings: string[]
  duplicates: DuplicateInfo[]
  values: Record<string, CellValue>
}

const CONTACT_ALIASES: Record<string, string[]> = {
  first_name: ['first name', 'firstname', 'ime', 'given name', 'name', 'naziv'],
  last_name: ['last name', 'lastname', 'prezime', 'surname'],
  email: ['e-mail', 'mail', 'eposta', 'e-pošta', 'el. pošta'],
  phone: ['telefon', 'tel', 'mobile', 'mobilni', 'broj telefona', 'phone number'],
  company: ['firma', 'kompanija', 'company name', 'organization'],
  position: ['pozicija', 'role', 'titula'],
  address: ['adresa', 'street', 'ulica'],
  city: ['grad', 'mjesto'],
  notes: ['note', 'napomena', 'komentar', 'bilješke'],
}

const LEAD_ALIASES: Record<string, string[]> = {
  ...CONTACT_ALIASES,
  stage: ['faza', 'pipeline stage', 'status prodaje'],
  source: ['izvor', 'lead source', 'kanal'],
  budget_min: ['budget min', 'min budget', 'budžet od', 'budzet min'],
  budget_max: ['budget max', 'max budget', 'budžet do', 'budzet max'],
  requirements: ['zahtjevi', 'requirement', 'potrebe', 'opis potraznje'],
}

const PROPERTY_ALIASES: Record<string, string[]> = {
  title: ['naslov', 'name', 'naziv nekretnine', 'listing title'],
  description: ['opis', 'details', 'detalji'],
  type: ['property type', 'tip', 'vrsta', 'vrsta nekretnine'],
  status: ['stanje', 'listing status'],
  price: ['cijena', 'cena', 'amount', 'price amount'],
  currency: ['valuta'],
  city: ['grad', 'mjesto', 'location city'],
  address: ['adresa', 'street', 'ulica'],
  area_size: ['area', 'kvadratura', 'površina', 'povrsina', 'm2', 'm²'],
  bedrooms: ['bedrooms count', 'spavaće sobe', 'spavace sobe', 'sobа', 'br soba'],
  bathrooms: ['kupatila', 'kupaonica', 'bathrooms count'],
  reference_number: ['ref', 'reference', 'šifra', 'sifra', 'id nekretnine'],
}


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function canonicalizeHeader(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function canonicalAliasSet(m: Record<string, string[]>): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  for (const [field, list] of Object.entries(m)) {
    out[field] = new Set([canonicalizeHeader(field), ...list.map(canonicalizeHeader)])
  }
  return out
}

const ALIAS_SETS: Record<ImportEntity, Record<string, Set<string>>> = {
  contacts: canonicalAliasSet(CONTACT_ALIASES),
  leads: canonicalAliasSet(LEAD_ALIASES),
  properties: canonicalAliasSet(PROPERTY_ALIASES),
}

export function mapHeaders(
  entity: ImportEntity,
  headers: string[]
): { mapped: Record<number, string>; unmapped: string[] } {
  const aliases = ALIAS_SETS[entity]
  const mapped: Record<number, string> = {}
  const unmapped: string[] = []
  for (let i = 0; i < headers.length; i++) {
    const canon = canonicalizeHeader(String(headers[i] ?? ''))
    if (!canon) continue
    let target: string | null = null
    for (const [field, set] of Object.entries(aliases)) {
      if (set.has(canon)) {
        target = field
        break
      }
    }
    if (target && !Object.values(mapped).includes(target)) {
      mapped[i] = target
    } else {
      unmapped.push(String(headers[i]))
    }
  }
  return { mapped, unmapped }
}

function cellToString(v: CellValue): string {
  if (v === null) return ''
  return String(v).trim()
}

function coerceNumber(v: CellValue): number | null {
  const s = cellToString(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  if (!s || s === '-') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function normalizePhoneBa(raw: string): string | null {
  let s = raw.replace(/[\s()\-./]/g, '')
  if (!s) return null
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (/^\+387/.test(s)) return s
  if (/^0[2-5]\d{7,8}$/.test(s)) return '+387' + s.slice(1)
  if (/^06\d{7,8}$/.test(s)) return '+387' + s.slice(1)
  if (/^\+?\d{6,15}$/.test(s)) return s.startsWith('+') ? s : '+' + s
  return null
}

function coerceEnum(field: string, v: CellValue): CellValue {
  const s = cellToString(v).toLowerCase().replace(/\s+/g, '-')
  if (!s) return null
  const tables: Record<string, { values: string[]; map?: Record<string, string> }> = {
    source: {
      values: ['website', 'referral', 'portal', 'social', 'email', 'phone', 'walk-in', 'other'],
      map: { web: 'website', preporuka: 'referral', telefon: 'phone', 'hodajući': 'walk-in', facebook: 'social', instagram: 'social' },
    },
    type_property: {
      values: ['apartment', 'house', 'land', 'commercial', 'office', 'warehouse', 'garage', 'other'],
      map: { stan: 'apartment', kuća: 'house', kuka: 'house', zemljište: 'land', zemljiste: 'land', poslovni: 'commercial', garaža: 'garage', garaza: 'garage', skladiste: 'warehouse', skladište: 'warehouse' },
    },
  }
  const key = field === 'type' ? 'type_property' : field
  const table = tables[key]
  if (!table) return cellToString(v) || null
  const ascii = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
  if (table.values.includes(s)) return s
  if (table.values.includes(ascii)) return ascii
  if (table.map?.[s]) return table.map[s]
  const base = ascii.split('-')[0]
  if (table.map?.[base]) return table.map[base]
  return null
}

export function normalizeRow(
  entity: ImportEntity,
  rowNumber: number,
  rawRow: CellValue[],
  mapping: Record<number, string>
): NormalizedRow {
  const values: Record<string, CellValue> = {}
  const errors: string[] = []
  const warnings: string[] = []

  for (const [idxStr, field] of Object.entries(mapping)) {
    const v = rawRow[Number(idxStr)] ?? null
    switch (field) {
      case 'price':
      case 'budget_min':
      case 'budget_max':
      case 'area_size':
      case 'bedrooms':
      case 'bathrooms': {
        const n = coerceNumber(v)
        if (cellToString(v) && n === null) errors.push(`${field}: not a valid number`)
        else values[field] = n
        break
      }
      case 'source':
      case 'type': {
        const e = coerceEnum(field, v)
        if (cellToString(v) && !e) warnings.push(`${field}: unknown value "${cellToString(v)}", will use default`)
        values[field] = e
        break
      }
      case 'email': {
        const s = cellToString(v).toLowerCase()
        if (s && !EMAIL_RE.test(s)) errors.push(`email: invalid format "${s}"`)
        else values[field] = s || null
        break
      }
      case 'phone': {
        const s = normalizePhoneBa(cellToString(v))
        if (cellToString(v) && !s) errors.push(`phone: cannot parse "${cellToString(v)}"`)
        else values[field] = s
        break
      }
      default:
        values[field] = cellToString(v) || null
    }
  }

  const firstName = values.first_name ?? ''
  if (entity !== 'properties') {
    if (!firstName) {
      const email = values.email as string | null
      const phone = values.phone as string | null
      if (email) {
        values.first_name = email.split('@')[0]
        warnings.push('first_name missing — derived from email')
      } else if (phone) {
        values.first_name = phone.slice(-4)
        warnings.push('first_name missing — derived from phone')
      } else {
        errors.push('row has no name, email, or phone')
      }
    }
  }

  if (entity === 'contacts' && !values.email && !values.phone && !errors.length) {
    errors.push('contact needs at least an email or a phone')
  }
  if (entity === 'leads' && !values.email && !values.phone && !errors.length) {
    errors.push('lead needs at least an email or a phone')
  }
  if (entity === 'properties') {
    if (!values.title) errors.push('title is required')
    if (!values.city) {
      values.city = 'Sarajevo'
      warnings.push('city missing — defaulted to Sarajevo')
    }
    if (values.price === null || values.price === undefined) {
      errors.push('price is required')
    }
    if (!values.type) {
      values.type = 'apartment'
      if (!warnings.some((w) => w.startsWith('type'))) warnings.push('type missing — defaulted to apartment')
    }
    if (!values.currency) values.currency = 'BAM'
    if (!values.status) values.status = 'active'
  }

  return { rowNumber, values, errors, warnings }
}

export function dedupeKey(row: NormalizedRow): string | null {
  const email = row.values.email as string | null
  const phone = row.values.phone as string | null
  if (email) return `e:${email}`
  if (phone) return `p:${phone}`
  return null
}

export async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const sheet = wb.worksheets.find((ws) => ws.rowCount > 0)
  if (!sheet) throw new Error('workbook has no data rows')

  let headerRowIndex = 0
  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    const vals = sheet.getRow(r).values as unknown[]
    const filled = vals.filter((v) => v !== null && v !== undefined && v !== '').length
    if (filled >= 3) {
      headerRowIndex = r
      break
    }
  }
  if (!headerRowIndex) throw new Error('no header row found in first 10 rows')

  const headerRow = sheet.getRow(headerRowIndex)
  const width = sheet.columnCount
  const headers: string[] = []
  for (let c = 1; c <= width; c++) {
    const v = headerRow.getCell(c).value
    headers.push(v == null ? '' : String(v).trim())
  }

  const rows: Record<string, CellValue>[] = []
  for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const rec: Record<string, CellValue> = {}
    let filledCount = 0
    for (let c = 1; c <= width; c++) {
      const cell = row.getCell(c)
      let v: CellValue
      if (cell.value === null || cell.value === undefined) v = null
      else if (typeof cell.value === 'object') {
        const obj = cell.value as { result?: unknown; text?: string; richText?: { text: string }[] }
        if ('result' in obj && obj.result != null) v = String(obj.result)
        else if ('richText' in obj && obj.richText) v = obj.richText.map((t) => t.text).join('')
        else if ('text' in obj && obj.text) v = String(obj.text)
        else v = null
      } else v = cell.value as CellValue
      rec[headers[c - 1]] = v
      if (v !== null && v !== '') filledCount++
    }
    if (filledCount === 0) continue
    rows.push(rec)
  }
  return { headers, rows }
}

export function parseCsv(text: string): ParsedSheet {
  let t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const firstLine = t.slice(0, t.indexOf('\n') === -1 ? t.length : t.indexOf('\n'))
  const comma = (firstLine.match(/,/g) || []).length
  const semi = (firstLine.match(/;/g) || []).length
  const delim = semi > comma ? ';' : ','

  const records: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"' && field === '') {
      inQuotes = true
    } else if (ch === delim) {
      cur.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++
      cur.push(field)
      field = ''
      if (cur.length > 1 || cur[0] !== '') records.push(cur)
      cur = []
    } else field += ch
  }
  cur.push(field)
  if (cur.length > 1 || cur[0] !== '') records.push(cur)

  const headers = (records.shift() || []).map((h) => h.trim())
  const rows: Record<string, CellValue>[] = records.map((rec) => {
    const o: Record<string, CellValue> = {}
    headers.forEach((h, i) => { o[h] = rec[i] ?? null })
    return o
  })
  return { sheetName: 'csv', headers, rows }
}
