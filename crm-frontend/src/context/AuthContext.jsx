import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/api';
import { MOCK_USER } from '../api/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    // در حالت پیش‌نمایش بدون بک‌اند
    const res = await authService.login(identifier, password);
    const { access_token, refresh_token, user: u } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};