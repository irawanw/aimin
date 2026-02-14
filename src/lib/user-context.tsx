'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '@/types';
import { getMe, logout as apiLogout } from './auth-client';

interface UserContextType {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getMe();
      if ('user' in res) setUser(res.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    window.location.href = '/';
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <UserContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
