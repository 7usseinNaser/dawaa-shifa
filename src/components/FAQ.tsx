import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const faqs = [
  { q: 'هل التطبيق مجاني للمواطنين؟', a: 'نعم، التطبيق مجاني تماماً للمواطنين. البحث عن الدواء ومعرفة حالة المرافق متاحان دون أي رسوم.' },
  { q: 'كيف أسجّل صيدليتي أو مرفقي؟', a: 'بعد إطلاق التطبيق، يمكنك التسجيل كصيدلاني أو إدارة مرفق عبر نموذج تسجيل خاص. يتم التحقق من البيانات لضمان المصداقية.' },
  { q: 'هل يعمل التطبيق بدون إنترنت؟', a: 'نعم، التطبيق يحفظ آخر حالة معروفة لكل مرفق وصيدلية، مع طابع زمني "آخر تحديث". عند عودة الاتصال، يتم تحديث البيانات تلقائياً.' },
  { q: 'كيف تضمنون دقة الأسعار والمخزون؟', a: 'الصيدلاني يحدّث مخزونه وأسعاره مباشرة من لوحة التحكم. كما يمكن للمواطنين الإبلاغ عن أخطاء الأسعار، ويتم التحقق منها.' },
  { q: 'ما هي مناطق التغطية؟', a: 'نبدأ بقطاع غزة، ونخطط للتوسع تدريجياً. الهدف هو تغطية كل المناطق التي تحتاج هذه الخدمة.' },
  { q: 'هل بياناتي الشخصية آمنة؟', a: 'نعم. لا نشارك بياناتك مع أي طرف ثالث. بياناتك مشفّرة وتستخدم فقط لتحسين تجربتك في البحث.' },
];

/**
 * FAQ — accordion with smooth expand/collapse.
 */
export default function FAQ() {
  const { ref, visible } = useReveal();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
            أسئلة شائعة
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            كل ما تريد <span className="text-gradient">معرفته</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className={`glass-card overflow-hidden reveal reveal-delay-${(i % 3) + 1} ${visible ? 'visible' : ''}`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full p-5 flex items-center justify-between text-right cursor-hover"
              >
                <span className="font-cairo font-bold text-base">{f.q}</span>
                <ChevronDown className={`w-5 h-5 text-brand-green-light transition-transform shrink-0 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 font-tajawal text-[var(--text-soft)] leading-relaxed">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
