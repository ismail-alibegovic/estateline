'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Search, Building, User, Users, Briefcase, Sparkles, X } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyContext'

export default function SearchSpotlight() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>({ properties: [], contacts: [], leads: [], deals: [] })
  const [activeIndex, setActiveIndex] = useState(0)
  
  const { formatPrice } = useCurrency()
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale || 'en'
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
      setQuery('')
      setResults({ properties: [], contacts: [], leads: [], deals: [] })
      setActiveIndex(0)
    }
  }, [isOpen])

  // Fetch results when query changes (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults({ properties: [], contacts: [], leads: [], deals: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(delay)
  }, [query])

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setIsOpen(false)
    }
  }

  // Flattened items list for keyboard navigation
  const flatItems: any[] = []
  if (results.properties?.length) {
    results.properties.forEach((p: any) => flatItems.push({ ...p, kind: 'property', icon: <Building className="w-4 h-4 text-emerald-500" />, href: `/${locale}/dashboard/properties` }))
  }
  if (results.contacts?.length) {
    results.contacts.forEach((c: any) => flatItems.push({ ...c, name: `${c.first_name} ${c.last_name || ''}`, kind: 'contact', icon: <User className="w-4 h-4 text-blue-500" />, href: `/${locale}/dashboard/contacts` }))
  }
  if (results.leads?.length) {
    results.leads.forEach((l: any) => flatItems.push({ ...l, name: `${l.first_name} ${l.last_name || ''}`, kind: 'lead', icon: <Users className="w-4 h-4 text-purple-500" />, href: `/${locale}/dashboard/leads` }))
  }
  if (results.deals?.length) {
    results.deals.forEach((d: any) => flatItems.push({ ...d, name: d.title, kind: 'deal', icon: <Briefcase className="w-4 h-4 text-orange-500" />, href: `/${locale}/dashboard/pipeline` }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatItems[activeIndex]) {
        router.push(flatItems[activeIndex].href)
        setIsOpen(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-background/60 backdrop-blur-md z-[999] flex justify-center p-4 pt-[12vh] transition-all duration-300 ease-out"
    >
      <div
        onKeyDown={handleKeyDown}
        className="bg-card w-full max-w-xl border border-border/80 shadow-2xl rounded-2xl flex flex-col overflow-hidden max-h-[500px]"
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-border/60 gap-3 bg-muted/10">
          <Search className="w-5 h-5 text-muted-foreground/60 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search properties, contacts, leads, deals..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground outline-none border-none py-1 placeholder-muted-foreground/50"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md shrink-0">
            ESC
          </kbd>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground/40 hover:text-foreground shrink-0 sm:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-xs text-muted-foreground font-medium">Searching database...</span>
            </div>
          )}

          {!loading && query && flatItems.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for "<span className="font-bold text-foreground">{query}</span>"
            </div>
          )}

          {!loading && !query && (
            <div className="py-6 text-center space-y-2">
              <div className="p-3 bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto text-primary">
                <Sparkles size={16} />
              </div>
              <p className="text-xs text-foreground font-semibold">Spotlight Quick Find</p>
              <p className="text-[11px] text-muted-foreground max-w-[280px] mx-auto leading-normal">
                Type coordinates, name, city, price, or tags to locate any resource instantly. Press ⌘K to open.
              </p>
            </div>
          )}

          {!loading && flatItems.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2 px-2.5">
                Search Results ({flatItems.length})
              </p>
              {flatItems.map((item, idx) => {
                const isSelected = idx === activeIndex
                return (
                  <button
                    key={item.id + item.kind}
                    onClick={() => {
                      router.push(item.href)
                      setIsOpen(false)
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.01]'
                        : 'hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-muted text-foreground'}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {item.title || item.name}
                        </p>
                        <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {item.kind === 'property' && `${item.city} • ${item.type === 'sale' ? 'For Sale' : 'For Rent'}`}
                          {item.kind === 'contact' && `${item.email || 'No email'} • ${item.type}`}
                          {item.kind === 'lead' && `${item.email || 'No email'} • Stage: ${item.stage}`}
                          {item.kind === 'deal' && `Stage: ${item.stage}`}
                        </p>
                      </div>
                    </div>

                    {item.price !== undefined && item.price !== null && (
                      <span className={`text-xs font-bold shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`}>
                        {formatPrice(Number(item.price))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 text-[10px] text-muted-foreground/60 flex items-center justify-between shrink-0">
          <span>Navigate with <kbd className="bg-background border px-1.5 py-0.5 rounded">↑</kbd> <kbd className="bg-background border px-1.5 py-0.5 rounded">↓</kbd> and <kbd className="bg-background border px-1.5 py-0.5 rounded">Enter</kbd></span>
          <span>Estateline Spotlight</span>
        </div>
      </div>
    </div>
  )
}
