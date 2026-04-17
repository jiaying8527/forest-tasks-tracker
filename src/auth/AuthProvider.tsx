import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'pendingMagicLink' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  pendingEmail: string | null;
  lastMagicLinkSentAt: number | null;
}

export interface AuthContextValue extends AuthState {
  requestMagicLink: (email: string) => Promise<{ error: string | null }>;
  resendMagicLink: () => Promise<{ error: string | null }>;
  cancelMagicLink: () => void;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  onSignedIn: (cb: (userId: string) => void) => () => void;
  onSignedOut: (cb: () => void) => () => void;
}

const initialState: AuthState = {
  status: isSupabaseConfigured ? 'loading' : 'signedOut',
  userId: null,
  email: null,
  pendingEmail: null,
  lastMagicLinkSentAt: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const MAGIC_LINK_COOLDOWN_MS = 30_000;

function getRedirectTo(): string {
  return window.location.origin + window.location.pathname + '#/auth/callback';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const signedInListeners = useRef(new Set<(userId: string) => void>());
  const signedOutListeners = useRef(new Set<() => void>());

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const session = data.session;
      if (session?.user) {
        setState({
          status: 'signedIn',
          userId: session.user.id,
          email: session.user.email ?? null,
          pendingEmail: null,
          lastMagicLinkSentAt: null,
        });
      } else {
        setState((s) => ({ ...s, status: 'signedOut' }));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setState({
          status: 'signedIn',
          userId: session.user.id,
          email: session.user.email ?? null,
          pendingEmail: null,
          lastMagicLinkSentAt: null,
        });
        signedInListeners.current.forEach((cb) => cb(session.user.id));
      } else if (event === 'SIGNED_OUT') {
        setState({
          status: 'signedOut',
          userId: null,
          email: null,
          pendingEmail: null,
          lastMagicLinkSentAt: null,
        });
        signedOutListeners.current.forEach((cb) => cb());
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = useCallback(
    async (email: string, isResend: boolean): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured) return { error: 'Sync is not configured in this build.' };
      const now = Date.now();
      const last = state.lastMagicLinkSentAt;
      if (last !== null && now - last < MAGIC_LINK_COOLDOWN_MS) {
        const remaining = Math.ceil((MAGIC_LINK_COOLDOWN_MS - (now - last)) / 1000);
        return { error: `Please wait ${remaining} s before requesting another link.` };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getRedirectTo(),
          shouldCreateUser: true,
        },
      });
      if (error) return { error: error.message };
      setState({
        status: 'pendingMagicLink',
        userId: null,
        email: null,
        pendingEmail: email,
        lastMagicLinkSentAt: now,
      });
      return { error: null };
      void isResend;
    },
    [state.lastMagicLinkSentAt],
  );

  const requestMagicLink = useCallback(
    (email: string) => sendMagicLink(email, false),
    [sendMagicLink],
  );

  const resendMagicLink = useCallback(async () => {
    if (!state.pendingEmail) return { error: 'No pending sign-in to resend.' };
    return sendMagicLink(state.pendingEmail, true);
  }, [sendMagicLink, state.pendingEmail]);

  const cancelMagicLink = useCallback(() => {
    setState((s) => ({ ...s, status: 'signedOut', pendingEmail: null }));
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured) return { error: 'Sync is not configured in this build.' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ error: string | null; needsConfirmation: boolean }> => {
      if (!isSupabaseConfigured)
        return { error: 'Sync is not configured in this build.', needsConfirmation: false };
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message, needsConfirmation: false };
      // If "Confirm email" is enabled in Supabase, no session is returned —
      // the user has to click a link in their inbox first.
      const needsConfirmation = !data.session;
      return { error: null, needsConfirmation };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    // onAuthStateChange('SIGNED_OUT', …) will drive the state reset.
  }, []);

  const onSignedIn = useCallback((cb: (userId: string) => void) => {
    signedInListeners.current.add(cb);
    return () => {
      signedInListeners.current.delete(cb);
    };
  }, []);

  const onSignedOut = useCallback((cb: () => void) => {
    signedOutListeners.current.add(cb);
    return () => {
      signedOutListeners.current.delete(cb);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      requestMagicLink,
      resendMagicLink,
      cancelMagicLink,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      onSignedIn,
      onSignedOut,
    }),
    [
      state,
      requestMagicLink,
      resendMagicLink,
      cancelMagicLink,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      onSignedIn,
      onSignedOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
