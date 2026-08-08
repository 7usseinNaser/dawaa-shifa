import { TriangleAlert as AlertTriangle, Clock, Pill } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLang } from '@/lib/i18n';

/**
 * Problem — dark dramatic storytelling with 3 animated cards.
 */
export default function Problem() {
  const { ref, visible } = useReveal();
  const { t, lang } = useLang();

  const problems = [
    {
      icon: Pill,
      title: t('problem.1.title'),
      desc: t('problem.1.desc'),
      color: 'status-busy',
    },
    {
      icon: AlertTriangle,
      title: t('problem.2.title'),
      desc: t('problem.2.desc'),
      color: 'status-emergency',
    },
    {
      icon: Clock,
      title: t('problem.3.title'),
      desc: t('problem.3.desc'),
      color: 'status-closed',
    },
  ];

  return (
    <section id="problem" className="relative py-24 overflow-hidden">
      {/* Dark medical grid background */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-20" />
      <div className="mesh-gradient">
        <div className="mesh-blob bg-status-emergency/30 w-[400px] h-[400px] top-0 left-1/4" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className={`text-center mb-16 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-status-emergency mb-4">
            {t('problem.title')}
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            {lang === 'ar' ? 'البحث العشوائي عن العلاج' : 'Random search for medicine'}
            <br />
            <span className="text-gradient">{lang === 'ar' ? 'قد يكلف حياة.' : 'Can cost a life.'}</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            {t('problem.subtitle')}
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className={`reveal reveal-delay-${i + 1} ${visible ? 'visible' : ''}`}
            >
              <div className="glass-card p-8 h-full light-sweep group hover:scale-[1.02] transition-transform duration-500 cursor-hover">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-${p.color}/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <p.icon className={`w-7 h-7 text-${p.color}`} />
                </div>

                <h3 className="font-cairo font-bold text-xl mb-3">{p.title}</h3>
                <p className="font-tajawal text-[var(--text-soft)] leading-relaxed">{p.desc}</p>

                {/* Glowing bottom border */}
                <div className={`mt-6 h-px bg-gradient-to-l from-${p.color} to-transparent`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
