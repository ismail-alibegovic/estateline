'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase'
import { CheckCircle2, ShieldCheck, Zap, CreditCard, ArrowUpRight, Sparkles } from 'lucide-react'

export default function BillingPage() {
  const t = useTranslations('billing')
  const [plan, setPlan] = useState<string>('EstateLine Pro')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBilling = async () => {
      const supabase = createBrowserClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: u } = await supabase.from('users').select('id').eq('auth_id', authUser.id).single()
        if (u) {
          const { data: member } = await supabase
            .from('organization_members')
            .select('organizations(subscription_tier)')
            .eq('user_id', (u as any).id)
            .eq('is_primary', true)
            .single()
          if ((member as any)?.organizations?.subscription_tier) {
            setPlan((member as any).organizations.subscription_tier)
          }
        }
      }
      setLoading(false)
    }
    loadBilling()
  }, [])

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-48 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Header */}
      <header className="border-b border-gray-200/70 pb-6">
        <p className="page-eyebrow mb-1">PRETPLATA AGENCIJE</p>
        <h1
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
        >
          Billing & Agencijski Paket
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upravljanje pretplatom na EstateLine CRM, resursima i fakturama servisa.
        </p>
      </header>

      {/* Active Plan Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#C9963B]" />
            <span className="text-xs font-bold text-[#C9963B] uppercase tracking-wider">Aktivni Agencijski Paket</span>
          </div>
          <h2 className="text-3xl font-bold">{plan}</h2>
          <p className="text-xs text-gray-300">
            Pristup svim naprednim modulima: AI Matchmaking, OLX Sinhronizacija, Generator Ugovora & Multi-Agent CRM.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <button className="px-5 py-3 bg-[#C9963B] hover:bg-[#b88328] text-white font-bold text-xs rounded-xl shadow-lg transition-all">
            Upravljaj Pretplatom
          </button>
        </div>
      </div>

      {/* Resource Usage Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
            <span>Aktivne Nekretnine</span>
            <span className="font-bold text-gray-900">4 / 100</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9963B] rounded-full" style={{ width: '4%' }} />
          </div>
          <p className="text-[11px] text-gray-400">Preostalo još 96 mjesta za oglase.</p>
        </div>

        <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
            <span>Licence Agenata</span>
            <span className="font-bold text-gray-900">2 / 10</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '20%' }} />
          </div>
          <p className="text-[11px] text-gray-400">Preostalo još 8 licenciranih agenata.</p>
        </div>

        <div className="bg-white border border-gray-200/70 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
            <span>Skladište Dokumenta</span>
            <span className="font-bold text-gray-900">1.2 GB / 50 GB</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#059669] rounded-full" style={{ width: '2.4%' }} />
          </div>
          <p className="text-[11px] text-gray-400">Dovoljno prostora za hiljade ugovora.</p>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {[
          { name: 'Starter Agencija', price: '€49 / mj', features: ['Do 25 Nekretnina', '2 Agenta', 'Osnovna OLX Sinhronizacija'], active: false },
          { name: 'EstateLine Pro', price: '€99 / mj', features: ['Do 100 Nekretnina', '10 Agenata', 'Neograničeno OLX & Portali', 'Generator Ugovora'], active: true },
          { name: 'Enterprise Premium', price: '€199 / mj', features: ['Neograničeno Nekretnina', 'Neograničeno Agenata', 'Privatni API & White-Label', '24/7 Podrška'], active: false },
        ].map((tier, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between space-y-6 ${
              tier.active ? 'border-[#C9963B] ring-2 ring-[#C9963B]/20' : 'border-gray-200/70'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900">{tier.name}</h3>
                {tier.active && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-[#C9963B] border border-amber-200">
                    Aktivno
                  </span>
                )}
              </div>

              <div className="text-2xl font-bold text-gray-900">{tier.price}</div>

              <div className="space-y-2 text-xs text-gray-600">
                {tier.features.map((f, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#C9963B]" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={tier.active}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                tier.active
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-[#C9963B] text-white hover:bg-[#b88328]'
              }`}
            >
              {tier.active ? 'Trenutni Paket' : 'Nadogradi Paket'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
