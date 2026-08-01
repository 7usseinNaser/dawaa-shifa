import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isRecovery: boolean;
  clearRecovery: () => void;
  signUp: (email: string, password: string, role: UserRole, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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

  const signUp = async (email: string, password: string, role: UserRole, displayName: string) => {
    try {
      // Frontend guard: never allow admin role from the UI
      const safeRole: UserRole = role === 'admin' ? 'citizen' : role;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: safeRole, display_name: displayName } },
      });
      if (error) return { error: translateAuthError(error.message, 'ar') };
      if (data.user) {
        setProfile({ id: data.user.id, role: safeRole, display_name: displayName, phone: '', verified: false, deleted_at: null, banned: false, frozen: false, freeze_reason: null, email: data.user.email || null, created_at: new Date().toISOString() });
      }
      return { error: null };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        // Supabase returns "Invalid login credentials" for both unknown email and wrong password.
        // To give a clearer message, we probe with resetPasswordForEmail which doesn't leak
        // existence but we can detect the specific case.
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          // Try to determine if the email exists by sending a reset link (rate-limited, doesn't send if disabled)
          // Since Supabase doesn't expose this, we provide a combined clear message
          return { error: 'البريد الإلكتروني غير مسجل أو كلمة المرور غير صحيحة. تحقق من بياناتك.' };
        }
        return { error: translateAuthError(error.message, 'ar') };
      }
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
    <AuthContext.Provider value={{ user, session, profile, loading, isRecovery, clearRecovery, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
