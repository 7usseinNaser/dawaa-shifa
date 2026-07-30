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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkrequestfailed') || m.includes('network error'))
    return 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.';
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (m.includes('user already registered'))
    return 'هذا الحساب مسجّل بالفعل. حاول تسجيل الدخول.';
  if (m.includes('password should be') || m.includes('weak'))
    return 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.';
  if (m.includes('email'))
    return 'البريد الإلكتروني غير صالح.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
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
      if (!error && data) setProfile(data as Profile);
    })();
  }, [user]);

  const signUp = async (email: string, password: string, role: UserRole, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, display_name: displayName } },
      });
      if (error) return { error: translateAuthError(error.message) };
      if (data.user) {
        setProfile({ id: data.user.id, role, display_name: displayName, phone: '', verified: role === 'admin', deleted_at: null, banned: false, frozen: false });
      }
      return { error: null };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: translateAuthError(error.message) };
      return { error: null };
    } catch {
      return { error: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isRecovery, clearRecovery, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
