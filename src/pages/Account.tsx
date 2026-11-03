import { useState, type FormEvent, type ReactNode } from 'react';
import { useSync, type SyncStatus } from '../sync/SyncProvider';

const STATUS_TEXT: Record<SyncStatus, string> = {
  'local-only': 'Saved in this browser',
  'signed-out': 'Not logged in',
  syncing: 'Syncing…',
  synced: 'All progress synced',
  offline: 'Offline. Changes will sync when you’re back online.',
  error: 'Sync failed. We’ll retry automatically.',
};

export const MIN_PASSWORD = 8;

/** Turns Supabase auth errors into plain sentences. */
export function authMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  const message = raw.toLowerCase();
  if (message.includes('invalid login credentials')) return 'Wrong email or password.';
  if (message.includes('email not confirmed')) return 'Confirm your email first: open the link we sent you, then log in.';
  if (message.includes('already registered')) return 'An account with this email already exists. Log in instead.';
  if (message.includes('rate limit') || message.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (message.includes('should be different')) return 'Choose a password different from your current one.';
  if (message.includes('password')) return raw;
  if (message.includes('fetch') || message.includes('network')) return 'Couldn’t reach the server. Check your connection.';
  return raw || 'Something went wrong. Please try again.';
}

type Mode = 'login' | 'signup' | 'forgot';

export function AccountPage() {
  const sync = useSync();

  if (!sync.enabled) {
    return (
      <section className="page account">
        <h1>Account</h1>
        <p className="muted">
          Accounts aren’t set up on this site, so your progress is saved in this browser only. Clearing site data or
          switching devices starts you over.
        </p>
      </section>
    );
  }

  if (sync.recovering) return <NewPasswordPage />;
  if (sync.email) return <SignedInPage />;
  return <AuthPage />;
}

/** Runs an async form action with a busy flag and a friendly error. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

function AuthPage() {
  const sync = useSync();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<ReactNode>(null);
  const { busy, error, setError, run } = useAction();

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (mode === 'signup' && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    run(async () => {
      if (mode === 'login') {
        await sync.logIn(address, password);
      } else if (mode === 'signup') {
        const { confirmEmail } = await sync.signUp(address, password);
        if (confirmEmail) {
          setNotice(
            <>
              Almost done. We sent a confirmation link to <strong>{address}</strong>. Open it, then log in here.
            </>,
          );
          setPassword('');
          setMode('login');
        }
      } else {
        await sync.sendPasswordReset(address);
        setNotice(
          <>
            If an account exists for <strong>{address}</strong>, we’ve emailed a link to reset the password.
          </>,
        );
      }
    });
  };

  const title = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create an account' : 'Reset your password';

  return (
    <section className="page account">
      <h1>{title}</h1>
      <p className="muted">
        {mode === 'forgot'
          ? 'Enter your account email and we’ll send you a link to choose a new password.'
          : 'Back up your progress and continue on any device. Anything you’ve already practiced in this browser is kept.'}
      </p>

      {mode !== 'forgot' && (
        <div className="segmented auth-tabs" role="tablist" aria-label="Account">
          <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchTo('login')}>
            Log in
          </button>
          <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-active' : ''} onClick={() => switchTo('signup')}>
            Sign up
          </button>
        </div>
      )}

      {notice && (
        <p className="auth-notice" role="status">
          {notice}
        </p>
      )}

      <form className="field auth-form" onSubmit={submit}>
        <label className="auth-form__field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {mode !== 'forgot' && (
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            hint={mode === 'signup' ? `At least ${MIN_PASSWORD} characters.` : undefined}
          />
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary auth-form__submit" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
        </button>

        {mode === 'login' && (
          <button type="button" className="link-button" onClick={() => switchTo('forgot')}>
            Forgot your password?
          </button>
        )}
        {mode === 'forgot' && (
          <button type="button" className="link-button" onClick={() => switchTo('login')}>
            ← Back to log in
          </button>
        )}
      </form>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-form__field">
      <span>{label}</span>
      <span className="password-input">
        <input
          type={visible ? 'text' : 'password'}
          required
          minLength={autoComplete === 'new-password' ? MIN_PASSWORD : undefined}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

/** Shown after opening a password-reset email link. */
function NewPasswordPage() {
  const sync = useSync();
  const [password, setPassword] = useState('');
  const { busy, error, setError, run } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    run(() => sync.updatePassword(password));
  };

  return (
    <section className="page account">
      <h1>Choose a new password</h1>
      <form className="field auth-form" onSubmit={submit}>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary auth-form__submit" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </section>
  );
}

function SignedInPage() {
  const sync = useSync();
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const { busy, error, setError, run } = useAction();

  const changePassword = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    run(async () => {
      await sync.updatePassword(password);
      setPassword('');
      setChanging(false);
      setSaved(true);
    });
  };

  return (
    <section className="page account">
      <h1>Account</h1>
      <div className="field">
        <p>
          Logged in as <strong>{sync.email}</strong>
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
            Log out
          </button>
        </div>
        <p className="hint">Logging out removes your progress from this device. It stays safe in your account.</p>
      </div>

      <div className="field">
        <h2>Password</h2>
        {saved && !changing && (
          <p className="auth-notice" role="status">
            Password updated.
          </p>
        )}
        {changing ? (
          <form className="auth-form" onSubmit={changePassword}>
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD} characters.`}
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="button-row auth-form__actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save password'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setChanging(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn"
            onClick={() => {
              setChanging(true);
              setSaved(false);
            }}
          >
            Change password
          </button>
        )}
      </div>
    </section>
  );
}
