import { Cloud, Code2, Database, Map, Smartphone, Zap } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const stack = [
  { icon: Smartphone, name: 'React Native', desc: 'iOS + Android', color: 'brand-blue' },
  { icon: Database, name: 'Firebase', desc: 'Realtime Database', color: 'brand-green' },
  { icon: Map, name: 'OpenStreetMap', desc: '+ Leaflet', color: 'brand-blue' },
  { icon: Zap, name: 'Firebase Auth', desc: 'مصادقة سريعة', color: 'brand-green' },
  { icon: Cloud, name: 'Edge Functions', desc: 'تحديث لحظي', color: 'brand-blue' },
  { icon: Code2, name: 'TypeScript', desc: 'أمان الأنواع', color: 'brand-green' },
];

/**
 * TechStack — grid showing the technologies powering the platform.
 */
export default function TechStack() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            التقنيات
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            مبني على <span className="text-gradient">أساس قوي</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stack.map((t, i) => (
            <div
              key={t.name}
              className={`glass-card p-5 text-center light-sweep cursor-hover reveal reveal-delay-${(i % 3) + 1} ${visible ? 'visible' : ''} group hover:scale-[1.05] transition-transform`}
            >
              <div className={`w-12 h-12 rounded-xl bg-${t.color}/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <t.icon className={`w-6 h-6 text-${t.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'}`} />
              </div>
              <div className="font-cairo font-bold text-sm">{t.name}</div>
              <div className="text-xs text-[var(--text-muted)] font-tajawal mt-1">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
