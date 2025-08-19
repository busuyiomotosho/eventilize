import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Event, { IEvent } from '@/lib/models/Event';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Unauthorized', 401);
  await dbConnect();
  const events = await Event.find({ createdBy: session.user.id })
    .sort({ createdAt: -1 })
    .lean();
  // Ensure each event has an 'id' property for frontend compatibility
  const eventsWithId = events.map((event: any) => ({
    ...event,
    id: event.id || event._id?.toString() || '',
  }));
  return NextResponse.json({ events: eventsWithId });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Unauthorized', 401);
  await dbConnect();
  let eventData: Partial<IEvent>;
  try {
    eventData = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  // Generate unique QR code
  const qrCode = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const event = new Event({
    ...eventData,
    createdBy: session.user.id,
    qrCode,
  });
  await event.save();
  // Convert to plain object and add `id` for frontend compatibility
  const eventObj: any = event.toObject ? event.toObject() : { ...event };
  eventObj.id = eventObj.id || eventObj._id?.toString() || '';

  return NextResponse.json(
    { message: 'Event created successfully', event: eventObj },
    { status: 201 }
  );
}