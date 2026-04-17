import { useAuth } from '../auth/useAuth';

export function SignOutButton() {
  const auth = useAuth();
  const onClick = async () => {
    const ok = window.confirm(
      'Sign out of this device? Your cloud data stays safe and will return when you sign back in.',
    );
    if (!ok) return;
    await auth.signOut();
  };
  return (
    <button type="button" className="btn btn-secondary" onClick={onClick}>
      Sign out
    </button>
  );
}
