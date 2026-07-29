import { Clock, MapPin, Pill, Search } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLang } from '@/lib/i18n';

/** Mini UI preview for each feature card */
function MiniPreview({ type, lang }: { type: string; lang: 'ar' | 'en' }) {
  if (type === 'search') {
    return (
      <div className="space-y-2">
        <div className="glass rounded-lg p-2 flex items-center gap-2">
          <Search className="w-3 h-3 text-brand-green-light" />
          <span className="text-xs text-[var(--text-muted)]">Augmentin 1g</span>
        </div>
        {[
          { n: lang === 'ar' ? 'صيدلية الرحمة' : 'Al-Rahma Pharmacy', p: '14 ₪', d: '850 م' },
          { n: lang === 'ar' ? 'صيدلية النور' : 'Al-Noor Pharmacy', p: '12 ₪', d: '1.2 كم' },
        ].map((r) => (
          <div key={r.n} className="glass rounded-lg p-2 flex items-center justify-between">
            <span className="text-xs font-tajawal">{r.n}</span>
            <div className="flex gap-2 text-xs">
              <span className="text-brand-green-light font-bold">{r.p}</span>
              <span className="text-[var(--text-muted)]">{r.d}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'status') {
    return (
      <div className="space-y-2">
        {[
          { n: lang === 'ar' ? 'مستشفى الشفاء' : 'Al-Shifa Hospital', s: lang === 'ar' ? 'مزدحم' : 'Busy', c: 'bg-status-busy/20 text-status-busy' },
          { n: lang === 'ar' ? 'عيادة الجلدية' : 'Dermatology Clinic', s: lang === 'ar' ? 'متاح' : 'Open', c: 'bg-status-open/20 text-status-open' },
          { n: lang === 'ar' ? 'نقطة طبية الشمال' : 'North Medical Point', s: lang === 'ar' ? 'طوارئ' : 'Emergency', c: 'bg-status-emergency/20 text-status-emergency' },
        ].map((r) => (
          <div key={r.n} className="glass rounded-lg p-2 flex items-center justify-between">
            <span className="text-xs font-tajawal">{r.n}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${r.c}`}>{r.s}</span>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'map') {
    return (
      <div className="relative h-32 rounded-lg bg-dark-3/50 border border-[var(--border-subtle)] overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:16px_16px] opacity-40" />
        <div className="map-pin bg-status-open" style={{ top: '20%', left: '25%', transform: 'rotate(-45deg) scale(0.7)' }} />
        <div className="map-pin bg-status-busy" style={{ top: '50%', left: '55%', transform: 'rotate(-45deg) scale(0.7)' }} />
        <div className="map-pin bg-status-emergency" style={{ top: '70%', left: '30%', transform: 'rotate(-45deg) scale(0.7)' }} />
        <div className="map-pin bg-status-open" style={{ top: '30%', left: '70%', transform: 'rotate(-45deg) scale(0.7)' }} />
      </div>
    );
  }
  return (
    <div className="glass rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-tajawal">{lang === 'ar' ? 'عيادة الجلدية' : 'Dermatology Clinic'}</span>
        <span className="text-xs text-status-open font-bold">{lang === 'ar' ? 'طبيعي' : 'Normal'}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{lang === 'ar' ? 'د. سامي خليل' : 'Dr. Sami Khalil'}</span>
        <span>{lang === 'ar' ? '5 منتظرين' : '5 waiting'}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">{lang === 'ar' ? 'متوقع الفراغ' : 'Est. clear'}</span>
        <span className="text-brand-green-light font-bold">~15 د</span>
      </div>
    </div>
  );
}

/**
 * Solution — futuristic dashboard showcase with 4 feature cards.
 */
export default function Solution() {
  const { ref, visible } = useReveal();
  const { t, lang } = useLang();

  const features = [
    {
      icon: Search,
      title: t('solution.1.title'),
      desc: t('solution.1.desc'),
      color: 'brand-green',
      preview: 'search',
    },
    {
      icon: Clock,
      title: t('solution.2.title'),
      desc: t('solution.2.desc'),
      color: 'brand-blue',
      preview: 'status',
    },
    {
      icon: MapPin,
      title: t('solution.3.title'),
      desc: t('solution.3.desc'),
      color: 'brand-green',
      preview: 'map',
    },
    {
      icon: Pill,
      title: lang === 'ar' ? 'وقت الانتظار للأقسام' : 'Department wait times',
      desc: lang === 'ar' ? 'تفاصيل دقيقة لكل قسم طبي: عدد حالات الانتظار، اسم الطبيب، والوقت المتوقع للفراغ.' : 'Precise details for each medical department: waiting cases, doctor name, and estimated clear time.',
      color: 'brand-blue',
      preview: 'wait',
    },
  ];

  return (
    <section id="solution" className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green/20 w-[500px] h-[500px] top-1/4 -right-40 animate-blob" />
        <div className="mesh-blob bg-brand-blue/20 w-[400px] h-[400px] bottom-0 -left-20 animate-blob" style={{ animationDelay: '3s' }} />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            {t('solution.title')}
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            {lang === 'ar' ? 'منصة واحدة.' : 'One platform.'}
            <span className="text-gradient"> {lang === 'ar' ? 'كل ما تحتاجه.' : 'Everything you need.'}</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            {t('solution.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`reveal reveal-delay-${(i % 2) + 1} ${visible ? 'visible' : ''}`}
            >
              <div className="glass-card p-6 lg:p-8 h-full light-sweep group hover:scale-[1.02] transition-transform duration-500 cursor-hover">
                <div className="grid sm:grid-cols-2 gap-6 items-center">
                  {/* Text */}
                  <div>
                    <div className={`w-12 h-12 rounded-xl bg-${f.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <f.icon className={`w-6 h-6 text-${f.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'}`} />
                    </div>
                    <h3 className="font-cairo font-bold text-xl mb-2">{f.title}</h3>
                    <p className="font-tajawal text-[var(--text-soft)] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                  {/* Mini preview */}
                  <div className="glass rounded-xl p-3">
                    <MiniPreview type={f.preview} lang={lang} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
