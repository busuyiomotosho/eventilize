import { render, screen, fireEvent } from '@testing-library/react';
import BasicInfoStep, { BasicEventInfo } from '../BasicInfoStep';

describe('BasicInfoStep', () => {
  const eventData: BasicEventInfo = {
    eventName: 'Test Event',
    eventLocation: 'Test Location',
    eventDate: '2025-08-18',
    eventTime: '12:00',
  };
  it('renders all input fields with correct values', () => {
    render(<BasicInfoStep eventData={eventData} updateEventData={jest.fn()} />);
    expect(screen.getByLabelText(/Event Name/i)).toHaveValue('Test Event');
    expect(screen.getByLabelText(/Location/i)).toHaveValue('Test Location');
    expect(screen.getByLabelText(/Date/i)).toHaveValue('2025-08-18');
    expect(screen.getByLabelText(/Time/i)).toHaveValue('12:00');
  });

  it('calls updateEventData on input change', () => {
    const updateEventData = jest.fn();
    render(<BasicInfoStep eventData={eventData} updateEventData={updateEventData} />);
    fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: 'New Name' } });
    expect(updateEventData).toHaveBeenCalledWith({ eventName: 'New Name' });
  });
});
