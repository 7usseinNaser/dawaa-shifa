import { motion } from 'framer-motion';
import { TriangleAlert as AlertTriangle, Clock, MapPin, Navigation, Pill, Search, Activity } from 'lucide-react';
import { useLang } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/**
 * ProblemSolutionSection — merges Problem + Solution + HowItWorks into one
 * cohesive narrative section with visual flow between the three parts.
 */
export default function ProblemSolutionSection() {
  const { t, lang } = useLang();
  const isRTL = lang === 'ar';

  const problems = [
    { icon: Pill, title: t('problem.1.title'), desc: t('problem.1.desc'), color: 'status-busy' },
    { icon: AlertTriangle, title: t('problem.2.title'), desc: t('problem.2.desc'), color: 'status-emergency' },
    { icon: Clock, title: t('problem.3.title'), desc: t('problem.3.desc'), color: 'status-closed' },
  ];

  const solutions = [
    { icon: Search, title: t('solution.1.title'), desc: t('solution.1.desc'), color: 'brand-green' },
    { icon: Clock, title: t('solution.2.title'), desc: t('solution.2.desc'), color: 'brand-blue' },
    { icon: MapPin, title: t('solution.3.title'), desc: t('solution.3.desc'), color: 'brand-green' },
    { icon: Pill, title: isRTL ? 'وقت الانتظار للأقسام' : 'Department wait times', desc: isRTL ? 'تفاصيل دقيقة لكل قسم طبي: عدد حالات الانتظار، اسم الطبيب، والوقت المتوقع للفراغ.' : 'Precise details for each medical department: waiting cases, doctor name, and estimated clear time.', color: 'brand-blue' },
  ];

  const steps = [
    { n: '01', icon: Search, title: t('how.step1'), desc: t('how.step1Desc'), color: 'brand-green' },
    { n: '02', icon: Activity, title: t('how.step2'), desc: t('how.step2Desc'), color: 'brand-blue' },
    { n: '03', icon: Navigation, title: t('how.step3'), desc: t('how.step3Desc'), color: 'brand-green' },
  ];

  return (
    <section id="problem-solution" className="relative py-20 overflow-hidden">
      {/* ── Part 1: Problem ── */}
      <div id="problem" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.div variants={cardVariants} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-status-emergency mb-4">
              {t('problem.title')}
            </span>
            <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
              {isRTL ? 'البحث العشوائي عن العلاج' : 'Random search for medicine'}
              <br />
              <span className="text-gradient">{isRTL ? 'قد يكلف حياة.' : 'Can cost a life.'}</span>
            </h2>
            <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">{t('problem.subtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {problems.map((p) => (
              <motion.div key={p.title} variants={cardVariants}>
                <div className="glass-card p-8 h-full light-sweep group hover:scale-[1.02] transition-transform duration-500 cursor-hover">
                  <div className={`w-14 h-14 rounded-2xl bg-${p.color}/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <p.icon className={`w-7 h-7 text-${p.color}`} />
                  </div>
                  <h3 className="font-cairo font-bold text-xl mb-3">{p.title}</h3>
                  <p className="font-tajawal text-[var(--text-soft)] leading-relaxed">{p.desc}</p>
                  <div className={`mt-6 h-px bg-gradient-to-l from-${p.color} to-transparent`} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Visual connector ── */}
      <div className="max-w-xs mx-auto mb-24 px-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-px h-12 bg-gradient-to-b from-status-emergency to-brand-green-light" />
          <span className="text-xs font-tajawal text-[var(--text-muted)]">{isRTL ? 'الحل' : 'The Solution'}</span>
          <div className="w-px h-12 bg-gradient-to-b from-brand-green-light to-transparent" />
        </div>
      </div>

      {/* ── Part 2: Solution ── */}
      <div id="solution" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.div variants={cardVariants} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
              {t('solution.title')}
            </span>
            <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
              {isRTL ? 'منصة واحدة.' : 'One platform.'}
              <span className="text-gradient"> {isRTL ? 'كل ما تحتاجه.' : 'Everything you need.'}</span>
            </h2>
            <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">{t('solution.subtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {solutions.map((f) => (
              <motion.div key={f.title} variants={cardVariants}>
                <div className="glass-card p-6 lg:p-8 h-full light-sweep group hover:scale-[1.02] transition-transform duration-500 cursor-hover">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-${f.color}/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <f.icon className={`w-6 h-6 text-${f.color === 'brand-green' ? 'brand-green-light' : 'brand-blue-light'}`} />
                    </div>
                    <div>
                      <h3 className="font-cairo font-bold text-xl mb-2">{f.title}</h3>
                      <p className="font-tajawal text-[var(--text-soft)] text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

    </section>
  );
}