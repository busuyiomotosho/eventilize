import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';
import Papa from 'papaparse';
import mongoose from 'mongoose';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

// Accepts POST with JSON: { csvText: string, mapping: { guestName, guestEmail, tableId, tableName, seatIndex }, createMissingTables: boolean }
// Returns: { matched: [...], unmatched: [...], tablesAdded: number }
// @ts-expect-error Next.js 15 context typing
export async function POST(req: NextRequest, context) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  if (!id) return errorResponse('Missing event id', 400);
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400);
  }
  const { csvText, mapping = {}, createMissingTables = false } = body;
  if (!csvText) return errorResponse('Missing csvText', 400);

  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as any[];

  const event = await Event.findById(id);
  if (!event) return errorResponse('Event not found', 404);

  const matched: any[] = [];
  const unmatched: any[] = [];
  let tablesAdded = 0;

  for (const row of rows) {
    const guestName = (row[mapping.guestName] || row['guestName'] || row['Name'] || row['name'] || '').toString().trim();
    const guestEmail = (row[mapping.guestEmail] || row['guestEmail'] || row['Email'] || row['email'] || '').toString().trim();
    const tableIdVal = (row[mapping.tableId] || row['tableId'] || row['table id'] || '').toString().trim();
    const tableNameVal = (row[mapping.tableName] || row['tableName'] || row['Table Name'] || row['table name'] || '').toString().trim();

    if (!guestName && !guestEmail) {
      unmatched.push({ row, reason: 'Missing guest name/email' });
      continue;
    }

    // find guest by email then name
    let guest = null as any;
    if (guestEmail) {
      guest = event.guests.find((g: any) => g.email && g.email.trim().toLowerCase() === guestEmail.trim().toLowerCase());
    }
    if (!guest && guestName) {
      guest = event.guests.find((g: any) => g.name && g.name.trim().toLowerCase() === guestName.trim().toLowerCase());
    }

    // find table by id or name
    let table = null as any;
    if (tableIdVal) table = event.tables.find((t: any) => t.id === tableIdVal);
    if (!table && tableNameVal) table = event.tables.find((t: any) => t.name && t.name.trim().toLowerCase() === tableNameVal.trim().toLowerCase());

    if (!table && createMissingTables && tableNameVal) {
      // create a new table subdocument
      const newTable = {
        id: `table_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: tableNameVal,
        shape: 'round',
        capacity: 10,
        x: 50 + (event.tables.length * 80) % 500,
        y: 50 + Math.floor(event.tables.length / 6) * 80,
        assignedGuests: [],
        rotation: 0,
      } as any;
      event.tables.push(newTable);
      table = newTable;
      tablesAdded++;
    }

    if (!table) {
      unmatched.push({ row, reason: 'Table not found' });
      continue;
    }
    if (!guest) {
      unmatched.push({ row, reason: 'Guest not found' });
      continue;
    }

    // ensure assignedGuests exist array
    if (!Array.isArray(table.assignedGuests)) table.assignedGuests = [];
    // remove guest from other tables
    for (const t of event.tables) {
      if (!Array.isArray(t.assignedGuests)) t.assignedGuests = [];
      t.assignedGuests = t.assignedGuests.filter((gid: string) => gid !== guest._id.toString());
    }
    // add to this table if not already
    if (!table.assignedGuests.includes(guest._id.toString())) table.assignedGuests.push(guest._id.toString());
    matched.push({ guestId: guest._id, guestName: guest.name, tableId: table.id, tableName: table.name });
  }

  // Save event document if we created tables or changed assignments
  await event.save();

  return NextResponse.json({ matched, unmatched, tablesAdded });
}
