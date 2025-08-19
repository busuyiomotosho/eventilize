'use client'


import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Dashboard from '@/components/dashboard/Dashboard';
import EventManagement from '@/components/dashboard/EventManagement';

export default function DashboardPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

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