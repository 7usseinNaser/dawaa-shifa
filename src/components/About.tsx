import { Code as Code2, Smartphone, Trophy, Cpu, Link2 } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLang } from '@/lib/i18n';

const badges = [
  { icon: Code2, label: 'Front-End 144h' },
  { icon: Smartphone, label: 'Flutter 40h' },
  { icon: Trophy, label: 'Software Engineer' },
  { icon: Cpu, label: 'AI Automation Specialist' },
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

          {/* Portrait */}
          <div className={`reveal ${visible ? 'visible' : ''} flex justify-center`}>
            <div className="relative">
              {/* Neon glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-green via-brand-blue to-brand-green blur-3xl opacity-40 animate-glow" />
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-brand-green/40 to-brand-blue/40 blur-2xl animate-pulse" />

              {/* Photo avatar */}
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-full overflow-hidden border-glow ring-4 ring-brand-green/30">
                <img
                  src="/hussein-photo.jpg"
                  alt={lang === 'ar' ? 'حسين محمد نصر' : 'Hussein Mohammed Nasr'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                {/* Fallback initial avatar (shown if photo missing) */}
                <div className="absolute inset-0 hidden flex-col items-center justify-center bg-gradient-to-br from-brand-green/25 to-brand-blue/25">
                  <div className="font-cairo font-black text-6xl lg:text-7xl text-gradient mb-2">{lang === 'ar' ? 'ح' : 'H'}</div>
                  <div className="font-inter text-xs text-[var(--text-muted)] tracking-widest">HUSSEIN NASR</div>
                </div>
              </div>

              {/* Floating tech tags */}
              <div className="absolute -top-4 -right-8 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '5s' }}>
                React Native
              </div>
              <div className="absolute -bottom-4 -left-8 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '7s', animationDelay: '1s' }}>
                Front-End
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

            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://7ussein.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-brand-green-light font-tajawal hover:underline"
              >
                7ussein.com
                <span className="text-[var(--text-muted)]">{lang === 'ar' ? '— الموقع الشخصي' : '— Personal website'}</span>
              </a>
              <a
                href="https://www.linkedin.com/in/hussein-naser-098a533a8"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#0A66C2]/20 hover:bg-[#0A66C2]/35 transition-colors"
              >
                <Link2 className="w-5 h-5 text-[#0A66C2]" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
