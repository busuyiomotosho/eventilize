
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

// PATCH: Toggle guest check-in
// @ts-expect-error Next.js 15 context typing
export async function PATCH(req: NextRequest, context) {
  const { id, guestId } = context.params;
  await dbConnect();
  if (!id || !guestId) return errorResponse('Missing event or guest id', 400);
  let checkedIn: boolean;
  try {
    const body = await req.json();
    checkedIn = body.checkedIn;
    if (typeof checkedIn !== 'boolean') return errorResponse('Invalid checkedIn value', 400);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const event = await Event.findById(id);
  if (!event) return errorResponse('Event not found', 404);
  const guest = event.guests.id(guestId) || event.guests.find((g: any) => g._id?.toString() === guestId);
  if (!guest) return errorResponse('Guest not found', 404);
  guest.checkedIn = checkedIn;
  await event.save();
  return NextResponse.json({ guests: event.guests });
}