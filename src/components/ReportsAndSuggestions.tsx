import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Lightbulb, X, Send, Loader as Loader2, MessageCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase, type Conversation, type ConversationMessage } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';

type ReportMode = 'bug' | 'suggestion';

export function ReportsButton({ isRTL }: { isRTL: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ReportMode>('bug');

  return (
    <>
      <button
        onClick={() => { setMode('bug'); setOpen(true); }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full glass hover:bg-amber-500/10 transition-colors text-sm font-tajawal"
        aria-label={isRTL ? 'بلاغات واقتراحات' : 'Reports & Suggestions'}
      >
        <Bug className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline font-bold">{isRTL ? 'بلاغات' : 'Reports'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <ReportsModal isRTL={isRTL} mode={mode} setMode={setMode} onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function ReportsModal({ isRTL, mode, setMode, onClose }: { isRTL: boolean; mode: ReportMode; setMode: (m: ReportMode) => void; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ui');
  const [submitting, setSubmitting] = useState(false);

  const entityName = profile?.role === 'pharmacist'
    ? 'pharmacy'
    : profile?.role === 'facility_owner'
    ? 'facility'
    : '';

  async function submit() {
    if (!user || !description.trim()) return;
    setSubmitting(true);
    try {
      if (mode === 'bug') {
        const { error } = await supabase.from('bug_reports').insert({
          reporter_id: user.id,
          reporter_name: profile?.display_name || user.email || '',
          category,
          description: description.trim(),
        });
        if (error) throw error;
        showToast(isRTL ? 'تم إرسال البلاغ. شكراً!' : 'Bug report sent. Thank you!');
      } else {
        const { error } = await supabase.from('suggestions').insert({
          user_id: user.id,
          user_name: profile?.display_name || user.email || '',
          user_role: profile?.role || 'citizen',
          entity_name: entityName,
          title: title.trim(),
          description: description.trim(),
        });
        if (error) throw error;
        showToast(isRTL ? 'تم إرسال الاقتراح. شكراً!' : 'Suggestion sent. Thank you!');
      }
      onClose();
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2">
            {mode === 'bug' ? <Bug className="w-5 h-5 text-amber-400" /> : <Lightbulb className="w-5 h-5 text-brand-green-light" />}
            {mode === 'bug' ? (isRTL ? 'الإبلاغ عن مشكلة تقنية' : 'Report a Technical Issue') : (isRTL ? 'تقديم اقتراح تطوير' : 'Submit a Suggestion')}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg glass"><X className="w-4 h-4" /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('bug')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${mode === 'bug' ? 'bg-amber-500/20 text-amber-400' : 'glass text-[var(--text-muted)]'}`}
          >
            <Bug className="w-3.5 h-3.5" /> {isRTL ? 'مشكلة تقنية' : 'Bug Report'}
          </button>
          <button
            onClick={() => setMode('suggestion')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${mode === 'suggestion' ? 'bg-brand-green/20 text-brand-green-light' : 'glass text-[var(--text-muted)]'}`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> {isRTL ? 'اقتراح تطوير' : 'Suggestion'}
          </button>
        </div>

        <div className="space-y-3">
          {mode === 'bug' && (
            <div>
              <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'النوع' : 'Category'}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-amber-500">
                <option value="ui">{isRTL ? 'واجهة المستخدم' : 'UI Issue'}</option>
                <option value="data">{isRTL ? 'بيانات' : 'Data Issue'}</option>
                <option value="auth">{isRTL ? 'مصادقة' : 'Authentication'}</option>
                <option value="performance">{isRTL ? 'أداء' : 'Performance'}</option>
                <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
          )}
          {mode === 'suggestion' && (
            <div>
              <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'العنوان' : 'Title'}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isRTL ? 'مثال: إضافة قسم الدعم النفسي' : 'e.g. Add mental health section'}
                className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الوصف' : 'Description'}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={mode === 'suggestion'
                ? (isRTL ? 'مثال: أقترح إضافة قسم الدعم النفسي في المنصة' : 'e.g. I suggest adding a mental health support section')
                : (isRTL ? 'صف المشكلة...' : 'Describe the issue...')
              }
              className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={submitting || !description.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isRTL ? 'إرسال' : 'Submit'}
          </button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ Conversations Button + Modal ============
export function ConversationsButton({ isRTL }: { isRTL: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full glass hover:bg-brand-blue/10 transition-colors text-sm font-tajawal"
        aria-label={isRTL ? 'المحادثات' : 'Conversations'}
      >
        <MessageCircle className="w-4 h-4 text-brand-blue-light" />
        <span className="hidden sm:inline font-bold">{isRTL ? 'محادثات' : 'Chat'}</span>
      </button>
      <AnimatePresence>
        {open && <ConversationsModal isRTL={isRTL} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function ConversationsModal({ isRTL, onClose }: { isRTL: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const entityName = profile?.role === 'pharmacist'
    ? (isRTL ? 'صيدلية' : 'Pharmacy')
    : profile?.role === 'facility_owner'
    ? (isRTL ? 'مستشفى/مرفق' : 'Facility')
    : '';

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('conversations')
        .select('id,report_id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setConversations((data as Conversation[]) || []);
      setLoading(false);
    })();
  }, [user]);

  // Realtime subscription for conversation list
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversations_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${user.id}` },
        () => {
          (async () => {
            const { data } = await supabase
              .from('conversations')
              .select('id,report_id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });
            setConversations((data as Conversation[]) || []);
          })();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!activeConv) return;
    (async () => {
      const { data } = await supabase
        .from('conversation_messages')
        .select('id,conversation_id,sender_id,sender_name,sender_role,message,created_at')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true });
      setMessages((data as ConversationMessage[]) || []);
    })();

    const channel = supabase
      .channel(`conv_${activeConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ConversationMessage]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeConv || sending) return;
    setSending(true);
    const msg = input.trim();
    setInput('');
    try {
      const { data } = await supabase.from('conversation_messages').insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        sender_name: profile?.display_name || user.email || '',
        sender_role: profile?.role || 'citizen',
        message: msg,
      }).select().single();
      if (data) setMessages((prev) => [...prev, data as ConversationMessage]);
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  const createConversation = async () => {
    if (!user || !newSubject.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from('conversations').insert({
        user_id: user.id,
        subject: newSubject.trim(),
        status: 'active',
        entity_name: entityName,
      }).select().single();
      if (error) throw error;
      if (data) {
        const newConv = data as Conversation;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConv(newConv);
        setShowNewForm(false);
        setNewSubject('');
      }
    } catch {
      showToast(isRTL ? 'فشل إنشاء المحادثة' : 'Failed to create conversation', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-0 w-full max-w-md h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            {activeConv && (
              <button onClick={() => setActiveConv(null)} className="p-1 rounded-lg glass">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="font-cairo font-bold text-sm flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-brand-blue-light" />
                {activeConv ? activeConv.subject : (isRTL ? 'محادثاتي مع الإدارة' : 'My Conversations')}
              </h3>
              {entityName && !activeConv && (
                <p className="text-[10px] text-[var(--text-muted)] font-tajawal">{isRTL ? 'مرتبط بـ:' : 'Linked to:'} {entityName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg glass"><X className="w-4 h-4" /></button>
        </div>

        {/* Conversation list view */}
        {!activeConv && !showNewForm && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full btn-primary text-sm flex items-center justify-center gap-1.5 mb-2"
            >
              {isRTL ? 'محادثة جديدة' : 'New Conversation'}
            </button>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-blue-light" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-8">{isRTL ? 'لا توجد محادثات بعد' : 'No conversations yet'}</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConv(c)}
                  className="w-full glass-card p-3 text-right hover:border-brand-blue/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-cairo font-bold text-sm truncate">{c.subject}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${c.status === 'active' ? 'bg-status-open/20 text-status-open' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                      {c.status === 'active' ? (isRTL ? 'مفتوحة' : 'Active') : (isRTL ? 'مغلقة' : 'Closed')}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] font-tajawal mt-1">{new Date(c.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                </button>
              ))
            )}
          </div>
        )}

        {/* New conversation form */}
        {!activeConv && showNewForm && (
          <div className="flex-1 p-4 space-y-3">
            <div>
              <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'موضوع المحادثة' : 'Subject'}</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={isRTL ? 'مثال: استفسار عن إضافة دواء' : 'e.g. Inquiry about adding medicines'}
                className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-blue"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={createConversation} disabled={sending || !newSubject.trim()} className="btn-primary flex-1 text-sm disabled:opacity-50">
                {isRTL ? 'إنشاء' : 'Create'}
              </button>
              <button onClick={() => setShowNewForm(false)} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        )}

        {/* Chat view */}
        {activeConv && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <p className="text-center text-sm font-tajawal text-[var(--text-muted)] mt-8">{isRTL ? 'ابدأ المحادثة...' : 'Start the conversation...'}</p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl p-2.5 ${isMine ? 'bg-brand-blue/20 text-[var(--text-bright)]' : 'glass text-[var(--text-soft)]'}`}>
                        {!isMine && <span className="text-[10px] font-bold text-brand-green-light block mb-0.5">{isRTL ? 'الإدارة' : 'Admin'}</span>}
                        <p className="text-xs font-tajawal">{m.message}</p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(m.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={activeConv.status !== 'active'}
                className="flex-1 glass rounded-xl px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-blue disabled:opacity-50"
                placeholder={activeConv.status === 'active' ? (isRTL ? 'اكتب رسالة...' : 'Type a message...') : (isRTL ? 'المحادثة مغلقة' : 'Conversation closed')}
              />
              <button onClick={sendMessage} disabled={sending || !input.trim() || activeConv.status !== 'active'} className="btn-primary px-4 py-2 disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
