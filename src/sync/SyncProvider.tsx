import { useEffect, useRef, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../auth/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useStore } from '../state/store';
import { SyncEngine, type StoreBridge } from './SyncEngine';
import { clearAllCloudSyncedState } from '../storage/localStorage';
import { seedState, SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../storage/seed';
import type { AppState } from '../storage/schema';
import * as syncStatus from './syncStatus';

/**
 * A local AppState has "user data" if it contains anything the user
 * created — user tasks, user-added categories or statuses, or trees.
 * Seed defaults alone do not count.
 */
export function hasLocalUserData(state: AppState): boolean {
  if (state.tasks.length > 0) return true;
  if (state.trees.length > 0) return true;
  const userCats = state.categories.filter((c) => !c.isSeeded);
  const userStats = state.statuses.filter((s) => !s.isSeeded);
  if (userCats.length > 0 || userStats.length > 0) return true;
  const expectedCats = Object.values(SEED_CATEGORY_IDS);
  const expectedStats = Object.values(SEED_STATUS_IDS);
  const missingSeedCat = expectedCats.some(
    (id) => !state.categories.some((c) => c.id === id),
  );
  const missingSeedStat = expectedStats.some(
    (id) => !state.statuses.some((s) => s.id === id),
  );
  return missingSeedCat || missingSeedStat;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const store = useStore();
  const engineRef = useRef<SyncEngine | null>(null);
  const storeListeners = useRef(new Set<() => void>());
  const stateRef = useRef(store.state);
  const dispatchRef = useRef(store.dispatch);

  // Keep imperative refs fresh for the SyncEngine bridge.
  stateRef.current = store.state;
  dispatchRef.current = store.dispatch;

  // Fan out store changes to the engine's subscribers.
  useEffect(() => {
    storeListeners.current.forEach((l) => l());
  }, [store.state]);

  // Start / stop the engine on auth transitions.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (auth.status !== 'signedIn' || !auth.userId) return;

    const bridge: StoreBridge = {
      getState: () => stateRef.current,
      dispatch: (action) => dispatchRef.current(action),
      subscribe: (listener) => {
        storeListeners.current.add(listener);
        return () => {
          storeListeners.current.delete(listener);
        };
      },
    };

    const engine = new SyncEngine({
      supabase,
      store: bridge,
      hasLocalUserData,
      promptReplaceLocal: async () =>
        window.confirm(
          'Signing in will replace your current device data with your cloud data. ' +
            'Tip: cancel, export your local data from Settings, then sign in again.',
        ),
    });

    engineRef.current = engine;
    void engine.start(auth.userId);

    return () => {
      engineRef.current = null;
      void engine.stop();
    };
  }, [auth.status, auth.userId]);

  // On sign-out: wipe local cloud-synced data and reseed the store.
  useEffect(() => {
    return auth.onSignedOut(() => {
      clearAllCloudSyncedState();
      dispatchRef.current({ type: 'replaceState', state: seedState() });
      syncStatus.set('synced');
    });
  }, [auth]);

  return <>{children}</>;
}
