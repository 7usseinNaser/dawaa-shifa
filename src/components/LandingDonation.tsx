import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Gift, MessageCircle, BookOpen, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { DonationModal, type DonationType } from '@/components/DonationModal';
import { donationVerses } from '@/data/donationVerses';

export default function LandingDonation() {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<DonationType>('platform');
  const [verseIndex, setVerseIndex] = useState(0);

  const teaserVerses = [donationVerses[0], donationVerses[3], donationVerses[8]];
  const verse = teaserVerses[verseIndex];

  const openModal = (type: DonationType) => {
    setModalType(type);
    setShowModal(true);
  };

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-green/5 via-transparent to-brand-blue/5 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-4">
            <Heart className="w-4 h-4 text-brand-green-light" />
            <span className="text-xs font-bold uppercase tracking-wider">{isRTL ? 'صدقة جارية' : 'Sadaqah Jariyah'}</span>
          </div>
          <h2 className="font-cairo text-3xl sm:text-4xl font-bold mb-3">
            {isRTL ? 'ساهم في استمرارية دواء وشفاء' : 'Help Sustain Dawaa Shifa'}
          </h2>
          <p className="font-tajawal text-[var(--text-soft)] max-w-2xl mx-auto">
            {isRTL
              ? 'تبرعك يغطي تكاليف السيرفرات وقاعدة البيانات والصيانة لإبقاء المنصة تعمل وخدمة المرضى.'
              : 'Your donation covers server, database, and maintenance costs to keep the platform running and serving patients.'}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Verse Carousel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 relative min-h-[200px] flex flex-col justify-center"
          >
            <div className="flex items-center gap-1.5 mb-3">
              {verse.type === 'quran' ? (
                <BookOpen className="w-4 h-4 text-brand-green-light" />
              ) : (
                <Sparkles className="w-4 h-4 text-brand-blue-light" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {verse.type === 'quran' ? (isRTL ? 'آية قرآنية' : 'Quran Verse') : (isRTL ? 'حديث شريف' : 'Hadith')}
              </span>
            </div>
            <motion.p
              key={verse.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-cairo text-xl leading-relaxed text-center mb-3"
              dir="rtl"
            >
              {verse.arabic}
            </motion.p>
            <p className="text-sm font-tajawal text-[var(--text-soft)] text-center mb-1">{verse.translation}</p>
            <p className="text-xs text-[var(--text-muted)] text-center font-tajawal">{verse.reference}</p>

            <button onClick={() => setVerseIndex((i) => (i + 1) % teaserVerses.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-brand-green/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setVerseIndex((i) => (i - 1 + teaserVerses.length) % teaserVerses.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-brand-green/10 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Donation CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 flex flex-col justify-center gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-green/15 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-brand-green-light" />
                </div>
                <div>
                  <h3 className="font-cairo font-bold">{isRTL ? 'تبرع بالأدوية' : 'Medicine Donation'}</h3>
                  <p className="text-xs font-tajawal text-[var(--text-muted)] mt-0.5">
                    {isRTL ? 'أدوية sealed وغير مستعملة تصل للمرضى مباشرة' : 'Sealed, unused medicines delivered to patients directly'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-brand-blue-light" />
                </div>
                <div>
                  <h3 className="font-cairo font-bold">{isRTL ? 'دعم المنصة' : 'Platform Support'}</h3>
                  <p className="text-xs font-tajawal text-[var(--text-muted)] mt-0.5">
                    {isRTL ? 'دعم مالي لتغطية النقل والتخزين والتحقق' : 'Financial support for transport, storage & verification'}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => openModal('platform')} className="btn-primary text-sm flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" />
                {isRTL ? 'تبرّع للموقع' : 'Donate to Platform'}
              </button>
              <button onClick={() => openModal('medicine')} className="btn-secondary text-sm flex items-center justify-center gap-1.5">
                <Gift className="w-4 h-4" />
                {isRTL ? 'تبرّع بدواء' : 'Donate Medicine'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <DonationModal open={showModal} onClose={() => setShowModal(false)} defaultType={modalType} />
    </section>
  );
}
