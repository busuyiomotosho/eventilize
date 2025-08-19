
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';
import Guest from '@/lib/models/Guest';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Unauthorized', 401);
  await dbConnect();
  // Get user's events
  const events = await Event.find({ createdBy: session.user.id }).lean();
  const eventIds = events.map((event: any) => event._id);
  // Get all guests for user's events
  const guests = await Guest.find({ eventId: { $in: eventIds } }).lean();
  // Calculate stats
  const totalEvents = events.length;
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter((guest: any) => guest.checkedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  return NextResponse.json({
    totalEvents,
    totalGuests,
    checkedInGuests,
    pendingGuests
  });
}