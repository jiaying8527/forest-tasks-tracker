import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppState } from '../storage/schema';
import type { Action } from './actions';
import { reducer } from './reducer';
import { loadState, saveState, StorageQuotaError, StorageSchemaTooNewError } from '../storage/localStorage';
import { seedState } from '../storage/seed';

interface StoreContextValue {
  state: AppState;
  dispatch: (action: Action) => void;
  toast: ToastState | null;
  showToast: (t: Omit<ToastState, 'id'>) => void;
  dismissToast: () => void;
  fatalError: string | null;
}

export interface ToastState {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function lazyInit(): AppState {
  try {
    return loadState();
  } catch (err) {
    if (err instanceof StorageSchemaTooNewError) {
      // Caller (StoreProvider) will detect and surface this.
      throw err;
    }
    return seedState();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [initial] = useState<AppState>(() => {
    try {
      return lazyInit();
    } catch (err) {
      if (err instanceof StorageSchemaTooNewError) {
        setFatalError(
          'This build is older than your saved data. Please deploy the latest version before continuing.',
        );
      }
      return seedState();
    }
  });
  const [state, dispatchRaw] = useReducer(reducer, initial);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastCounter = useRef(0);
  const firstRenderRef = useRef(true);

  const showToast = useCallback((t: Omit<ToastState, 'id'>) => {
    toastCounter.current += 1;
    setToast({ ...t, id: toastCounter.current });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const dispatch = useCallback(
    (action: Action) => {
      try {
        dispatchRaw(action);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        showToast({ kind: 'error', message: msg });
      }
    },
    [showToast],
  );

  // Persist on every change, skipping the very first render (when we already
  // loaded from storage).
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      // If storage was empty, seed the key so subsequent migrations see v1.
      try {
        saveState(state);
      } catch {
        /* swallow on mount */
      }
      return;
    }
    try {
      saveState(state);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        showToast({
          kind: 'error',
          message: 'Your device is out of space — export your data or remove completed tasks.',
        });
      } else {
        showToast({ kind: 'error', message: 'Failed to save your latest change.' });
      }
    }
  }, [state, showToast]);

  // Auto-dismiss non-action toasts after 5s.
  useEffect(() => {
    if (!toast) return;
    if (toast.onAction) return; // keep action toasts until dismissed
    const id = setTimeout(dismissToast, 5000);
    return () => clearTimeout(id);
  }, [toast, dismissToast]);

  const value = useMemo<StoreContextValue>(
    () => ({ state, dispatch, toast, showToast, dismissToast, fatalError }),
    [state, dispatch, toast, showToast, dismissToast, fatalError],
  );

  return (
    <StoreContext.Provider value={value}>
      {fatalError ? (
        <div className="app-shell" role="alert" style={{ padding: '2rem' }}>
          <h1>Can't load your data</h1>
          <p>{fatalError}</p>
        </div>
      ) : (
        <>
          {children}
          {toast ? <ToastView toast={toast} onDismiss={dismissToast} /> : null}
        </>
      )}
    </StoreContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={`toast toast-${toast.kind}`} role="status" aria-live="polite">
      <span className="toast-message">{toast.message}</span>
      {toast.onAction && toast.actionLabel ? (
        <button
          className="btn btn-ghost toast-action"
          onClick={() => {
            toast.onAction?.();
            onDismiss();
          }}
        >
          {toast.actionLabel}
        </button>
      ) : null}
      <button className="btn btn-ghost toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function useAppState(): AppState {
  return useStore().state;
}

export function useAppDispatch(): (action: Action) => void {
  return useStore().dispatch;
}
