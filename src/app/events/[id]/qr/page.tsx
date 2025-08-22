"use client"
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchEventById } from '@/lib/api';

const QRCodeSVG = dynamic<any>(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false });

type Props = { params?: Promise<{ id: string }>; };

export default function EventQrPage({ params }: Props) {
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  const [qrSize, setQrSize] = useState<number>(320);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const previousLogoRef = useRef<string | null>(null);
  const [eventName, setEventName] = useState<string>('Event');
  const [isOrganizer, setIsOrganizer] = useState<boolean | null>(null);

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
        if (mounted && eventId) {
          try {
            const d = await fetchEventById(eventId as string);
            setEventName(d.event?.name || 'Event');
          } catch (e) {}
          try {
            const chk = await fetch(`/api/events/${eventId}/organizer-check`);
            if (chk.ok) {
              const jd = await chk.json();
              setIsOrganizer(Boolean(jd.isOrganizer));
            } else {
              setIsOrganizer(false);
            }
          } catch (e) {
            setIsOrganizer(false);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [params, eventId]);

  useEffect(() => {
    const prev = previousLogoRef.current;
    if (prev && prev !== logoUrl) {
      try { URL.revokeObjectURL(prev); } catch (e) {}
    }
    previousLogoRef.current = logoUrl;
    return () => {
      if (previousLogoRef.current) {
        try { URL.revokeObjectURL(previousLogoRef.current); } catch (e) {}
      }
    };
  }, [logoUrl]);

  function triggerDownload(href: string, filename: string) {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadSvg() {
    const svg = document.getElementById('event-qr-code-svg') as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    try {
      triggerDownload(url, `${eventId || 'event'}-qr.svg`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function downloadPng() {
    const svg = document.getElementById('event-qr-code-svg') as SVGSVGElement | null;
    if (!svg) return;
    try {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const rect = svg.getBoundingClientRect();
            const w = Math.max(1, Math.round(rect.width || qrSize));
            const h = Math.max(1, Math.round(rect.height || qrSize));
            const scale = Math.max(2, window.devicePixelRatio || 2);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('2D context not available');
            // Disable smoothing for crisper output
            // @ts-ignore
            ctx.imageSmoothingEnabled = false;
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.drawImage(img, 0, 0, w, h);

            const finalize = () => {
              const dataUrl = canvas.toDataURL('image/png');
              triggerDownload(dataUrl, `${eventId || 'event'}-qr.png`);
              resolve();
            };

            if (logoUrl) {
              const logoImg = new Image();
              logoImg.crossOrigin = 'anonymous';
              logoImg.onload = () => {
                try {
                  const logoSize = Math.round(Math.min(w, h) * 0.22);
                  const lx = Math.round((w - logoSize) / 2);
                  const ly = Math.round((h - logoSize) / 2);
                  ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
                } catch (e) {
                  // ignore logo draw errors
                } finally {
                  finalize();
                }
              };
              logoImg.onerror = () => finalize();
              logoImg.src = logoUrl;
            } else {
              finalize();
            }
          } catch (e) {
            // fallback to SVG download
            triggerDownload(url, `${eventId || 'event'}-qr.svg`);
            resolve();
          }
        };
        img.onerror = () => {
          // fallback to svg
          triggerDownload(url, `${eventId || 'event'}-qr.svg`);
          resolve();
        };
        img.src = url;
      });

      URL.revokeObjectURL(url);
    } catch (e) {
      // final fallback: try direct svg
      downloadSvg();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded shadow p-6 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Event QR Code</h1>
        <div className="mb-2 text-sm text-gray-600">Organizer-only QR page: attendees should not see this. Share via a staff link or print the QR.</div>
        <div className="mb-6 flex flex-col items-center">
          <div className="flex flex-col items-center">
            {isOrganizer === false ? (
              <div className="text-red-600">You are not authorized to view this QR code.</div>
            ) : isOrganizer === null ? (
              <div className="text-gray-500">Checking permissions...</div>
            ) : (
              <QRCodeSVG value={typeof window !== 'undefined' && eventId ? `${window.location.origin}/events/${eventId}/checkin` : ''} size={qrSize} id="event-qr-code-svg" />
            )}
            <div className="mt-2 flex items-center gap-3">
              <label className="text-xs">Size:</label>
              <select className="border rounded px-2 py-1 text-xs" value={qrSize} onChange={e => setQrSize(Number(e.target.value))}>
                <option value={160}>160</option>
                <option value={320}>320</option>
                <option value={512}>512</option>
              </select>
              <label className="text-xs ml-2">Logo:</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) { setLogoUrl(null); return; }
                  const url = URL.createObjectURL(file);
                  setLogoUrl(url);
                }}
                className="text-xs"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700" onClick={async () => {
                if (!isOrganizer) { alert('Not authorized'); return; }
                downloadSvg();
              }}>Download SVG</button>
              <button className="bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-800" onClick={async () => {
                if (!isOrganizer) { alert('Not authorized'); return; }
                await downloadPng();
              }}>Download PNG</button>
              <button className="bg-indigo-600 text-white px-3 py-1 rounded text-xs" onClick={() => {
                const url = eventId ? `${window.location.origin}/events/${eventId}/checkin` : window.location.href;
                navigator.clipboard?.writeText(url);
                alert('Copied link to clipboard');
              }}>Copy link</button>
              <button className="bg-green-600 text-white px-3 py-1 rounded text-xs" onClick={() => {
                if (!eventId) { alert('Missing event id'); return; }
                window.open(`/events/${eventId}/qr/print`, '_blank');
              }}>Print QR</button>
            </div>
            <div className="text-xs text-gray-500 mt-2">Scan this QR code to check in</div>
          </div>
        </div>
      </div>
    </div>
  );
}
