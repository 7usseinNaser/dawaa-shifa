import { useEffect, useRef, useState } from 'react';
import { Clock, MapPin, Pill, Shield, TrendingUp } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

/** Animated counter that counts up when visible */
function Counter({ to, suffix = '', duration = 2000 }: { to: number; suffix?: string; duration?: number }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, to, duration]);

  return <span ref={ref} className="counter text-4xl lg:text-5xl text-gradient-green">{val}{suffix}</span>;
}

/** Animated progress bar */
function ProgressBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!visible) setTimeout(() => setW(value), delay);
  }, [visible, value, delay]);

  return (
    <div ref={ref} className="h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
      <div className={`h-full rounded-full bg-${color} transition-all duration-1000 ease-out`} style={{ width: `${w}%` }} />
    </div>
  );
}

const stats = [
  { icon: Pill, label: 'صيدلية مسجلة', value: 150, suffix: '+', color: 'brand-green' },
  { icon: Shield, label: 'مرفق طبي', value: 40, suffix: '+', color: 'brand-blue' },
  { icon: MapPin, label: 'نقطة طبية', value: 25, suffix: '+', color: 'brand-green' },
  { icon: Clock, label: 'ثانية لإيجاد الدواء', value: 10, suffix: 's', color: 'brand-blue' },
];

const distribution = [
  { label: 'صيدليات متاحة الآن', value: 78, color: 'status-open' },
  { label: 'مرافق مزدحمة', value: 45, color: 'status-busy' },
  { label: 'مرافق في طوارئ', value: 12, color: 'status-emergency' },
  { label: 'مرافق مغلقة', value: 8, color: 'status-closed' },
];

/**
 * StatsDashboard — animated stats with counters and progress bars.
 */
export default function StatsDashboard() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-blue/15 w-[400px] h-[400px] bottom-0 left-0" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
            بالأرقام
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            تأثير <span className="text-gradient">حقيقي</span>
          </h2>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`glass-card p-6 text-center light-sweep cursor-hover reveal reveal-delay-${(i % 4) + 1} ${visible ? 'visible' : ''}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-${s.color}/20 flex items-center justify-center mx-auto mb-4`}>
                <s.icon className={`w-6 h-6 text-${s.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'}`} />
              </div>
              <Counter to={s.value} suffix={s.suffix} />
              <div className="text-sm font-tajawal text-[var(--text-soft)] mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Distribution bars */}
        <div className={`glass-card p-6 lg:p-8 reveal ${visible ? 'visible' : ''}`}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-brand-green-light" />
            <h3 className="font-cairo font-bold text-lg">توزيع الحالة الحالية</h3>
          </div>
          <div className="space-y-4">
            {distribution.map((d, i) => (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-tajawal text-[var(--text-soft)]">{d.label}</span>
                  <span className="text-sm font-inter font-bold text-[var(--text-main)]">{d.value}%</span>
                </div>
                <ProgressBar value={d.value} color={d.color} delay={i * 150} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
