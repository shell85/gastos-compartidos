import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserRow } from '../types/database';
import { createConfiguredClient } from './supabase';
import { clearStoredConfig, getStoredConfig, getStoredCurrentUserId, setStoredCurrentUserId, type StoredConfig } from './config';
import { getUsers } from '../services/data';

interface AppContextValue {
  config: StoredConfig | null;
  client: SupabaseClient<Database> | null;
  users: UserRow[];
  activeUsers: UserRow[];
  currentUser: UserRow | null;
  loadingUsers: boolean;
  setCurrentUserId: (id: string) => void;
  refreshUsers: () => Promise<void>;
  connect: (config: StoredConfig) => void;
  disconnect: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoredConfig | null>(() => getStoredConfig());
  const [client, setClient] = useState<SupabaseClient<Database> | null>(() => {
    const initial = getStoredConfig();
    return initial ? createConfiguredClient(initial) : null;
  });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(Boolean(config));
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(() => getStoredCurrentUserId());

  const refreshUsers = useCallback(async () => {
    if (!client) return;
    setLoadingUsers(true);
    try {
      setUsers(await getUsers(client));
    } finally {
      setLoadingUsers(false);
    }
  }, [client]);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  const connect = useCallback((nextConfig: StoredConfig) => {
    localStorage.setItem('expenses_app.supabase_url', nextConfig.url.trim());
    localStorage.setItem('expenses_app.supabase_key', nextConfig.key.trim());
    const nextClient = createConfiguredClient(nextConfig);
    setConfig(nextConfig);
    setClient(nextClient);
    setCurrentUserIdState(getStoredCurrentUserId());
  }, []);

  const disconnect = useCallback(() => {
    clearStoredConfig();
    setConfig(null);
    setClient(null);
    setUsers([]);
    setCurrentUserIdState(null);
  }, []);

  const setCurrentUserId = useCallback((id: string) => {
    setStoredCurrentUserId(id);
    setCurrentUserIdState(id);
  }, []);

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);
  const currentUser = useMemo(() => users.find((user) => user.id === currentUserId && user.active) ?? null, [users, currentUserId]);

  const value = useMemo(() => ({ config, client, users, activeUsers, currentUser, loadingUsers, setCurrentUserId, refreshUsers, connect, disconnect }), [config, client, users, activeUsers, currentUser, loadingUsers, setCurrentUserId, refreshUsers, connect, disconnect]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
