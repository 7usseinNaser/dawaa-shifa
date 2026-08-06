import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, CircleCheck as CheckCircle, Lock, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function ResetPasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      supabase.auth.signOut();
      onSuccess();
    }, 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-30" />
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green w-[500px] h-[500px] -top-40 -right-40 animate-blob" />
        <div className="mesh-blob bg-brand-blue w-[400px] h-[400px] -bottom-20 -left-20 animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <a href="#hero" className="inline-flex items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-brand-green-light" />
            <span className="font-cairo font-extrabold text-xl">{isRTL ? 'دواء وشفاء' : 'Dawaa & Shifa'}</span>
          </a>
          <p className="text-sm font-tajawal text-[var(--text-muted)]">
            {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset your password'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-status-open/20 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-status-open" />
              </motion.div>
              <h3 className="font-cairo font-bold text-lg mb-2">
                {isRTL ? 'تم تحديث كلمة المرور' : 'Password updated'}
              </h3>
              <p className="text-sm font-tajawal text-[var(--text-muted)]">
                {isRTL ? 'سيتم تحويلك لصفحة الدخول...' : 'Redirecting to login...'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="glass-card p-6 lg:p-8"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">
                    {isRTL ? 'كلمة المرور الجديدة' : 'New password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoFocus
                      className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                  {password && (
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength >= i
                              ? passwordStrength <= 1
                                ? 'bg-status-emergency'
                                : passwordStrength <= 2
                                ? 'bg-status-busy'
                                : 'bg-status-open'
                              : 'bg-[var(--border-subtle)]'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-tajawal mb-1.5 text-[var(--text-soft)]">
                    {isRTL ? 'تأكيد كلمة المرور' : 'Confirm password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full glass rounded-xl pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-xl p-3 text-sm text-status-emergency font-tajawal bg-status-emergency/10 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full btn-primary flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{isRTL ? 'تحديث كلمة المرور' : 'Update password'}</span>
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
