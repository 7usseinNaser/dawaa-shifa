import { Search, Activity, Navigation } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLang } from '@/lib/i18n';

/**
 * HowItWorks — 3-step visual timeline with connected animated lines.
 */
export default function HowItWorks() {
  const { ref, visible } = useReveal();
  const { t, lang } = useLang();

  const steps = [
    {
      n: '01',
      icon: Search,
      title: t('how.step1'),
      desc: t('how.step1Desc'),
      color: 'brand-green',
    },
    {
      n: '02',
      icon: Activity,
      title: t('how.step2'),
      desc: t('how.step2Desc'),
      color: 'brand-blue',
    },
    {
      n: '03',
      icon: Navigation,
      title: t('how.step3'),
      desc: t('how.step3Desc'),
      color: 'brand-green',
    },
  ];

  return (
    <section id="how" className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            {t('how.title')}
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            {lang === 'ar' ? 'ثلاث خطوات. ' : 'Three steps. '}<span className="text-gradient">{lang === 'ar' ? 'نتيجة فورية.' : 'Instant result.'}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-20 right-[16%] left-[16%] h-px bg-gradient-to-l from-brand-green via-brand-blue to-brand-green opacity-30" />

          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`reveal reveal-delay-${i + 1} ${visible ? 'visible' : ''} relative text-center`}
            >
              {/* Glowing number */}
              <div className="relative inline-block mb-6">
                <div className={`w-20 h-20 rounded-full glass-card flex items-center justify-center mx-auto group hover:scale-110 transition-transform cursor-hover`}>
                  <s.icon className={`w-8 h-8 text-${s.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'}`} />
                </div>
                <span className={`absolute -top-2 -right-2 counter text-sm text-${s.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'} opacity-50`}>
                  {s.n}
                </span>
              </div>

              <h3 className="font-cairo font-bold text-xl mb-3">{s.title}</h3>
              <p className="font-tajawal text-[var(--text-soft)] leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
