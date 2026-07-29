import { Activity, Clock, HeartPulse, MapPin, Pill, Shield } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const cases = [
  {
    icon: HeartPulse,
    title: 'حالة طوارئ ليلية',
    scenario: 'طفل يحتاج دواءً في منتصف الليل',
    desc: 'بدلاً من البحث العشوائي في عشرات الصيدليات، تفتح التطبيق وتكتب اسم الدواء — تحصل على أقرب صيدلية مفتوحة تملكه، بالسعر والمسافة.',
    color: 'status-emergency',
  },
  {
    icon: Shield,
    title: 'زيارة مستشفى',
    scenario: 'مريض يحتاج فحص في قسم معين',
    desc: 'قبل أن تتحرك، تعرف حالة المستشفى: مزدحم؟ طوارئ؟ كم منتظر؟ ومتى يتوقع الفراغ — فتقرر الذهاب الآن أو الانتظار.',
    color: 'status-busy',
  },
  {
    icon: MapPin,
    title: 'البحث عن أقرب مرفق',
    scenario: 'شخص جديد في منطقة لا يعرفها',
    desc: 'تفتح الخريطة الموحدة وترى كل صيدلية، عيادة، ونقطة طبية حولك — ملونة حسب حالتها. تنقر على نقطة لرؤية التفاصيل.',
    color: 'brand-blue',
  },
  {
    icon: Pill,
    title: 'صيدلاني يحدّث مخزونه',
    scenario: 'صيدلية وصلها دواء جديد',
    desc: 'يدخل الصيدلاني لوحة التحكم، يضيف الدواء ويحدد السعر والكمية في ثوانٍ — يصل التحديث لكل المواطنين فوراً.',
    color: 'brand-green',
  },
];

/**
 * UseCases — real-world scenarios showing how the platform helps.
 */
export default function UseCases() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green/15 w-[400px] h-[400px] top-0 left-1/4" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            حالات استخدام
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            في <span className="text-gradient">مواقف حقيقية</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {cases.map((c, i) => (
            <div
              key={c.title}
              className={`reveal reveal-delay-${(i % 2) + 1} ${visible ? 'visible' : ''}`}
            >
              <div className="glass-card p-6 lg:p-8 h-full light-sweep group hover:scale-[1.02] transition-transform cursor-hover">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-${c.color}/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <c.icon className={`w-7 h-7 text-${c.color === 'brand-green' ? 'brand-green-light' : c.color === 'brand-blue' ? 'brand-blue-light' : c.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-tajawal text-[var(--text-muted)] mb-1">{c.scenario}</div>
                    <h3 className="font-cairo font-bold text-xl mb-3">{c.title}</h3>
                    <p className="font-tajawal text-[var(--text-soft)] leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
