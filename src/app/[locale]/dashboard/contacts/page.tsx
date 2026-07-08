'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'

interface ContactRow {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  type: string
  city: string | null
  company: string | null
  created_at: string
}

export default function ContactsPage() {
  const t = useTranslations('contacts')
  const tc = useTranslations('common')
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
      if (data) setContacts(data as any[])
      setLoading(false)
    }
    run()
  }, [])

  if (loading) return <div className="p-8"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" /></div>

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">CRM</p>
          <h1 className="font-display text-3xl tracking-tight">{t('title')}</h1>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">{t('addContact')}</button>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
            <tr className="text-left text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Phone</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">City</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[hsl(var(--muted-foreground))]">
                  {t('empty')}
                </td>
              </tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-[hsl(var(--muted)/0.5)]">
                <td className="px-6 py-4 font-medium text-[hsl(var(--foreground))]">
                  {c.first_name} {c.last_name || ''}
                </td>
                <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">{c.email || '—'}</td>
                <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">{c.phone || '—'}</td>
                <td className="px-6 py-4">
                  <span className="inline-block rounded-full bg-[hsl(var(--accent))] px-3 py-0.5 text-xs capitalize text-[hsl(var(--accent-foreground))]">
                    {c.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">{c.city || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
