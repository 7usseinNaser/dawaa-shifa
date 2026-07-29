import { Building2, Pill, User } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLang } from '@/lib/i18n';

/**
 * Users — 3 futuristic persona cards with hover interaction.
 */
export default function Users() {
  const { ref, visible } = useReveal();
  const { t, lang } = useLang();

  const users = [
    {
      icon: User,
      title: t('users.citizen'),
      role: lang === 'ar' ? 'الباحث عن العلاج' : 'Treatment seeker',
      desc: t('users.citizenDesc'),
      color: 'brand-green',
      features: lang === 'ar'
        ? ['بحث فوري', 'خريطة قريبة', 'تنبيهات ذكية']
        : ['Instant search', 'Nearby map', 'Smart alerts'],
    },
    {
      icon: Pill,
      title: t('users.pharmacist'),
      role: lang === 'ar' ? 'محدّث المخزون' : 'Inventory updater',
      desc: t('users.pharmacistDesc'),
      color: 'brand-blue',
      features: lang === 'ar'
        ? ['لوحة تحكم', 'تحديث سريع', 'إحصائيات']
        : ['Control panel', 'Quick update', 'Statistics'],
    },
    {
      icon: Building2,
      title: t('users.admin'),
      role: lang === 'ar' ? 'مراقب الحالة' : 'Status monitor',
      desc: t('users.adminDesc'),
      color: 'brand-green',
      features: lang === 'ar'
        ? ['تحديث لحظي', 'إدارة أقسام', 'إعلان طوارئ']
        : ['Live updates', 'Dept management', 'Emergency alerts'],
    },
  ];

  return (
    <section id="users" className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-blue/15 w-[400px] h-[400px] top-0 right-0" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
            {t('users.title')}
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            {lang === 'ar' ? 'منصة ' : 'A platform '}<span className="text-gradient">{lang === 'ar' ? 'للجميع' : 'for everyone'}</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            {lang === 'ar' ? 'ثلاثة أنواع من المستخدمين، كل واحد منهم له أدواته الخاصة لتقديم أفضل تجربة.' : 'Three types of users, each with their own tools to deliver the best experience.'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {users.map((u, i) => (
            <div
              key={u.title}
              className={`reveal reveal-delay-${i + 1} ${visible ? 'visible' : ''}`}
            >
              <div className="glass-card p-8 h-full light-sweep group hover:scale-[1.03] transition-transform duration-500 cursor-hover text-center">
                {/* Avatar */}
                <div className={`w-20 h-20 rounded-full bg-${u.color}/20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  <u.icon className={`w-10 h-10 text-${u.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'}`} />
                </div>

                <h3 className="font-cairo font-bold text-2xl mb-1">{u.title}</h3>
                <p className={`text-sm font-tajawal text-${u.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'} mb-4`}>
                  {u.role}
                </p>
                <p className="font-tajawal text-[var(--text-soft)] leading-relaxed mb-6">{u.desc}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {u.features.map((f) => (
                    <span key={f} className="text-xs px-3 py-1.5 rounded-full glass font-tajawal text-[var(--text-soft)]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
