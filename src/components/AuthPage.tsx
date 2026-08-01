import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Heart, Gift, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import type { UserRole } from '@/lib/types';

interface AuthPageProps {
  onSuccess: () => void;
  onBack: () => void;
}

// Palestinian phone validation: starts with 05 (10 digits) or +970 (12 digits after +)
function validatePalestinianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  const pattern = /^(05\d{8}|\+9705\d{8})$/;
  return pattern.test(cleaned);
}

export function AuthPage({ onSuccess, onBack }: AuthPageProps) {
  const { t, isRTL } = useLang();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    if (mode === 'register') {
      if (!validatePalestinianPhone(phone)) {
        setPhoneError(t('auth.phoneInvalid'));
        return;
      }
    }

    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) { setError(error); return; }
      onSuccess();
    } else {
      const { error } = await signUp(email, password, role, name, phone);
      setLoading(false);
      if (error) { setError(error); return; }
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 w-full max-w-md rounded-3xl"
      >
        <button onClick={onBack} className="text-sm text-[var(--text-muted)] mb-4 hover:text-[var(--text-primary)] transition-colors">
          ← {isRTL ? 'العودة للرئيسية' : 'Back to home'}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-cairo font-bold text-xl">{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>
            <p className="text-xs font-tajawal text-[var(--text-muted)]">دواء وشفاء — Dawaa Shifa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.name')}</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.fullName')} required
                    className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
                  />
                </div>
              </div>
              {/* Phone field — required, between Name and Email */}
              <div>
                <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.phone')}</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                    placeholder={t('auth.phonePlaceholder')} required dir="ltr"
                    className={`w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none transition-colors ${phoneError ? 'border-red-500' : 'focus:border-brand-green'}`}
                  />
                </div>
                {phoneError && <p className="text-xs text-red-400 mt-1 font-tajawal">{phoneError}</p>}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com" required dir="ltr"
                className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">{isRTL ? 'نوع الحساب' : 'Account Type'}</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'citizen', icon: Heart, label: t('auth.citizen') },
                  { v: 'pharmacist', icon: Gift, label: t('auth.pharmacist') },
                  { v: 'facility', icon: Building2, label: t('auth.facility') },
                ] as const).map(({ v, icon: Icon, label }) => (
                  <button
                    key={v} type="button" onClick={() => setRole(v)}
                    className={`p-2.5 rounded-xl text-center transition-all ${role === v ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${role === v ? 'text-brand-green-light' : 'text-[var(--text-muted)]'}`} />
                    <span className="text-xs font-tajawal">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400 font-tajawal text-center">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '...' : mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
          </button>
        </form>

        <p className="text-center text-sm font-tajawal text-[var(--text-muted)] mt-4">
          {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setPhoneError(null); }}
            className="text-brand-green-light font-bold hover:underline"
          >
            {mode === 'login' ? t('auth.registerBtn') : t('auth.loginBtn')}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
