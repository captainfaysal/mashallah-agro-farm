import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => { api.get('/auth/me').then(setUser).catch(() => setUser(null)); }, []);
  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data.token) localStorage.setItem('token', data.token);
    setUser(data);
  };
  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    setUser(null);
  };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
