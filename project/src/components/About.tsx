import { Code2, Heart, Smartphone, Trophy } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLang } from '@/lib/i18n';

const badges = [
  { icon: Code2, label: 'Front-End 144h' },
  { icon: Smartphone, label: 'Flutter 40h' },
  { icon: Trophy, label: 'WRO Palestine' },
  { icon: Heart, label: 'Top 10 AI Gaza' },
];

/**
 * About — elegant storytelling section about the founder.
 * Hussein Mohammed Nasr — young developer from Gaza.
 */
export default function About() {
  const { ref, visible } = useReveal();
  const { t, lang } = useLang();

  return (
    <section id="about" className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green/15 w-[500px] h-[500px] top-1/3 -left-40 animate-blob" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Portrait placeholder */}
          <div className={`reveal ${visible ? 'visible' : ''} flex justify-center`}>
            <div className="relative">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-green to-brand-blue blur-3xl opacity-30 animate-glow" />

              {/* Portrait circle */}
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-full glass-card flex items-center justify-center overflow-hidden border-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 to-brand-blue/20" />
                <div className="relative text-center">
                  <div className="font-cairo font-black text-6xl lg:text-7xl text-gradient mb-2">{lang === 'ar' ? 'ح' : 'H'}</div>
                  <div className="font-inter text-xs text-[var(--text-muted)] tracking-widest">HUSSEIN NASR</div>
                </div>
              </div>

              {/* Floating tech tags */}
              <div className="absolute -top-4 -right-8 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '5s' }}>
                React Native
              </div>
              <div className="absolute -bottom-4 -left-8 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '7s', animationDelay: '1s' }}>
                Firebase
              </div>
              <div className="absolute top-1/2 -left-12 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '6s', animationDelay: '2s' }}>
                Flutter
              </div>
            </div>
          </div>

          {/* Text */}
          <div className={`reveal reveal-delay-2 ${visible ? 'visible' : ''}`}>
            <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
              {t('about.title')}
            </span>

            <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
              {lang === 'ar' ? 'حسين محمد نصر' : 'Hussein Mohammed Nasr'}
              <br />
              <span className="text-gradient">{lang === 'ar' ? 'مطور شاب من غزة' : 'Young developer from Gaza'}</span>
            </h2>

            <blockquote className="glass-card p-6 my-6 text-lg font-tajawal text-[var(--text-soft)] leading-relaxed border-r-4 border-brand-green">
              {t('about.desc')}
            </blockquote>

            {/* Badges */}
            <div className="grid grid-cols-2 gap-3">
              {badges.map((b) => (
                <div key={b.label} className="glass rounded-xl p-3 flex items-center gap-3 light-sweep cursor-hover">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/20 flex items-center justify-center">
                    <b.icon className="w-5 h-5 text-brand-green-light" />
                  </div>
                  <span className="font-tajawal text-sm font-bold">{b.label}</span>
                </div>
              ))}
            </div>

            {/* Website link */}
            <a
              href="https://7ussein.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 text-brand-green-light font-tajawal hover:underline"
            >
              7ussein.com
              <span className="text-[var(--text-muted)]">{lang === 'ar' ? '— الموقع الشخصي' : '— Personal website'}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
