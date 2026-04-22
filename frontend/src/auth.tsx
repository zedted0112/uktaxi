import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User } from './api';

const STORAGE_KEY = 'utk_auth_v1';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached: User = JSON.parse(raw);
          // re-validate against backend
          try {
            const fresh = await api.me(cached.phone);
            setUser(fresh);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
          } catch {
            setUser(cached);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (u: User) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const refresh = async () => {
    if (!user) return;
    const fresh = await api.me(user.phone);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setUser(fresh);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
