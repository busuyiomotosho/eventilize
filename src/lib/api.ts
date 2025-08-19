// Fetch all events
export async function fetchAllEvents(): Promise<{ events: Event[] }> {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

// Create a new event
export async function createEvent(data: Partial<Event>): Promise<{ event: Event }> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}
// Centralized API helpers for event management
import type { Event, Guest, Table } from '../lib/types';

export async function fetchEventById(eventId: string): Promise<{ event: Event }> {
  const res = await fetch(`/api/events/${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch event');
  return res.json();
}

export async function updateEvent(eventId: string, data: Partial<Event>): Promise<{ event: Event }> {
  const res = await fetch(`/api/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json();
}

export async function updateEventLayout(eventId: string, tables: Table[]): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/layout`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tables }),
  });
  if (!res.ok) throw new Error('Failed to update layout');
}

export async function addGuest(eventId: string, guest: Partial<Guest>): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/guests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guest),
  });
  if (!res.ok) throw new Error('Failed to add guest');
}

export async function updateGuest(eventId: string, guestId: string, guest: Partial<Guest>): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guest),
  });
  if (!res.ok) throw new Error('Failed to update guest');
}

export async function deleteGuest(eventId: string, guestId: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete guest');
}

export async function toggleGuestCheckin(eventId: string, guestId: string, checkedIn: boolean): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/guests/${guestId}/checkin`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkedIn }),
  });
  if (!res.ok) throw new Error('Failed to update check-in');
}
