import { useEffect, useState } from 'react';
import { useAuth, MAGIC_LINK_COOLDOWN_MS } from '../auth/useAuth';
import './SignInForm.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Tick a 1 s timer while a cooldown is in effect.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
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
          Click the link on this device or any device to finish signing in.
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

  return (
    <form className="signin-form" onSubmit={handleSubmit}>
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
      {error ? (
        <p className="signin-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="signin-hint">
        No password. We'll email you a one-tap sign-in link.
      </p>
    </form>
  );
}
