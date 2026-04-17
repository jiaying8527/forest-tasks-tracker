import { useEffect, useState } from 'react';
import { useAuth, MAGIC_LINK_COOLDOWN_MS } from '../auth/useAuth';
import './SignInForm.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signIn' | 'signUp' | 'magic';

export function SignInForm() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (auth.lastMagicLinkSentAt === null) {
      setCooldownLeft(0);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - (auth.lastMagicLinkSentAt ?? 0);
      const left = Math.max(0, Math.ceil((MAGIC_LINK_COOLDOWN_MS - elapsed) / 1000));
      setCooldownLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [auth.lastMagicLinkSentAt]);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    if (mode === 'signIn') {
      const { error: err } = await auth.signInWithPassword(trimmed, password);
      setSubmitting(false);
      if (err) setError(err);
    } else {
      const { error: err, needsConfirmation } = await auth.signUpWithPassword(trimmed, password);
      setSubmitting(false);
      if (err) {
        setError(err);
      } else if (needsConfirmation) {
        setInfo(
          'Account created. Check your email for a confirmation link before signing in.',
        );
      }
    }
  };

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await auth.requestMagicLink(trimmed);
    setSubmitting(false);
    if (err) setError(err);
  };

  const handleResend = async () => {
    setSubmitting(true);
    setError(null);
    const { error: err } = await auth.resendMagicLink();
    setSubmitting(false);
    if (err) setError(err);
  };

  if (auth.status === 'pendingMagicLink' && auth.pendingEmail) {
    return (
      <div className="signin-form signin-check-email">
        <h3>Check your email</h3>
        <p>
          We sent a sign-in link to <strong>{auth.pendingEmail}</strong>.
          Open it on this device to finish signing in.
        </p>
        <div className="signin-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting || cooldownLeft > 0}
            onClick={handleResend}
          >
            {cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : 'Resend email'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={auth.cancelMagicLink}
          >
            Use a different email
          </button>
        </div>
        {error ? (
          <p className="signin-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (mode === 'magic') {
    return (
      <form className="signin-form" onSubmit={handleMagicSubmit}>
        <label className="signin-field">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || !email.trim()}
        >
          {submitting ? 'Sending…' : 'Send magic link'}
        </button>
        <button
          type="button"
          className="signin-toggle"
          onClick={() => {
            setMode('signIn');
            resetMessages();
          }}
        >
          Use email and password instead
        </button>
        {error ? (
          <p className="signin-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form className="signin-form" onSubmit={handlePasswordSubmit}>
      <label className="signin-field">
        <span>Email address</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>
      <label className="signin-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signUp' ? 'Choose a password (6+ chars)' : 'Your password'}
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          required
        />
      </label>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || !email.trim() || !password}
      >
        {submitting
          ? mode === 'signUp'
            ? 'Creating account…'
            : 'Signing in…'
          : mode === 'signUp'
            ? 'Create account'
            : 'Sign in'}
      </button>
      <div className="signin-toggle-row">
        <button
          type="button"
          className="signin-toggle"
          onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            resetMessages();
          }}
        >
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
        <button
          type="button"
          className="signin-toggle signin-toggle-muted"
          onClick={() => {
            setMode('magic');
            resetMessages();
          }}
        >
          Email me a magic link
        </button>
      </div>
      {error ? (
        <p className="signin-error" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="signin-info" role="status">
          {info}
        </p>
      ) : null}
    </form>
  );
}
