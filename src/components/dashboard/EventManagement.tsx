
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import dynamic from 'next/dynamic';
// Define a local Table type compatible with event.tables and HallLayoutPlanner
type Table = {
  id: string;
  name: string;
  shape: 'round' | 'rectangular';
  capacity: number;
  x: number;
  y: number;
  assignedGuests: string[];
  rotation?: number;
};

import { fetchEventById, updateEvent, updateEventLayout, addGuest, updateGuest, deleteGuest, toggleGuestCheckin } from '@/lib/api';
import type { Event, Guest } from '../../lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
// Make sure NOT to import Table from '../../lib/types' or '@/components/events/HallLayoutPlanner' anywhere in this file

// Dynamically import HallLayoutPlanner to avoid SSR issues
const HallLayoutPlanner = dynamic(() => import('@/components/events/HallLayoutPlanner'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-gray-500">Loading hall layout planner...</div>,
});

// Guest Edit Modal
function GuestEditModal({
  open, guest, tables, onSave, onCancel, loading, error
}: {
  open: boolean;
  guest: Guest | null;
  tables: Table[];
  onSave: (g: Partial<Guest>) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [editName, setEditName] = useState(guest?.name || '');
  const [editEmail, setEditEmail] = useState(guest?.email || '');
  const [editAssignedTable, setEditAssignedTable] = useState(guest?.assignedTable || '');
  useEffect(() => {
    setEditName(guest?.name || '');
    setEditEmail(guest?.email || '');
    setEditAssignedTable(guest?.assignedTable || '');
  }, [guest]);
  if (!open || !guest) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onCancel}>&times;</button>
        <h4 className="text-lg font-bold mb-4">Edit Guest</h4>
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            onSave({ name: editName, email: editEmail, assignedTable: editAssignedTable });
          }}
        >
          <input className="border rounded px-3 py-2" value={editName} onChange={e => setEditName(e.target.value)} required placeholder="Full Name" />
          <input className="border rounded px-3 py-2" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email (optional)" />
          <select className="border rounded px-3 py-2" value={editAssignedTable} onChange={e => setEditAssignedTable(e.target.value)} required>
            <option value="">Assign to Table</option>
            {tables.map(table => (
              <option key={table.id} value={table.id}>{table.name}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel} disabled={loading}>Cancel</button>
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </form>
      </div>
    </div>
  );
}

// Table Modal (for attendees and renaming)
function TableModal({ open, table, guests, onRename, onClose, renaming, setRenaming, renameValue, setRenameValue }: {
  open: boolean;
  table: Table | null;
  guests: Guest[];
  onRename: (id: string, name: string) => void;
  onClose: () => void;
  renaming: string | null;
  setRenaming: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
}) {
  if (!open || !table) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4 relative" onClick={e => e.stopPropagation()}>
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onClose}>&times;</button>
        <div className="flex items-center gap-2 mb-4">
          {renaming === table.id ? (
            <form onSubmit={e => { e.preventDefault(); onRename(table.id, renameValue); }} className="flex items-center gap-1">
              <input className="border rounded px-1 py-0.5 text-lg font-bold w-32" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus onBlur={() => setRenaming(null)} />
              <button type="submit" className="text-blue-600 text-xs px-1">✔</button>
            </form>
          ) : (
            <>
              <h4 className="text-lg font-bold">{table.name} Attendees</h4>
              <button className="text-gray-400 hover:text-blue-600 text-xs px-1" title="Rename table" onClick={e => { e.stopPropagation(); setRenaming(table.id); setRenameValue(table.name); }}>✎</button>
            </>
          )}
        </div>
        {table.assignedGuests && table.assignedGuests.length > 0 ? (
          <ul className="divide-y">
            {table.assignedGuests.map((guestId: string) => {
              const guest = guests.find(g => g._id === guestId);
              return guest ? (<li key={guest._id || guestId} className="py-2">{guest.name}</li>) : null;
            })}
          </ul>
        ) : (
          <p className="text-gray-500">No attendees assigned to this table.</p>
        )}
      </div>
    </div>
  );
}

export default function EventManagement({ eventId, onBack }: { eventId: string, onBack: () => void }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', date: '', time: '', location: '', maxCapacity: '' });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'guests' | 'layout' | 'checkin' | 'analytics'>('guests');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [assignedTable, setAssignedTable] = useState('');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // For attendee modal
  const [showTableModal, setShowTableModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  // Table rename state for modal
  const [renamingTableId, setRenamingTableId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');


  // Handler for renaming table
  const handleRenameTable = useCallback(async (tableId: string, newName: string) => {
    if (!event || !event.tables) return;
    const updatedTables = (event.tables as Table[]).map((t) =>
      t.id === tableId ? { ...t, name: newName } : t
    );
    await updateEventLayout(eventId, updatedTables);
    setEvent(prevEvent => prevEvent ? { ...prevEvent, tables: updatedTables } : null);
    setRenamingTableId(null);
  }, [event, eventId]);

  // Keep selectedTable in sync with event.tables when modal is open
  useEffect(() => {
    if (showTableModal && selectedTable && event && event.tables) {
      const latest = event.tables.find((t: any) => t.id === selectedTable.id);
      if (latest && latest !== selectedTable) {
        setSelectedTable(latest as Table);
      }
    }
  }, [event && event.tables, selectedTable, showTableModal]);
  // Search and pagination state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [guestsPerPage, setGuestsPerPage] = useState(5);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchEventById(eventId)
      .then(data => {
        setEvent(data.event || null);
        if (data.event) {
          setEventForm({
            name: data.event.name || '',
            date: data.event.date || '',
            time: data.event.time || '',
            location: data.event.location || '',
            maxCapacity: data.event.maxCapacity ? String(data.event.maxCapacity) : ''
          });
        }
      })
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!event) return <div className="p-8">Event not found.</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <button onClick={onBack} className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
        <i className="fas fa-arrow-left mr-2"></i>Back to Dashboard
      </button>
      {/* Check-in Page/QR Code Button */}
      <div className="mb-4">
        <a
          href={`/events/${eventId}/checkin`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Show Check-In Page / Event QR Code
        </a>
      </div>
      <div className="mb-6">
        {editingEvent ? (
          <form
            className="space-y-2 bg-gray-50 p-4 rounded"
            onSubmit={async e => {
              e.preventDefault();
              setAdding(true);
              setError(null);
              try {
                const res = await fetch(`/api/events/${eventId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: eventForm.name,
                    date: eventForm.date,
                    time: eventForm.time,
                    location: eventForm.location,
                    maxCapacity: eventForm.maxCapacity ? parseInt(eventForm.maxCapacity) : undefined
                  })
                });
                if (!res.ok) throw new Error('Failed to update event');
                const data = await res.json();
                setEvent(data.event || null);
                setEditingEvent(false);
              } catch (err: any) {
                setError(err.message || 'Error updating event');
              }
              setAdding(false);
            }}
          >
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input type="text" className="border rounded px-3 py-2 w-full" required value={eventForm.name} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Date</label>
              <input type="date" className="border rounded px-3 py-2 w-full" required value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Time</label>
              <input type="time" className="border rounded px-3 py-2 w-full" required value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Location</label>
              <input type="text" className="border rounded px-3 py-2 w-full" required value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Number of Guests</label>
              <input type="number" min="1" className="border rounded px-3 py-2 w-full" required value={eventForm.maxCapacity} onChange={e => setEventForm(f => ({ ...f, maxCapacity: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={adding}>{adding ? 'Saving...' : 'Save'}</button>
              <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={() => setEditingEvent(false)} disabled={adding}>Cancel</button>
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </form>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{event.name}</h2>
            <p className="text-gray-600">{event.date} at {event.time} - {event.location}</p>
            <div className="flex gap-2 mt-2">
              <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm" onClick={() => setEditingEvent(true)}>Edit Event</button>
            </div>
          </>
        )}
      </div>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button className={`px-4 py-2 rounded-lg ${tab === 'guests' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setTab('guests')}>Guests</button>
        <button className={`px-4 py-2 rounded-lg ${tab === 'layout' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setTab('layout')}>Layout</button>
        <button className={`px-4 py-2 rounded-lg ${tab === 'checkin' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setTab('checkin')}>Check-in</button>
        <button className={`px-4 py-2 rounded-lg ${tab === 'analytics' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setTab('analytics')}>Analytics</button>
      </div>
      {/* Tab Content */}
      {tab === 'guests' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Guest Management</h3>
          {/* Import Guests */}
          <div className="mb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <label className="block text-sm font-medium">Import Guests from Spreadsheet</label>
              <button
                type="button"
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300"
                onClick={() => {
                  const sample = [
                    ['Name', 'Email', 'Table name'],
                    ['Alice Example', 'alice@email.com', 'Table 1'],
                    ['Bob Example', 'bob@email.com', 'Table 2']
                  ];
                  const csv = sample.map(row => row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'guest-import-sample.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
              >Download Sample CSV</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">Import Guests</label>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAdding(true);
                  setError(null);
                  let rows: any[] = [];
                  try {
                    if (file.name.endsWith('.csv')) {
                      const text = await file.text();
                      const parsed = Papa.parse(text, { header: true });
                      rows = parsed.data;
                    } else {
                      const data = await file.arrayBuffer();
                      const workbook = XLSX.read(data, { type: 'array' });
                      const sheet = workbook.Sheets[workbook.SheetNames[0]];
                      rows = XLSX.utils.sheet_to_json(sheet);
                    }
                    // Find all unique table names in the file
                    const tableNamesInFile = Array.from(new Set(rows.map(row => (row['Table name'] || row['Table Name'] || row.table || row.tableName || row.Table || '').trim()).filter(Boolean)));
                    // Find missing tables
                    const existingTableNames = (event.tables || []).map((t: any) => t.name.trim().toLowerCase());
                    const missingTableNames = tableNamesInFile.filter(name => !existingTableNames.includes(name.trim().toLowerCase()));
                    // Add missing tables as round tables with 10 capacity
                    let updatedTables = [...(event.tables || [])];
                    let tablesAdded = 0;
                    for (const tableName of missingTableNames) {
                      const newTable = {
                        id: `table_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        name: tableName,
                        shape: 'round',
                        capacity: 10,
                        x: 50 + (updatedTables.length * 80) % 500,
                        y: 50 + Math.floor(updatedTables.length / 6) * 80,
                        assignedGuests: [],
                        rotation: 0,
                      };
                      updatedTables.push(newTable);
                      tablesAdded++;
                    }
                    // If new tables were added, update event in backend
                    if (tablesAdded > 0) {
                      await updateEventLayout(eventId, updatedTables);
                    }
                    // Refresh event to get new tables
                    let refreshedEvent = event;
                    if (tablesAdded > 0) {
                      const data = await fetchEventById(eventId);
                      refreshedEvent = data.event || event;
                      setEvent(refreshedEvent);
                    }
                    // Import each guest
                    let success = 0, failed = 0;
                    for (const row of rows) {
                      const name = row.Name || row.name;
                      const email = row.Email || row.email;
                      const tableName = row['Table name'] || row['Table Name'] || row.table || row.tableName || row.Table;
                      if (!name) { failed++; continue; }
                      let assignedTable = '';
                      if (tableName && refreshedEvent.tables) {
                        const match = refreshedEvent.tables.find((t: any) => t.name.trim().toLowerCase() === String(tableName).trim().toLowerCase());
                        if (match) assignedTable = match.id;
                      }
                      try {
                        await addGuest(eventId, { name, email, assignedTable });
                        success++;
                      } catch {
                        failed++;
                      }
                    }
                    // Refresh event guest list
                    const data = await fetchEventById(eventId);
                    setEvent(data.event || null);
                    alert(`Imported: ${success} guests. Failed: ${failed}. Tables added: ${tablesAdded}`);
                  } catch (err: any) {
                    setError('Import failed: ' + (err.message || 'Unknown error'));
                  }
                  setAdding(false);
                  e.target.value = '';
                }}
                className="border rounded p-1 w-1/4 mb-2"
                disabled={adding}
              />
            </div>
            <div className="text-xs text-gray-500">Accepted: CSV, XLSX, XLS. Columns: Name, Email, Table name</div>
          </div>
          {/* Add Guest Form */}
          <form
            className="flex flex-col md:flex-row gap-2 mb-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setAdding(true);
              setError(null);
              try {
                await addGuest(eventId, { name: guestName, email: guestEmail, assignedTable });
                const data = await fetchEventById(eventId);
                setEvent(data.event || null);
                setGuestName('');
                setGuestEmail('');
                setAssignedTable('');
              } catch (err: any) {
                setError(err.message || 'Error adding guest');
              }
              setAdding(false);
            }}
          >
            <input
              type="text"
              className="border rounded px-3 py-2 flex-1"
              placeholder="Full Name"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              required
            />
            <input
              type="email"
              className="border rounded px-3 py-2 flex-1"
              placeholder="Email (optional)"
              value={guestEmail}
              onChange={e => setGuestEmail(e.target.value)}
            />
            <select
              className="border rounded px-3 py-2 flex-1"
              value={assignedTable}
              onChange={e => setAssignedTable(e.target.value)}
            >
              <option value="">Assign to Table</option>
              {(event.tables || []).map((table: any) => {
                const localTable = {
                  ...table,
                  shape: table.shape === 'round' || table.shape === 'rectangular' ? table.shape : 'round'
                } as Table;
                return (
                  <option key={localTable.id} value={localTable.id}>{localTable.name}</option>
                );
              })}
            </select>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={adding}
            >
              {adding ? 'Adding...' : 'Add Guest'}
            </button>
          </form>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {/* Search, Filter, and Pagination Controls */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
            <input
              type="text"
              className="border rounded px-3 py-2 flex-1"
              placeholder="Search guests by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Guest List with Pagination */}
          {event.guests && event.guests.length > 0 ? (
            (() => {
              // Filter guests by debounced search
              const filteredGuests = (event.guests || []).filter((guest: any) => {
                const q = debouncedSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  (guest.name && guest.name.toLowerCase().includes(q)) ||
                  (guest.email && guest.email.toLowerCase().includes(q))
                );
              });
              // Pagination
              const totalPages = Math.ceil(filteredGuests.length / guestsPerPage) || 1;
              const startIdx = (currentPage - 1) * guestsPerPage;
              const paginatedGuests = filteredGuests.slice(startIdx, startIdx + guestsPerPage);
              return (
                <React.Fragment>
                  <ul className="divide-y">
                    {paginatedGuests.map((guest: Guest) => {
                      const guestId = guest._id || (guest as any).id;
                      return (
                        <li key={guestId} className="py-2 flex justify-between items-center gap-2">
                          <span>{guest.name}</span>
                          <span className="flex gap-2 items-center">
                            <button
                              className={`px-2 py-1 rounded text-xs ${guest.checkedIn ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                              onClick={async () => {
                                setAdding(true);
                                setError(null);
                                try {
                                  await toggleGuestCheckin(eventId, guestId, !guest.checkedIn);
                                  const data = await fetchEventById(eventId);
                                  setEvent(data.event || null);
                                } catch (err: any) {
                                  setError(err.message || 'Error updating check-in');
                                }
                                setAdding(false);
                              }}
                              disabled={adding}
                            >{guest.checkedIn ? 'Checked In' : 'Pending'}</button>
                            <button
                              className="text-blue-600 hover:underline text-xs"
                              onClick={() => setEditingGuest(guest)}
                              disabled={adding}
                            >Edit</button>
                            <button
                              className="text-red-600 hover:underline text-xs"
                              onClick={async () => {
                                if (!confirm('Delete this guest?')) return;
                                setAdding(true);
                                setError(null);
                                try {
                                  await deleteGuest(eventId, guestId);
                                  const data = await fetchEventById(eventId);
                                  setEvent(data.event || null);
                                } catch (err: any) {
                                  setError(err.message || 'Error deleting guest');
                                }
                                setAdding(false);
                              }}
                              disabled={adding}
                            >Delete</button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center gap-2 mt-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft />
                      </button>
                      <span className="text-sm">Page {currentPage} of {totalPages}</span>
                      <button
                        className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight />
                      </button>
                    </div>
                    <label className="block text-sm font-medium ml-2">Show
                      <select
                        className="ml-2 border rounded px-2 py-1"
                        value={guestsPerPage}
                        onChange={e => {
                          setGuestsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      guests
                    </label>

                  </div>
                  {/* Edit Guest Modal */}
                  <GuestEditModal
                    open={!!editingGuest}
                    guest={editingGuest}
                    tables={(event.tables || []).map((table: any) => ({
                      ...table,
                      shape: table.shape === 'round' || table.shape === 'rectangular' ? table.shape : 'round',
                    }))}
                    onSave={async (g) => {
                      setAdding(true);
                      setEditError(null);
                      try {
                        if (!editingGuest) return;
                        await updateGuest(eventId, editingGuest._id, g);
                        const data = await fetchEventById(eventId);
                        setEvent(data.event || null);
                        setEditingGuest(null);
                      } catch (err: any) {
                        setEditError(err.message || 'Error updating guest');
                      }
                      setAdding(false);
                    }}
                    onCancel={() => setEditingGuest(null)}
                    loading={adding}
                    error={editError}
                  />
                </React.Fragment>
              );
            })()
          ) : (
            <p className="text-gray-500">No guests yet.</p>
          )}
        </div>
      )}
      {tab === 'layout' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Hall Layout</h3>
          {event && (
            <HallLayoutPlanner
              eventId={eventId}
              tables={(event.tables || []).map((table: any) => ({
                ...table,
                shape: table.shape === 'round' || table.shape === 'rectangular' ? table.shape : 'round',
              }))}
              guests={event.guests || []}
              onTableClick={(table, meta) => {
                // Normalize shape to match local Table type for modal
                const normalizedTable = {
                  ...table,
                  shape: (table.shape === 'round' || table.shape === 'rectangular') ? table.shape : 'round',
                } as Table;
                if (!meta?.fromDrag) {
                  setSelectedTable(normalizedTable);
                  setShowTableModal(true);
                }
              }}
              onTablesChange={async (tables) => {
                // Normalize shape for backend update
                const normalizedTables = tables.map((table: any) => ({
                  ...table,
                  shape: table.shape === 'round' || table.shape === 'rectangular' ? table.shape : 'round',
                }));
                await updateEventLayout(eventId, normalizedTables);
                const data = await fetchEventById(eventId);
                setEvent(data.event || null);
              }}
            />
          )}
          <TableModal
            open={showTableModal && !!selectedTable}
            table={selectedTable}
            guests={event.guests || []}
            onRename={handleRenameTable}
            onClose={() => setShowTableModal(false)}
            renaming={renamingTableId}
            setRenaming={setRenamingTableId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
          />
        </div>
      )}
      {tab === 'checkin' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Check-in</h3>
          {event.guests && event.guests.length > 0 ? (
            <ul className="divide-y">
              {event.guests.map((guest: Guest) => (
                <li key={guest._id || guest.email || guest.name} className="py-2 flex justify-between items-center gap-2">
                  <span>{guest.name}</span>
                  <span className="flex gap-2 items-center">
                    <span className={`px-2 py-1 rounded text-xs ${guest.checkedIn ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{guest.checkedIn ? 'Checked In' : 'Pending'}</span>
                    <button
                      className={`px-3 py-1 rounded text-xs ${guest.checkedIn ? 'bg-red-500 text-white' : 'bg-green-600 text-white'} hover:opacity-90`}
                      onClick={async () => {
                        setAdding(true);
                        setError(null);
                        try {
                          await toggleGuestCheckin(eventId, guest._id, !guest.checkedIn);
                          const data = await fetchEventById(eventId);
                          setEvent(data.event || null);
                        } catch (err: any) {
                          setError(err.message || 'Error updating check-in');
                        }
                        setAdding(false);
                      }}
                      disabled={adding}
                    >{guest.checkedIn ? 'Undo' : 'Check In'}</button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No guests yet.</p>
          )}
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </div>
      )}
      {tab === 'analytics' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Analytics</h3>
          <p>Coming soon: Analytics and reports.</p>
        </div>
      )}
    </div>
  );
}
