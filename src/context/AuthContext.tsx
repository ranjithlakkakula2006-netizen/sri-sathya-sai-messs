import React, { createContext, useContext, useState, useEffect } from 'react';
import { OwnerProfile } from '../types/restaurant';

interface AuthContextType {
  token: string | null;
  user: OwnerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sai_mess_admin_token'));
  const [user, setUser] = useState<OwnerProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('sai_mess_admin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('sai_mess_admin_token');
          localStorage.removeItem('sai_mess_admin_user');
        }
      } catch (e) {
        console.warn('Token verification error', e);
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('sai_mess_admin_token', data.token);
      localStorage.setItem('sai_mess_admin_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login connection failed' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('sai_mess_admin_token');
    localStorage.removeItem('sai_mess_admin_user');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token),
        isLoading,
        login,
        logout,
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
