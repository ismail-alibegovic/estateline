'use client'

import { useState, useEffect } from 'react'
import { Bookmark, BookmarkPlus, X, ChevronDown, Trash2 } from 'lucide-react'

export interface SavedView {
  id: string
  name: string
  filters: Record<string, any>
  createdAt: number
}

interface SavedViewsProps {
  storageKey: string
  currentFilters: Record<string, any>
  onLoadView: (filters: Record<string, any>) => void
}

export default function SavedViews({ storageKey, currentFilters, onLoadView }: SavedViewsProps) {
  const [views, setViews] = useState<SavedView[]>([])
  const [open, setOpen] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [viewName, setViewName] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setViews(JSON.parse(stored))
    } catch {}
  }, [storageKey])

  const persist = (next: SavedView[]) => {
    setViews(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const saveView = () => {
    const name = viewName.trim()
    if (!name) return
    const view: SavedView = {
      id: `${Date.now()}`,
      name,
      filters: { ...currentFilters },
      createdAt: Date.now(),
    }
    persist([view, ...views])
    setViewName('')
    setShowSaveInput(false)
  }

  const deleteView = (id: string) => {
    persist(views.filter(v => v.id !== id))
  }

  const loadView = (view: SavedView) => {
    onLoadView(view.filters)
    setOpen(false)
  }

  const hasActiveFilters = Object.values(currentFilters).some(v => v !== '' && v !== 'all' && v !== null && v !== undefined)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Bookmark size={14} className={views.length > 0 ? 'text-[#C9963B]' : ''} />
        Pogledi
        {views.length > 0 && (
          <span className="bg-[#C9963B]/10 text-[#C9963B] px-1.5 rounded text-[10px] font-bold">{views.length}</span>
        )}
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowSaveInput(false) }} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {showSaveInput ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Spremi trenutni pogled</span>
                  <button onClick={() => setShowSaveInput(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Naziv pogleda..."
                  value={viewName}
                  onChange={e => setViewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveView() }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9963B]"
                />
                <button
                  onClick={saveView}
                  disabled={!viewName.trim()}
                  className="w-full py-2 bg-[#C9963B] text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-[#B8862E] transition-colors"
                >
                  Spremi pogled
                </button>
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-gray-100">
                  <button
                    onClick={() => setShowSaveInput(true)}
                    disabled={!hasActiveFilters}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#C9963B] hover:bg-[#C9963B]/5 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    <BookmarkPlus size={14} />
                    Spremi trenutni pogled
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {views.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bookmark size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">Nema spremljenih pogleda</p>
                    </div>
                  ) : (
                    views.map(view => (
                      <div
                        key={view.id}
                        className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                        onClick={() => loadView(view)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{view.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {Object.entries(view.filters)
                              .filter(([, v]) => v !== '' && v !== 'all')
                              .map(([k]) => k)
                              .join(', ') || 'Svi filteri'}
                          </p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); deleteView(view.id) }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
