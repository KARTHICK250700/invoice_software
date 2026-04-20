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

// Render free tier cold-start can take 60–120 s.
// Each attempt uses a 90 s timeout. We retry up to 5 times with 8 s between tries.
// Total patience: 5 × 90 s + 4 × 8 s = ~482 s (~8 min) — more than enough.
const MAX_ATTEMPTS    = 5;
const REQUEST_TIMEOUT = 90_000;   // 90 s per request
const RETRY_DELAY     = 8_000;    // 8 s between retries

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Fire a lightweight health ping as soon as the app loads so Render starts
 * waking the dyno immediately — before the user has even clicked Sign In.
 * Completely fire-and-forget; never throws.
 */
async function pingBackend(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout?.(5_000) ?? undefined,
    });
  } catch {
    // Backend still sleeping — that's fine, the ping just kicked off the wake
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                     = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]               = useState(true);
  const [serverWaking, setServerWaking]     = useState(false);

  axios.defaults.baseURL = API_BASE_URL;

  useEffect(() => {
    // Always send a silent wake-ping immediately so Render starts booting ASAP
    pingBackend();

    const token = localStorage.getItem('access_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  /** Verify the stored token; retries patiently for Render cold-start. */
  const fetchCurrentUser = async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await axios.get('/api/auth/me', { timeout: REQUEST_TIMEOUT });
        setServerWaking(false);
        setUser(response.data);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      } catch (error: any) {
        const status = error?.response?.status;

        // 401 / 403 → token is genuinely invalid, stop immediately
        if (status === 401 || status === 403) {
          localStorage.removeItem('access_token');
          delete axios.defaults.headers.common['Authorization'];
          setIsAuthenticated(false);
          setUser(null);
          setServerWaking(false);
          setLoading(false);
          return;
        }

        // Network error / timeout / 5xx → backend still cold-starting
        if (attempt === 1) setServerWaking(true);   // show banner after first fail
        if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY);
      }
    }

    // All attempts exhausted — show login, but keep the token so next load works
    setServerWaking(false);
    setIsAuthenticated(false);
    setUser(null);
    setLoading(false);
  };

  /**
   * Login — also retries on timeout/network errors so Render cold-start
   * doesn't silently kill the Sign In button.
   * Returns true on success, false on bad credentials, throws on total failure.
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    const LOGIN_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= LOGIN_ATTEMPTS; attempt++) {
      try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await axios.post('/api/auth/token', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: REQUEST_TIMEOUT,
        });

        const { access_token, user: userData } = response.data;

        localStorage.setItem('access_token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

        setUser(userData);
        setIsAuthenticated(true);
        return true;
      } catch (error: any) {
        const status = error?.response?.status;

        // Wrong credentials — no point retrying
        if (status === 401 || status === 422) return false;

        // Network / timeout (Render cold-start) → retry
        if (attempt < LOGIN_ATTEMPTS) {
          await sleep(RETRY_DELAY);
        } else {
          console.error('Login failed after retries:', error);
          return false;
        }
      }
    }
    return false;
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
