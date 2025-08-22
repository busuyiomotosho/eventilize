"use client"
import React, { useEffect, useRef } from 'react';
import HallLayoutPlanner from '@/components/events/HallLayoutPlanner';
import type { Table, Guest } from '@/lib/types';
import { fetchEventById } from '@/lib/api';

type PrintPageProps = {
  // Next's generated types expect Promise-like params/searchParams for PageProps
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function PrintLayoutPage({ params }: PrintPageProps) {
  // params may be a promise in the generated types; resolve it in an effect and store the id in state.
  const [eventId, setEventId] = React.useState<string | undefined>(undefined);
  const [tables, setTables] = React.useState<Table[]>([]);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const mountedRef = useRef(false);

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

  useEffect(() => {
  if (mountedRef.current) return;
  if (!eventId) return;
    mountedRef.current = true;
    (async () => {
      try {
        const { event } = await fetchEventById(eventId as string);
        setTables(event.tables || []);
        setGuests(event.guests || []);
      } catch (e) {
        // ignore
      }
      // Delay printing slightly to allow images/fonts to settle
      setTimeout(() => {
        try { window.print(); } catch (e) {}
      }, 350);
    })();
  }, [eventId]);

  return (
    <div className="p-4 print:p-0">
      <h1 className="text-xl font-bold mb-4">Print - Seating Layout</h1>
      <div style={{ width: '100%' }}>
        {/* Render the planner in read-only mode: we can reuse HallLayoutPlanner but disable interactions via CSS */}
        <div className="print-only">
          {eventId ? <HallLayoutPlanner eventId={eventId} tables={tables} guests={guests} readOnly onTableClick={() => {}} onTablesChange={() => {}} /> : <div>Missing event id</div>}
        </div>
      </div>
    </div>
  );
}
