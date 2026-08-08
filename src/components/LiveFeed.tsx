import { useEffect, useState } from 'react';
import { Activity, Bell, Clock, Pill, Shield } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLang } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { PublicActivityFeed } from '@/lib/supabase';

/**
 * LiveFeed — subscribes to the public_activity_feed table via Supabase
 * Realtime. Only citizen-useful operational events appear (medicine
 * availability, facility status changes, wait-time drops). Administrative
 * and private actions are never written to that table, so they never appear.
 */
export default function LiveFeed() {
  const { ref, visible } = useReveal();
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [feed, setFeed] = useState<PublicActivityFeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadInitial = async () => {
      const { data } = await supabase
        .from('public_activity_feed')
        .select('id,event_type,message_ar,message_en,created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      if (active) {
        setFeed((data as PublicActivityFeed[] | null) ?? []);
        setLoading(false);
      }
    };
    loadInitial();

    const channel = supabase
      .channel('live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'public_activity_feed' },
        (payload) => {
          const row = payload.new as PublicActivityFeed;
          setFeed((prev) => [row, ...prev].slice(0, 8));
        },
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const icon = (type: PublicActivityFeed['event_type']) => {
    if (type === 'medicine_available') return Pill;
    if (type === 'facility_status') return Shield;
    return Activity;
  };

  const color = (type: PublicActivityFeed['event_type']) => {
    if (type === 'medicine_available') return 'status-open';
    if (type === 'facility_status') return 'brand-green';
    return 'brand-blue';
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isRTL ? 'الآن' : 'now';
    if (mins < 60) return isRTL ? `قبل ${mins} د` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isRTL ? `قبل ${hrs} س` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return isRTL ? `قبل ${days} يوم` : `${days}d ago`;
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            <span className="w-2 h-2 bg-status-open rounded-full status-pulse text-status-open" />
            {isRTL ? 'تغذية لحظية' : 'Live feed'}
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            {isRTL ? <>ما يحدث <span className="text-gradient">الآن</span></> : <>What's happening <span className="text-gradient">now</span></>}
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            {isRTL
              ? 'تحديثات لحظية من الصيدليات والمرافق — كل تغيير يصل فوراً لكل المستخدمين.'
              : 'Real-time updates from pharmacies and facilities — every change reaches all users instantly.'}
          </p>
        </div>

        <div className={`glass-card p-6 reveal ${visible ? 'visible' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-green-light" />
              <span className="font-cairo font-bold text-sm">{isRTL ? 'آخر التحديثات' : 'Latest updates'}</span>
            </div>
            <span className="text-xs font-tajawal text-[var(--text-muted)] flex items-center gap-1">
              <Clock className="w-3 h-3" /> {isRTL ? 'يتحدّث تلقائياً' : 'Auto-updates'}
            </span>
          </div>

          <div className="space-y-2 min-h-[120px]">
            {loading ? (
              <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">
                {isRTL ? 'جارٍ التحميل…' : 'Loading…'}
              </p>
            ) : feed.length === 0 ? (
              <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">
                {isRTL ? 'لا توجد تحديثات بعد' : 'No updates yet'}
              </p>
            ) : (
              feed.map((item, i) => {
                const Icon = icon(item.event_type);
                const c = color(item.event_type);
                return (
                  <div
                    key={item.id}
                    className={`glass rounded-xl p-3 flex items-center gap-3 ${i === 0 ? 'animate-slide-up' : ''}`}
                    style={i === 0 ? { opacity: 0, animationFillMode: 'forwards' } : undefined}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-${c}/20 flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 text-${c}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-tajawal font-bold">{isRTL ? item.message_ar : item.message_en}</div>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] font-tajawal shrink-0">{timeAgo(item.created_at)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
