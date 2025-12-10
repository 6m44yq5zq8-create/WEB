/**
 * Authentication context and hooks
 */
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL, TOKEN_KEY } from './config';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        // Verify token is still valid
        verifyToken(token);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      // Try to make an authenticated request to verify token
      const response = await axios.get(`${API_URL}/api/files/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          path: '',
        },
      });
      
      if (response.status === 200) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setIsAuthenticated(false);
      }
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        password,
      });

      const { token } = response.data;
      localStorage.setItem(TOKEN_KEY, token);
      setIsAuthenticated(true);
      
      // Redirect to home page
      router.push('/');
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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
