
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

// POST: Guest self-check-in by name
// @ts-expect-error Next.js 15 context typing
export async function POST(req: NextRequest, context) {
  await dbConnect();
  const { id } = context.params;
  if (!id) return errorResponse('Missing event id', 400);
  let name: string;
  try {
    const body = await req.json();
    name = body.name;
    if (!name) return errorResponse('Name is required', 400);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const event = await Event.findById(id);
  if (!event) return errorResponse('Event not found', 404);
  // Find guest by name (case-insensitive, trimmed)
  const guest = event.guests.find((g: any) => g.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!guest) return errorResponse('Guest not found. Please check your name or contact the organizer.', 404);
  // Mark as checked in
  guest.checkedIn = true;
  await event.save();
  // Find assigned table (if any)
  let assignedTable = null;
  if (event.tables && Array.isArray(event.tables)) {
    for (const table of event.tables) {
      if (table.assignedGuests && table.assignedGuests.includes(guest._id?.toString())) {
        assignedTable = table.name;
        break;
      }
    }
  }
  return NextResponse.json({ checkedIn: true, table: assignedTable });
}
