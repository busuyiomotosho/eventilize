
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event, { ITable } from '@/lib/models/Event';

// Helper for error responses
function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}


// GET: Get event layout
// @ts-expect-error Next.js 15 context typing
export async function GET(_req: NextRequest, context) {
  await dbConnect();
  const { id } = context.params;
  if (!id) return errorResponse('Missing event id', 400);
  const event = await Event.findById(id).lean() as import('@/lib/models/Event').IEvent | null;
  if (!event) return errorResponse('Event not found', 404);
  return NextResponse.json({ tables: event.tables || [] });
}


// PUT: Update event layout
// @ts-expect-error Next.js 15 context typing
export async function PUT(req: NextRequest, context) {
  await dbConnect();
  const { id } = context.params;
  if (!id) return errorResponse('Missing event id', 400);
  let tables: ITable[];
  try {
    const body = await req.json();
    tables = body.tables;
    if (!Array.isArray(tables)) return errorResponse('Invalid tables array', 400);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const event = await Event.findById(id);
  if (!event) return errorResponse('Event not found', 404);
  event.tables = tables;
  await event.save();
  return NextResponse.json({ tables: event.tables });
}