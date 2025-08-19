'use client'
import React, { useState, use, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Dynamically import QRCodeSVG to avoid SSR issues
const QRCodeSVG = dynamic<any>(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false });


export default function EventCheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [guestName, setGuestName] = useState('');
  const [result, setResult] = useState<{ table?: string; checkedIn?: boolean; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded shadow p-6 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Event Check-In</h1>
        <div className="mb-6 flex flex-col items-center">
          <div className="flex flex-col items-center">
            <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : ''} size={160} id="event-qr-code-svg" />
            <button
              className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
              onClick={() => {
                const svg = document.getElementById('event-qr-code-svg') as SVGSVGElement | null;
                if (!svg) return;
                const serializer = new XMLSerializer();
                const source = serializer.serializeToString(svg);
                const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'event-qr-code.svg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >Download QR Code</button>
            <div className="text-xs text-gray-500 mt-2">Scan this QR code to check in</div>
          </div>
        </div>
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
            Checked in!<br />
            {result.table ? `Your assigned table: ${result.table}` : 'No table assigned.'}
          </div>
        )}
      </div>
    </div>
  );
}
