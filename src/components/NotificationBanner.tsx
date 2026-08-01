import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'emergency';
  max_views_per_user: number | null;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const typeConfig = {
  info: { icon: Info, color: 'brand-blue', bgClass: 'bg-brand-blue/15', borderClass: 'border-brand-blue/40', textClass: 'text-brand-blue-light' },
  warning: { icon: AlertTriangle, color: 'amber-400', bgClass: 'bg-amber-500/15', borderClass: 'border-amber-500/40', textClass: 'text-amber-300' },
  emergency: { icon: ShieldAlert, color: 'status-emergency', bgClass: 'bg-status-emergency/15', borderClass: 'border-status-emergency/40', textClass: 'text-status-emergency' },
};

export default function NotificationBanner() {
  const { user } = useAuth();
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [visibleNotifs, setVisibleNotifs] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchAndFilter = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch active, non-expired notifications
      const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('id, title, content, type, max_views_per_user')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifError || !notifs) return;

      // Fetch this user's view records
      const { data: views } = await supabase
        .from('user_notification_views')
        .select('notification_id, view_count, is_dismissed')
        .eq('user_id', user.id);

      const viewMap = new Map<string, { view_count: number; is_dismissed: boolean }>();
      (views || []).forEach((v) => {
        viewMap.set(v.notification_id, { view_count: v.view_count, is_dismissed: v.is_dismissed });
      });

      const toShow: Notification[] = [];
      for (const n of notifs as Notification[]) {
        const view = viewMap.get(n.id);
        if (view?.is_dismissed) continue;
        if (n.max_views_per_user !== null && n.max_views_per_user > 0) {
          if (view && view.view_count >= n.max_views_per_user) continue;
        }
        toShow.push(n);
      }
      setVisibleNotifs(toShow);

      // Increment view counts for shown notifications
      for (const n of toShow) {
        const existing = viewMap.get(n.id);
        if (existing) {
          await supabase
            .from('user_notification_views')
            .update({ view_count: existing.view_count + 1, last_viewed_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('notification_id', n.id);
        } else {
          await supabase
            .from('user_notification_views')
            .insert({ user_id: user.id, notification_id: n.id, view_count: 1, is_dismissed: false });
        }
      }
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchAndFilter();
  }, [fetchAndFilter]);

  const handleDismiss = async (notifId: string) => {
    setDismissed((prev) => new Set(prev).add(notifId));
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('user_notification_views')
        .select('id')
        .eq('user_id', user.id)
        .eq('notification_id', notifId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_notification_views')
          .update({ is_dismissed: true, last_viewed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('notification_id', notifId);
      } else {
        await supabase
          .from('user_notification_views')
          .insert({ user_id: user.id, notification_id: notifId, view_count: 1, is_dismissed: true });
      }
    } catch { /* ignore */ }
  };

  const active = visibleNotifs.filter((n) => !dismissed.has(n.id));
  if (active.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 space-y-2">
      <AnimatePresence>
        {active.map((n) => {
          const cfg = typeConfig[n.type] || typeConfig.info;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE } }}
              exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.25 } }}
              className={`glass-card border-2 ${cfg.borderClass} ${cfg.bgClass} p-4 flex items-start gap-3 shadow-lg`}
            >
              <div className={`shrink-0 w-10 h-10 rounded-xl ${cfg.bgClass} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${cfg.textClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-cairo font-bold text-sm text-[var(--text-main)] mb-0.5">{n.title}</h4>
                <p className="text-sm font-tajawal text-[var(--text-soft)] leading-relaxed">{n.content}</p>
              </div>
              <button
                onClick={() => handleDismiss(n.id)}
                className="shrink-0 p-1.5 rounded-lg glass hover:bg-white/10 transition-colors"
                aria-label={isRTL ? 'فهمت' : 'Got it'}
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
