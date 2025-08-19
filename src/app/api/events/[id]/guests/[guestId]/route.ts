
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}



// PATCH: Toggle guest check-in
// @ts-expect-error Next.js 15 context typing
export async function PATCH(req: NextRequest, context) {
  const params = await context.params;
  const { id, guestId } = params;
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


// PUT: Edit guest
// @ts-expect-error Next.js 15 context typing
export async function PUT(req: NextRequest, context) {
  const params = await context.params;
  const { id, guestId } = params;
  await dbConnect();
  if (!id || !guestId) return errorResponse('Missing event or guest id', 400);
  let name: string, email: string, assignedTable: string;
  try {
    const body = await req.json();
    name = body.name;
    email = body.email;
    assignedTable = body.assignedTable;
    if (!name) return errorResponse('Name is required', 400);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const event = await Event.findById(id);
  if (!event) return errorResponse('Event not found', 404);
  const guest = event.guests.id(guestId) || event.guests.find((g: any) => g._id?.toString() === guestId);
  if (!guest) return errorResponse('Guest not found', 404);
  // Remove guest from all tables' assignedGuests
  if (Array.isArray(event.tables)) {
    event.tables.forEach((table: any) => {
      if (Array.isArray(table.assignedGuests)) {
        table.assignedGuests = table.assignedGuests.filter((gid: string) => gid !== guest._id.toString());
      }
    });
  }
  // Assign guest to the new table if provided
  if (assignedTable) {
    const table = event.tables.find((t: any) => t.id === assignedTable);
    if (table) {
      if (!Array.isArray(table.assignedGuests)) table.assignedGuests = [];
      table.assignedGuests.push(guest._id.toString());
    }
    guest.assignedTable = assignedTable;
  } else {
    guest.assignedTable = undefined;
  }
  guest.name = name;
  guest.email = email;
  await event.save();
  return NextResponse.json({ guests: event.guests });
}


// DELETE: Remove guest
// @ts-expect-error Next.js 15 context typing
export async function DELETE(_req: NextRequest, context) {
  const params = await context.params;
  const { id, guestId } = params;
  await dbConnect();
  if (!id || !guestId) return errorResponse('Missing event or guest id', 400);
  const event = await Event.findById(id);
  if (!event) return errorResponse('Event not found', 404);
  event.guests = event.guests.filter((g: any) => (g._id?.toString() !== guestId));
  await event.save();
  return NextResponse.json({ guests: event.guests });
}
// (duplicate code removed)