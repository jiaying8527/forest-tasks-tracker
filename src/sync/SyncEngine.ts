import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { AppState } from '../storage/schema';
import type { Action } from '../state/actions';
import { debounce, type Debounced } from '../lib/debounce';
import { seedState } from '../storage/seed';
import * as syncStatus from './syncStatus';

export interface StoreBridge {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: () => void): () => void;
}

export interface SyncEngineOptions {
  supabase: SupabaseClient;
  store: StoreBridge;
  promptReplaceLocal: (cloud: AppState) => Promise<boolean>;
  hasLocalUserData: (state: AppState) => boolean;
  now?: () => number;
  debounceMs?: number;
}

const BACKOFF_STEPS_MS = [30_000, 120_000, 300_000];

export class SyncEngine {
  private supabase: SupabaseClient;
  private store: StoreBridge;
  private promptReplaceLocal: SyncEngineOptions['promptReplaceLocal'];
  private hasLocalUserData: SyncEngineOptions['hasLocalUserData'];
  private debounceMs: number;

  private userId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private lastCloudUpdatedAt: string | null = null;
  private backoffIndex = 0;
  private retryTimer: number | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private unsubscribeOnline: (() => void) | null = null;
  private debouncedPush: Debounced<() => void> | null = null;
  private stopped = false;
  private immediatePushInFlight: Promise<void> | null = null;

  constructor(opts: SyncEngineOptions) {
    this.supabase = opts.supabase;
    this.store = opts.store;
    this.promptReplaceLocal = opts.promptReplaceLocal;
    this.hasLocalUserData = opts.hasLocalUserData;
    this.debounceMs = opts.debounceMs ?? 1000;
  }

  async start(userId: string): Promise<void> {
    this.stopped = false;
    this.userId = userId;

    // Build the debounced pusher bound to *this* userId / context.
    this.debouncedPush = debounce(() => {
      void this.push();
    }, this.debounceMs);

    await this.pullOnAuth();
    if (this.stopped) return;

    this.subscribeRealtime();
    this.wireStoreListener();
    this.wireOnlineListener();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.userId = null;
    if (this.debouncedPush) {
      this.debouncedPush.cancel();
      this.debouncedPush = null;
    }
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    if (this.unsubscribeOnline) {
      this.unsubscribeOnline();
      this.unsubscribeOnline = null;
    }
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.lastCloudUpdatedAt = null;
    this.backoffIndex = 0;
  }

  /** Test hook — force an immediate push without waiting for the debounce. */
  async triggerImmediatePush(): Promise<void> {
    if (this.debouncedPush) this.debouncedPush.cancel();
    await this.push();
  }

  // ---------- internals ----------

  private async pullOnAuth(): Promise<void> {
    if (!this.userId) return;
    const { data, error } = await this.supabase
      .from('profiles')
      .select('state, updated_at')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error) {
      syncStatus.set('error', { lastError: error.message });
      return;
    }

    if (!data) {
      // First-ever sign-in for this user: insert an empty-seeded state.
      // We use `replaceState(seedState)` locally first so sign-in cleanly
      // wipes any pre-existing local-only data (FR-012 "start fresh").
      const seed = seedState();
      this.store.dispatch({ type: 'replaceState', state: seed });
      const insert = await this.supabase
        .from('profiles')
        .insert({ user_id: this.userId, state: seed })
        .select('updated_at')
        .single();
      if (!insert.error && insert.data) {
        this.lastCloudUpdatedAt = insert.data.updated_at as string;
      }
      syncStatus.set('synced', {
        lastSyncedAt: this.lastCloudUpdatedAt,
      });
      return;
    }

    const cloudState = data.state as AppState;
    const local = this.store.getState();
    if (this.hasLocalUserData(local)) {
      const ok = await this.promptReplaceLocal(cloudState);
      if (!ok) {
        // User declined — sign them out so there's no half-signed-in state.
        await this.supabase.auth.signOut();
        return;
      }
    }

    this.store.dispatch({ type: 'replaceState', state: cloudState });
    this.lastCloudUpdatedAt = data.updated_at as string;
    syncStatus.set('synced', { lastSyncedAt: this.lastCloudUpdatedAt });
  }

  private subscribeRealtime(): void {
    if (!this.userId) return;
    this.channel = this.supabase
      .channel(`profile:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          const row = (payload.new as { state: AppState; updated_at: string } | null);
          if (!row) return;
          if (
            this.lastCloudUpdatedAt &&
            row.updated_at <= this.lastCloudUpdatedAt
          ) {
            // Self-echo or older than what we already applied; ignore.
            return;
          }
          this.store.dispatch({ type: 'replaceState', state: row.state });
          this.lastCloudUpdatedAt = row.updated_at;
          syncStatus.set('synced', { lastSyncedAt: this.lastCloudUpdatedAt });
        },
      )
      .subscribe();
  }

  private wireStoreListener(): void {
    // Seed with current state so the first mutation post-start triggers a push.
    let last = this.store.getState();
    this.unsubscribeStore = this.store.subscribe(() => {
      if (this.stopped || !this.userId) return;
      const next = this.store.getState();
      if (next === last) return;
      last = next;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        syncStatus.set('offline');
        return;
      }
      this.debouncedPush?.();
    });
  }

  private wireOnlineListener(): void {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      if (this.stopped) return;
      // Fire an immediate push if we've missed uploads while offline.
      void this.push();
    };
    const onOffline = () => {
      if (this.stopped) return;
      syncStatus.set('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    this.unsubscribeOnline = () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }

  private async push(): Promise<void> {
    if (this.stopped || !this.userId) return;
    if (this.immediatePushInFlight) {
      // Coalesce concurrent pushes; the next mutation will re-arm the debounce.
      await this.immediatePushInFlight;
      return;
    }
    const run = this._pushOnce();
    this.immediatePushInFlight = run;
    try {
      await run;
    } finally {
      this.immediatePushInFlight = null;
    }
  }

  private async _pushOnce(): Promise<void> {
    if (!this.userId) return;
    syncStatus.set('syncing');
    const state = this.store.getState();
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert(
        { user_id: this.userId, state },
        { onConflict: 'user_id' },
      )
      .select('updated_at')
      .single();

    if (error) {
      const name = (error as { name?: string }).name ?? '';
      if (name === 'AuthApiError') {
        // Token revoked / expired; return to a clean signed-out state.
        syncStatus.set('error', { lastError: error.message });
        await this.supabase.auth.signOut();
        return;
      }
      syncStatus.set('offline', { lastError: error.message });
      this.scheduleRetry();
      return;
    }

    this.lastCloudUpdatedAt = (data?.updated_at as string | undefined) ?? null;
    this.backoffIndex = 0;
    syncStatus.set('synced', { lastSyncedAt: this.lastCloudUpdatedAt });
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null) return;
    const ms = BACKOFF_STEPS_MS[Math.min(this.backoffIndex, BACKOFF_STEPS_MS.length - 1)];
    this.backoffIndex = Math.min(this.backoffIndex + 1, BACKOFF_STEPS_MS.length - 1);
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      void this.push();
    }, ms);
  }
}
