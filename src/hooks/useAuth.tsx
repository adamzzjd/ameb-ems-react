import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import { normalizeRole, can as checkPermission, type Permission, type Role } from '../lib/roles';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: Role | null;
  isAdmin: boolean;
  can: (permission: Permission) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Role-based access control. The role is read from `app_metadata.role`
  // ONLY — app_metadata is server-controlled, so end users cannot elevate
  // themselves (user_metadata is client-editable and must not be trusted).
  // Set the role via the Supabase dashboard (Authentication → Users → edit
  // user) or with SQL:
  //   update auth.users set raw_app_meta_data =
  //     raw_app_meta_data || '{"role":"admin"}'::jsonb
  //   where email = 'admin@example.com';
  const role = normalizeRole(user?.app_metadata?.role);
  const isAdmin = role === 'admin' || role === 'super_admin';
  const can = useCallback((permission: Permission) => checkPermission(role, permission), [role]);

  return (
    <AuthContext.Provider value={{ user, session, loading, role, isAdmin, can, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
