import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isRecovery: boolean;
  emailVerificationPending: boolean;
  clearRecovery: () => void;
  clearEmailVerificationPending: () => void;
  signUp: (email: string, password: string, role: UserRole, displayName: string, phone?: string) => Promise<{ error: string | null; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  resendVerification: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTHORIZED_ADMIN_EMAIL = 'hussein7.7naser@gmail.com';

function translateAuthError(msg: string, lang: 'ar' | 'en' = 'ar'): string {
  const m = msg.toLowerCase();
  const isRTL = lang === 'ar';
  if (m.includes('failed to fetch') || m.includes('networkrequestfailed') || m.includes('network error'))
    return isRTL ? 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' : 'Failed to connect to the server. Check your internet connection.';
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
  if (m.includes('user already registered'))
    return isRTL ? 'هذا الحساب مسجّل بالفعل. حاول تسجيل الدخول.' : 'This account is already registered. Try logging in.';
  if (m.includes('password should be') || m.includes('weak'))
    return isRTL ? 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.' : 'Password is too weak. Use at least 6 characters.';
  if (m.includes('email'))
    return isRTL ? 'البريد الإلكتروني غير صالح.' : 'Invalid email address.';
  if (m.includes('rate limit') || m.includes('too many'))
    return isRTL ? 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.' : 'Too many attempts. Please wait and try again.';
  return isRTL ? 'حدث خطأ غير متوقع. حاول مرة أخرى.' : 'An unexpected error occurred. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) setProfile(null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearRecovery = () => setIsRecovery(false);
  const clearEmailVerificationPending = () => setEmailVerificationPending(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,display_name,email,phone,role,unique_id,verified,deleted_at,banned,frozen,freeze_reason,created_at')
        .eq('id', user.id)
        .maybeSingle();
      if (!error && data) {
        const profileData = data as Profile;
        // Enforce admin restriction on the client too: only the authorized email may be admin
        if (profileData.role === 'admin' && user.email !== AUTHORIZED_ADMIN_EMAIL) {
          profileData.role = 'citizen';
        }
        setProfile(profileData);
      }
    })();
  }, [user]);

  const signUp = async (email: string, password: string, role: UserRole, displayName: string, phone?: string) => {
    try {
      // Frontend guard: never allow admin role from the UI
      const safeRole: UserRole = role === 'admin' ? 'citizen' : role;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: safeRole, display_name: displayName, phone: phone || '' } },
      });
      if (error) return { error: translateAuthError(error.message, 'ar') };
      // Do NOT set profile or session — user must verify email first.
      // The database trigger (set_new_user_verified) already created the
      // profiles row with role/phone/email synced from auth metadata.
      if (data.user) {
        setEmailVerificationPending(true);
        // Immediately sign out so no session lingers before verification
        await supabase.auth.signOut();
      }
      return { error: null, needsVerification: true };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          return { error: 'البريد الإلكتروني غير مسجل أو كلمة المرور غير صحيحة. تحقق من بياناتك.' };
        }
        return { error: translateAuthError(error.message, 'ar') };
      }
      // Block login if email is not verified
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return { error: 'يرجى تأكيد بريدك الإلكتروني أولاً عبر الرابط المرسل إلى إيميلك' };
      }
      // Send welcome notification on first login
      (async () => {
        try {
          const { data: { user: signedInUser } } = await supabase.auth.getUser();
          if (!signedInUser) return;
          // Check if welcome notification already sent
          const { data: profile } = await supabase
            .from('profiles')
            .select('welcome_notification_sent,display_name')
            .eq('id', signedInUser.id)
            .maybeSingle();
          if (profile?.welcome_notification_sent) return;
          const displayName = profile?.display_name || signedInUser.email?.split('@')[0] || '';
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', signedInUser.id)
            .eq('type', 'welcome')
            .maybeSingle();
          if (!existing) {
            await supabase.from('notifications').insert({
              user_id: signedInUser.id,
              type: 'welcome',
              title: `أهلاً ${displayName}!`,
              body: 'منصة "دواء وشفاء" تساعدك في البحث عن الأدوية القريبة ومعرفة ازدحام المستشفيات قبل التوجه إليها.',
              is_active: true,
              unread: true,
            });
          }
          await supabase.from('profiles').update({ welcome_notification_sent: true }).eq('id', signedInUser.id);
        } catch (err) {
          console.error('[welcomeNotification] Error:', err);
        }
      })();
      return { error: null };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    // No-client-storage policy: clear any residual cached data
    try {
      Object.keys(localStorage).forEach((k) => { if (k.startsWith('sb-') || k.startsWith('admin')) localStorage.removeItem(k); });
    } catch { /* ignore */ }
    try {
      Object.keys(sessionStorage).forEach((k) => { if (k.startsWith('sb-') || k.startsWith('admin')) sessionStorage.removeItem(k); });
    } catch { /* ignore */ }
  };

  const resendVerification = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) return { error: translateAuthError(error.message, 'ar') };
      return { error: null };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) return { error: translateAuthError(error.message, 'ar') };
      return { error: null };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isRecovery, clearRecovery, emailVerificationPending, clearEmailVerificationPending, signUp, signIn, signOut, resetPassword, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
