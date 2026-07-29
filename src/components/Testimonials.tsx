import { useEffect, useState } from 'react';
import { ChevronDown, Quote, Star } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const testimonials = [
  { name: 'أم محمد', role: 'أم لطفلين — غزة', text: 'بحثت عن دواء لابني 3 ساعات حتى وجدته عبر المنصة. وفرت عليّ يوماً كاملاً من التنقل.', rating: 5 },
  { name: 'د. أحمد خليل', role: 'صيدلاني — صيدلية الرحمة', text: 'أحدّث مخزوني من الهاتف في ثوانٍ. المواطنون يصلونني وهم يعرفون ما لديّ بالضبط.', rating: 5 },
  { name: 'سارة العطا', role: 'ممرضة — مستشفى الشفاء', text: 'أعلنت حالة الطوارئ فوراً عبر التطبيق، والناس تجنبت الازدحام وذهبوا لبدائل.', rating: 4 },
  { name: 'خالد أبو سلمي', role: 'مواطن — الشجاعية', text: 'كنت أروح للمستشفى وألاقيه مزدحم. هلق بعرف الحالة قبل ما أتحرك.', rating: 5 },
];

/**
 * Testimonials — carousel with auto-rotate + manual navigation.
 */
export default function Testimonials() {
  const { ref, visible } = useReveal();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            آراء
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            من <span className="text-gradient">الميدان</span>
          </h2>
        </div>

        <div className={`glass-card p-8 lg:p-12 reveal ${visible ? 'visible' : ''}`}>
          <Quote className="w-10 h-10 text-brand-green/30 mb-4" />
          <div className="relative min-h-[140px]">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-500 ${i === active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              >
                <p className="font-tajawal text-lg text-[var(--text-soft)] leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center font-cairo font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-cairo font-bold">{t.name}</div>
                    <div className="text-sm text-[var(--text-muted)] font-tajawal">{t.role}</div>
                  </div>
                  <div className="flex gap-0.5 mr-auto">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className={`w-4 h-4 ${s < t.rating ? 'text-status-busy fill-status-busy' : 'text-[var(--border-subtle)]'}`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all ${i === active ? 'w-8 bg-brand-green' : 'w-2 bg-[var(--border-subtle)]'}`}
                aria-label={`رأي ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
