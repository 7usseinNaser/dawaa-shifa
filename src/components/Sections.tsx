import { motion } from 'framer-motion';
import { Heart, Activity, Pill, Building2, Users, MapPin } from 'lucide-react';
import { useLang } from '@/lib/i18n';

export function ImpactMetrics() {
  const { isRTL } = useLang();
  const stats = [
    { icon: Pill, value: '12,500+', label: isRTL ? 'دواء متوفر' : 'Medicines Available' },
    { icon: Building2, value: '340+', label: isRTL ? 'صيدلية شريكة' : 'Partner Pharmacies' },
    { icon: Users, value: '8,200+', label: isRTL ? 'مواطن مستفيد' : 'Citizens Served' },
    { icon: MapPin, value: '18', label: isRTL ? 'محافظة مغطاة' : 'Districts Covered' },
  ];
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-cairo text-3xl sm:text-4xl font-bold text-center mb-2"
        >
          {isRTL ? 'تأثير حقيقي — أرقام تصنع فرقاً' : 'Real Impact — Numbers That Make a Difference'}
        </motion.h2>
        <p className="text-center font-tajawal text-[var(--text-muted)] mb-10">
          {isRTL ? 'منصة دواء وشفاء تربط المرضى بالأدوية عبر شبكة صيدليات معتمدة' : 'Dawaa Shifa connects patients with medicines through a verified pharmacy network'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5 text-center border-glow"
            >
              <s.icon className="w-8 h-8 mx-auto mb-3 text-brand-green-light" />
              <div className="font-cairo font-bold text-2xl">{s.value}</div>
              <div className="text-xs font-tajawal text-[var(--text-muted)] mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CommunityStories() {
  const { isRTL } = useLang();
  const stories = [
    { name: isRTL ? 'أم محمد، غزة' : 'Um Mohammed, Gaza', text: isRTL ? 'وجدت دواء والدي الذي لم نعثر عليه في أي صيدلية.' : 'Found my father\'s medicine that we couldn\'t find anywhere.' },
    { name: isRTL ? 'أبو خالد، رام الله' : 'Abu Khalid, Ramallah', text: isRTL ? 'التطبيق وفر علينا ساعات من البحث.' : 'The app saved us hours of searching.' },
    { name: isRTL ? 'د. سارة، نابلس' : 'Dr. Sara, Nablus', text: isRTL ? 'كصيدلية، ساعدنا في الوصول لمرضى أكثر.' : 'As a pharmacy, it helped us reach more patients.' },
  ];
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-cairo text-3xl sm:text-4xl font-bold text-center mb-10"
        >
          {isRTL ? 'من الميدان' : 'From the Field'}
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-4">
          {stories.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <Heart className="w-6 h-6 text-brand-green-light mb-3" />
              <p className="font-tajawal text-sm text-[var(--text-soft)] mb-3">{s.text}</p>
              <p className="font-cairo text-xs text-[var(--text-muted)]">{s.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
