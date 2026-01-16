'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Initialize Convex client - use environment variable or fallback for development
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://placeholder.convex.cloud';
const convex = new ConvexReactClient(convexUrl);

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'faculty' | 'student';
  isActive: boolean;
  studentId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  setAuth: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const TOKEN_KEY = 'smart_attend_token';
const USER_KEY = 'smart_attend_user';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

function setStoredAuth(token: string, user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

function clearStoredAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/kiosk'];

// Get the default dashboard for a role
function getDashboardForRole(role: string): string {
  if (role === 'student') return '/student';
  if (role === 'faculty' || role === 'admin') return '/teacher';
  return '/login';
}

// Check if user has access to a path
function hasAccessToPath(role: string, pathname: string): boolean {
  if (pathname.startsWith('/student')) {
    return role === 'student';
  }
  if (pathname.startsWith('/teacher') || pathname.startsWith('/admin')) {
    return role === 'faculty' || role === 'admin';
  }
  return true;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Load stored auth on mount
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Route protection
  useEffect(() => {
    if (!mounted || isLoading) return;

    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith('/kiosk')
    );

    if (!user && !isPublicRoute) {
      router.push('/login');
      return;
    }

    if (user) {
      const isProtectedRoute = ['/teacher', '/admin', '/student'].some((prefix) =>
        pathname.startsWith(prefix)
      );

      if (isProtectedRoute && !hasAccessToPath(user.role, pathname)) {
        router.push(getDashboardForRole(user.role));
        return;
      }

      if (pathname === '/login' || pathname === '/register' || pathname === '/') {
        router.push(getDashboardForRole(user.role));
      }
    }
  }, [mounted, isLoading, user, pathname, router]);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  const setAuth = useCallback((newUser: User, newToken: string) => {
    setStoredAuth(newToken, newUser);
    setUser(newUser);
    setToken(newToken);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading: !mounted || isLoading,
        isAuthenticated: !!user,
        logout,
        setAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}

// Export for direct usage
export { convex };
export function getToken(): string | null {
  return getStoredToken();
}
