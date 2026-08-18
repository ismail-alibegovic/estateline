import { integrationEnv } from './integration-env'

export interface PropertyDescriptionInput {
  title: string
  type: string
  listing_type?: string
  price: number
  currency: string
  area_size?: number
  bedrooms?: number
  bathrooms?: number
  city?: string
  address?: string
  features?: string[]
  language?: 'bs' | 'hr' | 'sr' | 'en'
}

export interface DescriptionResult {
  headline: string
  description: string
  key_highlights: string[]
  seo_keywords: string[]
  generated_via: 'gemini' | 'rule_engine'
}

export interface LeadMatchInput {
  id: string
  full_name?: string
  email?: string
  phone?: string
  preferred_type?: string
  preferred_city?: string
  budget_min?: number
  budget_max?: number
  min_bedrooms?: number
  notes?: string
}

export interface PropertyMatchInput {
  id: string
  title: string
  type: string
  city?: string
  price?: number
  currency?: string
  area_size?: number
  bedrooms?: number
  bathrooms?: number
  status?: string
}

export interface MatchResult {
  property_id: string
  property_title: string
  match_score: number // 0 - 100
  match_level: 'perfect' | 'strong' | 'moderate' | 'weak'
  reasons: string[]
}

/**
 * Generates an SEO-rich, attractive property description.
 * Uses Gemini REST API if configured; falls back to structured template engine.
 */
export async function generatePropertyDescription(
  params: PropertyDescriptionInput
): Promise<DescriptionResult> {
  const apiKey = integrationEnv.geminiApiKey

  if (apiKey) {
    try {
      const prompt = `Vi ste stručni koprajter za nekretnine. Generišite privlačan i SEO optimizovan opis nekretnine na ${
        params.language === 'en' ? 'engleskom' : 'bosanskom/hrvatskom/srpskom'
      } jeziku.
Detalji nekretnine:
- Naslov: ${params.title}
- Tip nekretnine: ${params.type}
- Tip oglasa: ${params.listing_type || 'Prodaja'}
- Cijena: ${params.price} ${params.currency}
- Površina: ${params.area_size || 'N/A'} m²
- Broj soba: ${params.bedrooms || 'N/A'}
- Broj kupatila: ${params.bathrooms || 'N/A'}
- Grad/Lokacija: ${params.city || 'N/A'}
- Adresa: ${params.address || 'N/A'}
- Dodatne karakteristike: ${(params.features || []).join(', ') || 'Nema posebnih napomena'}

Vrati odgovor isključivo kao validan JSON sa sljedećom strukturom:
{
  "headline": "Naslov oglasa koji privlači pažnju",
  "description": "Detaljan i emotivno privlačan opis nekretnine u 2-3 odlomka",
  "key_highlights": ["Istaknuto 1", "Istaknuto 2", "Istaknuto 3"],
  "seo_keywords": ["nekretnine", "grad", "tip"]
}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) {
          const parsed = JSON.parse(rawText) as DescriptionResult
          return {
            ...parsed,
            generated_via: 'gemini',
          }
        }
      }
    } catch {
      // Ignore API failure and proceed to rule engine fallback
    }
  }

  // Fallback Rule Engine
  const lang = params.language || 'bs'
  const isEn = lang === 'en'
  const cityStr = params.city ? (isEn ? `in ${params.city}` : `u lokaciji ${params.city}`) : ''
  const priceFormatted = `${params.price.toLocaleString()} ${params.currency}`

  const headline = isEn
    ? `Exceptional ${params.type} ${cityStr} - ${priceFormatted}`
    : `Izuzetna ponuda: ${params.type} ${cityStr} - ${priceFormatted}`

  const highlights = [
    params.area_size ? (isEn ? `Total Area: ${params.area_size} m²` : `Ukupna površina: ${params.area_size} m²`) : null,
    params.bedrooms ? (isEn ? `Bedrooms: ${params.bedrooms}` : `Broj spavaćih soba: ${params.bedrooms}`) : null,
    params.bathrooms ? (isEn ? `Bathrooms: ${params.bathrooms}` : `Broj kupatila: ${params.bathrooms}`) : null,
    params.city ? (isEn ? `Location: ${params.city}` : `Prepoznatljiva lokacija: ${params.city}`) : null,
  ].filter(Boolean) as string[]

  const description = isEn
    ? `Discover this outstanding ${params.type.toLowerCase()} situated ${cityStr}. Offering an optimal spatial structure of ${
        params.area_size ? `${params.area_size} m²` : 'generous space'
      }, this property represents an ideal opportunity for comfortable living or high-return investment. Priced competitively at ${priceFormatted}, it features modern layout and premium location advantages.`
    : `Predstavljamo Vam vrhunsku nekretninu - ${params.type.toLowerCase()} ${cityStr}. Sa funkcionalnom površinom od ${
        params.area_size ? `${params.area_size} m²` : 'prostranog prostora'
      }, ova nekretnina nudi idealan balans komfora, kvaliteta i lokacije. Po atraktivnoj cijeni od ${priceFormatted}, predstavlja savršenu priliku za stanovanje ili investiciju.`

  return {
    headline,
    description,
    key_highlights: highlights,
    seo_keywords: [params.type, params.city || 'nekretnine', 'prodaja', 'estateline'],
    generated_via: 'rule_engine',
  }
}

/**
 * Calculates matchmaking score (0-100%) between a Lead's preferences and Properties.
 */
export function calculatePropertyLeadMatches(
  lead: LeadMatchInput,
  properties: PropertyMatchInput[]
): MatchResult[] {
  return properties
    .map((prop) => {
      let score = 50 // Baseline
      const reasons: string[] = []

      // 1. Property Type Match (+25% / -15%)
      if (lead.preferred_type && prop.type) {
        if (lead.preferred_type.toLowerCase() === prop.type.toLowerCase()) {
          score += 25
          reasons.push(`Odgovara željeni tip nekretnine (${prop.type})`)
        } else {
          score -= 15
        }
      }

      // 2. City Match (+20% / -20%)
      if (lead.preferred_city && prop.city) {
        if (lead.preferred_city.toLowerCase() === prop.city.toLowerCase()) {
          score += 20
          reasons.push(`Lokacija u potpunosti odgovara (${prop.city})`)
        } else {
          score -= 20
        }
      }

      // 3. Budget Match (+20% / -25%)
      if (prop.price && prop.price > 0) {
        if (lead.budget_max && prop.price <= lead.budget_max) {
          if (lead.budget_min && prop.price >= lead.budget_min) {
            score += 20
            reasons.push('Cijena je unutar traženog budžetskog raspona')
          } else {
            score += 15
            reasons.push('Cijena je u okviru maksimalnog budžeta')
          }
        } else if (lead.budget_max && prop.price > lead.budget_max) {
          const excessRatio = (prop.price - lead.budget_max) / lead.budget_max
          if (excessRatio <= 0.1) {
            score += 5
            reasons.push('Cijena je neznatno iznad budžeta (do 10%)')
          } else {
            score -= 25
            reasons.push('Cijena prelazi maksimalni budžet kupca')
          }
        }
      }

      // 4. Bedrooms Match (+15%)
      if (lead.min_bedrooms && prop.bedrooms) {
        if (prop.bedrooms >= lead.min_bedrooms) {
          score += 15
          reasons.push(`Zadovoljava minimalan broj soba (${prop.bedrooms} >= ${lead.min_bedrooms})`)
        } else {
          score -= 10
        }
      }

      // Clamp score between 0 and 100
      const finalScore = Math.min(100, Math.max(0, score))

      let match_level: MatchResult['match_level'] = 'weak'
      if (finalScore >= 85) match_level = 'perfect'
      else if (finalScore >= 70) match_level = 'strong'
      else if (finalScore >= 50) match_level = 'moderate'

      return {
        property_id: prop.id,
        property_title: prop.title,
        match_score: finalScore,
        match_level,
        reasons: reasons.length > 0 ? reasons : ['Djelomična kompatibilnost lokacije i tipa'],
      }
    })
    .sort((a, b) => b.match_score - a.match_score)
}
