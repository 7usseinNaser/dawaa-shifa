import { Fingerprint, Lock, Shield, ShieldCheck, UserCheck } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

const items = [
  { icon: Lock, title: 'تشفير كامل', desc: 'كل البيانات مشفّرة من طرف لطرف. لا أحد يرى بياناتك إلا أنت.' },
  { icon: UserCheck, title: 'تحقق المزودين', desc: 'كل صيدلية ومرفق يمر بتحقق قبل القبول، لضمان مصداقية البيانات.' },
  { icon: Fingerprint, title: 'خصوصية الموقع', desc: 'موقعك يُستخدم فقط لإيجاد الأقرب، ولا يُشارك مع أي طرف ثالث.' },
  { icon: ShieldCheck, title: 'بياناتك تخصك', desc: 'لا نبيع بياناتك. لا إعلانات. لا تتبع. منصة إنسانية بحتة.' },
];

/**
 * PrivacySecurity — trust section about data protection.
 */
export default function PrivacySecurity() {
  const { ref, visible } = useReveal();

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
            الخصوصية والأمان
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            بياناتك <span className="text-gradient">آمنة معنا</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-xl mx-auto">
            في زمن تحتاج فيه الثقة أكثر من أي وقت، نلتزم بأعلى معايير الخصوصية.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((it, i) => (
            <div
              key={it.title}
              className={`glass-card p-6 flex items-start gap-4 light-sweep cursor-hover reveal reveal-delay-${(i % 2) + 1} ${visible ? 'visible' : ''} group hover:scale-[1.02] transition-transform`}
            >
              <div className="w-12 h-12 rounded-xl bg-brand-green/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <it.icon className="w-6 h-6 text-brand-green-light" />
              </div>
              <div>
                <h3 className="font-cairo font-bold text-lg mb-1">{it.title}</h3>
                <p className="font-tajawal text-[var(--text-soft)] text-sm leading-relaxed">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
