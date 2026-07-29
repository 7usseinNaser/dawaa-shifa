import { Check, X } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const rows = [
  { feature: 'معرفة توفر الدواء قبل التحرك', old: false, new: true },
  { feature: 'معرفة حالة المرفق لحظياً', old: false, new: true },
  { feature: 'الأسعار المعروضة مسبقاً', old: false, new: true },
  { feature: 'خريطة موحدة لكل المرافق', old: false, new: true },
  { feature: 'وقت الانتظار المتوقع', old: false, new: true },
  { feature: 'إشعارات ذكية عند التوفر', old: false, new: true },
  { feature: 'التنقل بين صيدليات متعددة', old: true, new: false },
  { feature: 'عدم معرفة حالة المستشفى', old: true, new: false },
  { feature: 'تضييع ساعات في البحث', old: true, new: false },
];

/**
 * Comparison — before vs after table showing the platform's impact.
 */
export default function Comparison() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            الفرق
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            قبل وبعد <span className="text-gradient">دواء وشفاء</span>
          </h2>
        </div>

        <div className={`glass-card overflow-hidden reveal ${visible ? 'visible' : ''}`}>
          {/* Header */}
          <div className="grid grid-cols-3 border-b border-[var(--border-subtle)]">
            <div className="p-4 font-cairo font-bold text-sm text-[var(--text-muted)]">الميزة</div>
            <div className="p-4 text-center font-cairo font-bold text-sm text-status-closed">بدون المنصة</div>
            <div className="p-4 text-center font-cairo font-bold text-sm text-brand-green-light">مع المنصة</div>
          </div>

          {/* Rows */}
          {rows.map((r, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 items-center ${i % 2 === 0 ? 'bg-[var(--glass)]' : ''}`}
            >
              <div className="p-4 font-tajawal text-sm text-[var(--text-soft)]">{r.feature}</div>
              <div className="p-4 flex justify-center">
                {r.old ? (
                  <div className="w-7 h-7 rounded-full bg-status-closed/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-status-closed" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--border-subtle)] flex items-center justify-center">
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
              <div className="p-4 flex justify-center">
                {r.new ? (
                  <div className="w-7 h-7 rounded-full bg-status-open/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-status-open" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--border-subtle)] flex items-center justify-center">
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
