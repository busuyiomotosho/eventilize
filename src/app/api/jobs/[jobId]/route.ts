import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ImportJob from '@/lib/models/ImportJob';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ message }, { status });
}

// GET job status
export async function GET(_req: NextRequest, context: any) {
  await dbConnect();
  const { jobId } = context.params || {};
  if (!jobId) return errorResponse('Missing job id', 400);
  const job = await ImportJob.findById(jobId).lean();
  if (!job) return errorResponse('Job not found', 404);
  return NextResponse.json({ job });
}
