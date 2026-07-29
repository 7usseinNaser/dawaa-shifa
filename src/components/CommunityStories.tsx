import { Quote } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const stories = [
  {
    name: 'فاطمة - رفح',
    text: 'ابنتي تحتاج دواءً مزمناً. قبل المنصة، كنت أقضي يوماً كاملاً أبحث. الآن أجد أقرب صيدلية في ثوانٍ.',
    tag: 'أم',
  },
  {
    name: 'محمد - غزة',
    text: 'ذهبت لمستشفى الشفاء ولقيته في طوارئ. لو كنت أعرف من قبل، كنت وفرت ساعات وذهبت لمرفق متاح.',
    tag: 'مواطن',
  },
  {
    name: 'د. ليلى - خان يونس',
    text: 'كمديرة مرفق، المنصة ساعدتني أعلن حالة الازدحام للناس بدل ما يجيئوا ويلقوا الزحمة.',
    tag: 'إدارة مرفق',
  },
];

/**
 * CommunityStories — short quotes from the community.
 */
export default function CommunityStories() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            من المجتمع
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            أصوات <span className="text-gradient">من غزة</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {stories.map((s, i) => (
            <div
              key={i}
              className={`glass-card p-6 reveal reveal-delay-${i + 1} ${visible ? 'visible' : ''} light-sweep cursor-hover hover:scale-[1.02] transition-transform`}
            >
              <Quote className="w-8 h-8 text-brand-green/30 mb-3" />
              <p className="font-tajawal text-[var(--text-soft)] leading-relaxed mb-4">{s.text}</p>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center font-cairo font-bold text-white text-sm">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <div className="font-cairo font-bold text-sm">{s.name}</div>
                  <div className="text-xs text-brand-green-light font-tajawal">{s.tag}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
