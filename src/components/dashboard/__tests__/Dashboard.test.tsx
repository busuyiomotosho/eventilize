import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { SessionProvider } from 'next-auth/react';

describe('Dashboard', () => {
  it('renders dashboard heading', () => {
    render(
      <SessionProvider session={{ user: { id: '1', email: 'demo@example.com', name: 'Demo User' }, expires: '2099-01-01T00:00:00.000Z' }}>
        <Dashboard onSelectEvent={jest.fn()} />
      </SessionProvider>
    );
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});
