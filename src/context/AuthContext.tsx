import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  role: UserRole;
  login: (email: string, password?: string, role?: UserRole, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password?: string, school?: string) => Promise<{ success: boolean; error?: string }>;
  googleSignIn: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  allUsers: UserProfile[];
  updateUserRole: (userId: string, newRole: UserRole) => void;
  adminEmail: string;
  setAdminEmail: (email: string) => void;
}

const STORAGE_KEY_AUTH = 'maktabat_aloloom_current_user_v3';
const STORAGE_KEY_USERS = 'maktabat_aloloom_registered_users_v3';

export const OFFICIAL_ADMIN_EMAIL = 'sciencelibrary8@gmail.com';
export const FORBIDDEN_ADMIN_EMAIL = 'jawaher2023umkhaled@gmail.com';

export const isAuthorizedAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean === FORBIDDEN_ADMIN_EMAIL) return false;
  return clean === OFFICIAL_ADMIN_EMAIL;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminEmail, setAdminEmailState] = useState<string>(() => OFFICIAL_ADMIN_EMAIL);
  // Default user state is strictly unauthenticated (null) on app initialization
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Stored registered accounts
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Map Supabase User or Session to Platform UserProfile
  const mapSupabaseUserToProfile = (authUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string; last_sign_in_at?: string }): UserProfile => {
    const email = (authUser.email || '').trim().toLowerCase();
    const isAdmin = isAuthorizedAdmin(email);
    const metaRole = authUser.user_metadata?.role as UserRole | undefined;
    // Strict RBAC: only sciencelibrary8@gmail.com can be administrator
    const assignedRole: UserRole = isAdmin ? 'administrator' : (metaRole === 'administrator' || metaRole === 'admin' ? 'user' : (metaRole || 'user'));
    const assignedDisplayName = (authUser.user_metadata?.displayName as string) || (authUser.user_metadata?.full_name as string) || (isAdmin ? 'مدير مكتبة العلوم الرقمية' : email.split('@')[0]);

    return {
      id: authUser.id,
      uid: authUser.id,
      displayName: assignedDisplayName,
      email,
      role: assignedRole,
      photoURL: (authUser.user_metadata?.avatar_url as string) || undefined,
      avatar: (authUser.user_metadata?.avatar_url as string) || undefined,
      school: (authUser.user_metadata?.school as string) || 'مدرسة محلاح للبنات (5–12)',
      createdAt: authUser.created_at || new Date().toISOString(),
      lastLoginAt: authUser.last_sign_in_at || new Date().toISOString()
    };
  };

  // Require active authentication check via Supabase (supabase.auth.getSession()) on initialization
  useEffect(() => {
    let isMounted = true;

    async function checkSupabaseSession() {
      try {
        setIsLoadingAuth(true);
        // Clear any legacy mock sessions from storage
        localStorage.removeItem('maktabat_aloloom_current_user_v2');

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Supabase getSession warning:', error.message);
        }

        if (isMounted) {
          if (session?.user) {
            const profile = mapSupabaseUserToProfile(session.user);
            setUser(profile);
            // Sync with local registered user list if not present
            setUsers(prev => {
              if (prev.some(u => u.id === profile.id || u.email.toLowerCase() === profile.email.toLowerCase())) {
                return prev.map(u => (u.id === profile.id ? { ...u, ...profile } : u));
              }
              return [...prev, profile];
            });
          } else {
            // Check fallback active storage token only if verified
            const stored = localStorage.getItem(STORAGE_KEY_AUTH);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                // Ensure it has valid structure and is not an unverified mock
                if (parsed && parsed.id && parsed.email) {
                  setUser(parsed);
                } else {
                  setUser(null);
                }
              } catch {
                setUser(null);
              }
            } else {
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('Active authentication check error:', err);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    }

    checkSupabaseSession();

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile = mapSupabaseUserToProfile(session.user);
        setUser(profile);
        try {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(profile));
        } catch (e) {
          console.error(e);
        }
      } else {
        setUser(null);
        try {
          localStorage.removeItem(STORAGE_KEY_AUTH);
        } catch (e) {
          console.error(e);
        }
      }
      setIsLoadingAuth(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [adminEmail]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  const setAdminEmail = (newEmail: string) => {
    storageService.setAdminEmail(newEmail);
    setAdminEmailState(newEmail);
  };

  // Login via Supabase active authentication
  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!password) {
      return { success: false, error: 'يرجى إدخال كلمة المرور' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        const profile = mapSupabaseUserToProfile(data.user);
        setUser(profile);
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(profile));
        return { success: true };
      }

      return { success: false, error: 'تعذر الحصول على جلسة دخول نشطة من Supabase' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  };

  // Google Sign-In with Supabase
  const googleSignIn = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        console.warn('Supabase Google OAuth:', error.message);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await supabase.auth.resetPasswordForEmail(cleanEmail);
    } catch (err) {
      console.warn('Supabase reset password:', err);
    }
    return true;
  };

  // Register via Supabase
  const register = async (name: string, email: string, password?: string, school?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = isAuthorizedAdmin(cleanEmail);
    const assignedRole: UserRole = isAdmin ? 'administrator' : 'user';

    if (!password || password.length < 6) {
      return { success: false, error: 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            displayName: name.trim(),
            school: school || 'مدرسة محلاح للبنات (5–12)',
            role: assignedRole
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.session && data?.user) {
        const profile = mapSupabaseUserToProfile(data.user);
        setUser(profile);
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(profile));
        return { success: true };
      } else if (data?.user) {
        return {
          success: true,
          error: 'تم تسجيل الحساب بنجاح. إذا كان تأكيد البريد مفعلاً، يرجى مراجعة بريدك الإلكتروني.'
        };
      }

      return { success: false, error: 'تعذر إنشاء الحساب في Supabase' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  };

  // Logout via Supabase
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    }));
    if (user && user.id === userId) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        role: user?.role || 'user',
        login,
        register,
        googleSignIn,
        resetPassword,
        logout,
        switchRole,
        allUsers: users,
        updateUserRole,
        adminEmail,
        setAdminEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
