import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setApiToken, User } from './api';

const STORAGE_KEY = 'utk_auth_v1';
const LEGACY_STORAGE_KEY = 'utk_auth_v0';

type Session = { user: User; token: string };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (user: User, token: string) => Promise<void>;
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
          const cached: Session = JSON.parse(raw);
          setApiToken(cached.token);
          // Re-validate against backend with bearer token.
          try {
            const fresh = await api.me();
            setUser(fresh);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: fresh, token: cached.token }));
          } catch {
            setApiToken('');
            await AsyncStorage.removeItem(STORAGE_KEY);
            setUser(null);
          }
        } else {
          // Drop stale legacy user-only sessions after token migration.
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (u: User, token: string) => {
    setApiToken(token);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, token }));
    setUser(u);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setApiToken('');
    setUser(null);
  };

  const refresh = async () => {
    if (!user) return;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const cached: Session = JSON.parse(raw);
    setApiToken(cached.token);
    const fresh = await api.me();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: fresh, token: cached.token }));
    setUser(fresh);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
