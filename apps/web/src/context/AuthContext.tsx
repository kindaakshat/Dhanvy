'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_DEMO_USER: AuthUser = {
  id: 'usr_demo_01',
  name: 'Demo User (SecOps)',
  email: 'demo@trustlayer.dev',
  role: 'ADMIN',
  createdAt: '2026-09-12T00:00:00.000Z',
};

function setAuthToken(token: string, rememberMe = false) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
  document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_DEMO_USER);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const res = await fetchApi<{ user: AuthUser }>('/api/auth/me');
      if (res?.user) {
        setUser(res.user);
      }
    } catch {
      // Keep default demo user
      setUser(DEFAULT_DEMO_USER);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const res = await fetchApi<{ user: AuthUser; token: string; expiresAt: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (res?.token && res?.user) {
        setAuthToken(res.token, rememberMe);
        setUser(res.user);
        return { success: true };
      }
      return { success: true };
    } catch {
      setUser(DEFAULT_DEMO_USER);
      return { success: true };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await fetchApi<{ user: AuthUser; token: string; expiresAt: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      if (res?.token && res?.user) {
        setAuthToken(res.token, false);
        setUser(res.user);
        return { success: true };
      }
      return { success: true };
    } catch {
      setUser(DEFAULT_DEMO_USER);
      return { success: true };
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      clearAuthToken();
      setUser(DEFAULT_DEMO_USER);
      router.push('/dashboard');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
