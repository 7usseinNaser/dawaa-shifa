import { ArrowLeft, Clock, MapPin, Search } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useMedicinePreviews, useMapPoints, useFacilityPreview } from '@/hooks/useLiveStats';
import { useLang } from '@/lib/i18n';
import { to12Hour, autoCloseStatus } from '@/lib/timeUtils';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-status-open',
  busy: 'bg-status-busy',
  emergency: 'bg-status-emergency',
  closed: 'bg-status-closed',
};

const statusLabel = (s: string, isRTL: boolean) => {
  if (isRTL) return { open: 'متاح', busy: 'مزدحم', emergency: 'طوارئ', closed: 'مغلق' }[s] ?? s;
  return { open: 'Open', busy: 'Busy', emergency: 'Emergency', closed: 'Closed' }[s] ?? s;
};

/**
 * AppPreview — animated mobile mockups showing real data from the database.
 * Medicine search, unified map, and hospital status — all live.
 */
export default function AppPreview() {
  const { ref, visible } = useReveal();
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const medicines = useMedicinePreviews(4);
  const mapPoints = useMapPoints(8);
  const facility = useFacilityPreview();

  // Normalize map coordinates to the 0-100% box for the mockup
  const points = mapPoints.filter((p) => p.lat && p.lng);
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;
  const pinPos = (p: { lat: number; lng: number }) => ({
    top: `${15 + ((maxLat - p.lat) / latRange) * 65}%`,
    left: `${10 + ((p.lng - minLng) / lngRange) * 75}%`,
  });

  const openCount = points.filter((p) => p.status === 'open').length;

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            {isRTL ? 'معاينة التطبيق' : 'App preview'}
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            {isRTL ? <>تطبيق <span className="text-gradient">في جيبك</span></> : <>An app <span className="text-gradient">in your pocket</span></>}
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            {isRTL ? 'مصمم ليكون سريعاً وواضحاً — لأن كل ثانية تهم.' : 'Designed to be fast and clear — because every second matters.'}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 lg:gap-12 items-end">
          {/* Phone 1 — Medicine Search (live) */}
          <div className="phone-mockup animate-float" style={{ animationDuration: '7s', transform: 'rotate(-3deg)' }}>
            <div className="phone-screen p-4 pt-12">
              <div className="text-center mb-4">
                <div className="font-cairo font-bold text-sm">{isRTL ? 'بحث الدواء' : 'Medicine search'}</div>
              </div>
              <div className="glass rounded-xl p-2 flex items-center gap-2 mb-3">
                <Search className="w-3 h-3 text-brand-green-light" />
                <span className="text-xs text-[var(--text-muted)]">{medicines[0]?.medicine_name ?? 'Augmentin 1g'}</span>
              </div>
              <div className="space-y-2">
                {medicines.length === 0 ? (
                  [0, 1, 2].map((i) => <div key={i} className="glass rounded-xl p-2.5 h-14 animate-pulse" />)
                ) : medicines.slice(0, 3).map((m) => (
                  <div key={m.medicine_name + m.pharmacy_name} className="glass rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-cairo font-bold truncate">{m.pharmacy_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${m.status === 'open' ? 'bg-status-open/20 text-status-open' : 'bg-status-busy/20 text-status-busy'}`}>
                        {statusLabel(m.status, isRTL)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-green-light font-bold">{m.price.toFixed(0)} ₪</span>
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {isRTL ? 'غزة' : 'Gaza'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phone 2 — Map (center, elevated, live pins) */}
          <div className="phone-mockup animate-float glow-green" style={{ animationDuration: '6s', transform: 'rotate(2deg) translateY(-20px)' }}>
            <div className="phone-screen p-4 pt-12">
              <div className="text-center mb-3">
                <div className="font-cairo font-bold text-sm">{isRTL ? 'الخريطة الموحدة' : 'Unified map'}</div>
              </div>
              <div className="relative h-48 rounded-xl bg-dark-3/50 border border-[var(--border-subtle)] overflow-hidden mb-3">
                <div className="absolute inset-0 bg-grid-pattern bg-[size:16px_16px] opacity-40" />
                {points.length === 0 ? (
                  <>
                    <div className="map-pin bg-status-open" style={{ top: '20%', left: '25%', transform: 'rotate(-45deg) scale(0.6)' }} />
                    <div className="map-pin bg-status-busy" style={{ top: '50%', left: '55%', transform: 'rotate(-45deg) scale(0.6)' }} />
                    <div className="map-pin bg-status-emergency" style={{ top: '70%', left: '30%', transform: 'rotate(-45deg) scale(0.6)' }} />
                    <div className="map-pin bg-status-open" style={{ top: '35%', left: '70%', transform: 'rotate(-45deg) scale(0.6)' }} />
                  </>
                ) : points.slice(0, 6).map((p) => (
                  <div key={p.id} className={`map-pin ${STATUS_COLORS[p.status]}`} style={{ ...pinPos(p), transform: 'rotate(-45deg) scale(0.6)' }} />
                ))}
              </div>
              <div className="glass rounded-xl p-2.5">
                <div className="text-xs font-cairo font-bold mb-1">{points.length} {isRTL ? 'مرفق على الخريطة' : 'facilities on map'}</div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-status-open" />
                  <span className="w-2 h-2 rounded-full bg-status-busy" />
                  <span className="w-2 h-2 rounded-full bg-status-emergency" />
                  <span className="w-2 h-2 rounded-full bg-status-closed" />
                </div>
              </div>
            </div>
          </div>

          {/* Phone 3 — Hospital Status (live) */}
          <div className="phone-mockup animate-float" style={{ animationDuration: '8s', animationDelay: '1s', transform: 'rotate(-2deg)' }}>
            <div className="phone-screen p-4 pt-12">
              <div className="text-center mb-3">
                <div className="font-cairo font-bold text-sm">{isRTL ? 'حالة المستشفى' : 'Hospital status'}</div>
              </div>
              {facility ? (
                <>
                  <div className={`glass rounded-xl p-3 mb-3 ${facility.overall_status === 'busy' ? 'bg-status-busy/10' : facility.overall_status === 'emergency' ? 'bg-status-emergency/10' : facility.overall_status === 'closed' ? 'bg-status-closed/10' : 'bg-status-open/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-cairo font-bold truncate">{facility.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${facility.overall_status === 'open' ? 'bg-status-open/20 text-status-open' : facility.overall_status === 'busy' ? 'bg-status-busy/20 text-status-busy' : facility.overall_status === 'emergency' ? 'bg-status-emergency/20 text-status-emergency' : 'bg-status-closed/20 text-status-closed'}`}>
                        {statusLabel(facility.overall_status, isRTL)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(facility.departments.length ? facility.departments : []).map((d) => (
                      <div key={d.name} className="glass rounded-xl p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-cairo font-bold">{d.name}</span>
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[d.status] ?? 'bg-status-open'}`} />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {d.waiting_count} {isRTL ? 'منتظر' : 'waiting'}
                          </span>
                          <span className="text-brand-green-light font-bold">{d.estimated_clear_time || (isRTL ? '—' : '—')}</span>
                        </div>
                        {(() => {
                          const queue = (d as unknown as Record<string, number>).current_queue_count ?? d.waiting_count;
                          const serviceTime = (d as unknown as Record<string, number>).avg_service_time_minutes ?? 15;
                          const waitMin = queue * serviceTime;
                          const level = queue === 0 ? 'none' : waitMin < 15 ? 'green' : waitMin <= 45 ? 'yellow' : 'red';
                          const cls: Record<string, string> = {
                            green: 'text-status-open',
                            yellow: 'text-amber-400',
                            red: 'text-status-emergency',
                            none: 'text-status-open',
                          };
                          return (
                            <div className={`text-[10px] font-bold mt-1 ${cls[level]}`}>
                              {queue === 0 ? (isRTL ? 'دخول مباشر' : 'Direct entry') : (isRTL ? `${waitMin} دقيقة` : `${waitMin} min`)}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                    {facility.departments.length === 0 && (
                      <p className="text-xs text-[var(--text-muted)] font-tajawal text-center py-2">{isRTL ? 'لا أقسام مسجلة' : 'No departments'}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="glass rounded-xl p-3 h-32 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button className="btn-primary inline-flex items-center gap-2 group">
            <span>{isRTL ? 'تحميل التطبيق (قريباً)' : 'Download app (soon)'}</span>
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
