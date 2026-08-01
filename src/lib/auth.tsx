import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/lib/types';

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, role: UserRole, displayName: string, phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        setProfile({
          id: data.session.user.id,
          role: (data.session.user.user_metadata?.role as UserRole) || 'citizen',
          display_name: data.session.user.user_metadata?.display_name || '',
          phone: data.session.user.user_metadata?.phone || '',
          email: data.session.user.email || null,
        });
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setProfile({
          id: session.user.id,
          role: (session.user.user_metadata?.role as UserRole) || 'citizen',
          display_name: session.user.user_metadata?.display_name || '',
          phone: session.user.user_metadata?.phone || '',
          email: session.user.email || null,
        });
      } else {
        setProfile(null);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, role: UserRole, displayName: string, phone: string) => {
    const safeRole: UserRole = role === 'admin' ? 'citizen' : role;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: safeRole, display_name: displayName, phone } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      setProfile({ id: data.user.id, role: safeRole, display_name: displayName, phone, email: data.user.email || null });
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
