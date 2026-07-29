import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Pill, AlertTriangle, Clock } from 'lucide-react';
import { useLang } from '@/lib/i18n';

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

function generateResponse(query: string, isRTL: boolean): string {
  const q = query.toLowerCase();
  if (q.includes('باراسيتامول') || q.includes('paracetamol') || q.includes('acetaminophen')) {
    return isRTL
      ? 'جرعة الباراسيتامول للبالغين: 500-1000 ملغ كل 4-6 ساعات، بحد أقصى 4000 ملغ يومياً. لا تتجاوز الجرعة القصوى لتجنب أضرار الكبد. للأطفال استشر الطبيب.'
      : 'Adult paracetamol dose: 500-1000mg every 4-6 hours, max 4000mg/day. Do not exceed the maximum dose to avoid liver damage. For children, consult a doctor.';
  }
  if (q.includes('أسبرين') || q.includes('aspirin') || q.includes('warfarin') || q.includes('وارفارين')) {
    return isRTL
      ? 'نعم، يوجد تعارض خطير بين الأسبرين والوارفارين. الأسبرين يزيد خطر النزيف عند تناوله مع الوارفارين. تجنب الجمع بينهما إلا بوصفة طبية مباشرة ورقابة طبيب.'
      : 'Yes, there is a serious interaction between aspirin and warfarin. Aspirin increases bleeding risk when taken with warfarin. Avoid combining them unless directly prescribed and monitored by a doctor.';
  }
  if (q.includes('أوميبرازول') || q.includes('omeprazole') || q.includes('بديل')) {
    return isRTL
      ? 'بدائل الأوميبرازول (مثبطات مضخة البروتون): إسوميبرازول، بانتوبرازول، رابيبرازول. جميعها تقلل حموضة المعدة. استشر طبيبك قبل التبديل.'
      : 'Alternatives to omeprazole (PPIs): esomeprazole, pantoprazole, rabeprazole. All reduce stomach acid. Consult your doctor before switching.';
  }
  if (q.includes('أموكسيسيلين') || q.includes('amoxicillin') || q.includes('كم مرة')) {
    return isRTL
      ? 'جرعة الأموكسيسيلون للبالغين: 500 ملغ ثلاث مرات يومياً (كل 8 ساعات). أكمل الموصوف كاملاً حتى لو شعرت بتحسن. لا توقف الدواء مبكراً.'
      : 'Adult amoxicillin dose: 500mg three times daily (every 8 hours). Complete the full course even if you feel better. Do not stop early.';
  }
  if (q.includes('تعارض') || q.includes('interaction')) {
    return isRTL
      ? 'للتحقق من التعارضات الدوائية، أدخل قائمة أدويتك في تبويب "أدويتي" وسيقوم النظام بفحص التداخلات تلقائياً. استشر طبيبك أو الصيدلي دائماً قبل الجمع بين أدوية جديدة.'
      : 'To check drug interactions, enter your medicine list in the "My Meds" tab and the system will check automatically. Always consult your doctor or pharmacist before combining new medicines.';
  }
  if (q.includes('جرعة') || q.includes('dose') || q.includes('كم')) {
    return isRTL
      ? 'الجرعات تختلف حسب الدواء والعمر والحالة الصحية. يرجى تحديد اسم الدواء وسن المريض لأعطيك إرشاد عام. تذكر: هذه إرشادات عامة وليست بديلاً عن استشارة الطبيب.'
      : 'Doses vary by medication, age, and health condition. Please specify the medicine name and patient age for general guidance. Remember: this is general guidance, not a substitute for consulting a doctor.';
  }
  if (q.includes('بديل') || q.includes('alternative')) {
    return isRTL
      ? 'للبحث عن البدائل، انتقل إلى صفحة تفاصيل الصيدلية وستجد قسم "مستكشف البدائل" الذي يبحث عن أدوية بنفس المادة الفعالة. يمكنك أيضاً استخدام البحث.'
      : 'To find alternatives, go to the pharmacy detail page and use the "Alternative Explorer" section which searches for medicines with the same active ingredient. You can also use search.';
  }
  return isRTL
    ? 'أنا مساعد صيدلاني ذكي. يمكنني مساعدتك في: الجرعات، التعارضات الدوائية، البدائل، والإرشادات العامة. اكتب سؤالك بوضوح. ملاحظة: هذه إرشادات عامة ولا تغني عن استشارة الطبيب أو الصيدلي.'
    : 'I am a smart AI pharmacist assistant. I can help with: dosages, drug interactions, alternatives, and general guidance. Write your question clearly. Note: this is general guidance and does not replace consulting a doctor or pharmacist.';
}

export function AIChatbot() {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'bot', text: isRTL ? 'مرحباً! أنا مساعدك الصيدلاني الذكي. كيف يمكنني مساعدتك اليوم؟' : 'Hello! I am your AI pharmacist assistant. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((p) => [...p, { role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = generateResponse(text, isRTL);
      setMessages((p) => [...p, { role: 'bot', text: reply }]);
      setTyping(false);
    }, 800);
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
                  <div className={`glass-card p-2.5 max-w-[80%] text-sm font-tajawal ${m.role === 'bot' ? '' : 'bg-brand-blue/15'}`}>
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
              <button onClick={() => send(input)} disabled={!input.trim()} className="btn-primary px-3 disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
