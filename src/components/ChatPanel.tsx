import { useEffect, useState, useRef } from 'react'
import { X, Send, MessageSquare, Plus, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/lang'
import type { Profile, Conversation, ConversationMessage } from '../lib/types'

export function ChatPanel({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { t } = useLang()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [entityName, setEntityName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
    loadEntityName()
  }, [])

  useEffect(() => {
    if (!activeConv) return

    loadMessages(activeConv.id)

    const channel = supabase
      .channel(`conversation:${activeConv.id}`)
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

  async function loadEntityName() {
    let name = ''
    if (profile.role === 'pharmacist') {
      const { data } = await supabase.from('pharmacies').select('name').eq('owner_id', profile.id).is('deleted_at', null).maybeSingle()
      name = data?.name || ''
    } else if (profile.role === 'facility_admin' || profile.role === 'facility_owner') {
      const { data } = await supabase.from('facilities').select('name').eq('owner_id', profile.id).is('deleted_at', null).maybeSingle()
      name = data?.name || ''
    }
    setEntityName(name)
  }

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    if (data) setConversations(data as Conversation[])
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

  async function createConversation() {
    if (!newSubject.trim()) return
    setBusy(true)
    const { data, error } = await supabase.from('conversations').insert({
      user_id: profile.id,
      subject: `${entityName ? entityName + ' — ' : ''}${newSubject.trim()}`,
      status: 'active',
      entity_name: entityName,
    }).select('*').single()

    if (data && !error) {
      setConversations((prev) => [data as Conversation, ...prev])
      setActiveConv(data as Conversation)
      setShowNew(false)
      setNewSubject('')
    }
    setBusy(false)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activeConv) return
    const msg = newMessage.trim()
    setNewMessage('')
    setBusy(true)

    const { data, error } = await supabase.from('conversation_messages').insert({
      conversation_id: activeConv.id,
      sender_id: profile.id,
      sender_name: profile.display_name || profile.email || '',
      sender_role: profile.role,
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

  function formatTime(ts: string) {
    const d = new Date(ts)
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-2xl h-[80vh] glass-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-blue-light" />
            {t('chat.title')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {activeConv ? (
          /* Chat view */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
              <button onClick={() => { setActiveConv(null); setMessages([]); }} className="p-1 rounded-lg hover:bg-white/5">
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              <span className="font-cairo font-bold text-sm truncate">{activeConv.subject}</span>
              {activeConv.status === 'closed' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red font-bold">{t('chat.closed')}</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
              {messages.length === 0 && (
                <p className="text-center text-sm text-[var(--text-muted)] font-tajawal py-8">{t('chat.placeholder')}</p>
              )}
              {messages.map((m) => {
                const isOwn = m.sender_id === profile.id
                return (
                  <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isOwn ? 'bg-brand-green/20 border border-brand-green/30' : 'glass'}`}>
                      {!isOwn && <p className="text-xs font-bold text-brand-blue-light mb-0.5">{t('chat.adminName')}</p>}
                      <p className="text-sm font-tajawal whitespace-pre-wrap break-words">{m.message}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatTime(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {activeConv.status === 'active' && (
              <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 glass-input px-4 py-2.5 text-sm outline-none focus:border-brand-green"
                />
                <button onClick={sendMessage} disabled={busy || !newMessage.trim()} className="p-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green/90 disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : showNew ? (
          /* New conversation form */
          <div className="flex-1 p-6 space-y-4">
            <button onClick={() => setShowNew(false)} className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-soft)]">
              <ArrowRight className="w-4 h-4" />
              {t('common.back')}
            </button>
            <div>
              <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5 font-tajawal">{t('chat.subject')}</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createConversation(); }}
                placeholder={t('chat.subject')}
                className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green"
              />
              {entityName && <p className="text-xs text-[var(--text-muted)] mt-1 font-tajawal">سيتم ربط المحادثة باسم: {entityName}</p>}
            </div>
            <button onClick={createConversation} disabled={busy || !newSubject.trim()} className="w-full py-3 rounded-xl bg-brand-green text-white font-cairo font-bold text-sm hover:bg-brand-green/90 disabled:opacity-50">
              {busy ? '...' : t('chat.new')}
            </button>
          </div>
        ) : (
          /* Conversation list */
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => setShowNew(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass border-2 border-dashed border-brand-green/30 hover:bg-brand-green/5 transition-colors font-cairo font-bold text-sm"
            >
              <Plus className="w-4 h-4 text-brand-green-light" />
              {t('chat.new')}
            </button>

            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[var(--text-muted)] font-tajawal">{t('chat.noConversations')}</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className="w-full glass-card p-3 hover:bg-white/5 transition-colors text-right"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-cairo font-bold text-sm truncate flex-1">{conv.subject}</span>
                    {conv.status === 'closed' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red font-bold mr-2">{t('chat.closed')}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-tajawal">{new Date(conv.created_at).toLocaleDateString('ar-EG')}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
