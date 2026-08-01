import { Building2, MapPin, Pill, Shield, Users } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLiveStats } from '@/hooks/useLiveStats';
import { useLang } from '@/lib/i18n';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-status-open',
  busy: 'bg-status-busy',
  emergency: 'bg-status-emergency',
  closed: 'bg-status-closed',
};

/**
 * ImpactMetrics — live counts pulled from the database with a realtime
 * status distribution bar.
 */
export default function ImpactMetrics() {
  const { ref, visible } = useReveal();
  const stats = useLiveStats();
  const { lang } = useLang();
  const isRTL = lang === 'ar';

  const total = stats.statusDist.open + stats.statusDist.busy + stats.statusDist.emergency + stats.statusDist.closed || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const dist = [
    { key: 'open', label: isRTL ? 'متاحة' : 'Available', count: stats.statusDist.open },
    { key: 'busy', label: isRTL ? 'مزدحمة' : 'Busy', count: stats.statusDist.busy },
    { key: 'emergency', label: isRTL ? 'طوارئ' : 'Emergency', count: stats.statusDist.emergency },
    { key: 'closed', label: isRTL ? 'مغلقة' : 'Closed', count: stats.statusDist.closed },
  ];

  const metrics = [
    { icon: Pill, value: stats.pharmacyCount.toString(), label: isRTL ? 'صيدلية مرتبطة' : 'Linked Pharmacies', desc: isRTL ? 'بيانات لحظية' : 'Real-time data' },
    { icon: Building2, value: stats.facilityCount.toString(), label: isRTL ? 'مرفق طبي' : 'Medical Facilities', desc: isRTL ? 'مستشفيات وعيادات' : 'Hospitals & clinics' },
    { icon: MapPin, value: stats.medicalPointCount.toString(), label: isRTL ? 'نقطة طبية' : 'Medical Points', desc: isRTL ? 'نقاط انتشار' : 'Spread points' },
    { icon: Users, value: stats.userCount.toString(), label: isRTL ? 'مستخدم مسجل' : 'Registered Users', desc: isRTL ? 'حسابات حقيقية' : 'Real accounts' },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green/15 w-[500px] h-[500px] top-1/4 right-0" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            {isRTL ? <>تأثير <span className="text-gradient">حقيقي</span></> : <>Real <span className="text-gradient">Impact</span></>}
          </h2>
        </div>

        {/* Live counter cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`glass-card p-6 light-sweep cursor-hover reveal reveal-delay-${(i % 3) + 1} ${visible ? 'visible' : ''} group hover:scale-[1.03] transition-transform text-center`}
            >
              <div className="w-12 h-12 rounded-xl bg-brand-green/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <m.icon className="w-6 h-6 text-brand-green-light" />
              </div>
              <div className="counter text-3xl text-gradient-green mb-1">{m.value}</div>
              <div className="font-cairo font-bold text-sm">{m.label}</div>
              <div className="text-xs text-[var(--text-muted)] font-tajawal mt-1">{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Live status distribution bar */}
        <div className={`glass-card p-6 reveal ${visible ? 'visible' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cairo font-bold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-green-light" />
              {isRTL ? 'توزيع الحالة الحالية' : 'Current Status Distribution'}
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-tajawal flex items-center gap-1.5">
              <span className="w-2 h-2 bg-status-open rounded-full status-pulse" />
              {isRTL ? 'محدّث لحظياً' : 'Live'}
            </span>
          </div>

          <div className="flex h-4 rounded-full overflow-hidden bg-dark-3/50">
            {dist.map((d) => d.count > 0 && (
              <div
                key={d.key}
                className={`${STATUS_COLORS[d.key]} transition-all duration-700`}
                style={{ width: `${pct(d.count)}%` }}
                title={`${d.label}: ${d.count}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {dist.map((d) => (
              <div key={d.key} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[d.key]}`} />
                <span className="text-xs font-tajawal text-[var(--text-soft)]">{d.label}</span>
                <span className="text-xs font-cairo font-bold mr-auto">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
