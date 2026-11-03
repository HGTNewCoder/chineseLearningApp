import { fireEvent, render, screen } from '@testing-library/react';
import { AccountPage, authMessage } from '../pages/Account';

const sync = {
  enabled: true,
  email: null as string | null,
  status: 'signed-out',
  lastSyncedAt: null,
  recovering: false,
  logIn: vi.fn(),
  signUp: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
  syncNow: vi.fn(),
};

vi.mock('../sync/SyncProvider', () => ({ useSync: () => sync }));

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(sync, { enabled: true, email: null, recovering: false });
});

describe('AccountPage', () => {
  it('logs in with email and password', async () => {
    sync.logIn.mockResolvedValue(undefined);
    render(<AccountPage />);
    type('Email', '  me@example.com ');
    type(/^Password/, 'secret-pass');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(sync.logIn).toHaveBeenCalledWith('me@example.com', 'secret-pass');
  });

  it('explains a wrong password', async () => {
    sync.logIn.mockRejectedValue(new Error('Invalid login credentials'));
    render(<AccountPage />);
    type('Email', 'me@example.com');
    type(/^Password/, 'nope-nope');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('signs up, then asks the user to confirm their email', async () => {
    sync.signUp.mockResolvedValue({ confirmEmail: true });
    render(<AccountPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }));
    type('Email', 'new@example.com');

    type(/^Password/, 'short');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('at least 8 characters');
    expect(sync.signUp).not.toHaveBeenCalled();

    type(/^Password/, 'long-enough');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('status')).toHaveTextContent('confirmation link to new@example.com');
    expect(sync.signUp).toHaveBeenCalledWith('new@example.com', 'long-enough');
    expect(screen.getByRole('tab', { name: 'Log in' })).toHaveAttribute('aria-selected', 'true');
  });

  it('sends a password reset link', async () => {
    sync.sendPasswordReset.mockResolvedValue(undefined);
    render(<AccountPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    type('Email', 'me@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('emailed a link to reset the password');
    expect(sync.sendPasswordReset).toHaveBeenCalledWith('me@example.com');
  });

  it('asks for a new password after opening a reset link', () => {
    sync.recovering = true;
    sync.email = 'me@example.com';
    sync.updatePassword.mockResolvedValue(undefined);
    render(<AccountPage />);
    type(/^New password/, 'brand-new-pass');
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(sync.updatePassword).toHaveBeenCalledWith('brand-new-pass');
  });

  it('shows the account and lets a logged-in user change their password', async () => {
    sync.email = 'me@example.com';
    sync.updatePassword.mockResolvedValue(undefined);
    render(<AccountPage />);
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    type(/^New password/, 'another-pass');
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    expect(await screen.findByText('Password updated.')).toBeInTheDocument();
  });

  it('shows the password only when asked', () => {
    render(<AccountPage />);
    const input = screen.getByLabelText(/^Password/);
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});

describe('authMessage', () => {
  it('rewrites common Supabase errors', () => {
    expect(authMessage(new Error('Email not confirmed'))).toMatch(/Confirm your email/);
    expect(authMessage(new Error('User already registered'))).toMatch(/already exists/);
    expect(authMessage(new Error('Failed to fetch'))).toMatch(/connection/);
  });
});
