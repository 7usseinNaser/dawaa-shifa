import { motion } from 'framer-motion';
import { Code as Code2, Smartphone, Trophy, Cpu, Linkedin, Instagram, Mail, Globe, Heart, Users, Target, Sparkles } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useTheme } from '@/hooks/useTheme';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LiquidBackground from '@/components/LiquidBackground';
import BackToTop from '@/components/BackToTop';
import ScrollProgress from '@/components/ScrollProgress';
import LanguageToggle from '@/components/LanguageToggle';
import { DonationModal } from '@/components/DonationModal';
import { useState } from 'react';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const badges = [
  { icon: Code2, label: 'Front-End 144h' },
  { icon: Smartphone, label: 'Flutter 40h' },
  { icon: Trophy, label: 'Software Engineer' },
  { icon: Cpu, label: 'AI Automation Specialist' },
];

const techStack = [
  { name: 'React', color: 'text-brand-blue-light' },
  { name: 'React Native', color: 'text-brand-green-light' },
  { name: 'Flutter', color: 'text-brand-blue-light' },
  { name: 'TypeScript', color: 'text-brand-green-light' },
  { name: 'Supabase', color: 'text-brand-blue-light' },
  { name: 'Tailwind CSS', color: 'text-brand-green-light' },
  { name: 'Framer Motion', color: 'text-brand-blue-light' },
  { name: 'Vite', color: 'text-brand-green-light' },
];

/**
 * TeamPage — dedicated page for the developer & contributors.
 * Route: #/team
 */
export default function TeamPage() {
  const { theme, toggle } = useTheme();
  const { t, lang } = useLang();
  const isRTL = lang === 'ar';
  const [showDonate, setShowDonate] = useState(false);

  return (
    <div className="min-h-screen text-[var(--text-main)] selection:bg-brand-green/30">
      <LiquidBackground />
      <ScrollProgress />
      <BackToTop />

      {/* Simplified navbar for team page */}
      <nav className="fixed top-0 inset-x-0 z-50 glass shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#hero" className="flex items-center gap-2 group">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-brand-green-light group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-open rounded-full status-pulse" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-cairo font-extrabold text-lg">{isRTL ? 'دواء وشفاء' : 'Dawaa & Shifa'}</span>
                <span className="font-inter text-[10px] text-[var(--text-muted)] tracking-wider">DAWAA & SHIFA</span>
              </div>
            </a>

            <div className="flex items-center gap-3">
              <LanguageToggle />
              <button onClick={toggle} className="p-2 rounded-full glass hover:scale-110 transition-transform" aria-label={isRTL ? 'تبديل الوضع' : 'Toggle theme'}>
                {theme === 'dark' ? <span className="text-brand-green-light text-sm font-bold">{isRTL ? 'نهاري' : 'Light'}</span> : <span className="text-brand-blue text-sm font-bold">{isRTL ? 'ليلي' : 'Dark'}</span>}
              </button>
              <a href="#hero" className="btn-primary text-sm flex items-center gap-1.5">
                {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-24">
        {/* ── Hero ── */}
        <section className="relative py-20 overflow-hidden">
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-6">
                {isRTL ? 'الفريق والمطورون' : 'Team & Developers'}
              </span>
              <h1 className="font-cairo font-black text-4xl sm:text-5xl lg:text-6xl mb-6">
                {isRTL ? 'من صنع' : 'Built by'} <span className="text-gradient">{isRTL ? 'دواء وشفاء' : 'Dawaa Shifa'}</span>
              </h1>
              <p className="text-[var(--text-soft)] font-tajawal text-lg max-w-2xl mx-auto leading-relaxed">
                {isRTL
                  ? 'من قلب غزة، فريق شغوف بني هذه المنصة لخدمة أهلنا. تعرّف على من يقفون خلف الفكرة والتنفيذ.'
                  : 'From the heart of Gaza, a passionate team built this platform to serve our people. Meet the people behind the idea and execution.'}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Founder: Hussein Mohammed Nasr ── */}
        <section className="relative py-16 overflow-hidden">
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              {/* Portrait */}
              <motion.div variants={itemVariants} className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-green via-brand-blue to-brand-green blur-3xl opacity-40 animate-glow" />
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-brand-green/40 to-brand-blue/40 blur-2xl animate-pulse" />
                  <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-full overflow-hidden border-glow ring-4 ring-brand-green/30">
                    <img
                      src="/hussein-photo.jpg"
                      alt={isRTL ? 'حسين محمد نصر' : 'Hussein Mohammed Nasr'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 hidden flex-col items-center justify-center bg-gradient-to-br from-brand-green/25 to-brand-blue/25">
                      <div className="font-cairo font-black text-6xl lg:text-7xl text-gradient mb-2">{isRTL ? 'ح' : 'H'}</div>
                      <div className="font-inter text-xs text-[var(--text-muted)] tracking-widest">HUSSEIN NASR</div>
                    </div>
                  </div>
                  {/* Floating tags */}
                  <div className="absolute -top-4 -right-8 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '5s' }}>React Native</div>
                  <div className="absolute -bottom-4 -left-8 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '7s', animationDelay: '1s' }}>Front-End</div>
                  <div className="absolute top-1/2 -left-12 glass rounded-full px-3 py-1.5 text-xs font-tajawal animate-float" style={{ animationDuration: '6s', animationDelay: '2s' }}>Flutter</div>
                </div>
              </motion.div>

              {/* Bio */}
              <motion.div variants={itemVariants}>
                <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
                  {t('about.title')}
                </span>
                <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
                  {isRTL ? 'حسين محمد نصر' : 'Hussein Mohammed Nasr'}
                  <br />
                  <span className="text-gradient">{isRTL ? 'مطور شاب من غزة' : 'Young developer from Gaza'}</span>
                </h2>
                <blockquote className="glass-card p-6 my-6 text-lg font-tajawal text-[var(--text-soft)] leading-relaxed border-r-4 border-brand-green">
                  {t('about.desc')}
                </blockquote>

                {/* Badges */}
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((b) => (
                    <div key={b.label} className="glass rounded-xl p-3 flex items-center gap-3 light-sweep cursor-hover">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/20 flex items-center justify-center">
                        <b.icon className="w-5 h-5 text-brand-green-light" />
                      </div>
                      <span className="font-tajawal text-sm font-bold">{b.label}</span>
                    </div>
                  ))}
                </div>

                {/* Social links */}
                <div className="flex items-center gap-3 mt-6 flex-wrap">
                  <a href="https://7ussein.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-brand-green-light font-tajawal hover:underline">
                    <Globe className="w-4 h-4" /> 7ussein.com
                  </a>
                  <a href="https://www.linkedin.com/in/hussein-naser-098a533a8" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#0A66C2]/20 hover:bg-[#0A66C2]/35 transition-colors">
                    <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                  </a>
                  <a href="https://www.instagram.com/7ussein.naser" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex items-center justify-center w-10 h-10 rounded-xl glass hover:scale-110 transition-transform">
                    <Instagram className="w-5 h-5 text-brand-green-light" />
                  </a>
                  <a href="mailto:hussein7.7naser@gmail.com" aria-label="Email" className="inline-flex items-center justify-center w-10 h-10 rounded-xl glass hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5 text-brand-blue-light" />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Project Vision ── */}
        <section className="relative py-20 overflow-hidden">
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div variants={itemVariants} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
                  <Target className="w-4 h-4" />
                  {isRTL ? 'رؤية المشروع' : 'Project Vision'}
                </div>
                <h2 className="font-cairo font-black text-3xl sm:text-4xl mb-4">
                  {isRTL ? 'لماذا بُني هذا المشروع؟' : 'Why was this built?'}
                </h2>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-card p-8 lg:p-12">
                <p className="font-tajawal text-lg text-[var(--text-soft)] leading-loose mb-6">
                  {isRTL
                    ? 'في غزة، البحث عن دواء قد يتحول إلى رحلة تستغرق ساعات. التنقل بين صيدلية وأخرى، دون معرفة ما إذا كان الدواء متوفراً، يهدر وقتاً ثميناً قد يكون حاسماً.'
                    : 'In Gaza, searching for medicine can turn into a hours-long journey. Moving from pharmacy to pharmacy without knowing if the medicine is available wastes precious time that could be critical.'}
                </p>
                <p className="font-tajawal text-lg text-[var(--text-soft)] leading-loose mb-6">
                  {isRTL
                    ? 'دواء وشفاء وُلدت لتكون الجسر: منصة تربط المواطن بالصيدلية والمستشفى في لحظتها. توفّر الدواء، حالة المرفق، وقت الانتظار — كلها على الشاشة قبل أن تتحرك.'
                    : 'Dawaa Shifa was born to be the bridge: a platform connecting citizens with pharmacies and hospitals in real-time. Medicine availability, facility status, wait times — all on screen before you move.'}
                </p>
                <div className="flex items-center gap-2 text-brand-green-light font-tajawal font-bold">
                  <Heart className="w-5 h-5" />
                  <span>{isRTL ? 'صُنع في غزة، رغم كل شيء.' : 'Made in Gaza, despite everything.'}</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section className="relative py-16 overflow-hidden">
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div variants={itemVariants} className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
                  <Code2 className="w-4 h-4" />
                  {isRTL ? 'التقنيات' : 'Tech Stack'}
                </div>
                <h2 className="font-cairo font-black text-3xl sm:text-4xl mb-4">
                  {isRTL ? 'بُنيت بأدوات' : 'Built with'} <span className="text-gradient">{isRTL ? 'حديثة' : 'modern tools'}</span>
                </h2>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3">
                {techStack.map((tech) => (
                  <span key={tech.name} className={`px-4 py-2 rounded-full glass font-tajawal font-bold text-sm ${tech.color} cursor-hover hover:scale-105 transition-transform`}>
                    {tech.name}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Contributors ── */}
        <section className="relative py-20 overflow-hidden">
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div variants={itemVariants} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
                  <Users className="w-4 h-4" />
                  {isRTL ? 'المساهمون' : 'Contributors'}
                </div>
                <h2 className="font-cairo font-black text-3xl sm:text-4xl mb-4">
                  {isRTL ? 'من ساهموا في المشروع' : 'Who contributed'}
                </h2>
                <p className="text-[var(--text-soft)] font-tajawal max-w-xl mx-auto">
                  {isRTL
                    ? 'هذا المشروع مفتوح لكل من يريد المساعدة — بالكود، بالتصميم، بالأفكار، أو بالدعم.'
                    : 'This project is open to anyone who wants to help — with code, design, ideas, or support.'}
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-brand-green-light" />
                </div>
                <p className="font-tajawal text-[var(--text-soft)] text-lg mb-2">
                  {isRTL ? 'كن أول المساهمين' : 'Be the first contributor'}
                </p>
                <p className="font-tajawal text-sm text-[var(--text-muted)] mb-6">
                  {isRTL ? 'تواصل معنا لإضافة اسمك هنا' : 'Reach out to add your name here'}
                </p>
                <a href="mailto:hussein7.7naser@gmail.com" className="btn-secondary inline-flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  {isRTL ? 'تواصل معنا' : 'Contact us'}
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative py-16 overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <h2 className="font-cairo font-black text-2xl sm:text-3xl mb-4">
                {isRTL ? 'ادعم استمرارية المشروع' : 'Support this project'}
              </h2>
              <p className="text-[var(--text-soft)] font-tajawal mb-8">
                {isRTL ? 'تبرعك يغطي تكاليف السيرفرات وقاعدة البيانات لإبقاء المنصة تعمل.' : 'Your donation covers server and database costs to keep the platform running.'}
              </p>
              <button onClick={() => setShowDonate(true)} className="btn-primary inline-flex items-center gap-2">
                <Heart className="w-5 h-5" />
                {isRTL ? 'تبرّع الآن' : 'Donate now'}
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <DonationModal open={showDonate} onClose={() => setShowDonate(false)} />
    </div>
  );
}
