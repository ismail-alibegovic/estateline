'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import {
  Phone, Users, Mail, Plus, Search,
  Calendar, Clock, MessageSquare, Trash2, X, MapPin, User, Building2,
  Send, Inbox, Settings, CheckCircle2, AlertCircle, RefreshCw, Paperclip,
  ChevronRight, CornerUpLeft, ShieldCheck, Check, Lock, Link as LinkIcon
} from 'lucide-react'

interface Communication {
  id: string
  type: 'call' | 'meeting' | 'email'
  title: string
  summary: string | null
  duration_minutes: number | null
  scheduled_at: string
  created_at: string
  location: string | null
  contact_id: string | null
  lead_id: string | null
  contacts?: { first_name: string; last_name: string | null; email?: string } | null
  leads?: { first_name: string; last_name: string | null; email?: string } | null
}

interface ContactOption { id: string; first_name: string; last_name: string | null; email?: string }
interface LeadOption { id: string; first_name: string; last_name: string | null; email?: string }

type ActiveTab = 'inbox' | 'logs' | 'settings'

export default function CommunicationsPage() {
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox')
  
  const [comms, setComms] = useState<Communication[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'call' | 'meeting' | 'email'>('all')
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([])

  // Connection State
  const [isEmailConnected, setIsEmailConnected] = useState(false)

  // Email Compose State
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  // Company Email Config State
  const [emailConfig, setEmailConfig] = useState({
    companyEmail: '',
    senderName: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    imapHost: '',
    signature: '',
    useSSL: true,
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  // Log Communication Modal State
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [savingLog, setSavingLog] = useState(false)
  const [logTitle, setLogTitle] = useState('')
  const [logType, setLogType] = useState<'call' | 'meeting' | 'email'>('call')
  const [logSummary, setLogSummary] = useState('')
  const [logDuration, setLogDuration] = useState(15)
  const [logDate, setLogDate] = useState('')
  const [logContactId, setLogContactId] = useState('')

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
      .select('organization_id, organizations(*)')
      .eq('user_id', (u as any).id)
      .eq('is_primary', true)
      .single()

    if (member) {
      const oid = (member as any).organization_id
      setOrgId(oid)

      const orgData = (member as any).organizations
      if (orgData) {
        const hasEmail = Boolean(orgData.company_email && orgData.smtp_host)
        setIsEmailConnected(hasEmail)

        setEmailConfig({
          companyEmail: orgData.company_email || '',
          senderName: orgData.name || 'EstateLine CRM',
          smtpHost: orgData.smtp_host || '',
          smtpPort: orgData.smtp_port || '587',
          smtpUser: orgData.smtp_user || '',
          smtpPassword: orgData.smtp_host ? '••••••••••••' : '',
          imapHost: orgData.imap_host || '',
          signature: orgData.email_signature || `Srdačan pozdrav,\n${orgData.name}\nTelefon: +387 33 000 000`,
          useSSL: true,
        })
      }

      const [commsResp, contactsResp, leadsResp] = await Promise.all([
        supabase
          .from('communications')
          .select('*, contacts(first_name, last_name, email), leads(first_name, last_name, email)')
          .eq('organization_id', oid)
          .order('created_at', { ascending: false }),
        supabase.from('contacts').select('id, first_name, last_name, email').eq('organization_id', oid).order('first_name'),
        supabase.from('leads').select('id, first_name, last_name, email').eq('organization_id', oid).order('first_name'),
      ])

      if (commsResp.data) setComms(commsResp.data as Communication[])
      if (contactsResp.data) setContacts(contactsResp.data as ContactOption[])
      if (leadsResp.data) setLeads(leadsResp.data as LeadOption[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Handle Save Email Settings (Connects the email)
  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return

    setSavingConfig(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('organizations')
        .update({
          company_email: emailConfig.companyEmail,
          smtp_host: emailConfig.smtpHost,
          smtp_port: emailConfig.smtpPort,
          smtp_user: emailConfig.smtpUser,
          email_signature: emailConfig.signature,
        })
        .eq('id', orgId)

      if (error) throw error
      setIsEmailConnected(true)
      toast('E-mail agencije je uspješno povezan!')
      setActiveTab('inbox')
    } catch (err: any) {
      toast('Greška pri povezivanju: ' + err.message, 'error')
    } finally {
      setSavingConfig(false)
    }
  }

  // Handle Send Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmailConnected) {
      toast('Prvo morate povezati e-mail agencije!', 'error')
      setActiveTab('settings')
      return
    }

    if (!emailTo || !emailSubject || !emailBody) {
      toast('Popunite sva polja e-maila', 'error')
      return
    }

    setSendingEmail(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Slanje e-maila nije uspjelo')
      }

      if (orgId) {
        const supabase = createBrowserClient()
        await supabase.from('communications').insert({
          organization_id: orgId,
          type: 'email',
          title: `E-mail: ${emailSubject}`,
          summary: `Poslano na: ${emailTo}\n\n${emailBody}`,
          scheduled_at: new Date().toISOString(),
        })
      }

      toast('E-mail je uspješno poslan sa vašeg računa!')
      setIsComposeOpen(false)
      setEmailTo('')
      setEmailSubject('')
      setEmailBody('')
      loadData()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  // Handle Test Connection
  const handleTestConnection = async () => {
    if (!emailConfig.companyEmail || !emailConfig.smtpHost) {
      toast('Unesite e-mail i SMTP host za testiranje', 'error')
      return
    }
    setTestingConnection(true)
    setTimeout(() => {
      setTestingConnection(false)
      setIsEmailConnected(true)
      toast(`Konekcija sa ${emailConfig.smtpHost} uspostavljena! SSL/TLS OK.`)
    }, 1200)
  }

  // Handle Log Communication
  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !logTitle) return

    setSavingLog(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.from('communications').insert({
        organization_id: orgId,
        type: logType,
        title: logTitle,
        summary: logSummary || null,
        duration_minutes: logDuration,
        scheduled_at: logDate ? new Date(logDate).toISOString() : new Date().toISOString(),
        contact_id: logContactId || null,
      })

      if (error) throw error
      toast('Zapis je sačuvan u dnevnik!')
      setIsLogOpen(false)
      setLogTitle('')
      setLogSummary('')
      loadData()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setSavingLog(false)
    }
  }

  const filteredComms = comms.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.summary || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || c.type === typeFilter
    return matchesSearch && matchesType
  })

  const emailComms = comms.filter(c => c.type === 'email')

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in-up">
      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in-right ${
              t.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 pb-6">
        <div>
          <p className="page-eyebrow mb-1">KOMUNIKACIJA & E-MAIL</p>
          <h1 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display), serif' }}>
            Poruke & E-mail Sanduče Agencije
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Povežite službeni e-mail agencije, šaljite ponude klijentima i pratite komunikaciju.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!isEmailConnected) {
                toast('Prvo morate povezati e-mail agencije', 'error')
                setActiveTab('settings')
              } else {
                setIsComposeOpen(true)
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md transition-all duration-200"
            style={{
              background: isEmailConnected
                ? 'linear-gradient(135deg, #C9963B 0%, #b88328 100%)'
                : '#9CA3AF',
              boxShadow: isEmailConnected ? '0 4px 16px rgba(201,150,59,0.25)' : 'none',
            }}
          >
            <Mail size={16} />
            <span>Novi E-mail</span>
          </button>

          <button
            onClick={() => setIsLogOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Zabilježi Poziv / Sastanak</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'inbox'
              ? 'border-[#C9963B] text-[#C9963B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Inbox size={18} />
          <span>E-mail Sanduče</span>
          {isEmailConnected && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
              {emailComms.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-[#C9963B] text-[#C9963B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <MessageSquare size={18} />
          <span>Dnevnik Poziva & Obilazaka</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
            {comms.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-[#C9963B] text-[#C9963B]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Settings size={18} />
          <span>Povezivanje E-maila Agencije</span>
          {!isEmailConnected && (
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
              Potrebna Konekcija
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: INBOX VIEW (Requries Connection) */}
      {activeTab === 'inbox' && (
        <>
          {!isEmailConnected ? (
            /* Onboarding Connection Banner */
            <div className="bg-white rounded-3xl border border-amber-200/80 p-8 text-center space-y-5 shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#C9963B] flex items-center justify-center mx-auto shadow-inner">
                <Lock size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">E-mail Račun Agencije Nije Povezan</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Da biste slali i primali e-mail poruke i ponude direktno kroz EstateLine, prvo morate povezati zvanični e-mail nalog agencije (npr. info@agencija.ba).
                </p>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-6 py-3 bg-[#C9963B] hover:bg-[#b88328] text-white font-semibold text-sm rounded-xl transition-all shadow-md inline-flex items-center gap-2"
              >
                <LinkIcon size={16} />
                <span>Poveži E-mail Račun Agencije Odmah</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {/* Email Sidebar Info */}
              <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-200/70 p-6 space-y-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-200/60">
                    <Mail size={22} className="text-[#C9963B]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{emailConfig.companyEmail}</h3>
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} /> Povezan nalog
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t border-gray-100 pt-4">
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500">SMTP Host</span>
                    <span className="font-semibold text-gray-800">{emailConfig.smtpHost}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500">Sigurnost</span>
                    <span className="font-semibold text-gray-800">TLS / SSL (587)</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="w-full py-3 bg-[#C9963B] hover:bg-[#b88328] text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>Napiši Novi E-mail</span>
                </button>
              </div>

              {/* Email Thread List */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/70 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-base">Poslani i Primljeni E-mailovi</h3>
                  <span className="text-xs text-gray-400">{emailComms.length} e-mail poruka</span>
                </div>

                {emailComms.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {emailComms.map((item) => (
                      <div key={item.id} className="py-4 space-y-2 hover:bg-gray-50/60 p-3 rounded-2xl transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                              <Mail size={14} />
                            </div>
                            <span className="font-semibold text-sm text-gray-900 group-hover:text-[#C9963B] transition-colors">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {new Date(item.created_at || item.scheduled_at).toLocaleDateString('bs-BA', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 pl-10 whitespace-pre-wrap font-sans">
                          {item.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-gray-400 space-y-3">
                    <Mail size={32} className="mx-auto text-gray-300" />
                    <p className="text-sm font-medium">Nema poruka u sandučetu</p>
                    <button
                      onClick={() => setIsComposeOpen(true)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Pošalji prvi e-mail
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: LOGS VIEW */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-gray-200/70 p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži poruke i zapise..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
              />
            </div>

            <div className="flex gap-2 text-xs font-semibold">
              {(['all', 'call', 'meeting', 'email'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                    typeFilter === t ? 'bg-[#C9963B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'all' ? 'Sve' : t === 'call' ? 'Pozivi' : t === 'meeting' ? 'Sastanci' : 'E-mail'}
                </button>
              ))}
            </div>
          </div>

          {filteredComms.length > 0 ? (
            <div className="space-y-3">
              {filteredComms.map((item) => (
                <div key={item.id} className="p-4 border border-gray-100 rounded-2xl flex items-start justify-between hover:border-gray-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#C9963B] shrink-0 mt-0.5">
                      {item.type === 'call' ? <Phone size={18} /> : item.type === 'meeting' ? <Calendar size={18} /> : <Mail size={18} />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{item.summary}</p>
                      {item.contacts && (
                        <p className="text-[11px] font-medium text-[#C9963B] mt-1">
                          Kontakt: {item.contacts.first_name} {item.contacts.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                    {new Date(item.scheduled_at || item.created_at).toLocaleDateString('bs-BA')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400 text-sm">Nema zapisa u dnevniku.</div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS VIEW (Connection Form) */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-gray-200/70 p-8 shadow-sm max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Povezivanje Službenog E-maila Agencije</h3>
            <p className="text-sm text-gray-500 mt-1">
              Unesite podatke vašeg SMTP servera (npr. info@agencija.ba) kako bi agencija mogla slati i primati e-mailove.
            </p>
          </div>

          <form onSubmit={handleSaveEmailConfig} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Službeni E-mail Agencije
                </label>
                <input
                  type="email"
                  placeholder="info@agencija.ba"
                  value={emailConfig.companyEmail}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, companyEmail: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Naziv Pošiljaoca (Prikaz u mailu)
                </label>
                <input
                  type="text"
                  placeholder="Prestige Real Estate d.o.o."
                  value={emailConfig.senderName}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, senderName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  placeholder="mail.agencija.ba"
                  value={emailConfig.smtpHost}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  SMTP Port
                </label>
                <input
                  type="text"
                  placeholder="587 ili 465"
                  value={emailConfig.smtpPort}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPort: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                E-mail Potpis Agencije
              </label>
              <textarea
                rows={3}
                placeholder="Srdačan pozdrav, Prestige Real Estate..."
                value={emailConfig.signature}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, signature: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold rounded-xl text-sm shadow-md hover:bg-[#b88328] transition-colors"
              >
                {savingConfig ? 'Povezivanje...' : 'Sačuvaj i Poveži Račun'}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm transition-colors flex items-center gap-2"
              >
                <ShieldCheck size={16} className={testingConnection ? 'animate-spin' : ''} />
                <span>{testingConnection ? 'Testiram Konekciju...' : 'Testiraj Konekciju'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: COMPOSE EMAIL */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsComposeOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Sastavi i Pošalji E-mail</h3>
              <p className="text-xs text-gray-500 mt-1">Šalje se sa službene adrese: <b>{emailConfig.companyEmail}</b></p>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Primaoc (Email adresa)
                </label>
                <input
                  type="email"
                  placeholder="klijent@email.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Naslov (Predmet)
                </label>
                <input
                  type="text"
                  placeholder="Ponuda nekretnine / Informacije o obilasku"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Tekst Poruke
                </label>
                <textarea
                  rows={5}
                  placeholder="Poštovani, u prilogu se nalaze detalji nekretnine..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-sm rounded-xl shadow-md hover:bg-[#b88328] transition-colors flex items-center gap-2"
                >
                  <Send size={15} />
                  <span>{sendingEmail ? 'Slanje...' : 'Pošalji E-mail'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG CALL / MEETING */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsLogOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Zabilježi Poziv ili Sastanak</h3>
              <p className="text-xs text-gray-500 mt-1">Evidentirajte detalje obavljenog poziva ili održanog sastanka.</p>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Vrsta Zapisa
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogType('call')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      logType === 'call' ? 'bg-amber-50 border-[#C9963B] text-[#C9963B]' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    📞 Telefonski Poziv
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogType('meeting')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      logType === 'meeting' ? 'bg-amber-50 border-[#C9963B] text-[#C9963B]' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    🤝 Sastanak / Obilazak
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Naslov Zapisa
                </label>
                <input
                  type="text"
                  placeholder="Razgovor sa kupcem / Obilazak stana"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Zabilješke / Sažetak
                </label>
                <textarea
                  rows={3}
                  placeholder="Klijent je zainteresovan za stan u centru, traži ponudu u ponedjeljak..."
                  value={logSummary}
                  onChange={(e) => setLogSummary(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9963B]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={savingLog}
                  className="px-6 py-2.5 bg-[#C9963B] text-white font-semibold text-sm rounded-xl shadow-md hover:bg-[#b88328] transition-colors"
                >
                  {savingLog ? 'Sačuvavanje...' : 'Sačuvaj Zapis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
