import { Clock, Heart, MapPin, Pill, Shield, TrendingDown, Users } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const metrics = [
  { icon: Clock, label: 'متوسط الوقت الموفر', value: '2.5 ساعة', desc: 'لكل بحث عن دواء', color: 'brand-green' },
  { icon: TrendingDown, label: 'تقليل التنقل', value: '-70%', desc: 'في رحلات غير ضرورية', color: 'brand-blue' },
  { icon: Pill, label: 'دقة المخزون', value: '95%', desc: 'تحديث لحظي', color: 'brand-green' },
  { icon: Users, label: 'المستفيدون', value: '500K+', desc: 'سكان غزة المحتملون', color: 'brand-blue' },
  { icon: Shield, label: 'موثوقية البيانات', value: '24/7', desc: 'مراقبة مستمرة', color: 'brand-green' },
  { icon: Heart, label: 'تأثير إنساني', value: 'حياة', desc: 'ما نسعى لإنقاذه', color: 'status-emergency' },
];

/**
 * ImpactMetrics — large impact numbers with icons and descriptions.
 */
export default function ImpactMetrics() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green/15 w-[500px] h-[500px] top-1/4 right-0" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            الأثر المتوقع
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            أرقام <span className="text-gradient">تصنع فرقاً</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`glass-card p-6 light-sweep cursor-hover reveal reveal-delay-${(i % 3) + 1} ${visible ? 'visible' : ''} group hover:scale-[1.03] transition-transform text-center`}
            >
              <div className={`w-12 h-12 rounded-xl bg-${m.color}/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                <m.icon className={`w-6 h-6 text-${m.color === 'brand-green' ? 'brand-green-light' : m.color === 'brand-blue' ? 'brand-blue-light' : m.color}`} />
              </div>
              <div className="counter text-3xl text-gradient-green mb-1">{m.value}</div>
              <div className="font-cairo font-bold text-sm">{m.label}</div>
              <div className="text-xs text-[var(--text-muted)] font-tajawal mt-1">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
