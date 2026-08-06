import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, ArrowRight, Building2, CircleCheck as CheckCircle, Lock, Mail, MessageCircle, Phone, Pill, Snowflake, User } from 'lucide-react';
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

export default function AuthPage() {
  const { signIn, signUp, profile, resetPassword, emailVerificationPending, clearEmailVerificationPending } = useAuth();
  const { t, lang } = useLang();
  const isRTL = lang === 'ar';
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [role, setRole] = useState<UserRole>('citizen');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset password — fully separate state
  const [view, setView] = useState<'auth' | 'reset'>('auth');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const roles: { key: UserRole; label: string; desc: string; icon: typeof User; color: string }[] = [
    { key: 'citizen', label: t('auth.citizen'), desc: t('auth.citizenDesc'), icon: User, color: 'brand-green' },
    { key: 'pharmacist', label: t('auth.pharmacist'), desc: t('auth.pharmacistDesc'), icon: Pill, color: 'brand-blue' },
    { key: 'facility_owner', label: t('auth.facility_owner'), desc: t('auth.facilityDesc'), icon: Building2, color: 'status-busy' },
  ];

  const pickRole = (r: UserRole) => { setRole(r); setDir(1); setStep(1); };
  const backToRole = () => { setDir(-1); setStep(0); };
  const switchMode = (m: 'register' | 'login') => { setMode(m); setStep(m === 'login' ? 1 : 0); setError(''); };

  const passwordStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    return s;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPhoneError('');
    if (mode === 'register') {
      const cleaned = phone.trim().replace(/[\s-]/g, '');
      if (!/^(05\d{8}|\+9705\d{8})$/.test(cleaned)) {
        setPhoneError(isRTL
          ? 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 أو +970 ويتكون من 10 أرقام.'
          : 'Invalid phone. Must start with 05 or +970 and be 10 digits.');
        return;
      }
    }
    setLoading(true);
    if (mode === 'register') {
      const { error, needsVerification } = await signUp(email, password, role, name, phone.trim());
      if (error) setError(error);
      // If verification is needed, the auth context sets emailVerificationPending
      // and the verification screen is shown instead of logging in.
      if (needsVerification) { setLoading(false); return; }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setLoading(false);

    // After successful auth, check for redirect target in query string
    if (!error && profile) {
      const hashQuery = window.location.hash.split('?')[1];
      const params = new URLSearchParams(hashQuery);
      const redirect = params.get('redirect');
      if (redirect) {
        window.location.hash = '#/' + redirect.replace(/^\/+/, '');
      }
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    if (error) setResetError(error);
    else setResetSent(true);
    setResetLoading(false);
  };

  const goReset = () => {
    setView('reset');
    setResetEmail(email);
    setResetSent(false);
    setResetError('');
  };

  const backToLogin = () => {
    setView('auth');
    setResetSent(false);
    setResetError('');
  };

  // Auto-dismiss the reset success message after 5 seconds
  useEffect(() => {
    if (!resetSent) return;
    const timer = setTimeout(() => {
      setResetSent(false);
      setView('auth');
    }, 5000);
    return () => clearTimeout(timer);
  }, [resetSent]);

  // After successful auth, redirect to the intended page if present
  useEffect(() => {
    if (!profile) return;
    const hashQuery = window.location.hash.split('?')[1];
    const params = new URLSearchParams(hashQuery);
    const redirect = params.get('redirect');
    if (redirect) {
      window.location.hash = '#/' + redirect.replace(/^\/+/, '');
    }
  }, [profile]);

  if (emailVerificationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-30" />
        <div className="mesh-gradient">
          <div className="mesh-blob bg-brand-green w-[500px] h-[500px] -top-40 -right-40 animate-blob" />
          <div className="mesh-blob bg-brand-blue w-[400px] h-[400px] -bottom-20 -left-20 animate-blob" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-8 text-center">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-20 h-20 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-brand-green-light" />
            </motion.div>
            <h2 className="font-cairo font-bold text-xl mb-4">{isRTL ? 'تأكيد البريد الإلكتروني' : 'Email Verification'}</h2>
            <p className="text-sm font-tajawal text-[var(--text-soft)] leading-relaxed mb-6">
              {isRTL
                ? 'تم إرسال رابط تأكيد إلى بريدك الإلكتروني، يرجى فتح البريد والضغط على الرابط لتفعيل حسابك'
                : 'A confirmation link has been sent to your email. Please open your inbox and click the link to activate your account.'}
            </p>
            <div className="glass rounded-xl p-3 mb-6 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-status-open shrink-0 mt-0.5" />
              <p className="text-xs font-tajawal text-[var(--text-muted)] text-start">
                {isRTL
                  ? 'لن تتمكن من تسجيل الدخول حتى تقوم بتأكيد بريدك الإلكتروني. تحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها.'
                  : 'You will not be able to log in until you confirm your email. Check your inbox or spam folder.'}
              </p>
            </div>
            <motion.button
              onClick={() => { clearEmailVerificationPending(); setMode('login'); setStep(1); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <span>{isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}</span>
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

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
          <p className="text-sm font-tajawal text-[var(--text-muted)]">
            {view === 'reset'
              ? (isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset your password')
              : (mode === 'register' ? t('auth.joinPlatform') : t('auth.welcomeBack'))}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="glass-card p-6 lg:p-8">

          {/* ===== RESET PASSWORD VIEW (fully separate) ===== */}
          {view === 'reset' ? (
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {resetSent ? (
                  <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-status-open/20 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7 text-status-open" />
                    </div>
                    <p className="text-sm font-tajawal text-status-open">
                      {isRTL ? 'تم إرسال رابط إعادة التعيين إلى بريدك. تحقق من صندوق الوارد.' : 'Reset link sent to your email. Check your inbox.'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.form key="reset-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="email@example.com" required className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors" />
                      </div>
                    </div>

                    {resetError && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-xl p-3 text-sm text-status-emergency font-tajawal bg-status-emergency/10">
                        {resetError}
                      </motion.div>
                    )}

                    <motion.button type="submit" disabled={resetLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full btn-primary flex items-center justify-center gap-2 group disabled:opacity-50">
                      {resetLoading
                        ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><span>{isRTL ? 'إرسال رابط التعيين' : 'Send reset link'}</span><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /></>}
                    </motion.button>

                    <button type="button" onClick={backToLogin} className="text-xs font-tajawal text-[var(--text-muted)] hover:text-brand-green-light hover:underline w-full text-center">
                      {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              {/* ===== AUTH VIEW (login / register) ===== */}
              <div className="flex gap-2 p-1 glass rounded-full mb-6">
                {(['register', 'login'] as const).map((m) => (
                  <button key={m} onClick={() => switchMode(m)} className={`relative flex-1 py-2.5 rounded-full text-sm font-tajawal font-bold transition-colors ${mode === m ? 'text-white' : 'text-[var(--text-soft)]'}`}>
                    {mode === m && <motion.div layoutId="authPill" className="absolute inset-0 bg-brand-green rounded-full" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                    <span className="relative z-10">{m === 'register' ? t('auth.register') : t('auth.login')}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" custom={dir}>
                {mode === 'register' && step === 0 ? (
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
                  <motion.form key="details" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                      <div className="flex items-center gap-2 mb-2">
                        <button type="button" onClick={backToRole} className="flex items-center gap-1 text-xs text-brand-blue-light hover:underline">
                          <ArrowRight className="w-3 h-3" /> {t('auth.back')}
                        </button>
                        <span className="text-sm font-tajawal text-[var(--text-muted)]">{t('auth.role')}:</span>
                        <span className="text-sm font-bold text-brand-green-light">{roles.find((r) => r.key === role)?.label}</span>
                      </div>
                    )}

                    {mode === 'register' && (
                      <div>
                        <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.name')}</label>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth.fullName')} required className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors" />
                        </div>
                      </div>
                    )}
                    {mode === 'register' && (
                      <div>
                        <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.phone')}</label>
                        <div className="relative">
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                          <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }} placeholder={isRTL ? '0599123456' : '0599123456'} required dir="ltr" className={`w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none transition-colors ${phoneError ? 'border-red-500' : 'focus:border-brand-green'}`} />
                        </div>
                        {phoneError && <p className="text-xs text-red-400 mt-1 font-tajawal">{phoneError}</p>}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.email')}</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.password')}</label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors" />
                      </div>
                      {mode === 'register' && password && (
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= i ? passwordStrength <= 1 ? 'bg-status-emergency' : passwordStrength <= 2 ? 'bg-status-busy' : 'bg-status-open' : 'bg-[var(--border-subtle)]'}`} />
                          ))}
                        </div>
                      )}
                    </div>

                    {error && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-xl p-3 text-sm text-status-emergency font-tajawal bg-status-emergency/10">
                        {error}
                      </motion.div>
                    )}

                    {mode === 'login' && (
                      <button type="button" onClick={goReset} className="text-xs font-tajawal text-brand-blue-light hover:underline w-full text-left">
                        {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                      </button>
                    )}

                    <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full btn-primary flex items-center justify-center gap-2 group">
                      {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>{mode === 'register' ? t('auth.createAndLogin') : t('auth.login')}</span><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /></>}
                    </motion.button>

                    {mode === 'register' && (
                      <div className="flex items-center gap-2 justify-center text-xs font-tajawal text-[var(--text-muted)]">
                        <CheckCircle className="w-3.5 h-3.5 text-status-open" />
                        <span>{t('auth.freeSecure')}</span>
                      </div>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        <div className="text-center mt-4">
          <a href="#hero" className="text-sm font-tajawal text-[var(--text-muted)] hover:text-brand-green-light transition-colors">{t('auth.backToSite')}</a>
        </div>
      </div>
    </div>
  );
}
