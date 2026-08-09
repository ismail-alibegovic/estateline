'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import {
  CheckSquare, Square, Plus, Search, Calendar,
  Clock, Trash2, X, CheckCircle2, AlertCircle, Building2, User
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  contact_id?: string | null
  lead_id?: string | null
  property_id?: string | null
}

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDueDate, setNewDueDate] = useState('')

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!u) { setLoading(false); return }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', (u as any).id)
      .eq('is_primary', true)
      .single()

    if (member) {
      const oid = (member as any).organization_id
      setOrgId(oid)

      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', oid)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setTasks(data as Task[])
      } else {
        setTasks([])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)

    if (orgId) {
      const supabase = createBrowserClient()
      const { error } = await supabase.from('tasks').insert({
        organization_id: orgId,
        title: newTitle,
        description: newDesc || null,
        status: 'todo',
        priority: newPriority,
        due_date: newDueDate || null,
      })

      if (error) {
        toast(error.message, 'error')
      } else {
        toast('Zadatak je uspješno kreiran!')
        setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewDueDate('')
        setIsOpen(false)
        loadData()
      }
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: newTitle,
        description: newDesc || null,
        status: 'todo',
        priority: newPriority,
        due_date: newDueDate || null,
        created_at: new Date().toISOString(),
      }
      setTasks(prev => [newTask, ...prev])
      toast('Zadatak je kreiran!')
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewDueDate('')
      setIsOpen(false)
    }
    setSaving(false)
  }

  const toggleStatus = async (id: string, current: Task['status']) => {
    const nextStatus: Record<string, Task['status']> = {
      todo: 'in_progress', in_progress: 'completed', completed: 'todo'
    }
    const next = nextStatus[current]
    const supabase = createBrowserClient()
    await supabase.from('tasks').update({ status: next }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: next } : t))
  }

  const deleteTask = async (id: string) => {
    const supabase = createBrowserClient()
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
    toast('Zadatak je obrisan!')
  }

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="w-full space-y-6 py-12">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-3xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 font-sans animate-fade-in">
      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${
              t.type === 'success' ? 'bg-gray-900 text-white border-gray-800' : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} className="text-[#C9963B]" /> : <X size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/70 pb-6">
        <div>
          <p className="page-eyebrow mb-1">ORGANIZACIJA & POSLOVI</p>
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif' }}
          >
            Zadaci Agencije
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Evidencija dnevnih obaveza, pripremne dokumentacije i poziva klijentima.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)',
            boxShadow: '0 4px 16px rgba(201,150,59,0.25)',
          }}
        >
          <Plus size={16} />
          <span>Dodaj Zadatak</span>
        </button>
      </header>

      {/* Controls Bar */}
      <div className="bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pretraži zadatke i obaveze..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'todo', 'in_progress', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                statusFilter === status
                  ? 'bg-[#C9963B] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? `Svi (${tasks.length})` : status === 'todo' ? 'Za Uraditi' : status === 'in_progress' ? 'U Toku' : 'Završeno'}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-gray-200/70 rounded-3xl p-5 shadow-sm hover:border-[#C9963B] transition-all flex items-start justify-between gap-4 group"
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggleStatus(t.id, t.status)}
                className="mt-0.5 text-gray-400 hover:text-[#C9963B] transition-colors shrink-0"
              >
                {t.status === 'completed' ? (
                  <CheckSquare size={22} className="text-[#C9963B]" />
                ) : (
                  <Square size={22} />
                )}
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-sm text-gray-900 transition-colors ${
                      t.status === 'completed' ? 'line-through text-gray-400' : 'group-hover:text-[#C9963B]'
                    }`}
                  >
                    {t.title}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    t.priority === 'high'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : t.priority === 'medium'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t.priority === 'high' ? 'Hitno' : t.priority === 'medium' ? 'Srednji' : 'Nizak'}
                  </span>
                </div>

                {t.description && (
                  <p className="text-xs text-gray-500">{t.description}</p>
                )}

                {t.due_date && (
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 pt-1">
                    <Calendar size={12} />
                    <span>Rok: {new Date(t.due_date).toLocaleDateString('bs-BA')}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => deleteTask(t.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Dodaj Novi Zadatak</h3>
              <p className="text-xs text-gray-500 mt-1">Unesite opis zadatka, prioritet i rok izvršenja.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Naslov Zadatka *</label>
                <input
                  type="text"
                  required
                  placeholder="Pripremi ugovor za kupca..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Detaljan Opis</label>
                <textarea
                  rows={3}
                  placeholder="Provjeriti dokumentaciju i notarske takse..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Prioritet</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  >
                    <option value="low">Nizak</option>
                    <option value="medium">Srednji</option>
                    <option value="high">Visok (Hitno)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Rok (Datum)</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#b88328] transition-colors"
                >
                  {saving ? 'Sačuvavanje...' : 'Sačuvaj Zadatak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
