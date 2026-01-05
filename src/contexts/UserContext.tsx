// massivamovilerp/src/contexts/UserContext.tsx
"use client";

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession, SessionProvider } from 'next-auth/react';
import { UserRole } from '@prisma/client'; // Assuming UserRole enum is imported from Prisma client

// Define the shape of the user object from NextAuth session
interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole; // Assuming role is part of the session
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const user: User | null = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role,
  } : null;

  const isAuthLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const login = useCallback(async (email, password) => {
    try {
      const result = await nextAuthSignIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        return { success: false, error: 'Credenciales inválidas.' };
      }

      router.push('/dashboard');
      return { success: true };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Ocurrió un error inesperado.' };
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await nextAuthSignOut({ redirect: false, callbackUrl: '/auth/login' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const contextValue = {
    user,
    isAuthenticated,
    login,
    logout,
    isAuthLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
