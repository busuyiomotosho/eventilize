import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event, { IEvent } from '@/lib/models/Event';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

// GET: Get single event
// @ts-expect-error Next.js 15 context typing
export async function GET(_req: NextRequest, context) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  if (!id) return errorResponse('Missing event id', 400);
  const event = await Event.findById(id).lean() as IEvent | null;
  if (!event) return errorResponse('Event not found', 404);
  return NextResponse.json({ event });
}

// PUT: Update event
// @ts-expect-error Next.js 15 context typing
export async function PUT(req: NextRequest, context) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  if (!id) return errorResponse('Missing event id', 400);
  let body: Partial<IEvent>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const event = await Event.findByIdAndUpdate(id, body, { new: true }).lean() as IEvent | null;
  if (!event) return errorResponse('Event not found', 404);
  return NextResponse.json({ event });
}

// DELETE: Delete event
// @ts-expect-error Next.js 15 context typing
export async function DELETE(_req: NextRequest, context) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  if (!id) return errorResponse('Missing event id', 400);
  const event = await Event.findByIdAndDelete(id).lean() as IEvent | null;
  if (!event) return errorResponse('Event not found', 404);
  return NextResponse.json({ message: 'Event deleted successfully' });
}