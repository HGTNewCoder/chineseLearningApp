import { useState, type FormEvent } from 'react';
import { useSync, type SyncStatus } from '../sync/SyncProvider';

const STATUS_TEXT: Record<SyncStatus, string> = {
  'local-only': 'Saved in this browser',
  'signed-out': 'Not signed in',
  syncing: 'Syncing…',
  synced: 'All progress synced',
  offline: 'Offline. Changes will sync when you’re back online.',
  error: 'Sync failed. We’ll retry automatically.',
};

export function AccountPage() {
  const sync = useSync();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sync.enabled) {
    return (
      <section className="page">
        <h1>Account</h1>
        <p className="muted">
          Cloud sync isn’t set up on this site, so your progress is saved in this browser only. Clearing site data or
          switching devices starts you over.
        </p>
      </section>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await sync.signIn(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send the sign-in link.');
    } finally {
      setSending(false);
    }
  };

  if (sync.email) {
    return (
      <section className="page">
        <h1>Account</h1>
        <div className="field">
          <p>
            Signed in as <strong>{sync.email}</strong>
          </p>
          <p className={`sync-status is-${sync.status}`} aria-live="polite">
            {STATUS_TEXT[sync.status]}
            {sync.lastSyncedAt && sync.status === 'synced' && (
              <span className="muted"> · {new Date(sync.lastSyncedAt).toLocaleTimeString()}</span>
            )}
          </p>
          <div className="button-row">
            <button className="btn" onClick={sync.syncNow} disabled={sync.status === 'syncing'}>
              Sync now
            </button>
            <button className="btn btn-ghost" onClick={sync.signOut}>
              Sign out
            </button>
          </div>
          <p className="hint">Signing out removes your progress from this device. It stays safe in your account.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Account</h1>
      <p className="muted">
        Sign in to back up your progress and continue on any device. Anything you’ve already practiced in this browser is
        kept.
      </p>
      {sent ? (
        <div className="field" role="status">
          <p>
            Check <strong>{email}</strong> for a sign-in link. Open it on this device to finish signing in.
          </p>
          <button className="btn btn-ghost" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form className="field signin-form" onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <div className="signin-form__row">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button className="btn btn-primary" type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          <p className="hint">No password needed. We’ll email you a one-time link.</p>
        </form>
      )}
    </section>
  );
}
