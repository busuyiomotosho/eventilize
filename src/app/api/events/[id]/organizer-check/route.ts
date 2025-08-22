import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/lib/models/Event';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, context: any) {
  const params = context?.params as { id?: string } | undefined;
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    if (!params?.id) return NextResponse.json({ ok: false, message: 'Missing id' }, { status: 400 });
    const event = await Event.findOne({ _id: params.id }).lean();
    if (!event) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
    const ev: any = event;
    const isOrganizer = String(ev.createdBy) === String(session.user.id);
    return NextResponse.json({ ok: true, isOrganizer });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
