import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createInitialState, type AppState } from '../lib/storage';
import { reportError } from '../lib/monitoring';
import { useProgress } from '../state/ProgressContext';
import { getSupabase, isCloudEnabled } from './client';
import { mergeStates } from './merge';
import { fetchRemote, pushChanges } from './remote';

export type SyncStatus = 'local-only' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncApi {
  enabled: boolean;
  email: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  /** Emails a one-time sign-in link. */
  signIn: (email: string) => Promise<void>;
  /** Signs out and clears this device's copy (it's safe in the cloud). */
  signOut: () => Promise<void>;
  syncNow: () => void;
}

const SyncContext = createContext<SyncApi | null>(null);

const PUSH_DELAY_MS = 800;
const REFRESH_MIN_INTERVAL_MS = 30_000;

/**
 * Local-first sync: progress always saves to this browser immediately, then
 * (when signed in) is merged with the cloud copy on sign-in, focus and
 * reconnect, and incremental changes are pushed shortly after they happen.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, replaceState } = useProgress();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SyncStatus>(isCloudEnabled ? 'signed-out' : 'local-only');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  /** The state the cloud is known to hold; pushes send the difference from it. */
  const synced = useRef<AppState | null>(null);
  const busy = useRef(false);
  const lastFullSync = useRef(0);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let unsubscribe = () => {};
    getSupabase().then((sb) => {
      if (!sb) return;
      setClient(sb);
      sb.auth.getSession().then(({ data }) => setSession(data.session));
      const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => unsubscribe();
  }, []);

  const fail = useCallback((err: unknown) => {
    setStatus(navigator.onLine ? 'error' : 'offline');
    if (navigator.onLine) reportError(err);
  }, []);

  const fullSync = useCallback(async () => {
    if (!client || !userId || busy.current) return;
    busy.current = true;
    setStatus('syncing');
    try {
      const remote = await fetchRemote(client, userId);
      // Never mix another account's progress into this one.
      const adopt = (s: AppState): AppState =>
        s.syncedUserId && s.syncedUserId !== userId ? { ...createInitialState(), settings: s.settings } : s;
      const merged: AppState = { ...mergeStates(adopt(stateRef.current), remote), syncedUserId: userId };
      await pushChanges(client, userId, remote, merged);
      synced.current = merged;
      // Keep anything the user did while we were talking to the server.
      replaceState((current) => ({ ...mergeStates(adopt(current), merged), syncedUserId: userId }));
      lastFullSync.current = Date.now();
      setLastSyncedAt(Date.now());
      setStatus('synced');
    } catch (err) {
      fail(err);
    } finally {
      busy.current = false;
    }
  }, [client, userId, replaceState, fail]);

  // Sign-in (or a returning session) triggers a full merge.
  useEffect(() => {
    synced.current = null;
    if (userId) fullSync();
    else if (isCloudEnabled) setStatus('signed-out');
  }, [userId, fullSync]);

  // Pick up changes from other devices when coming back to the tab or online.
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      if (Date.now() - lastFullSync.current > REFRESH_MIN_INTERVAL_MS) fullSync();
    };
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    window.addEventListener('online', fullSync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', fullSync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, fullSync]);

  // Push local changes shortly after they happen.
  useEffect(() => {
    if (!client || !userId || !synced.current || state === synced.current) return;
    const timer = setTimeout(async () => {
      const base = synced.current;
      if (!base || busy.current) return;
      busy.current = true;
      setStatus('syncing');
      try {
        const next = stateRef.current;
        await pushChanges(client, userId, base, next);
        synced.current = next;
        setLastSyncedAt(Date.now());
        setStatus('synced');
      } catch (err) {
        fail(err); // `synced` is unchanged, so the next push retries the same diff
      } finally {
        busy.current = false;
      }
    }, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, client, userId, fail]);

  const signIn = useCallback(
    async (email: string) => {
      if (!client) throw new Error('Cloud sync is not configured');
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}account` },
      });
      if (error) throw error;
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    // Upload anything not yet pushed before this device's copy is cleared.
    if (userId && synced.current && stateRef.current !== synced.current) {
      try {
        await pushChanges(client, userId, synced.current, stateRef.current);
      } catch (err) {
        reportError(err);
      }
    }
    await client.auth.signOut();
    synced.current = null;
    replaceState((s) => ({ ...createInitialState(), settings: s.settings }));
  }, [client, userId, replaceState]);

  const api = useMemo<SyncApi>(
    () => ({
      enabled: isCloudEnabled,
      email: session?.user.email ?? null,
      status,
      lastSyncedAt,
      signIn,
      signOut,
      syncNow: () => void fullSync(),
    }),
    [session, status, lastSyncedAt, signIn, signOut, fullSync],
  );

  return <SyncContext.Provider value={api}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncApi {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
