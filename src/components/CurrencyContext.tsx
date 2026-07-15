'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Currency = 'BAM' | 'EUR'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatPrice: (priceInBAM: number, pricePeriod?: string | null) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('BAM')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('estateline_currency') as Currency
      if (saved === 'BAM' || saved === 'EUR') {
        setCurrencyState(saved)
      }
    }
  }, [])

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr)
    if (typeof window !== 'undefined') {
      localStorage.setItem('estateline_currency', curr)
      // Broadcast custom event so independent components reload immediately
      window.dispatchEvent(new Event('estateline_currency_change'))
    }
  }

  const formatPrice = (priceInBAM: number, pricePeriod?: string | null) => {
    if (!priceInBAM || priceInBAM <= 0) {
      return 'Na upit'
    }

    let displayStr = ''
    if (currency === 'EUR') {
      const converted = priceInBAM / 1.95583
      // Round to nearest integer for clean presentation
      displayStr = `€ ${Math.round(converted).toLocaleString('de-DE')}`
    } else {
      displayStr = `${priceInBAM.toLocaleString('de-DE')} KM`
    }

    if (pricePeriod === 'monthly') {
      displayStr += '/mj'
    }

    return displayStr
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    // Safe fallback outside provider context
    return {
      currency: 'BAM' as Currency,
      setCurrency: () => {},
      formatPrice: (price: number, period?: string | null) => {
        if (!price || price <= 0) return 'Na upit'
        let s = `${price.toLocaleString('de-DE')} KM`
        if (period === 'monthly') s += '/mj'
        return s
      }
    }
  }
  return context
}
