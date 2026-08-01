import { Check, Circle } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const phases = [
  {
    title: 'المرحلة الأولى — MVP',
    status: 'done',
    items: [
      'بحث الدواء + قائمة الصيدليات',
      'عرض المرافق وحالتها الأساسية',
      'الخريطة الأساسية',
      'تسجيل الصيدليات والمرافق',
    ],
  },
  {
    title: 'المرحلة الثانية',
    status: 'next',
    items: [
      'حالة الأقسام التفصيلية (انتظار + وقت متوقع)',
      'الإشعارات الذكية (دواء توفر / مرفق متاح)',
      'تقييم الصيدليات',
    ],
  },
  {
    title: 'المرحلة الثالثة',
    status: 'future',
    items: [
      'اسم الطبيب وحالته',
      'إحصائيات الازدحام التاريخية',
      'لوحة تحكم للتحقق من المزودين',
    ],
  },
];

/**
 * Roadmap — 3-phase development timeline.
 */
export default function Roadmap() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
            خارطة الطريق
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            من أين <span className="text-gradient">بدأنا — إلى أين</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {phases.map((p, i) => (
            <div
              key={p.title}
              className={`reveal reveal-delay-${i + 1} ${visible ? 'visible' : ''}`}
            >
              <div className={`glass-card p-6 h-full ${p.status === 'done' ? 'border-glow' : ''}`}>
                {/* Status badge */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-cairo font-bold text-lg">{p.title}</h3>
                  {p.status === 'done' ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-status-open/20 text-status-open font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> منجز
                    </span>
                  ) : p.status === 'next' ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-status-busy/20 text-status-busy font-bold flex items-center gap-1">
                      <Circle className="w-3 h-3 fill-current" /> قريباً
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--glass)] text-[var(--text-muted)] font-bold">
                      مستقبلاً
                    </span>
                  )}
                </div>

                {/* Items */}
                <ul className="space-y-3">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 font-tajawal text-sm text-[var(--text-soft)]">
                      {p.status === 'done' ? (
                        <Check className="w-4 h-4 text-status-open mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                      )}
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
