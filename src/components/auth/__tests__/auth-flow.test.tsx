
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import '@testing-library/jest-dom';

// Mock next/navigation useRouter before importing LoginPage
jest.mock('next/navigation', () => {
  const actual = jest.requireActual('next/navigation');
  const pushMock = jest.fn();
  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    pushMock,
  };
});

// Mock next-auth/react
jest.mock('next-auth/react', () => {
  const actual = jest.requireActual('next-auth/react');
  return {
    ...actual,
    useSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    SessionProvider: actual.SessionProvider,
  };
});

const { useSession, signIn, signOut } = require('next-auth/react');

// Import after mocks
import Dashboard from '@/components/dashboard/Dashboard';
import LogoutButton from '@/components/auth/LogoutButton';
import LoginPage from '@/app/auth/login/page';
import * as nextNavigation from 'next/navigation';

describe('Auth Flow: Login and Logout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('redirects to dashboard after successful login', async () => {
    useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    signIn.mockResolvedValue({ error: undefined });
    render(
      <SessionProvider session={null}>
        <LoginPage />
      </SessionProvider>
    );
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'demo@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ email: 'demo@example.com', password: 'password123', redirect: false }));
  expect((nextNavigation as any).pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error on failed login', async () => {
    useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    signIn.mockResolvedValue({ error: 'Invalid email or password' });
    render(
      <SessionProvider session={null}>
        <LoginPage />
      </SessionProvider>
    );
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows logout button and logs out user', async () => {
    useSession.mockReturnValue({ data: { user: { id: '1', email: 'demo@example.com', name: 'Demo User' } }, status: 'authenticated' });
    render(
      <SessionProvider session={{ user: { id: '1', email: 'demo@example.com', name: 'Demo User' }, expires: '2099-01-01T00:00:00.000Z' }}>
        <LogoutButton />
      </SessionProvider>
    );
    const btn = screen.getByRole('button', { name: /logout/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/auth/login' });
    });
  });
});
