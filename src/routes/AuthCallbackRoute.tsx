import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../auth/supabase';
import './AuthCallbackRoute.css';

type CallbackState = 'exchanging' | 'error';

export function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [state, setState] = useState<CallbackState>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;

    const scrub = () => {
      // Remove any ?code / #params from the browser URL so they're not
      // left in history or copy-pasted into shared links.
      window.history.replaceState(null, '', window.location.pathname + '#/');
    };

    const errorParam = params.get('error');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');
    const code = params.get('code');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    (async () => {
      // Case C: provider returned an error (expired / used / invalid link)
      if (errorParam || errorCode) {
        scrub();
        if (cancelled) return;
        const msg =
          errorCode === 'otp_expired' || errorDescription?.includes('expired')
            ? 'This sign-in link has expired or was already used. Magic links are single-use and expire after a few minutes.'
            : errorDescription
              ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
              : 'Sign-in did not complete.';
        setErrorMessage(msg);
        setState('error');
        return;
      }

      // Case A: PKCE code exchange
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );
        scrub();
        if (cancelled) return;
        if (error) {
          setErrorMessage(error.message);
          setState('error');
          return;
        }
        navigate('/', { replace: true });
        return;
      }

      // Case B: implicit flow tokens in the fragment
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        scrub();
        if (cancelled) return;
        if (error) {
          setErrorMessage(error.message);
          setState('error');
          return;
        }
        navigate('/', { replace: true });
        return;
      }

      // No recognized params — just go home.
      scrub();
      if (cancelled) return;
      navigate('/', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  if (state === 'error') {
    return (
      <section className="route-auth-callback">
        <h1>Sign-in link didn't work</h1>
        <p>{errorMessage}</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/settings', { replace: true })}
        >
          Back to sign in
        </button>
      </section>
    );
  }

  return (
    <section className="route-auth-callback">
      <p>Signing you in…</p>
    </section>
  );
}
