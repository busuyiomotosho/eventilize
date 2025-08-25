"use client"
import React, { useEffect, useRef, useState } from 'react';
import { toTitleCase } from '@/lib/utils';

type CheckinProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function EventCheckInPage({ params }: CheckinProps) {
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  // resolve params if it's a Promise-like value
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (params && typeof (params as any).then === 'function') {
          const resolved = await (params as Promise<{ id: string }>);
          if (mounted) setEventId(resolved?.id);
        } else if (params && (params as any).id) {
          setEventId((params as any).id);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [params]);
  const [guestName, setGuestName] = useState('');
  const [result, setResult] = useState<{ table?: string; checkedIn?: boolean; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
  if (!eventId) throw new Error('Missing event id');
  const res = await fetch(`/api/events/${eventId}/guests/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Check-in failed');
      setResult({ table: data.table, checkedIn: data.checkedIn });
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  }

  // logo handling removed from guest-facing checkin page

  // QR download helpers removed from guest-facing checkin page

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded shadow p-6 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Event Check-In</h1>
  {/* Guest-facing checkin: QR code removed. Guests reach this page after scanning the event QR. */}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <label className="font-medium">Enter your name to check in:</label>
          <input
            type="text"
            className="border rounded px-3 py-2 w-full"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            required
            placeholder="Full Name"
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
            disabled={loading}
          >{loading ? 'Checking in...' : 'Check In'}</button>
        </form>

        {result && result.error && (
          <div className="text-red-600 mt-4">{result.error}</div>
        )}
        {result && result.checkedIn && (
          <div className="mt-4 text-green-700 font-semibold">
            Checked in, {toTitleCase(guestName)}!<br />
            {result.table ? `Your assigned table: ${result.table}` : 'No table assigned.'}
          </div>
        )}
      </div>
    </div>
  );
}
