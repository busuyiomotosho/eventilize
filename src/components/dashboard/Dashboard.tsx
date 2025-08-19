
import React, { useEffect, useState } from 'react';
import { fetchAllEvents, createEvent } from '@/lib/api';
import type { Event } from '@/lib/types';

function EventCard({ event, onSelect }: { event: Event; onSelect: (id: string) => void }) {
  return (
    <div className="border rounded p-4 flex justify-between items-center hover:bg-gray-50">
      <div>
        <div className="font-bold">{event.name}</div>
        <div className="text-sm text-gray-600">{event.date} at {event.time} - {event.location}</div>
      </div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={() => event.id && onSelect(event.id)}
        disabled={!event.id}
      >
        Manage
      </button>
    </div>
  );
}

function CreateEventForm({
  form, setForm, onCreate, creating, error, onCancel
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onCreate: (form: any) => void;
  creating: boolean;
  error: string | null;
  onCancel: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-lg mx-auto">
      <h3 className="text-lg font-bold mb-4">Create Event</h3>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <form
        onSubmit={e => {
          e.preventDefault();
          onCreate(form);
        }}
      >
        <div className="mb-2">
          <label className="block text-sm font-medium">Name</label>
          <input type="text" className="border rounded px-3 py-2 w-full" required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium">Date</label>
          <input type="date" className="border rounded px-3 py-2 w-full" required value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium">Time</label>
          <input type="time" className="border rounded px-3 py-2 w-full" required value={form.time} onChange={e => setForm((f: any) => ({ ...f, time: e.target.value }))} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Location</label>
          <input type="text" className="border rounded px-3 py-2 w-full" required value={form.location} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Guest Management Strategy</label>
          <select
            className="border rounded px-3 py-2 w-full"
            required
            value={form.strategy}
            onChange={e => setForm((f: any) => ({ ...f, strategy: e.target.value }))}
          >
            <option value="organizer-list">Organizer List</option>
            <option value="self-registration">Self Registration</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Number of Guests</label>
          <input type="number" min="1" className="border rounded px-3 py-2 w-full" required value={form.maxCapacity} onChange={e => setForm((f: any) => ({ ...f, maxCapacity: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={creating}>{creating ? 'Creating...' : 'Create Event'}</button>
          <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel} disabled={creating}>Cancel</button>
        </div>
      </form>
    </div>
  );
}


export default function Dashboard({ onSelectEvent }: { onSelectEvent: (id: string) => void }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', time: '', location: '', strategy: 'organizer-list', maxCapacity: '' });

  useEffect(() => {
    setLoading(true);
    fetchAllEvents()
      .then((data: { events: Event[] }) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const totalGuests = events.reduce((sum, e) => sum + (e.guests?.length || 0), 0);

  const handleCreate = async (formData: any) => {
    setCreating(true);
    setCreateError(null);
    try {
      const data = await createEvent(formData);
      setEvents(evts => [data.event, ...evts]);
      setForm({ name: '', date: '', time: '', location: '', strategy: 'organizer-list', maxCapacity: '' });
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err.message || 'Error creating event');
    }
    setCreating(false);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
        <p className="text-gray-600">Manage your events and track attendance</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card text-white p-6 rounded-lg">
          <div className="flex items-center">
            <i className="fas fa-calendar text-2xl mr-4"></i>
            <div>
              <p className="text-sm opacity-80">Total Events</p>
              <p className="text-2xl font-bold">{events.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-500 text-white p-6 rounded-lg">
          <div className="flex items-center">
            <i className="fas fa-users text-2xl mr-4"></i>
            <div>
              <p className="text-sm opacity-80">Total Guests</p>
              <p className="text-2xl font-bold">{totalGuests}</p>
            </div>
          </div>
        </div>
        {/* Add checked-in and pending stats here if available */}
      </div>
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
          onClick={() => setShowCreate(v => !v)}
        >
          <i className="fas fa-plus mr-2"></i>Create New Event
        </button>
      </div>
      {showCreate && (
        <CreateEventForm
          form={form}
          setForm={setForm}
          onCreate={handleCreate}
          creating={creating}
          error={createError}
          onCancel={() => setShowCreate(false)}
        />
      )}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Recent Events</h3>
        <div className="space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No events yet. Create your first event!</p>
          ) : (
            events.map((event, idx) => (
              event.id ? (
                <EventCard key={event.id} event={event} onSelect={onSelectEvent} />
              ) : (
                <EventCard key={`event-idx-${idx}`} event={event} onSelect={onSelectEvent} />
              )
            ))
          )}
        </div>
      </div>
    </div>
  );
}
