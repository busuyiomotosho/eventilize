'use client'


import React, { useState } from 'react';
import Dashboard from '@/components/dashboard/Dashboard';
import EventManagement from '@/components/dashboard/EventManagement';

export default function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div>
      {!selectedEventId ? (
        <Dashboard onSelectEvent={setSelectedEventId} />
      ) : (
        <EventManagement eventId={selectedEventId} onBack={() => setSelectedEventId(null)} />
      )}
    </div>
  );
}