import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, Building2, CircleCheck as CheckCircle, MessageCircle, Phone, Pill, Snowflake, User, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import type { UserRole } from '@/lib/supabase';
import { getDonationWhatsappUrl } from '@/lib/config';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.3 } }),
};

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.6 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function AuthPage() {
  const { profile, signInWithGoogle, needsPhoneCollection, updateProfilePhone } = useAuth();
  const { t, lang } = useLang();
  const isRTL = lang === 'ar';

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [role, setRole] = useState<UserRole>('citizen');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Phone collection modal state
  const [modalPhone, setModalPhone] = useState('');
  const [modalPhoneError, setModalPhoneError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const roles: { key: UserRole; label: string; desc: string; icon: typeof User; color: string }[] = [
    { key: 'citizen', label: t('auth.citizen'), desc: t('auth.citizenDesc'), icon: User, color: 'brand-green' },
    { key: 'pharmacist', label: t('auth.pharmacist'), desc: t('auth.pharmacistDesc'), icon: Pill, color: 'brand-blue' },
    { key: 'facility_owner', label: t('auth.facility_owner'), desc: t('auth.facilityDesc'), icon: Building2, color: 'status-busy' },
  ];

  const pickRole = (r: UserRole) => { setRole(r); setDir(1); setStep(1); };
  const backToRole = () => { setDir(-1); setStep(0); };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    const { error } = await signInWithGoogle(role);
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
    // If no error, browser redirects to Google OAuth
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalPhoneError('');
    const cleaned = modalPhone.trim().replace(/[\s-]/g, '');
    if (!/^(05\d{8}|\+9705\d{8})$/.test(cleaned)) {
      setModalPhoneError(isRTL
        ? 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 أو +970 ويتكون من 10 أرقام.'
        : 'Invalid phone. Must start with 05 or +970 and be 10 digits.');
      return;
    }
    setModalLoading(true);
    const pendingRole = (localStorage.getItem('pending_role') as UserRole) || role;
    const { error } = await updateProfilePhone(cleaned, pendingRole);
    setModalLoading(false);
    if (error) {
      setModalPhoneError(error);
    } else {
      setModalPhone('');
      setModalPhoneError('');
      window.location.hash = '#/dashboard';
    }
  };

  // Frozen account screen
  if (profile?.frozen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-dark)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-brand-blue/20 flex items-center justify-center mx-auto mb-4">
            <Snowflake className="w-8 h-8 text-brand-blue-light" />
          </div>
          <h2 className="font-cairo font-bold text-xl mb-3">{isRTL ? 'تم تجميد حسابك' : 'Your account is frozen'}</h2>
          <p className="text-sm font-tajawal text-[var(--text-muted)] mb-2">{isRTL ? 'تم تعليق حسابك من قبل إدارة المنصة.' : 'Your account has been suspended by the platform administration.'}</p>
          {profile.freeze_reason && (
            <div className="glass rounded-xl p-3 mb-4 text-sm font-tajawal text-status-emergency">
              {isRTL ? 'السبب: ' : 'Reason: '}{profile.freeze_reason}
            </div>
          )}
          <p className="text-xs font-tajawal text-[var(--text-muted)] mb-4">{isRTL ? 'للتواصل مع الدعم:' : 'Contact support:'}</p>
          <a href={getDonationWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="btn-primary w-full flex items-center justify-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {isRTL ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-30" />
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green w-[500px] h-[500px] -top-40 -right-40 animate-blob" />
        <div className="mesh-blob bg-brand-blue w-[400px] h-[400px] -bottom-20 -left-20 animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
          <a href="#hero" className="inline-flex items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-brand-green-light" />
            <span className="font-cairo font-extrabold text-xl">دواء وشفاء</span>
          </a>
          <p className="text-sm font-tajawal text-[var(--text-muted)]">{t('auth.joinPlatform')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="glass-card p-6 lg:p-8">
          <AnimatePresence mode="wait" custom={dir}>
            {step === 0 ? (
              <motion.div key="role" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-3">
                <h3 className="font-cairo font-bold text-lg text-center mb-4">{t('auth.howUse')}</h3>
                {roles.map((r, i) => (
                  <motion.button
                    key={r.key}
                    onClick={() => pickRole(r.key)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: i * 0.1 } }}
                    whileHover={{ scale: 1.02, x: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:border-brand-green transition-all cursor-hover group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-${r.color}/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <r.icon className={`w-6 h-6 text-${r.color === 'brand-green' ? 'brand-green-light' : r.color === 'brand-blue' ? 'brand-blue-light' : r.color}`} />
                    </div>
                    <div className="text-right flex-1">
                      <div className="font-cairo font-bold text-base">{r.label}</div>
                      <div className="text-sm text-[var(--text-muted)] font-tajawal">{r.desc}</div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-brand-green-light opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div key="google" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={backToRole} className="flex items-center gap-1 text-xs text-brand-blue-light hover:underline">
                    <ArrowLeft className="w-3 h-3 rotate-180" /> {t('auth.back')}
                  </button>
                  <span className="text-sm font-tajawal text-[var(--text-muted)]">{t('auth.role')}:</span>
                  <span className="text-sm font-bold text-brand-green-light">{roles.find((r) => r.key === role)?.label}</span>
                </div>

                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <GoogleIcon />
                  </motion.div>
                  <h3 className="font-cairo font-bold text-lg mb-2">{isRTL ? 'تسجيل الدخول' : 'Sign In'}</h3>
                  <p className="text-sm font-tajawal text-[var(--text-soft)] leading-relaxed">
                    {isRTL
                      ? 'اضغط الزر أدناه للمتابعة باستخدام حساب Google الخاص بك'
                      : 'Click the button below to continue with your Google account'}
                  </p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-xl p-3 text-sm text-status-emergency font-tajawal bg-status-emergency/10">
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-3 hover:border-brand-green transition-all cursor-hover disabled:opacity-50"
                >
                  {googleLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <GoogleIcon />
                      <span className="font-tajawal font-bold text-sm">{isRTL ? 'تسجيل الدخول بواسطة Google' : 'Continue with Google'}</span>
                    </>
                  )}
                </motion.button>

                <div className="flex items-center gap-2 justify-center text-xs font-tajawal text-[var(--text-muted)]">
                  <CheckCircle className="w-3.5 h-3.5 text-status-open" />
                  <span>{t('auth.freeSecure')}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="text-center mt-4">
          <a href="#hero" className="text-sm font-tajawal text-[var(--text-muted)] hover:text-brand-green-light transition-colors">{t('auth.backToSite')}</a>
        </div>
      </div>

      {/* Phone Collection Modal — non-dismissible, post Google OAuth */}
      <AnimatePresence>
        {needsPhoneCollection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-brand-green-light" />
                </div>
                <h2 className="font-cairo font-bold text-xl mb-2">{isRTL ? 'إكمال البيانات الأساسية' : 'Complete Basic Information'}</h2>
                <p className="text-sm font-tajawal text-[var(--text-soft)]">
                  {isRTL ? 'يرجى إدخال رقم هاتفك لإكمال التسجيل' : 'Please enter your phone number to complete registration'}
                </p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-brand-green-light" style={{ [isRTL ? 'right' : 'left']: '1rem' }} />
                    <input
                      type="tel"
                      value={modalPhone}
                      onChange={(e) => { setModalPhone(e.target.value); setModalPhoneError(''); }}
                      placeholder="05XXXXXXXX"
                      className={`w-full glass rounded-xl py-3 px-4 font-tajawal ${isRTL ? 'pr-12' : 'pl-12'} ${modalPhoneError ? 'border-status-emergency' : ''}`}
                      autoFocus
                    />
                  </div>
                  {modalPhoneError && (
                    <p className="text-xs text-status-emergency font-tajawal mt-1">{modalPhoneError}</p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={modalLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {modalLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>{isRTL ? 'حفظ ومتابعة' : 'Save & Continue'}</span>
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
