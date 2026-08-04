import { useEffect, useState, useRef } from 'react'
import { Lightbulb, MessageSquare, Send, X, ArrowRight, Filter, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/lang'
import type { Profile, Suggestion, Conversation, ConversationMessage } from '../lib/types'

type AdminTab = 'suggestions' | 'conversations'

export function AdminPanel({ profile }: { profile: Profile }) {
  const { t } = useLang()
  const [tab, setTab] = useState<AdminTab>('suggestions')

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-cairo font-bold text-xl">{t('dash.admin')}</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('suggestions')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-cairo font-bold text-sm transition-all ${tab === 'suggestions' ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
        >
          <Lightbulb className="w-4 h-4" />
          {t('admin.suggestions')}
        </button>
        <button
          onClick={() => setTab('conversations')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-cairo font-bold text-sm transition-all ${tab === 'conversations' ? 'bg-brand-blue/20 border-2 border-brand-blue' : 'glass border-2 border-transparent'}`}
        >
          <MessageSquare className="w-4 h-4" />
          {t('admin.conversations')}
        </button>
      </div>

      {tab === 'suggestions' && <AdminSuggestions />}
      {tab === 'conversations' && <AdminConversations adminId={profile.id} adminName={profile.display_name || 'Admin'} />}
    </div>
  )
}

function AdminSuggestions() {
  const { t } = useLang()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    loadSuggestions()
  }, [roleFilter, dateFilter])

  async function loadSuggestions() {
    setLoading(true)
    let query = supabase.from('suggestions').select('*').order('created_at', { ascending: false })
    if (roleFilter) query = query.eq('user_role', roleFilter)
    if (dateFilter) {
      const date = new Date(dateFilter)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      query = query.gte('created_at', date.toISOString()).lt('created_at', nextDay.toISOString())
    }
    const { data } = await query
    if (data) setSuggestions(data as Suggestion[])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('suggestions').update({ status }).eq('id', id)
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s))
  }

  const roleLabels: Record<string, string> = {
    citizen: 'مواطن',
    pharmacist: 'صيدلي',
    facility_admin: 'مرفق طبي',
    facility_owner: 'مرفق طبي',
    admin: 'أدمن',
  }

  const statusLabels: Record<string, string> = {
    open: 'مفتوح',
    reviewing: 'قيد المراجعة',
    implemented: 'تم التنفيذ',
    rejected: 'مرفوض',
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-soft)]">
          <Filter className="w-4 h-4" />
          {t('admin.filterByRole')}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="glass-input px-3 py-2 text-sm outline-none focus:border-brand-green"
          >
            <option value="" className="bg-[var(--bg-dark)]">{t('admin.allRoles')}</option>
            <option value="citizen" className="bg-[var(--bg-dark)]">مواطن</option>
            <option value="pharmacist" className="bg-[var(--bg-dark)]">صيدلي</option>
            <option value="facility_owner" className="bg-[var(--bg-dark)]">مرفق طبي</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="glass-input px-3 py-2 text-sm outline-none focus:border-brand-green"
          />
          {(roleFilter || dateFilter) && (
            <button
              onClick={() => { setRoleFilter(''); setDateFilter('') }}
              className="px-3 py-2 rounded-xl glass text-sm hover:bg-white/5 font-tajawal"
            >
              إلغاء الفلتر
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-[var(--text-muted)] py-8 font-tajawal">{t('common.loading')}</p>
      ) : suggestions.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-muted)] py-8 font-tajawal">{t('admin.noResults')}</p>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div key={s.id} className="glass-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-cairo font-bold text-sm">{s.title}</h3>
                  <p className="text-sm text-[var(--text-soft)] font-tajawal mt-1 whitespace-pre-wrap">{s.description}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                  s.status === 'open' ? 'bg-brand-amber/20 text-brand-amber' :
                  s.status === 'implemented' ? 'bg-brand-green/20 text-brand-green-light' :
                  s.status === 'rejected' ? 'bg-brand-red/20 text-brand-red' :
                  'bg-brand-blue/20 text-brand-blue-light'
                }`}>
                  {statusLabels[s.status] || s.status}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)] font-tajawal">
                <span className="px-2 py-0.5 rounded-full glass">{roleLabels[s.user_role] || s.user_role}</span>
                {s.entity_name && <span className="px-2 py-0.5 rounded-full glass">{s.entity_name}</span>}
                <span>{s.user_name}</span>
                <span>·</span>
                <span>{new Date(s.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => updateStatus(s.id, 'reviewing')} className="text-xs px-2 py-1 rounded-lg glass hover:bg-brand-blue/10 font-tajawal">قيد المراجعة</button>
                <button onClick={() => updateStatus(s.id, 'implemented')} className="text-xs px-2 py-1 rounded-lg glass hover:bg-brand-green/10 font-tajawal">تم التنفيذ</button>
                <button onClick={() => updateStatus(s.id, 'rejected')} className="text-xs px-2 py-1 rounded-lg glass hover:bg-brand-red/10 font-tajawal">مرفوض</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminConversations({ adminId, adminName }: { adminId: string; adminName: string }) {
  const { t } = useLang()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (!activeConv) return

    loadMessages(activeConv.id)
    assignAdmin(activeConv.id)

    const channel = supabase
      .channel(`admin-conv:${activeConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as ConversationMessage).id)) return prev
            return [...prev, payload.new as ConversationMessage]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setConversations(data as Conversation[])
    setLoading(false)
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as ConversationMessage[])
    else setMessages([])
  }

  async function assignAdmin(convId: string) {
    const conv = conversations.find((c) => c.id === convId)
    if (conv && !conv.admin_id) {
      await supabase.from('conversations').update({ admin_id: adminId }).eq('id', convId)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activeConv) return
    const msg = newMessage.trim()
    setNewMessage('')
    setBusy(true)

    const { data, error } = await supabase.from('conversation_messages').insert({
      conversation_id: activeConv.id,
      sender_id: adminId,
      sender_name: adminName,
      sender_role: 'admin',
      message: msg,
    }).select('*').single()

    if (data && !error) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === (data as ConversationMessage).id)) return prev
        return [...prev, data as ConversationMessage]
      })
    }
    setBusy(false)
  }

  async function closeConversation(convId: string) {
    await supabase.from('conversations').update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: adminId,
    }).eq('id', convId)

    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: 'closed' } : c))
    if (activeConv?.id === convId) {
      setActiveConv((prev) => prev ? { ...prev, status: 'closed' } : null)
    }
  }

  function formatTime(ts: string) {
    const d = new Date(ts)
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  }

  if (activeConv) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => { setActiveConv(null); setMessages([]); }} className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-soft)]">
            <ArrowRight className="w-4 h-4" />
            {t('common.back')}
          </button>
          {activeConv.status === 'active' && (
            <button onClick={() => closeConversation(activeConv.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl glass hover:bg-brand-red/10 text-brand-red font-tajawal">
              <X className="w-3 h-3" />
              {t('chat.close')}
            </button>
          )}
        </div>

        <div className="glass-card p-3">
          <p className="font-cairo font-bold text-sm">{activeConv.subject}</p>
          {activeConv.entity_name && <p className="text-xs text-[var(--text-muted)] font-tajawal mt-0.5">{activeConv.entity_name}</p>}
        </div>

        <div className="glass-card h-[50vh] overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <p className="text-center text-sm text-[var(--text-muted)] font-tajawal py-8">{t('chat.placeholder')}</p>
          )}
          {messages.map((m) => {
            const isOwn = m.sender_id === adminId
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isOwn ? 'bg-brand-blue/20 border border-brand-blue/30' : 'glass'}`}>
                  {!isOwn && <p className="text-xs font-bold text-brand-green-light mb-0.5">{m.sender_name}</p>}
                  <p className="text-sm font-tajawal whitespace-pre-wrap break-words">{m.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatTime(m.created_at)}</p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {activeConv.status === 'active' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={t('chat.placeholder')}
              className="flex-1 glass-input px-4 py-2.5 text-sm outline-none focus:border-brand-blue"
            />
            <button onClick={sendMessage} disabled={busy || !newMessage.trim()} className="p-2.5 rounded-xl bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {loading ? (
        <p className="text-center text-sm text-[var(--text-muted)] py-8 font-tajawal">{t('common.loading')}</p>
      ) : conversations.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-muted)] py-8 font-tajawal">{t('chat.noConversations')}</p>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setActiveConv(conv)}
            className="w-full glass-card p-4 hover:bg-white/5 transition-colors text-right"
          >
            <div className="flex items-center justify-between">
              <span className="font-cairo font-bold text-sm truncate flex-1">{conv.subject}</span>
              {conv.status === 'closed' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red font-bold mr-2">{t('chat.closed')}</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green-light font-bold mr-2">مفتوحة</span>
              )}
            </div>
            {conv.entity_name && <p className="text-xs text-[var(--text-muted)] mt-0.5 font-tajawal">{conv.entity_name}</p>}
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-tajawal">{new Date(conv.created_at).toLocaleDateString('ar-EG')}</p>
          </button>
        ))
      )}
    </div>
  )
}
