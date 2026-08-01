import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Gift, MessageCircle, BookOpen, Sparkles } from 'lucide-react';
import { donationVerses } from '@/data/donationVerses';
import { useLang } from '@/lib/i18n';
import { DONATION_CONFIG } from '@/lib/config';

export type DonationType = 'medicine' | 'platform';

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: DonationType;
}

export function DonationModal({ open, onClose, defaultType = 'platform' }: DonationModalProps) {
  const { lang, isRTL, t } = useLang();
  const [verseIndex, setVerseIndex] = useState(0);
  const [donationType, setDonationType] = useState<DonationType>(defaultType);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setDonationType(defaultType);
      setShowConfirm(false);
    }
  }, [open, defaultType]);

  const nextVerse = useCallback(() => setVerseIndex((i) => (i + 1) % donationVerses.length), []);
  const prevVerse = useCallback(() => setVerseIndex((i) => (i - 1 + donationVerses.length) % donationVerses.length), []);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(nextVerse, 6000);
    return () => clearInterval(timer);
  }, [open, nextVerse]);

  const handleDonateClick = () => {
    if (donationType === 'platform') {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmDonation = () => {
    window.open(DONATION_CONFIG.whatsappLink, '_blank', 'noopener,noreferrer');
    setShowConfirm(false);
    onClose();
  };

  const verse = donationVerses[verseIndex];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
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
                  <h2 className="font-cairo font-bold text-lg">{t('donate.title')}</h2>
                  <p className="text-xs font-tajawal text-[var(--text-muted)]">{t('donate.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Verses Carousel */}
            <div className="px-5 pt-4">
              <div className="relative glass-card p-4 min-h-[150px] flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2">
                  {verse.type === 'quran' ? (
                    <BookOpen className="w-4 h-4 text-brand-green-light" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-brand-blue-light" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {verse.type === 'quran' ? t('donate.quran') : t('donate.hadith')}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={verse.id}
                    initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="font-cairo text-lg leading-relaxed text-center mb-2" dir="rtl">{verse.arabic}</p>
                    <p className="text-sm font-tajawal text-[var(--text-soft)] text-center mb-1">{verse.translation}</p>
                    <p className="text-xs text-[var(--text-muted)] text-center font-tajawal">{verse.reference}</p>
                  </motion.div>
                </AnimatePresence>
                <button onClick={prevVerse} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-brand-green/10 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextVerse} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-brand-green/10 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                {donationVerses.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setVerseIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === verseIndex ? 'bg-brand-green w-4' : 'bg-[var(--text-muted)]/30 w-1.5'}`}
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
                  <div className="font-cairo font-bold text-sm">{t('donate.medicine')}</div>
                  <div className="text-[10px] font-tajawal text-[var(--text-muted)] mt-0.5">{t('donate.medicineDesc')}</div>
                </button>
                <button
                  onClick={() => setDonationType('platform')}
                  className={`p-3 rounded-2xl text-center transition-all ${donationType === 'platform' ? 'bg-brand-blue/20 border-2 border-brand-blue' : 'glass border-2 border-transparent'}`}
                >
                  <Heart className={`w-6 h-6 mx-auto mb-1 ${donationType === 'platform' ? 'text-brand-blue-light' : 'text-[var(--text-muted)]'}`} />
                  <div className="font-cairo font-bold text-sm">{t('donate.platform')}</div>
                  <div className="text-[10px] font-tajawal text-[var(--text-muted)] mt-0.5">{t('donate.platformDesc')}</div>
                </button>
              </div>
            </div>

            {/* Info text */}
            <div className="px-5 pt-3">
              <p className="text-xs font-tajawal text-[var(--text-soft)] leading-relaxed text-center">
                {donationType === 'platform' ? t('donate.subtitle') : t('donate.medicineDesc')}
              </p>
            </div>

            {/* Action */}
            <div className="p-5">
              {!showConfirm ? (
                <button onClick={handleDonateClick} className="btn-primary w-full flex items-center justify-center gap-2">
                  {donationType === 'platform' ? (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      {t('donate.whatsapp')}
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      {t('donate.medicine')}
                    </>
                  )}
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="glass-card p-3 flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-brand-green-light shrink-0 mt-0.5" />
                    <p className="text-xs font-tajawal text-[var(--text-soft)]">{isRTL ? DONATION_CONFIG.confirmTextAr : DONATION_CONFIG.confirmTextEn}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={confirmDonation} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      {t('donate.continue')}
                    </button>
                    <button onClick={() => setShowConfirm(false)} className="btn-secondary text-sm px-4">
                      {t('donate.cancel')}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
