import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Lightbulb, Clock, Check, X, MessageCircle, Send, Loader as Loader2, ChevronRight } from 'lucide-react';
import { supabase, type BugReport, type Suggestion, type Conversation, type ConversationMessage } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { showToast } from '@/components/ui/Toast';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function MyReports({ isRTL }: { isRTL: boolean }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'bugs' | 'suggestions' | 'conversations'>('bugs');
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [convMessages, setConvMessages] = useState<ConversationMessage[]>([]);
  const [convInput, setConvInput] = useState('');
  const [convLoading, setConvLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [bugs, suggs, convs] = await Promise.all([
      supabase.from('bug_reports').select('id,reporter_id,reporter_name,category,description,status,created_at,resolved_at,admin_notes').eq('reporter_id', user.id).order('created_at', { ascending: false }),
      supabase.from('suggestions').select('id,user_id,user_name,user_role,entity_name,title,description,status,admin_notes,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('conversations').select('id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name,report_id,suggestion_id,bug_report_id').or(`user_id.eq.${user.id}`).order('created_at', { ascending: false }),
    ]);
    setBugReports((bugs.data as BugReport[]) ?? []);
    setSuggestions((suggs.data as Suggestion[]) ?? []);
    setConversations((convs.data as Conversation[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime for conversations
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('my_reports_conversations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => { if ((payload.new as Conversation).user_id === user.id) setConversations((prev) => [payload.new as Conversation, ...prev]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load conversation messages when selected
  useEffect(() => {
    if (!selectedConv) return;
    (async () => {
      const { data } = await supabase.from('conversation_messages')
        .select('id,conversation_id,sender_id,sender_name,sender_role,message,created_at')
        .eq('conversation_id', selectedConv.id)
        .order('created_at', { ascending: true });
      setConvMessages((data as ConversationMessage[]) ?? []);
    })();
    const channel = supabase.channel(`my_conv_${selectedConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${selectedConv.id}` },
        (payload) => { setConvMessages((prev) => [...prev, payload.new as ConversationMessage]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  async function sendConvMessage() {
    if (!convInput.trim() || !selectedConv || !user) return;
    setConvLoading(true);
    const msg = convInput.trim();
    setConvInput('');
    try {
      const { data, error } = await supabase.from('conversation_messages').insert({
        conversation_id: selectedConv.id,
        sender_id: user.id,
        sender_name: 'User',
        sender_role: 'user',
        message: msg,
      }).select().single();
      if (error) throw error;
      if (data) setConvMessages((prev) => [...prev, data as ConversationMessage]);
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Failed to send', 'error');
    } finally {
      setConvLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-blue-light" /></div>;

  const tabs = [
    { id: 'bugs' as const, label: isRTL ? 'بلاغاتي' : 'My Bug Reports', count: bugReports.length, icon: Bug },
    { id: 'suggestions' as const, label: isRTL ? 'اقتراحاتي' : 'My Suggestions', count: suggestions.length, icon: Lightbulb },
    { id: 'conversations' as const, label: isRTL ? 'محادثاتي' : 'My Conversations', count: conversations.length, icon: MessageCircle },
  ];

  const statusColors: Record<string, string> = {
    open: 'bg-red-500/15 text-red-400',
    reviewing: 'bg-amber-500/15 text-amber-400',
    resolved: 'bg-brand-green/15 text-brand-green',
    implemented: 'bg-brand-green/15 text-brand-green',
    rejected: 'bg-[var(--border-subtle)] text-[var(--text-muted)]',
  };
  const statusLabels: Record<string, string> = {
    open: isRTL ? 'مفتوح' : 'Open',
    reviewing: isRTL ? 'قيد المراجعة' : 'Reviewing',
    resolved: isRTL ? 'تم الحل' : 'Resolved',
    implemented: isRTL ? 'تم التنفيذ' : 'Implemented',
    rejected: isRTL ? 'مرفوض' : 'Rejected',
  };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.id;
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${active ? 'bg-brand-blue/15 text-brand-blue-light' : 'glass text-[var(--text-muted)]'}`}>
              <Icon className="w-4 h-4" />
              {tb.label}
              {tb.count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">{tb.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Bug reports list */}
      {tab === 'bugs' && (
        <div className="space-y-3">
          {bugReports.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Bug className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{isRTL ? 'لم ترسل أي بلاغات بعد' : 'No bug reports sent'}</p>
            </div>
          ) : bugReports.map((r) => (
            <div key={r.id} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[r.status]}`}>{statusLabels[r.status] || r.status}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">{r.category}</span>
              </div>
              <p className="text-sm font-tajawal line-clamp-2">{r.description}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(r.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions list */}
      {tab === 'suggestions' && (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Lightbulb className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{isRTL ? 'لم ترسل أي اقتراحات بعد' : 'No suggestions sent'}</p>
            </div>
          ) : suggestions.map((s) => (
            <div key={s.id} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[s.status]}`}>{statusLabels[s.status] || s.status}</span>
                {s.entity_name && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">{s.entity_name}</span>}
              </div>
              {s.title && <h3 className="font-bold text-sm">{s.title}</h3>}
              <p className="text-sm font-tajawal text-[var(--text-soft)] mt-1 line-clamp-2">{s.description}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(s.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Conversations list */}
      {tab === 'conversations' && (
        <div className="space-y-3">
          {conversations.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <MessageCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{isRTL ? 'لا توجد محادثات بعد' : 'No conversations yet'}</p>
            </div>
          ) : conversations.map((c) => (
            <button key={c.id} onClick={() => setSelectedConv(c)} className="glass-card p-4 w-full text-start hover:border-brand-blue/30 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{c.subject || (isRTL ? 'محادثة' : 'Conversation')}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{new Date(c.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Conversation modal */}
      <AnimatePresence>
        {selectedConv && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setSelectedConv(null); setConvMessages([]); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="glass-card p-0 w-full max-w-md h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <MessageCircle className="w-4 h-4 text-brand-blue-light" />
                  {isRTL ? 'محادثة' : 'Conversation'}
                </h3>
                <button onClick={() => { setSelectedConv(null); setConvMessages([]); }} className="p-1.5 rounded-lg glass">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Context header */}
              <div className="px-4 py-2 bg-brand-blue/5 border-b border-[var(--border-subtle)]">
                <p className="text-xs font-tajawal text-brand-blue-light">
                  {selectedConv.suggestion_id
                    ? (isRTL ? `هذه المحادثة بخصوص اقتراحك: ${selectedConv.subject || ''}` : `This conversation is about your suggestion: ${selectedConv.subject || ''}`)
                    : selectedConv.bug_report_id
                    ? (isRTL ? `هذه المحادثة بخصوص بلاغك: ${selectedConv.subject || ''}` : `This conversation is about your bug report: ${selectedConv.subject || ''}`)
                    : selectedConv.subject || ''}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {convMessages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-muted)] mt-4">{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                ) : convMessages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl p-2.5 ${isMine ? 'bg-brand-blue/20' : 'glass'}`}>
                        {!isMine && <span className="text-[10px] font-bold text-brand-green-light block mb-0.5">{m.sender_name}</span>}
                        <p className="text-xs font-tajawal">{m.message}</p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(m.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
                <input value={convInput} onChange={(e) => setConvInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendConvMessage()}
                  className="flex-1 glass rounded-xl px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-blue"
                  placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'} />
                <button onClick={sendConvMessage} disabled={convLoading || !convInput.trim()} className="btn-primary px-4 py-2 disabled:opacity-50">
                  {convLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
