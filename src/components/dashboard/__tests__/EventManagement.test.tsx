import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventManagement from '../EventManagement';

jest.mock('@/lib/api', () => ({
  fetchEventById: jest.fn(() => Promise.resolve({ event: { name: 'Event', date: '2025-08-18', time: '12:00', location: 'Venue', maxCapacity: 100, tables: [], guests: [] } })),
  updateEvent: jest.fn(),
  updateEventLayout: jest.fn(),
  addGuest: jest.fn(),
  updateGuest: jest.fn(),
  deleteGuest: jest.fn(),
  toggleGuestCheckin: jest.fn(),
}));

describe('EventManagement', () => {
  it('renders event details and tabs', async () => {
    render(<EventManagement eventId="1" onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Event')).toBeInTheDocument());
    expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Show Check-In Page/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Guests/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Layout/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Check-in/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Analytics/i })).toBeInTheDocument();
  });
});
