import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';
import Papa from 'papaparse';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

// POST: preview import without saving. Body: { csvText, mapping }
// Returns: { matched: [...], unmatched: [...], tablesNeeded: string[] }
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
  const { csvText, mapping = {} } = body;
  if (!csvText) return errorResponse('Missing csvText', 400);

  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as any[];

  const event = await Event.findById(id).lean() as any;
  if (!event) return errorResponse('Event not found', 404);

  const matched: any[] = [];
  const unmatched: any[] = [];
  const tablesNeeded = new Set<string>();

  for (const row of rows) {
    const guestName = (row[mapping.guestName] || row['guestName'] || row['Name'] || row['name'] || '').toString().trim();
    const guestEmail = (row[mapping.guestEmail] || row['guestEmail'] || row['Email'] || row['email'] || '').toString().trim();
    const tableIdVal = (row[mapping.tableId] || row['tableId'] || row['table id'] || '').toString().trim();
    const tableNameVal = (row[mapping.tableName] || row['tableName'] || row['Table Name'] || row['table name'] || '').toString().trim();

    if (!guestName && !guestEmail) {
      unmatched.push({ row, reason: 'Missing guest name/email' });
      continue;
    }

    let guest = null as any;
    if (guestEmail) {
      guest = (event.guests || []).find((g: any) => g.email && g.email.trim().toLowerCase() === guestEmail.trim().toLowerCase());
    }
    if (!guest && guestName) {
      guest = (event.guests || []).find((g: any) => g.name && g.name.trim().toLowerCase() === guestName.trim().toLowerCase());
    }

    let table = null as any;
    if (tableIdVal) table = (event.tables || []).find((t: any) => t.id === tableIdVal);
    if (!table && tableNameVal) table = (event.tables || []).find((t: any) => t.name && t.name.trim().toLowerCase() === tableNameVal.trim().toLowerCase());

    if (!table && tableNameVal) tablesNeeded.add(tableNameVal);

    if (!table) {
      unmatched.push({ row, reason: 'Table not found' });
      continue;
    }
    if (!guest) {
      unmatched.push({ row, reason: 'Guest not found' });
      continue;
    }

    matched.push({ guestId: guest._id, guestName: guest.name, tableId: table.id, tableName: table.name });
  }

  return NextResponse.json({ matched, unmatched, tablesNeeded: Array.from(tablesNeeded) });
}
