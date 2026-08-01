import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Gift, MessageCircle, CircleCheck as CheckCircle, Loader as Loader2, BookOpen, Sparkles, Share2 } from 'lucide-react';
import { donationVerses, type DonationVerse } from '@/data/donationVerses';
import { useLang } from '@/lib/i18n';
import { getDonationWhatsappUrl, DONATION_CONFIG } from '@/lib/config';
import { showToast } from '@/components/ui/Toast';

export type DonationType = 'medicine' | 'platform';

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: DonationType;
  onMedicineDonate?: () => void;
}

export function DonationModal({ open, onClose, defaultType = 'medicine', onMedicineDonate }: DonationModalProps) {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [verseIndex, setVerseIndex] = useState(0);
  const [donationType, setDonationType] = useState<DonationType>(defaultType);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setDonationType(defaultType);
      setShowConfirm(false);
    }
  }, [open, defaultType]);

  const nextVerse = useCallback(() => {
    setVerseIndex((i) => (i + 1) % donationVerses.length);
  }, []);
  const prevVerse = useCallback(() => {
    setVerseIndex((i) => (i - 1 + donationVerses.length) % donationVerses.length);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(nextVerse, 6000);
    return () => clearInterval(timer);
  }, [open, nextVerse]);

  const handleDonateClick = () => {
    if (donationType === 'platform') {
      setShowConfirm(true);
    } else {
      if (onMedicineDonate) {
        onMedicineDonate();
      }
      onClose();
    }
  };

  const confirmDonation = () => {
    window.open(getDonationWhatsappUrl(), '_blank', 'noopener,noreferrer');
    setShowConfirm(false);
    onClose();
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const shareText = isRTL
      ? 'منصة دواء وشفاء — تربط سكان غزة بالصيدليات والمستشفيات لحظياً. ساهم في نشرها لتصل لمن يحتاجها.'
      : 'Dawaa & Shifa — connecting Gaza residents with pharmacies and hospitals in real-time. Share to help it reach those in need.';
    if (navigator.share) {
      try {
        await navigator.share({ title: DONATION_CONFIG.platformName, text: shareText, url: shareUrl });
      } catch {
        /* user cancelled — no action needed */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast(isRTL ? 'تم نسخ رابط المنصة — شاركه مع من تستطيع' : 'Platform link copied — share it with whoever you can');
      } catch {
        showToast(isRTL ? 'تعذّر نسخ الرابط' : 'Could not copy link', 'error');
      }
    }
  };

  const currentVerse: DonationVerse = donationVerses[verseIndex];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-card p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-brand-green/20 to-brand-blue/20 p-5 rounded-t-3xl">
              <button onClick={onClose} className="absolute top-4 left-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-cairo font-bold text-lg">{isRTL ? 'ساهم في استمرارية دواء وشفاء' : 'Help Sustain Dawaa Shifa'}</h2>
                  <p className="text-xs font-tajawal text-[var(--text-muted)]">
                    {isRTL
                      ? 'دعمك المالي يساهم في تطوير المنصة وتغطية التكاليف التشغيلية، لضمان استمرارية إيصال الدواء لمن هم في أمس الحاجة إليه.'
                      : 'Your financial support helps develop the platform and cover operational costs, ensuring continued delivery of medicine to those most in need.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quran/Hadith Carousel */}
            <div className="px-5 pt-4">
              <div className="relative glass-card p-4 min-h-[140px] flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2">
                  {currentVerse.type === 'quran' ? (
                    <BookOpen className="w-4 h-4 text-brand-green-light" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-brand-blue-light" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {currentVerse.type === 'quran' ? (isRTL ? 'آية قرآنية' : 'Quran Verse') : (isRTL ? 'حديث شريف' : 'Hadith')}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentVerse.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="font-cairo text-lg leading-relaxed text-center mb-2" dir="rtl">
                      {currentVerse.arabic}
                    </p>
                    <p className="text-sm font-tajawal text-[var(--text-soft)] text-center mb-1">
                      {currentVerse.translation}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] text-center font-tajawal">
                      {currentVerse.reference}
                    </p>
                  </motion.div>
                </AnimatePresence>
                <button onClick={prevVerse} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-brand-green/10 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextVerse} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-brand-green/10 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {/* Dots */}
              <div className="flex justify-center gap-1.5 mt-2">
                {donationVerses.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setVerseIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === verseIndex ? 'bg-brand-green w-4' : 'bg-[var(--text-muted)]/30'}`}
                  />
                ))}
              </div>
            </div>

            {/* Donation Type Tabs */}
            <div className="px-5 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDonationType('medicine')}
                  className={`p-3 rounded-2xl text-center transition-all ${donationType === 'medicine' ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
                >
                  <Gift className={`w-6 h-6 mx-auto mb-1 ${donationType === 'medicine' ? 'text-brand-green-light' : 'text-[var(--text-muted)]'}`} />
                  <div className="font-cairo font-bold text-sm">{isRTL ? 'تبرّع بدواء' : 'Donate Medicine'}</div>
                  <div className="text-[10px] font-tajawal text-[var(--text-muted)] mt-0.5">{isRTL ? 'أدوية مغلقة وغير مستعملة تصل للمرضى مباشرة' : 'Sealed, unused medicines delivered to patients directly'}</div>
                </button>
                <button
                  onClick={() => setDonationType('platform')}
                  className={`p-3 rounded-2xl text-center transition-all ${donationType === 'platform' ? 'bg-brand-blue/20 border-2 border-brand-blue' : 'glass border-2 border-transparent'}`}
                >
                  <Heart className={`w-6 h-6 mx-auto mb-1 ${donationType === 'platform' ? 'text-brand-blue-light' : 'text-[var(--text-muted)]'}`} />
                  <div className="font-cairo font-bold text-sm">{isRTL ? 'دعم المنصة' : 'Platform Support'}</div>
                  <div className="text-[10px] font-tajawal text-[var(--text-muted)] mt-0.5">{isRTL ? 'دعم مالي للعمليات' : 'Financial support for operations'}</div>
                </button>
              </div>
            </div>

            {/* Info text */}
            <div className="px-5 pt-3">
              <p className="text-xs font-tajawal text-[var(--text-soft)] leading-relaxed text-center">
                {donationType === 'medicine'
                  ? (isRTL
                    ? 'سيتم توجيهك لتسليم أدويتك لأقرب صيدلية معتمدة حيث يتم فحصها وتوزيعها على المرضى المحتاجين.'
                    : 'You will be guided to deliver your medicines to the nearest verified pharmacy where they are inspected and distributed to patients in need.')
                  : (isRTL
                    ? 'دعمك المالي يساهم في تطوير المنصة وتغطية التكاليف التشغيلية، لضمان استمرارية إيصال الدواء لمن هم في أمس الحاجة إليه.'
                    : 'Your financial support helps develop the platform and cover operational costs, ensuring continued delivery of medicine to those most in need.')}
              </p>
            </div>

            {/* Action Button */}
            <div className="p-5">
              {!showConfirm ? (
                <button onClick={handleDonateClick} className="btn-primary w-full flex items-center justify-center gap-2">
                  {donationType === 'platform' ? (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      {isRTL ? 'تواصل عبر واتساب للتبرع' : 'Contact via WhatsApp to Donate'}
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      {isRTL ? 'تابع لتبرع بالأدوية' : 'Continue to Medicine Donation'}
                    </>
                  )}
                </button>
              ) : (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className="glass-card p-3 flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 text-brand-green-light shrink-0 mt-0.5" />
                      <p className="text-xs font-tajawal text-[var(--text-soft)]">
                        {isRTL ? DONATION_CONFIG.confirmTextAr : DONATION_CONFIG.confirmTextEn}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={confirmDonation} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
                        <MessageCircle className="w-4 h-4" />
                        {isRTL ? 'متابعة إلى واتساب' : 'Continue to WhatsApp'}
                      </button>
                      <button onClick={() => setShowConfirm(false)} className="btn-secondary text-sm px-4">
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Non-donor share section */}
              <div className="mt-5 glass-card p-4 bg-gradient-to-br from-brand-green/5 to-brand-blue/5">
                <p className="text-sm font-tajawal text-[var(--text-soft)] text-center leading-relaxed mb-3">
                  🤍 {isRTL
                    ? 'إن لم تستطع الدعم اليوم، فمشاركتك للمنصة مع من يستطيع هي صدقةٌ جارية أيضاً.. فالدّال على الخير كفاعله.'
                    : 'If you cannot donate today, sharing this platform with someone who can is also ongoing charity — for the one who guides to good is like the one who does it.'}
                </p>
                <button onClick={handleShare} className="w-full btn-secondary text-sm flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  {isRTL ? 'انشر المنصة تؤجر 🔗' : 'Share the Platform 🔗'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
