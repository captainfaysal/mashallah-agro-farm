import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = checking
  useEffect(() => { api.get('/auth/me').then(setUser).catch(() => setUser(null)); }, []);
  const login = async (email, password) => setUser(await api.post('/auth/login', { email, password }));
  const logout = async () => { await api.post('/auth/logout'); setUser(null); };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
