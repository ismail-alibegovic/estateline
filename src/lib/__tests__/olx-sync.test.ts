import { describe, it, expect } from 'vitest'
import { cleanOlxUrl, mapOlxCategoryToPropertyType, cleanOlxDescription } from '../olx-helpers'

describe('OLX Sync Helpers', () => {
  it('cleans OLX profile and shop URLs', () => {
    expect(cleanOlxUrl('https://olx.ba/shops/agencydemo/items?page=1')).toBe('https://olx.ba/shops/agencydemo')
    expect(cleanOlxUrl('https://olx.ba/profil/user123/artikli')).toBe('https://olx.ba/profil/user123')
    expect(cleanOlxUrl('invalid-url')).toBe('invalid-url')
  })

  it('maps OLX category IDs and titles to valid property types', () => {
    expect(mapOlxCategoryToPropertyType(24, 'Moderna kuca na Prodaju')).toBe('house')
    expect(mapOlxCategoryToPropertyType(29, 'Zemljiste 1000m2')).toBe('land')
    expect(mapOlxCategoryToPropertyType(26, 'Poslovni prostor u centru')).toBe('office')
    expect(mapOlxCategoryToPropertyType(12, 'Garaža')).toBe('garage')
    expect(mapOlxCategoryToPropertyType(12, 'Dvosoban stan')).toBe('apartment')
  })

  it('cleans HTML tags and linebreaks in descriptions', () => {
    const raw = '<p>Lijep stan.<br/>U centru grada.</p>'
    expect(cleanOlxDescription(raw)).toBe('Lijep stan.\nU centru grada.')
  })
})
