import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
}

const QUICK_TOPICS = [
  { ar: 'ما هي جرعة الباراسيتامول للبالغين؟', en: 'What is the paracetamol dose for adults?' },
  { ar: 'هل يوجد تعارض بين الأسبرين والوارفارين؟', en: 'Is there an interaction between aspirin and warfarin?' },
  { ar: 'ما بديل الأوميبرازول؟', en: 'What is an alternative to omeprazole?' },
  { ar: 'كم مرة آخذ الأموكسيسيلين؟', en: 'How often should I take amoxicillin?' },
];

const FALLBACK: Record<'ar' | 'en', string> = {
  ar: 'عذراً، تعذّر الاتصال بالمساعد الذكي حالياً. هذه إرشادات عامة: استشر طبيبك أو الصيدلي دائماً قبل تناول أي دواء.',
  en: 'Sorry, the AI assistant is currently unavailable. General guidance: always consult your doctor or pharmacist before taking any medicine.',
};

export function AIChatbot() {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'bot', text: isRTL ? 'مرحباً! أنا مساعدك الصيدلاني الذكي. كيف يمكنني مساعدتك اليوم؟' : 'Hello! I am your AI pharmacist assistant. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  // Load chat history from Supabase when the panel opens
  const loadHistory = useCallback(async () => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      if (data && data.length > 0) {
        setMessages(
          data.map((r) => ({
            role: (r.role === 'assistant' ? 'bot' : 'user') as 'user' | 'bot',
            text: r.content,
          })),
        );
      }
    } catch {
      // keep the welcome message on failure
    }
  }, [user]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  const persistMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;
    try {
      await supabase.from('ai_chat_messages').insert({ user_id: user.id, role, content });
    } catch {
      // persistence is best-effort
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg: ChatMsg = { role: 'user', text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setTyping(true);
    persistMessage('user', text);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-pharmacist`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          lang: isRTL ? 'ar' : 'en',
          messages: newMessages.map((m) => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            content: m.text,
          })),
        }),
      });

      let reply = FALLBACK[isRTL ? 'ar' : 'en'];
      if (resp.ok) {
        const data = await resp.json();
        if (data && typeof data.reply === 'string' && data.reply.trim()) {
          reply = data.reply;
        }
      }
      setMessages((p) => [...p, { role: 'bot', text: reply }]);
      persistMessage('assistant', reply);
    } catch {
      setMessages((p) => [...p, { role: 'bot', text: FALLBACK[isRTL ? 'ar' : 'en'] }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-brand-green to-brand-blue shadow-lg shadow-brand-green/30 flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-status-emergency rounded-full animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-20 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm h-[60vh] glass-card flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-brand-green/15 to-brand-blue/15">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-cairo font-bold text-sm">{isRTL ? 'المساعد الصيدلاني' : 'AI Pharmacist'}</div>
                  <div className="text-[10px] text-status-open flex items-center gap-1"><span className="w-1.5 h-1.5 bg-status-open rounded-full" />{isRTL ? 'متصل' : 'Online'}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-soft)]"><X className="w-5 h-5" /></button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${m.role === 'bot' ? 'bg-brand-green/20' : 'bg-brand-blue/20'}`}>
                    {m.role === 'bot' ? <Bot className="w-4 h-4 text-brand-green-light" /> : <User className="w-4 h-4 text-brand-blue-light" />}
                  </div>
                  <div className={`glass-card p-2.5 max-w-[80%] text-sm font-tajawal whitespace-pre-wrap ${m.role === 'bot' ? '' : 'bg-brand-blue/15'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-green/20 flex items-center justify-center"><Bot className="w-4 h-4 text-brand-green-light" /></div>
                  <div className="glass-card p-3 flex gap-1">
                    {[0, 1, 2].map((j) => (
                      <motion.span key={j} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.15 }} className="w-1.5 h-1.5 bg-brand-green-light rounded-full" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!messages.some((m) => m.role === 'user') && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((t, i) => (
                  <button key={i} onClick={() => send(isRTL ? t.ar : t.en)} className="text-[10px] px-2.5 py-1.5 rounded-full glass-card font-tajawal hover:bg-brand-green/10 transition-colors">
                    {isRTL ? t.ar : t.en}
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                placeholder={isRTL ? 'اكتب سؤالك...' : 'Type your question...'}
                className="flex-1 glass-card px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-green"
              />
              <button onClick={() => send(input)} disabled={!input.trim() || typing} className="btn-primary px-3 disabled:opacity-50">
                {typing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
