import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, ArrowLeft, ChevronDown, Clock, MapPin, Navigation, Pill, Search,
  Shield, Star,
} from 'lucide-react';
import ParticleField from './ParticleField';
import { useLang } from '@/lib/i18n';
import { useLiveStats, useNearbyEntities, useMapPoints } from '@/hooks/useLiveStats';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function Hero() {
  const [time, setTime] = useState(new Date());
  const { t, lang } = useLang();
  const stats = useLiveStats();
  const nearby = useNearbyEntities();
  const mapPins = useMapPoints(6);

  const pinStyle = (p: { lat: number; lng: number }) => {
    const pts = mapPins.filter((mp) => mp.lat && mp.lng);
    if (pts.length === 0) return { top: '30%', left: '40%' };
    const lats = pts.map((mp) => mp.lat);
    const lngs = pts.map((mp) => mp.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latR = maxLat - minLat || 1;
    const lngR = maxLng - minLng || 1;
    return {
      top: `${10 + ((maxLat - p.lat) / latR) * 75}%`,
      left: `${8 + ((p.lng - minLng) / lngR) * 80}%`,
    };
  };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const statusLabel = (s: string, l: string) => {
    if (l === 'ar') return { open: 'متاح', busy: 'مزدحم', emergency: 'طوارئ', closed: 'مغلق' }[s] ?? s;
    return { open: 'Open', busy: 'Busy', emergency: 'Emergency', closed: 'Closed' }[s] ?? s;
  };

  const nearbyPreview = [
    ...nearby.facilities.map((f) => ({ name: f.name, status: f.status, dist: f.dist, icon: 'shield' as const })),
    ...nearby.pharmacies.map((p) => ({ name: p.name, status: p.status, dist: p.dist, icon: 'pill' as const })),
  ].slice(0, 4);

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-30" />
      <ParticleField count={35} />

      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green w-[500px] h-[500px] -top-40 -right-40 animate-blob" />
        <div className="mesh-blob bg-brand-blue w-[400px] h-[400px] bottom-0 -left-20 animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — Text */}
          <motion.div variants={container} initial="hidden" animate="show" className="text-center lg:text-right">
            <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <span className="w-2 h-2 bg-status-open rounded-full status-pulse" />
              <span className="text-sm font-tajawal text-[var(--text-soft)]">
                {lang === 'ar' ? 'منصة حية' : 'Live platform'} · {time.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>

            <motion.h1 variants={item} className="font-cairo font-black text-4xl sm:text-5xl lg:text-6xl leading-tight mb-4">
              {lang === 'ar' ? <>كل الدواء.<br />كل المرافق.<br /><span className="text-gradient">في مكان واحد.</span></> : <>All medicines.<br />All facilities.<br /><span className="text-gradient">in one place.</span></>}
            </motion.h1>

            <motion.p variants={item} className="text-lg font-tajawal text-[var(--text-soft)] mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {lang === 'ar'
                ? 'منصة تربط سكان غزة بالصيدليات والمستشفيات لحظياً لتوفير الوقت والجهد في الظروف الحرجة. نحن نراك. نحن معك. تحرك بثقة.'
                : 'A platform connecting Gaza residents with pharmacies and hospitals in real-time to save time and effort in critical conditions. We see you. We are with you. Move with confidence.'}
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <a href="#/auth" className="btn-primary inline-flex items-center gap-2 group">
                <span>{lang === 'ar' ? 'ابدأ الآن — أنشئ حسابك' : 'Get started — Create account'}</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </a>
              <a href="#problem" className="btn-secondary inline-flex items-center gap-2">
                <span>{lang === 'ar' ? 'اعرف أكثر' : 'Learn more'}</span>
                <ChevronDown className="w-5 h-5" />
              </a>
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-3 gap-4 mt-10 max-w-md mx-auto lg:mx-0">
              {[
                { v: `+${stats.pharmacyCount}`, l: lang === 'ar' ? 'صيدلية' : 'Pharmacies' },
                { v: `+${stats.facilityCount}`, l: lang === 'ar' ? 'مرفق طبي' : 'Facilities' },
                { v: '10s', l: lang === 'ar' ? 'لإيجاد الدواء' : 'To find medicine' },
              ].map((s) => (
                <div key={s.l} className="text-center lg:text-right">
                  <div className="counter text-2xl text-gradient-green">{s.v}</div>
                  <div className="text-xs font-tajawal text-[var(--text-muted)] mt-1">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-green-light" />
                  <span className="font-cairo font-bold text-sm">{lang === 'ar' ? 'لوحة دواء وشفاء' : 'Dawaa Panel'}</span>
                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-status-emergency" />
                  <span className="w-2 h-2 rounded-full bg-status-busy" />
                  <span className="w-2 h-2 rounded-full bg-status-open" />
                </div>
              </div>

              <div className="glass rounded-2xl p-3 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-green-light" />
                <span className="text-sm text-[var(--text-muted)] font-tajawal">{lang === 'ar' ? 'ابحث عن دواء...' : 'Search medicine...'}</span>
              </div>

              <div className="relative h-48 rounded-2xl bg-dark-3/60 border border-[var(--border-subtle)] overflow-hidden mb-4">
                <div className="absolute inset-0 bg-grid-pattern bg-[size:20px_20px] opacity-40" />
                {mapPins.filter((p) => p.lat && p.lng).slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className={`map-pin ${p.status === 'open' ? 'bg-status-open' : p.status === 'busy' ? 'bg-status-busy' : p.status === 'emergency' ? 'bg-status-emergency' : 'bg-status-closed'}`}
                    style={{ ...pinStyle(p), transform: 'scale(0.7)' }}
                  />
                ))}
                {mapPins.filter((p) => p.lat && p.lng).length === 0 && (
                  <>
                    <div className="map-pin bg-status-open" style={{ top: '20%', left: '30%' }} />
                    <div className="map-pin bg-status-busy" style={{ top: '50%', left: '60%' }} />
                    <div className="map-pin bg-status-emergency" style={{ top: '70%', left: '25%' }} />
                    <div className="map-pin bg-status-open" style={{ top: '35%', left: '75%' }} />
                  </>
                )}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-brand-green/10 to-transparent animate-scan" />
                </div>

                {/* Legend — solid dark background for maximum contrast */}
                <div className="absolute bottom-2 left-2 rounded-lg bg-slate-950/95 backdrop-blur-sm px-3 py-2.5 space-y-1.5 shadow-2xl border border-emerald-500/40">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-open" />
                    <span className="text-xs font-bold text-white">{lang === 'ar' ? 'متاح' : 'Open'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-busy" />
                    <span className="text-xs font-bold text-white">{lang === 'ar' ? 'مزدحم' : 'Busy'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-emergency" />
                    <span className="text-xs font-bold text-white">{lang === 'ar' ? 'طوارئ' : 'Emergency'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-closed" />
                    <span className="text-xs font-bold text-white">{lang === 'ar' ? 'مغلق' : 'Closed'}</span>
                  </div>
                </div>

                {/* Total count badge */}
                <div className="absolute bottom-2 right-2 rounded-lg bg-slate-950/95 backdrop-blur-sm px-3 py-1.5 shadow-2xl border border-emerald-500/40">
                  <span className="text-xs font-bold text-white">{stats.totalCount} {lang === 'ar' ? 'مرفق وصيدلية' : 'facilities'}</span>
                </div>

                {/* Navigation button */}
                <button
                  type="button"
                  aria-label={lang === 'ar' ? 'الاتجاهات' : 'Directions'}
                  className="absolute top-2 right-2 w-9 h-9 rounded-full bg-brand-green flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Navigation className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="space-y-2">
                {nearbyPreview.map((c) => (
                  <div key={c.name} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-green/20 flex items-center justify-center">
                      {c.icon === 'pill' ? <Pill className="w-4 h-4 text-brand-green-light" /> : <Shield className="w-4 h-4 text-brand-green-light" />}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm font-cairo font-bold">{c.name}</div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {c.dist || (lang === 'ar' ? 'غزة' : 'Gaza')}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${c.status === 'open' ? 'bg-status-open/20 text-status-open' : c.status === 'emergency' ? 'bg-status-emergency/20 text-status-emergency' : c.status === 'closed' ? 'bg-status-closed/20 text-status-closed' : 'bg-status-busy/20 text-status-busy'}`}>
                      {statusLabel(c.status, lang)}
                    </span>
                  </div>
                ))}
              </div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -top-6 -left-6 glass-card p-3"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-blue-light" />
                  <span className="text-xs font-tajawal">{lang === 'ar' ? 'وقت الانتظار: 15 د' : 'Wait: 15 min'}</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute -bottom-4 -right-4 glass-card p-3"
              >
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-status-busy fill-status-busy" />
                  <span className="text-xs font-tajawal">{lang === 'ar' ? '4.8 تقييم' : '4.8 rating'}</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="wave-container">
        <svg className="wave-svg" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60 L1440,120 L0,120 Z" fill="var(--bg-dark)" opacity="0.5" />
          <path d="M0,80 C240,40 480,120 720,80 C960,40 1200,120 1440,80 L1440,120 L0,120 Z" fill="var(--bg-dark)" />
        </svg>
      </div>
    </section>
  );
}
