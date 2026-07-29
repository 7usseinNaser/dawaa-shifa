import { ArrowLeft, Clock, MapPin, Pill, Search, Star } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

/**
 * AppPreview — animated mobile mockups showing key app screens.
 * Phones float, rotate slightly, have shadows and glow.
 */
export default function AppPreview() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            معاينة التطبيق
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            تطبيق <span className="text-gradient">في جيبك</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            مصمم ليكون سريعاً وواضحاً — لأن كل ثانية تهم.
          </p>
        </div>

        {/* Phone mockups */}
        <div className="flex flex-wrap justify-center gap-8 lg:gap-12 items-end">
          {/* Phone 1 — Medicine Search */}
          <div className="phone-mockup animate-float" style={{ animationDuration: '7s', transform: 'rotate(-3deg)' }}>
            <div className="phone-screen p-4 pt-12">
              <div className="text-center mb-4">
                <div className="font-cairo font-bold text-sm">بحث الدواء</div>
              </div>
              <div className="glass rounded-xl p-2 flex items-center gap-2 mb-3">
                <Search className="w-3 h-3 text-brand-green-light" />
                <span className="text-xs text-[var(--text-muted)]">Augmentin 1g</span>
              </div>
              <div className="space-y-2">
                {[
                  { n: 'صيدلية الرحمة', p: '14 ₪', d: '850 م', s: 'open' },
                  { n: 'صيدلية النور', p: '12 ₪', d: '1.2 كم', s: 'open' },
                  { n: 'صيدلية الشفاء', p: '15 ₪', d: '2 كم', s: 'busy' },
                ].map((r) => (
                  <div key={r.n} className="glass rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-cairo font-bold">{r.n}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.s === 'open' ? 'bg-status-open/20 text-status-open' : 'bg-status-busy/20 text-status-busy'}`}>
                        {r.s === 'open' ? 'متاح' : 'مزدحم'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-green-light font-bold">{r.p}</span>
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {r.d}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phone 2 — Map (center, elevated) */}
          <div className="phone-mockup animate-float glow-green" style={{ animationDuration: '6s', transform: 'rotate(2deg) translateY(-20px)' }}>
            <div className="phone-screen p-4 pt-12">
              <div className="text-center mb-3">
                <div className="font-cairo font-bold text-sm">الخريطة الموحدة</div>
              </div>
              <div className="relative h-48 rounded-xl bg-dark-3/50 border border-[var(--border-subtle)] overflow-hidden mb-3">
                <div className="absolute inset-0 bg-grid-pattern bg-[size:16px_16px] opacity-40" />
                <div className="map-pin bg-status-open" style={{ top: '20%', left: '25%', transform: 'rotate(-45deg) scale(0.6)' }} />
                <div className="map-pin bg-status-busy" style={{ top: '50%', left: '55%', transform: 'rotate(-45deg) scale(0.6)' }} />
                <div className="map-pin bg-status-emergency" style={{ top: '70%', left: '30%', transform: 'rotate(-45deg) scale(0.6)' }} />
                <div className="map-pin bg-status-open" style={{ top: '35%', left: '70%', transform: 'rotate(-45deg) scale(0.6)' }} />
              </div>
              <div className="glass rounded-xl p-2.5">
                <div className="text-xs font-cairo font-bold mb-1">12 مرفق ضمن 2 كم</div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-status-open" />
                  <span className="w-2 h-2 rounded-full bg-status-busy" />
                  <span className="w-2 h-2 rounded-full bg-status-emergency" />
                  <span className="w-2 h-2 rounded-full bg-status-closed" />
                </div>
              </div>
            </div>
          </div>

          {/* Phone 3 — Hospital Status */}
          <div className="phone-mockup animate-float" style={{ animationDuration: '8s', animationDelay: '1s', transform: 'rotate(-2deg)' }}>
            <div className="phone-screen p-4 pt-12">
              <div className="text-center mb-3">
                <div className="font-cairo font-bold text-sm">حالة المستشفى</div>
              </div>
              <div className="glass rounded-xl p-3 mb-3 bg-status-busy/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-cairo font-bold">مستشفى الشفاء</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-status-busy/20 text-status-busy font-bold">مزدحم</span>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { n: 'الباطنية', w: '23', t: '~45 د', s: 'busy' },
                  { n: 'الجلدية', w: '5', t: '~15 د', s: 'open' },
                  { n: 'الطوارئ', w: '40+', t: 'طوارئ', s: 'emergency' },
                ].map((d) => (
                  <div key={d.n} className="glass rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-cairo font-bold">{d.n}</span>
                      <span className={`w-2 h-2 rounded-full ${d.s === 'open' ? 'bg-status-open' : d.s === 'busy' ? 'bg-status-busy' : 'bg-status-emergency'}`} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {d.w} منتظر
                      </span>
                      <span className="text-brand-green-light font-bold">{d.t}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button className="btn-primary inline-flex items-center gap-2 group">
            <span>تحميل التطبيق (قريباً)</span>
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
