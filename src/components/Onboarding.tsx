import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Pill, Shield } from 'lucide-react';

const slides = [
  { icon: Pill, title: 'ابحث عن دوائك فوراً', body: 'اعرف أي صيدلية تملك الدواء الذي تحتاجه وبأفضل سعر متاح دون عناء التنقل الخطر.' },
  { icon: Shield, title: 'تابع حالة المرافق الطبية', body: 'اعرف هل المستشفى أو النقطة الطبية مزدحمة أو متاحة قبل ما تتوجّه إليها لإنقاذ الوقت.' },
  { icon: MapPin, title: 'خريطة صحية شاملة', body: 'شاهد جميع الصيدليات، والمستشفيات، والعيادات المفتوحة جغرافياً في مكان واحد ومحدث بلحظته.' },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const s = slides[idx];

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-[var(--bg-dark)] text-[var(--text-main)] p-8 text-center">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-green/20 to-brand-blue/20 flex items-center justify-center mb-8">
              <s.icon className="w-12 h-12 text-brand-green-light" />
            </div>
            <h2 className="font-cairo font-bold text-2xl mb-4">{s.title}</h2>
            <p className="font-tajawal text-[var(--text-soft)] text-lg leading-relaxed">{s.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md flex items-center justify-between mt-8">
        <button onClick={onDone} className="text-sm font-tajawal text-[var(--text-muted)] hover:text-[var(--text-soft)] transition-colors">تخطي</button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i} className={`h-2.5 rounded-full transition-all ${i === idx ? 'w-6 bg-brand-green' : 'w-2.5 bg-[var(--border-subtle)]'}`} />
          ))}
        </div>
        <button onClick={() => idx < 2 ? setIdx(idx + 1) : onDone()} className="btn-primary text-sm">
          {idx === 2 ? 'ابدأ الآن' : 'التالي'}
        </button>
      </div>
    </div>
  );
}
