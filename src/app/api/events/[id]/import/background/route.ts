import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ImportJob from '@/lib/models/ImportJob';
import Event from '@/lib/models/Event';
import Papa from 'papaparse';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

// POST: create a background import job. Body: { csvText, mapping, createMissingTables }
// Returns: { jobId }
// @ts-expect-error Next.js 15 context typing
export async function POST(req: NextRequest, context) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  if (!id) return errorResponse('Missing event id', 400);
  let body: any;
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON', 400); }
  const { csvText, mapping = {}, createMissingTables = false } = body;
  if (!csvText) return errorResponse('Missing csvText', 400);

  // create job
  const job = new ImportJob({ eventId: id, csvText, mapping, createMissingTables, status: 'pending' });
  await job.save();

  // start async worker (in-process). For production use a queue (Bull, RabbitMQ)
  (async () => {
    try {
      job.status = 'running';
      await job.save();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const rows = parsed.data as any[];
      const total = rows.length;
      let processed = 0;
      const CHUNK = 50;
      // process in chunks
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        // process chunk
        const event = await Event.findById(id);
        if (!event) throw new Error('Event not found');
        for (const row of chunk) {
          const guestName = (row[mapping.guestName] || row['guestName'] || row['Name'] || row['name'] || '').toString().trim();
          const guestEmail = (row[mapping.guestEmail] || row['guestEmail'] || row['Email'] || row['email'] || '').toString().trim();
          const tableIdVal = (row[mapping.tableId] || row['tableId'] || row['table id'] || '').toString().trim();
          const tableNameVal = (row[mapping.tableName] || row['tableName'] || row['Table Name'] || row['table name'] || '').toString().trim();
          if (!guestName && !guestEmail) { job.unmatchedCount++; continue; }
          let guest = null as any;
          if (guestEmail) guest = event.guests.find((g: any) => g.email && g.email.trim().toLowerCase() === guestEmail.trim().toLowerCase());
          if (!guest && guestName) guest = event.guests.find((g: any) => g.name && g.name.trim().toLowerCase() === guestName.trim().toLowerCase());
          let table = null as any;
          if (tableIdVal) table = event.tables.find((t: any) => t.id === tableIdVal);
          if (!table && tableNameVal) table = event.tables.find((t: any) => t.name && t.name.trim().toLowerCase() === tableNameVal.trim().toLowerCase());
          if (!table && createMissingTables && tableNameVal) {
            const newTable = { id: `table_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name: tableNameVal, shape: 'round', capacity: 10, x: 50 + (event.tables.length * 80) % 500, y: 50 + Math.floor(event.tables.length/6)*80, assignedGuests: [], rotation: 0 } as any;
            event.tables.push(newTable);
            table = newTable;
          }
          if (!table || !guest) { job.unmatchedCount++; continue; }
          // remove guest from other tables
          for (const t of event.tables) { t.assignedGuests = (t.assignedGuests || []).filter((id: string) => id !== guest._id.toString()); }
          if (!Array.isArray(table.assignedGuests)) table.assignedGuests = [];
          if (!table.assignedGuests.includes(guest._id.toString())) table.assignedGuests.push(guest._id.toString());
          job.matchedCount++;
        }
        await event.save();
        processed += chunk.length;
        job.progress = Math.round((processed / total) * 100);
        await job.save();
      }
      job.status = 'done';
      await job.save();
    } catch (err: any) {
      job.status = 'failed';
      job.errorMessage = err?.message || 'Import failed';
      await job.save();
    }
  })();

  return NextResponse.json({ jobId: job._id });
}
