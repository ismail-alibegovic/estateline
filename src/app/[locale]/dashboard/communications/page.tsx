'use client'

import { useState, useEffect } from 'react'
import { 
  Phone, 
  Users, 
  Mail, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  MessageSquare,
  Trash2,
  TrendingUp
} from 'lucide-react'

interface Communication {
  id: string
  type: 'call' | 'meeting' | 'email'
  title: string
  clientName: string
  summary: string
  durationMinutes: number
  date: string
}

const DEFAULT_COMMS: Communication[] = [
  {
    id: '1',
    type: 'call',
    title: 'Introductory call regarding Penthouse listings',
    clientName: 'Mark R.',
    summary: 'Explained pricing and layout options. Mark is interested in booking a viewing on Friday.',
    durationMinutes: 12,
    date: new Date(Date.now() - 3600000).toISOString().split('T')[0] // today
  },
  {
    id: '2',
    type: 'meeting',
    title: 'Negotiation for Down Town Loft agreement',
    clientName: 'Elena V.',
    summary: 'Met at our agency. Discussed agency commission and payment schedule. Elena requested contract drafts.',
    durationMinutes: 45,
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // yesterday
  },
  {
    id: '3',
    type: 'email',
    title: 'Sent catalog & brochures for New Villa Project',
    clientName: 'Sarah K.',
    summary: 'Followed up email with attachments for all luxury listings in coastal areas.',
    durationMinutes: 5,
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0]
  }
]

export default function CommunicationsPage() {
  const [comms, setComms] = useState<Communication[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'call' | 'meeting' | 'email'>('all')
  
  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newClient, setNewClient] = useState('')
  const [newType, setNewType] = useState<'call' | 'meeting' | 'email'>('call')
  const [newSummary, setNewSummary] = useState('')
  const [newDuration, setNewDuration] = useState(10)
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('estateline_comms')
    if (saved) {
      try {
        setComms(JSON.parse(saved))
      } catch {
        setComms(DEFAULT_COMMS)
      }
    } else {
      setComms(DEFAULT_COMMS)
      localStorage.setItem('estateline_comms', JSON.stringify(DEFAULT_COMMS))
    }
  }, [])

  const saveComms = (updated: Communication[]) => {
    setComms(updated)
    localStorage.setItem('estateline_comms', JSON.stringify(updated))
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newClient.trim()) return

    const newLog: Communication = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      clientName: newClient,
      type: newType,
      summary: newSummary,
      durationMinutes: Number(newDuration) || 10,
      date: newDate || new Date().toISOString().split('T')[0]
    }

    const updated = [newLog, ...comms]
    saveComms(updated)

    // Reset Form
    setNewTitle('')
    setNewClient('')
    setNewType('call')
    setNewSummary('')
    setNewDuration(10)
    setNewDate('')
    setIsOpen(false)
  }

  const deleteComm = (id: string) => {
    const updated = comms.filter(c => c.id !== id)
    saveComms(updated)
  }

  const filteredComms = comms.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.clientName.toLowerCase().includes(search.toLowerCase()) ||
                          c.summary.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || c.type === typeFilter
    return matchesSearch && matchesType
  })

  // Summary Metrics
  const totalCalls = comms.filter(c => c.type === 'call').length
  const totalMeetings = comms.filter(c => c.type === 'meeting').length
  const totalEmails = comms.filter(c => c.type === 'email').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Communications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Log calls, meetings, and emails to track communication history with clients.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-soft transition-all"
        >
          <Plus size={18} />
          Log Communication
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-card border border-border rounded-xl shadow-soft flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Logged Calls</p>
            <h3 className="text-2xl font-bold text-foreground font-display mt-0.5">{totalCalls}</h3>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-soft flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Logged Meetings</p>
            <h3 className="text-2xl font-bold text-foreground font-display mt-0.5">{totalMeetings}</h3>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-soft flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Mail size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Logged Emails</p>
            <h3 className="text-2xl font-bold text-foreground font-display mt-0.5">{totalEmails}</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-card border border-border rounded-xl shadow-soft">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communication logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
              typeFilter === 'all' 
                ? 'bg-primary text-primary-foreground border-primary shadow-soft' 
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('call')}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all flex items-center gap-1.5 ${
              typeFilter === 'call' 
                ? 'bg-primary text-primary-foreground border-primary shadow-soft' 
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            <Phone size={13} />
            Calls
          </button>
          <button
            onClick={() => setTypeFilter('meeting')}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all flex items-center gap-1.5 ${
              typeFilter === 'meeting' 
                ? 'bg-primary text-primary-foreground border-primary shadow-soft' 
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            <Users size={13} />
            Meetings
          </button>
          <button
            onClick={() => setTypeFilter('email')}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all flex items-center gap-1.5 ${
              typeFilter === 'email' 
                ? 'bg-primary text-primary-foreground border-primary shadow-soft' 
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            <Mail size={13} />
            Emails
          </button>
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-[2px] before:bg-border">
        {filteredComms.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-xl border border-border border-dashed ml-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No logged communications found.</p>
          </div>
        ) : (
          filteredComms.map((log) => {
            const icons = {
              call: <Phone size={16} className="text-primary" />,
              meeting: <Users size={16} className="text-amber-500" />,
              email: <Mail size={16} className="text-emerald-500" />
            }

            const iconBackgrounds = {
              call: 'bg-primary/10 border-primary/20',
              meeting: 'bg-amber-500/10 border-amber-500/20',
              email: 'bg-emerald-500/10 border-emerald-500/20'
            }

            return (
              <div key={log.id} className="relative pl-12 flex items-start gap-4">
                {/* Timeline Icon Node */}
                <div className={`absolute left-3 p-2 rounded-full border bg-card z-10 -translate-x-1/2 ${iconBackgrounds[log.type]}`}>
                  {icons[log.type]}
                </div>

                {/* Log Card */}
                <div className="flex-1 p-4 bg-card border border-border rounded-xl shadow-soft hover:shadow-md transition-all flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground text-base leading-tight">
                        {log.title}
                      </h3>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 border border-border rounded bg-muted font-medium">
                        with {log.clientName}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {log.summary}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {log.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        Duration: {log.durationMinutes} min
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteComm(log.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Log Comm Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground font-display">Log Communication</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="e.g. Elena V."
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Log Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Offer details phone call"
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Summary & Notes
                </label>
                <textarea
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Details of client response, interest level, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg shadow-soft hover:bg-primary/90 transition-colors text-sm"
              >
                Save Log
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
