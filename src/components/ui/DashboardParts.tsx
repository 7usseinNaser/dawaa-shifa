import { motion } from 'framer-motion';
import { Activity, Clock, AlertTriangle, CheckCircle, type LucideIcon } from 'lucide-react';
import { useLang } from '@/lib/i18n';

const statusConfig: Record<string, { ar: string; en: string; cls: string; dot: string }> = {
  open: { ar: 'متاح', en: 'Available', cls: 'bg-status-open/20 text-status-open', dot: 'bg-status-open' },
  busy: { ar: 'مزدحم', en: 'Busy', cls: 'bg-status-busy/20 text-status-busy', dot: 'bg-status-busy' },
  emergency: { ar: 'طوارئ', en: 'Emergency', cls: 'bg-status-emergency/20 text-status-emergency', dot: 'bg-status-emergency' },
  closed: { ar: 'مغلق', en: 'Closed', cls: 'bg-status-closed/20 text-status-closed', dot: 'bg-status-closed' },
};

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const { lang } = useLang();
  const cfg = statusConfig[status] || statusConfig.open;
  const sizeCls = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${sizeCls} ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'open' ? 'status-pulse' : ''}`} />
      {cfg[lang]}
    </span>
  );
}

export function OccupancyBar({ value, delay = 0 }: { value: number; delay?: number }) {
  const color = value < 40 ? 'bg-status-open' : value < 70 ? 'bg-status-busy' : 'bg-status-emergency';

  return (
    <div className="h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden flex-1">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function StatCard({ icon: Icon, value, label, color = 'brand-green', delay = 0 }: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color?: string;
  delay?: number;
}) {
  const colorMap: Record<string, string> = {
    'brand-green': 'text-brand-green-light',
    'brand-blue': 'text-brand-blue-light',
    'status-emergency': 'text-status-emergency',
    'status-open': 'text-status-open',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay } }}
      className="glass-card p-4 text-center"
    >
      <Icon className={`w-6 h-6 mx-auto mb-2 ${colorMap[color] || colorMap['brand-green']}`} />
      <div className="counter text-2xl text-gradient-green">{value}</div>
      <div className="text-xs font-tajawal text-[var(--text-muted)] mt-1">{label}</div>
    </motion.div>
  );
}

export function FreshnessBadge({ timestamp, isRTL }: { timestamp: string; isRTL: boolean }) {
  const ageMin = Math.round((Date.now() - new Date(timestamp).getTime()) / 60000);
  let color = 'text-status-open';
  let label = isRTL ? 'الآن' : 'just now';
  if (ageMin >= 60) { const h = Math.floor(ageMin / 60); label = isRTL ? `قبل ${h} ساعة` : `${h}h ago`; color = ageMin >= 720 ? 'text-status-emergency' : 'text-status-busy'; }
  else if (ageMin >= 10) { label = isRTL ? `قبل ${ageMin} دقيقة` : `${ageMin}m ago`; color = ageMin >= 60 ? 'text-status-busy' : 'text-status-open'; }
  return (
    <span className={`text-[9px] font-bold ${color} flex items-center gap-0.5`}>
      <Clock className="w-2.5 h-2.5" /> {label}
    </span>
  );
}
