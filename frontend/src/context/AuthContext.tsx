import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/environment';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  serverWaking: boolean;   // true while waiting for Render cold-start
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = API_CONFIG.BASE_URL;

// Render free tier can take 60–90 s to cold-start.
// Strategy: 5 attempts × 60 s timeout, with 8 s between retries = up to ~5 min patience.
// After the first failure we set serverWaking=true so the UI can show a helpful banner.
const MAX_ATTEMPTS   = 5;
const ATTEMPT_TIMEOUT = 60_000;   // 60 s per request
const RETRY_DELAY     = 8_000;    // 8 s between retries

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [serverWaking, setServerWaking]   = useState(false);

  // Set up axios defaults
  axios.defaults.baseURL = API_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await axios.get('/api/auth/me', { timeout: ATTEMPT_TIMEOUT });
        setServerWaking(false);
        setUser(response.data);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      } catch (error: any) {
        const status = error?.response?.status;

        // Token genuinely invalid — log out immediately, no retry
        if (status === 401 || status === 403) {
          localStorage.removeItem('access_token');
          delete axios.defaults.headers.common['Authorization'];
          setIsAuthenticated(false);
          setUser(null);
          setServerWaking(false);
          setLoading(false);
          return;
        }

        // Network error / timeout / 5xx → backend is cold-starting
        if (attempt === 1) {
          // Show "server waking" banner after the very first failure
          setServerWaking(true);
        }

        if (attempt < MAX_ATTEMPTS) {
          // Wait before next retry
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
    }

    // All attempts exhausted — keep token (it may still be valid), show login so
    // user can manually retry. Token is NOT deleted here.
    setServerWaking(false);
    setIsAuthenticated(false);
    setUser(null);
    setLoading(false);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post('/api/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: ATTEMPT_TIMEOUT,
      });

      const { access_token, user: userData } = response.data;

      localStorage.setItem('access_token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      setUser(userData);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, serverWaking, login, logout }}>
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
