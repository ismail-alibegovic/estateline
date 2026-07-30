/**
 * Automated Property Comparative Valuation engine helpers.
 */

export interface ValuationInput {
  city: string
  type: string
  area_size: number
  bedrooms?: number | null
  bathrooms?: number | null
  year_built?: number | null
}

export interface ValuationEstimate {
  estimated_price: number
  price_per_m2: number
  min_price: number
  max_price: number
  confidence_score: number // 0-100
  currency: string
  city: string
  type: string
  area_size: number
}

// Baseline market price per m2 benchmarks by city & property type in BAM
const BASELINE_PRICES_PER_M2: Record<string, Record<string, number>> = {
  sarajevo: { apartment: 3800, house: 2400, land: 600, office: 4200, garage: 2000 },
  mostar: { apartment: 2900, house: 1900, land: 400, office: 3100, garage: 1500 },
  'banja luka': { apartment: 3500, house: 2200, land: 550, office: 3800, garage: 1800 },
  tuzla: { apartment: 2600, house: 1700, land: 350, office: 2800, garage: 1300 },
  visoko: { apartment: 2100, house: 1400, land: 250, office: 2300, garage: 1000 },
}

export function calculatePropertyValuation(input: ValuationInput): ValuationEstimate {
  const cityKey = (input.city || 'Sarajevo').toLowerCase().trim()
  const typeKey = (input.type || 'apartment').toLowerCase().trim()
  const areaSize = Math.max(10, input.area_size || 50)

  const cityRates = BASELINE_PRICES_PER_M2[cityKey] || BASELINE_PRICES_PER_M2['sarajevo']
  const baseRate = cityRates[typeKey] || cityRates['apartment'] || 3000

  // Adjustments based on bedrooms/bathrooms/year built
  let rateMultiplier = 1.0

  if (input.bedrooms && input.bedrooms > 2) {
    rateMultiplier += 0.05
  }
  if (input.bathrooms && input.bathrooms > 1) {
    rateMultiplier += 0.04
  }
  if (input.year_built) {
    if (input.year_built >= 2020) rateMultiplier += 0.12
    else if (input.year_built >= 2010) rateMultiplier += 0.06
    else if (input.year_built < 1980) rateMultiplier -= 0.05
  }

  const adjustedPricePerM2 = Math.round(baseRate * rateMultiplier)
  const estimatedPrice = Math.round(adjustedPricePerM2 * areaSize)

  const margin = 0.08 // 8% range interval
  const minPrice = Math.round(estimatedPrice * (1 - margin))
  const maxPrice = Math.round(estimatedPrice * (1 + margin))

  let confidenceScore = 85
  if (input.bedrooms && input.bathrooms) confidenceScore += 5
  if (input.year_built) confidenceScore += 5

  return {
    estimated_price: estimatedPrice,
    price_per_m2: adjustedPricePerM2,
    min_price: minPrice,
    max_price: maxPrice,
    confidence_score: Math.min(98, confidenceScore),
    currency: 'BAM',
    city: input.city,
    type: input.type,
    area_size: areaSize,
  }
}
