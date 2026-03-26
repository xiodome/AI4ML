import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { getMe, login as apiLogin } from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ai4ml_token'));
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await getMe();
      setUser(res.data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('ai4ml_token');
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    const { access_token } = res.data;
    localStorage.setItem('ai4ml_token', access_token);
    setToken(access_token);
    const meRes = await getMe();
    setUser(meRes.data);
  };

  const logout = () => {
    localStorage.removeItem('ai4ml_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isDeveloper: user?.role === 'developer' || user?.role === 'admin',
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
