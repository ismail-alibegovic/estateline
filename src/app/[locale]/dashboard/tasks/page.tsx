'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import {
  CheckSquare, Square, Plus, Search, Calendar,
  AlertCircle, Clock, Trash2, Filter, X, CheckCheck, User, Building2
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  contact_id: string | null
  lead_id: string | null
  property_id: string | null
  contacts?: { first_name: string; last_name: string | null } | null
  leads?: { first_name: string; last_name: string | null } | null
  properties?: { title: string } | null
}

interface ContactOption { id: string; first_name: string; last_name: string | null }
interface LeadOption { id: string; first_name: string; last_name: string | null }
interface PropertyOption { id: string; title: string }

type Toast = { id: string; message: string; type: 'success' | 'error' }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newContactId, setNewContactId] = useState('')
  const [newLeadId, setNewLeadId] = useState('')
  const [newPropertyId, setNewPropertyId] = useState('')

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

      const [tasksResp, contactsResp, leadsResp, propertiesResp] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, contacts(first_name, last_name), leads(first_name, last_name), properties(title)')
          .eq('organization_id', oid)
          .order('created_at', { ascending: false }),
        supabase.from('contacts').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
        supabase.from('leads').select('id, first_name, last_name').eq('organization_id', oid).order('first_name'),
        supabase.from('properties').select('id, title').eq('organization_id', oid).order('title')
      ])

      if (tasksResp.data) setTasks(tasksResp.data as Task[])
      if (contactsResp.data) setContacts(contactsResp.data as ContactOption[])
      if (leadsResp.data) setLeads(leadsResp.data as LeadOption[])
      if (propertiesResp.data) setProperties(propertiesResp.data as PropertyOption[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !orgId) return
    setSaving(true)

    const supabase = createBrowserClient()
    const { error } = await supabase.from('tasks').insert({
      organization_id: orgId,
      title: newTitle,
      description: newDesc || null,
      status: 'todo',
      priority: newPriority,
      due_date: newDueDate || null,
      contact_id: newContactId || null,
      lead_id: newLeadId || null,
      property_id: newPropertyId || null,
    })

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Task created!')
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewDueDate('')
      setNewContactId(''); setNewLeadId(''); setNewPropertyId('')
      setIsOpen(false)
      loadData()
    }
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
    toast('Task deleted')
  }

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                          (t.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const counts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 text-red-600 border-red-200',
    medium: 'bg-amber-50 text-amber-600 border-amber-200',
    low: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  }

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Workflow</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.todo} to do &middot; {counts.in_progress} in progress &middot; {counts.completed} completed
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Status Summary Chips */}
      <div className="flex gap-2 flex-wrap">
        {([['all', 'All'], ['todo', 'To Do'], ['in_progress', 'In Progress'], ['completed', 'Completed']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
              statusFilter === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {label} {val !== 'all' && `(${counts[val as keyof typeof counts] ?? tasks.length})`}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs border border-border rounded-full bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-40"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="text-xs border border-border rounded-full px-3 py-1.5 bg-background text-muted-foreground outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl bg-card">
          <CheckCheck size={40} className="text-muted-foreground/30 mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-1">No tasks found</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first task to get organized.'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90">
              <Plus size={16} /> Add First Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all flex items-start gap-4 ${task.status === 'completed' ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => toggleStatus(task.id, task.status)}
                className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
              >
                {task.status === 'completed' && <CheckSquare size={20} className="text-emerald-500 fill-emerald-50" />}
                {task.status === 'in_progress' && <Clock size={20} className="text-amber-500" />}
                {task.status === 'todo' && <Square size={20} className="text-muted-foreground" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-foreground text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wide ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wide ${
                    task.status === 'completed' ? 'bg-muted text-muted-foreground border-border' :
                    task.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-blue-50 text-blue-600 border-blue-200'
                  }`}>
                    {task.status === 'todo' ? 'to do' : task.status === 'in_progress' ? 'in progress' : 'done'}
                  </span>
                </div>
                {task.description && (
                  <p className="text-muted-foreground text-xs leading-relaxed mb-2">{task.description}</p>
                )}
                
                {/* Related entities displays */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center text-xs text-muted-foreground">
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {task.contacts && (
                    <span className="flex items-center gap-1 bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-medium">
                      <User size={10} />
                      {task.contacts.first_name} {task.contacts.last_name || ''}
                    </span>
                  )}
                  {task.leads && (
                    <span className="flex items-center gap-1 bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-medium">
                      <User size={10} />
                      Lead: {task.leads.first_name} {task.leads.last_name || ''}
                    </span>
                  )}
                  {task.properties && (
                    <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded font-medium max-w-xs truncate">
                      <Building2 size={10} />
                      {task.properties.title}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="text-muted-foreground hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold font-display">New Task</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Task Title *</label>
                <input type="text" required placeholder="e.g. Follow up with client" className={inputClass} value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea placeholder="Additional details..." rows={3} className={inputClass} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
              
              {/* Assignments / Links fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Assign to Contact</label>
                  <select className={inputClass} value={newContactId} onChange={e => { setNewContactId(e.target.value); if (e.target.value) setNewLeadId('') }}>
                    <option value="">— Select contact —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Assign to Lead</label>
                  <select className={inputClass} value={newLeadId} onChange={e => { setNewLeadId(e.target.value); if (e.target.value) setNewContactId('') }}>
                    <option value="">— Select lead —</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.first_name} {l.last_name || ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Related Property</label>
                <select className={inputClass} value={newPropertyId} onChange={e => setNewPropertyId(e.target.value)}>
                  <option value="">— Select property —</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Priority</label>
                  <select className={inputClass} value={newPriority} onChange={e => setNewPriority(e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Due Date</label>
                  <input type="date" className={inputClass} value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                </div>
              </div>
              
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all text-sm">
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
