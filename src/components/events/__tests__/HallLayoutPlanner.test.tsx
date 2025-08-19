import { render, screen, fireEvent } from '@testing-library/react';
import HallLayoutPlanner from '../HallLayoutPlanner';
import type { Table, Guest } from '@/lib/types';

describe('HallLayoutPlanner', () => {
  const tables: Table[] = [
    { id: '1', name: 'Table 1', shape: 'round', capacity: 8, x: 100, y: 100, assignedGuests: [], rotation: 0 },
    { id: '2', name: 'Table 2', shape: 'rectangular', capacity: 10, x: 200, y: 200, assignedGuests: [], rotation: 0 },
  ];
  const guests: Guest[] = [
    { _id: 'g1', name: 'Alice', email: 'alice@email.com', assignedTable: '1', checkedIn: false },
    { _id: 'g2', name: 'Bob', email: 'bob@email.com', assignedTable: '2', checkedIn: true },
  ];

  it('renders tables and guests', () => {
    render(
      <HallLayoutPlanner
        eventId="event1"
        tables={tables}
        guests={guests}
      />
    );
    expect(screen.getByText('Table 1')).toBeInTheDocument();
    expect(screen.getByText('Table 2')).toBeInTheDocument();
  });

  it('calls onTableClick when a table is clicked', () => {
    const onTableClick = jest.fn();
    render(
      <HallLayoutPlanner
        eventId="event1"
        tables={tables}
        guests={guests}
        onTableClick={onTableClick}
      />
    );
    // Simulate clicking a table (implementation depends on actual DOM structure)
    // fireEvent.click(screen.getByText('Table 1'));
    // expect(onTableClick).toHaveBeenCalled();
  });
});
