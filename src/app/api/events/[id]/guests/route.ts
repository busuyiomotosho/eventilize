
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';
import mongoose from 'mongoose';
import crypto from 'crypto';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}


// POST: Add guest
// @ts-expect-error Next.js 15 context typing
export async function POST(req: NextRequest, context) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  if (!id) return errorResponse('Missing event id', 400);
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
  // Generate a unique qrCode for the guest
  const qrCode = crypto.randomBytes(8).toString('hex');
  // Use Mongoose subdocument creation for validation
  const guest = event.guests.create({
    name,
    email,
    checkedIn: false,
    eventId: new mongoose.Types.ObjectId(id),
    qrCode,
    registeredBy: 'organizer',
    registrationTime: new Date(),
    assignedTable: assignedTable || undefined
  });
  event.guests.push(guest);
  // If assignedTable, add guest to table's assignedGuests
  if (assignedTable && Array.isArray(event.tables)) {
    const table = event.tables.find((t: any) => t.id === assignedTable);
    if (table) {
      if (!Array.isArray(table.assignedGuests)) table.assignedGuests = [];
      table.assignedGuests.push(guest._id.toString());
    }
  }
  await event.save();
  return NextResponse.json({ guests: event.guests });
}
