import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Pill, Shield } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { PublicActivityFeed } from '@/lib/supabase';

const iconFor = (type: PublicActivityFeed['event_type']) => {
  if (type === 'medicine_available') return Pill;
  if (type === 'facility_status') return Shield;
  return Activity;
};

const colorFor = (type: PublicActivityFeed['event_type']) => {
  if (type === 'medicine_available') return 'text-status-open';
  if (type === 'facility_status') return 'text-brand-green-light';
  return 'text-brand-blue-light';
};

/**
 * LiveFeedStrip — compact horizontal ticker of the latest 4 public events.
 * Designed to sit inside the Impact section as a thin strip, not a full section.
 */
export default function LiveFeedStrip() {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [feed, setFeed] = useState<PublicActivityFeed[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('public_activity_feed')
        .select('id,event_type,message_ar,message_en,created_at')
        .order('created_at', { ascending: false })
        .limit(4);
      if (active) setFeed((data as PublicActivityFeed[] | null) ?? []);
    };
    load();

    const channel = supabase
      .channel('live-feed-strip')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'public_activity_feed' },
        (payload) => {
          const row = payload.new as PublicActivityFeed;
          setFeed((prev) => [row, ...prev].slice(0, 4));
        },
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  if (feed.length === 0) return null;

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-16">
      <div className="glass-card p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 bg-status-open rounded-full status-pulse" />
          <span className="text-xs font-tajawal font-bold text-brand-green-light">
            {isRTL ? 'تحديثات لحظية' : 'Live updates'}
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          <AnimatePresence initial={false}>
            {feed.map((item) => {
              const Icon = iconFor(item.event_type);
              const color = colorFor(item.event_type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="glass rounded-xl p-3 flex items-center gap-2 shrink-0 min-w-[200px]"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-xs font-tajawal text-[var(--text-soft)] line-clamp-1">
                    {isRTL ? item.message_ar : item.message_en}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
