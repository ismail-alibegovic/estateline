import { describe, it, expect } from 'vitest'
import {
  canonicalizeHeader,
  mapHeaders,
  normalizeRow,
  dedupeKey,
  parseCsv,
} from '../import'

describe('canonicalizeHeader', () => {
  it('lowercases, strips diacritics, punctuation and whitespace', () => {
    expect(canonicalizeHeader('  E-Pošta ')).toBe('eposta')
    expect(canonicalizeHeader('Prva__Soba')).toBe('prvasoba')
    expect(canonicalizeHeader('Šifra')).toBe('sifra')
  })
})

describe('mapHeaders', () => {
  it('maps localized contact headers', () => {
    const { mapped, unmapped } = mapHeaders('contacts', ['Ime', 'Prezime', 'E-mail', 'Telefon'])
    expect(mapped).toEqual({ 0: 'first_name', 1: 'last_name', 2: 'email', 3: 'phone' })
    expect(unmapped).toEqual([])
  })

  it('reports unmapped columns; second column targeting same field goes unmapped', () => {
    const { mapped, unmapped } = mapHeaders('contacts', ['Ime', 'Naziv', 'Random Stupac'])
    expect(mapped).toEqual({ 0: 'first_name' })
    expect(unmapped).toEqual(['Naziv', 'Random Stupac'])
  })
})

describe('normalizeRow', () => {
  const contactMap = mapHeaders('contacts', ['Ime', 'Prezime', 'Email', 'Telefon']).mapped

  it('normalizes phone to E.164-ish BA format', () => {
    const r = normalizeRow('contacts', 2, ['Ahmed', 'Hodžić', 'a@b.ba', '+387 61 123-456'], contactMap)
    expect(r.errors).toHaveLength(0)
    expect(r.values.phone).toBe('+38761123456')
  })

  it('derives first_name from email local part when name missing', () => {
    const r = normalizeRow('contacts', 3, ['', '', 'ahmed.hodzic@x.com', ''], contactMap)
    expect(r.values.first_name).toBe('ahmed.hodzic')
    expect(r.warnings.some((w) => w.includes('derived'))).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('errors when a row has no name, email or phone', () => {
    const r = normalizeRow('contacts', 4, ['', '', '', ''], contactMap)
    expect(r.errors.some((e) => e.includes('no name'))).toBe(true)
  })

  it('flags invalid email as error', () => {
    const r = normalizeRow('contacts', 5, ['A', 'B', 'not-an-email', ''], contactMap)
    expect(r.errors.some((e) => e.startsWith('email'))).toBe(true)
  })
})

describe('normalizeRow leads', () => {
  const leadMap = mapHeaders('leads', ['Ime', 'Email', 'Telefon', 'Budžet do', 'Izvor']).mapped

  it('coerces localized numbers and tolerates unknown source with warning', () => {
    const r = normalizeRow('leads', 6, ['M', 'm@x.com', '061/555-222', '250.000 KM', 'billboard'], leadMap)
    expect(r.values.budget_max).toBe(250000)
    expect(r.values.phone).toBe('+38761555222')
    expect(r.warnings.some((w) => w.includes('source'))).toBe(true)
    expect(r.errors).toHaveLength(0)
  })
})

describe('normalizeRow properties', () => {
  const propMap = mapHeaders('properties', ['Naslov', 'Cijena', 'Grad']).mapped

  it('requires title and price, defaults currency BAM', () => {
    const r = normalizeRow('properties', 7, [null, null, null], propMap)
    expect(r.errors.some((e) => e === 'title is required')).toBe(true)
    expect(r.errors.some((e) => e === 'price is required')).toBe(true)
    const ok = normalizeRow('properties', 8, ['Stan Centar', '180000', ''], propMap)
    expect(ok.errors).toHaveLength(0)
    expect(ok.values.currency).toBe('BAM')
    expect(ok.values.city).toBe('Sarajevo')
    expect(ok.warnings.some((w) => w.includes('Sarajevo'))).toBe(true)
  })
})

describe('dedupeKey', () => {
  it('prefers email then phone, null otherwise', () => {
    expect(dedupeKey({ rowNumber: 1, values: { email: 'a@b.c', phone: '+38761111222' }, errors: [], warnings: [] })).toBe('e:a@b.c')
    expect(dedupeKey({ rowNumber: 1, values: { phone: '+38761111222' }, errors: [], warnings: [] })).toBe('p:+38761111222')
    expect(dedupeKey({ rowNumber: 1, values: {}, errors: [], warnings: [] })).toBeNull()
  })
})

describe('parseCsv', () => {
  it('parses quoted fields, semicolon delimiter and BOM', () => {
    const csv = '\uFEFFIme;Prezime\n"Aho";"Semi;colon"\nOmar;\n'
    const sheet = parseCsv(csv)
    expect(sheet.headers).toEqual(['Ime', 'Prezime'])
    expect(sheet.rows[0]['Ime']).toBe('Aho')
    expect(sheet.rows[0]['Prezime']).toBe('Semi;colon')
    expect(sheet.rows[1]['Ime']).toBe('Omar')
  })

  it('skips empty trailing lines', () => {
    const sheet = parseCsv('Ime\nA\n\n')
    expect(sheet.rows).toHaveLength(1)
  })
})
