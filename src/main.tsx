import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components/toast.css';

// Bootstrap: Supabase's email-link redirect arrives in a few shapes,
// none of which the hash router catches on its own:
//   A) ?code=...                  — PKCE code exchange, at the top-level query
//   B) #access_token=...&refresh_token=... — implicit flow, fragment
//   C) #error=...&error_code=...  — link expired / invalid
//
// We fold every one of these into /#/auth/callback?<params> so the
// AuthCallbackRoute can handle them uniformly.
(function redirectAuthFragmentToCallback() {
  const { hash, search, pathname } = window.location;
  const hasHashParams =
    hash.startsWith('#') && /^#(?!\/)/.test(hash) && /=/.test(hash);
  const hasQueryCode = /[?&](code|error|error_code)=/.test(search);
  if (!hasHashParams && !hasQueryCode) return;

  // Pull params from whichever carrier they arrived in.
  const params = new URLSearchParams();
  if (hasHashParams) {
    const fragParams = new URLSearchParams(hash.slice(1));
    fragParams.forEach((v, k) => params.set(k, v));
  }
  if (hasQueryCode) {
    const q = new URLSearchParams(search);
    q.forEach((v, k) => params.set(k, v));
  }

  const next =
    pathname.replace(/\/+$/, '/') +
    '#/auth/callback' +
    (params.toString() ? `?${params.toString()}` : '');
  window.history.replaceState(null, '', next);
})();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
