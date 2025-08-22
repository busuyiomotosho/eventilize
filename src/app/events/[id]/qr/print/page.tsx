"use client"
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchEventById } from '@/lib/api';

const QRCodeSVG = dynamic<any>(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false });

type PrintProps = { params?: Promise<{ id: string }>; };

export default function QrPrintPage({ params }: PrintProps) {
  const [eventId, setEventId] = React.useState<string | undefined>(undefined);
  const [eventName, setEventName] = React.useState<string>('Event');

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
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [params]);

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    (async () => {
      try {
        const d = await fetchEventById(eventId);
        if (!mounted) return;
        setEventName(d.event?.name || 'Event');
      } catch (e) {}
      // small delay to allow fonts/images to settle
      setTimeout(() => {
        try { window.print(); } catch (e) {}
      }, 250);
    })();
    return () => { mounted = false; };
  }, [eventId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8 print:p-0">
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>{eventName}</h1>
        {eventId ? (
          <div>
            <div style={{ display: 'inline-block', padding: 12, background: '#fff' }}>
              <QRCodeSVG value={typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}/checkin` : ''} size={600} id="print-qr" />
            </div>
            <p style={{ marginTop: 12, fontSize: 14 }}>Scan to check in</p>
          </div>
        ) : (
          <div>Missing event id</div>
        )}
      </div>
    </div>
  );
}
