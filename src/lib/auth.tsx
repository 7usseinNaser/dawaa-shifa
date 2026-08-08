import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  isRecovery: boolean;
  clearRecovery: () => void;
  signUp: (email: string, password: string, role: UserRole, displayName: string, phone?: string) => Promise<{ error: string | null }>;
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
  if (m.includes('email not confirmed') || m.includes('email_not_confirmed'))
    return isRTL ? 'يرجى تأكيد بريدك الإلكتروني أولاً.' : 'Please confirm your email first.';
  if (m.includes('user already registered'))
    return isRTL ? 'هذا الحساب مسجّل بالفعل. حاول تسجيل الدخول.' : 'This account is already registered. Try logging in.';
  if (m.includes('password should be') || m.includes('weak'))
    return isRTL ? 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.' : 'Password is too weak. Use at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many'))
    return isRTL ? 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.' : 'Too many attempts. Please wait and try again.';
  if (m.includes('over_request_rate_limit') || m.includes('over_email_send_rate_limit'))
    return isRTL ? 'تم إرسال الكثير من الطلبات. انتظر دقيقة ثم حاول مجددًا.' : 'Too many requests sent. Wait a minute and try again.';
  if (m.includes('signup disabled') || m.includes('signups not allowed'))
    return isRTL ? 'التسجيل غير مفعّل حاليًا. تواصل مع الإدارة.' : 'Sign-ups are currently disabled. Contact support.';
  return isRTL ? `تعذّر تسجيل الدخول: ${msg}` : `Login failed: ${msg}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
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
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    let attempts = 0;
    const loadProfile = async (): Promise<void> => {
      attempts++;
      const { data, error } = await supabase
        .from('profiles')
        .select('id,display_name,email,phone,role,unique_id,verified,deleted_at,banned,frozen,freeze_reason,created_at,welcome_notification_sent')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        console.error('[auth] profile fetch error:', error.code, error.message, error.details);
        if (attempts < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempts));
          return loadProfile();
        }
        setProfileError('تعذّر تحميل بيانات الحساب. حاول مرة أخرى.');
        setProfileLoading(false);
        return;
      }
      if (data) {
        const profileData = data as Profile;
        if (profileData.role === 'admin' && user.email !== AUTHORIZED_ADMIN_EMAIL) {
          profileData.role = 'citizen';
        }
        setProfile(profileData);
      } else {
        console.warn('[auth] no profile row for user', user.id, '— trigger may have failed');
        setProfileError('لم يتم العثور على ملفك الشخصي. تواصل مع الدعم.');
      }
      setProfileLoading(false);
    };
    loadProfile();
  }, [user]);

  const signUp = async (email: string, password: string, role: UserRole, displayName: string, phone?: string) => {
    try {
      // Frontend guard: never allow admin role from the UI
      const safeRole: UserRole = role === 'admin' ? 'citizen' : role;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: safeRole, full_name: displayName, display_name: displayName, phone: phone || '' } },
      });
      if (error) return { error: translateAuthError(error.message, 'ar') };
      if (data.user) {
        setProfile({ id: data.user.id, role: safeRole, display_name: displayName, phone: phone || '', verified: false, deleted_at: null, banned: false, frozen: false, freeze_reason: null, email: data.user.email || null, created_at: new Date().toISOString() });
      }
      return { error: null };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[auth] signIn error:', error.code, error.message);
        return { error: translateAuthError(error.message, 'ar') };
      }
      if (data.user) {
        setProfileLoading(true);
        setUser(data.user);
        setSession(data.session);
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
    <AuthContext.Provider value={{ user, session, profile, loading, profileLoading, profileError, isRecovery, clearRecovery, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
