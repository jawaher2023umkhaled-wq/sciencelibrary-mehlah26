import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  role: UserRole;
  login: (email: string, role?: UserRole, displayName?: string) => Promise<boolean>;
  googleSignIn: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  register: (name: string, email: string) => Promise<boolean>;
  allUsers: UserProfile[];
  updateUserRole: (userId: string, newRole: UserRole) => void;
  adminEmail: string;
  setAdminEmail: (email: string) => void;
}

const STORAGE_KEY_AUTH = 'maktabat_aloloom_current_user_v2';
const STORAGE_KEY_USERS = 'maktabat_aloloom_all_users_v2';

// Initial pre-configured users with the school and administrator account
const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-admin-sciencelibrary8',
    uid: 'user-admin-sciencelibrary8',
    displayName: 'مدير مكتبة العلوم الرقمية',
    email: 'sciencelibrary8@gmail.com',
    role: 'administrator',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    school: 'مدرسة محلاح للبنات (5–12)',
    createdAt: '2026-09-01T08:00:00.000Z',
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'user-reviewer-1',
    uid: 'user-reviewer-1',
    displayName: 'المراجع الأكاديمي للعلوم',
    email: 'reviewer@muhlah.edu.om',
    role: 'reviewer',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
    photoURL: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
    school: 'مدرسة محلاح للبنات (5–12)',
    createdAt: '2026-09-02T08:00:00.000Z',
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'user-standard-1',
    uid: 'user-standard-1',
    displayName: 'عضو هيئة تدريس / مستخدم',
    email: 'teacher@muhlah.edu.om',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    school: 'مدرسة محلاح للبنات (5–12)',
    createdAt: '2026-09-05T08:00:00.000Z',
    lastLoginAt: new Date().toISOString()
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminEmail, setAdminEmailState] = useState<string>(() => storageService.getAdminEmail());

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_USERS;
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    // Default active user is the initial administrator profile for immediate full-feature access
    return DEFAULT_USERS[0];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const setAdminEmail = (newEmail: string) => {
    storageService.setAdminEmail(newEmail);
    setAdminEmailState(newEmail);
  };

  const login = async (email: string, role?: UserRole, displayName?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    let existing = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!existing) {
      // Check against configured admin email
      const isAdmin = cleanEmail === adminEmail.toLowerCase();
      const assignedRole: UserRole = isAdmin ? 'administrator' : (role || 'user');
      const assignedName = displayName || (isAdmin ? 'مدير مكتبة العلوم الرقمية' : cleanEmail.split('@')[0]);
      const newId = 'user-' + Date.now();
      
      existing = {
        id: newId,
        uid: newId,
        displayName: assignedName,
        email: cleanEmail,
        role: assignedRole,
        photoURL: isAdmin ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80' : undefined,
        avatar: isAdmin ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80' : undefined,
        school: 'مدرسة محلاح للبنات (5–12)',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      setUsers(prev => [...prev, existing!]);
    } else {
      existing = {
        ...existing,
        uid: existing.uid || existing.id,
        photoURL: existing.photoURL || existing.avatar,
        lastLoginAt: new Date().toISOString()
      };
    }

    setUser(existing);
    return true;
  };

  const googleSignIn = async (): Promise<boolean> => {
    // Google Sign-In with administrator account sciencelibrary8@gmail.com
    const email = 'sciencelibrary8@gmail.com';
    return await login(email, 'administrator', 'مدير مكتبة العلوم الرقمية (Google)');
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    // Simulate sending password reset email in Arabic
    console.log(`Password reset email sent to: ${cleanEmail}`);
    return true;
  };

  const register = async (name: string, email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === adminEmail.toLowerCase();
    const newId = 'user-' + Date.now();
    
    // Strict enforcement: New registrations are ALWAYS 'user' unless matching configured admin email
    const newUser: UserProfile = {
      id: newId,
      uid: newId,
      displayName: name.trim(),
      email: cleanEmail,
      role: isAdmin ? 'administrator' : 'user',
      school: 'مدرسة محلاح للبنات (5–12)',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    }));
    if (user && user.id === userId) {
      setUser(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role || 'user',
        login,
        googleSignIn,
        resetPassword,
        logout,
        switchRole,
        register,
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

