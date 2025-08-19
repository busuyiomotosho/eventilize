import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('renders dashboard heading', () => {
    render(<Dashboard onSelectEvent={jest.fn()} />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});
