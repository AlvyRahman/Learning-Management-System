'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getToken, loginUser, registerUser, setToken, fetchMe } from '@/lib/api';
import { StrapiUser, Role } from '@/lib/types';
import { useRouter } from 'next/navigation';

export interface AuthCtx {
  user: StrapiUser | null;
  loading: boolean;
  role: Role | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StrapiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me as StrapiUser);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const role = (user?.role?.type || null) as Role | null;

  const login = async (identifier: string, password: string) => {
    const u = await loginUser(identifier, password);
    setUser(u as StrapiUser);
    router.push('/');
  };

  const register = async (username: string, email: string, password: string) => {
    const u = await registerUser(username, email, password);
    setUser(u as StrapiUser);
    router.push('/');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    router.push('/');
  };

  const hasRole = (...roles: Role[]) => (role ? roles.includes(role) : false);

  return (
    <AuthContext.Provider value={{ user, loading, role, login, register, logout, hasRole, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}