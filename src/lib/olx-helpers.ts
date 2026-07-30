/**
 * Helper utility functions for OLX portal synchronization.
 */

export function cleanOlxUrl(olxUrl: string): string {
  if (!olxUrl || typeof olxUrl !== 'string') return olxUrl
  try {
    const parsed = new URL(olxUrl)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const shopsIdx = parts.indexOf('shops')
    const profilIdx = parts.indexOf('profil')
    
    if (shopsIdx !== -1 && parts[shopsIdx + 1]) {
      return `${parsed.origin}/shops/${parts[shopsIdx + 1]}`
    } else if (profilIdx !== -1 && parts[profilIdx + 1]) {
      return `${parsed.origin}/profil/${parts[profilIdx + 1]}`
    }
    return olxUrl
  } catch {
    return olxUrl
  }
}

export function mapOlxCategoryToPropertyType(categoryId?: number, title?: string): string {
  const lowerTitle = (title || '').toLowerCase()
  if (categoryId === 24 || lowerTitle.includes('kuća') || lowerTitle.includes('vila') || lowerTitle.includes('kuca')) {
    return 'house'
  } else if (categoryId === 29 || lowerTitle.includes('zemljište') || lowerTitle.includes('plac') || lowerTitle.includes('zemljiste')) {
    return 'land'
  } else if (categoryId === 26 || categoryId === 27 || lowerTitle.includes('poslovni') || lowerTitle.includes('poslovni prostor')) {
    return 'office'
  } else if (lowerTitle.includes('garaža') || lowerTitle.includes('garaza')) {
    return 'garage'
  }
  return 'apartment'
}

export function cleanOlxDescription(rawDesc?: string): string {
  if (!rawDesc || typeof rawDesc !== 'string') return ''
  return rawDesc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
}
