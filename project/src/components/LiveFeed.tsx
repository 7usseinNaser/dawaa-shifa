import { useEffect, useRef, useState } from 'react';
import { Activity, Bell, Clock, Pill, Shield } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

interface FeedItem {
  id: number;
  type: 'medicine' | 'facility' | 'status';
  text: string;
  time: string;
  color: string;
}

const initialFeed: FeedItem[] = [
  { id: 1, type: 'facility', text: 'مستشفى الشفاء — تحول إلى طوارئ', time: 'قبل 3 د', color: 'status-emergency' },
  { id: 2, type: 'medicine', text: 'صيدلية النور — توفر بانادول', time: 'قبل 8 د', color: 'status-open' },
  { id: 3, type: 'status', text: 'عيادة الجلدية — انتقلت لمزدحم', time: 'قبل 12 د', color: 'status-busy' },
  { id: 4, type: 'medicine', text: 'صيدلية الرحمة — انخفض سعر أوجمنتين', time: 'قبل 15 د', color: 'brand-green' },
  { id: 5, type: 'facility', text: 'نقطة طبية الشمال — عادت للعمل', time: 'قبل 20 د', color: 'status-open' },
];

const newItems: Omit<FeedItem, 'id' | 'time'>[] = [
  { type: 'medicine', text: 'صيدلية السلام — توفر بروفين 400', color: 'status-open' },
  { type: 'facility', text: 'مستشفى الأقصى — حالة طبيعية', color: 'status-open' },
  { type: 'status', text: 'قسم الباطنية — انخفض الانتظار لـ 12', color: 'brand-blue' },
  { type: 'medicine', text: 'صيدلية الحياة — نفد أوجمنتين', color: 'status-closed' },
  { type: 'facility', text: 'عيادة الأطفال — طوارئ', color: 'status-emergency' },
];

/**
 * LiveFeed — real-time activity feed that auto-updates.
 * New items slide in from top with stagger, simulating live data.
 */
export default function LiveFeed() {
  const { ref, visible } = useReveal();
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [counter, setCounter] = useState(0);
  const idRef = useRef(100);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      const newItem = newItems[counter % newItems.length];
      setFeed((prev) => [
        { ...newItem, id: idRef.current++, time: 'الآن' },
        ...prev.slice(0, 7),
      ]);
      setCounter((c) => c + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [visible, counter]);

  const icon = (type: string) => {
    if (type === 'medicine') return Pill;
    if (type === 'facility') return Shield;
    return Activity;
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            <span className="w-2 h-2 bg-status-open rounded-full status-pulse text-status-open" />
            تغذية لحظية
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            ما يحدث <span className="text-gradient">الآن</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            تحديثات لحظية من الصيدليات والمرافق — كل تغيير يصل فوراً لكل المستخدمين.
          </p>
        </div>

        <div className={`glass-card p-6 reveal ${visible ? 'visible' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-green-light" />
              <span className="font-cairo font-bold text-sm">آخر التحديثات</span>
            </div>
            <span className="text-xs font-tajawal text-[var(--text-muted)] flex items-center gap-1">
              <Clock className="w-3 h-3" /> يتحدث تلقائياً
            </span>
          </div>

          <div className="space-y-2">
            {feed.map((item, i) => {
              const Icon = icon(item.type);
              return (
                <div
                  key={item.id}
                  className={`glass rounded-xl p-3 flex items-center gap-3 ${i === 0 ? 'animate-slide-up' : ''}`}
                  style={i === 0 ? { opacity: 0, animationFillMode: 'forwards' } : undefined}
                >
                  <div className={`w-9 h-9 rounded-lg bg-${item.color}/20 flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 text-${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-tajawal font-bold">{item.text}</div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-tajawal shrink-0">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
