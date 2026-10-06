import { NextResponse } from 'next/server';
import { getLogs } from '@/lib/store';

export async function GET() {
  const logs = await getLogs(50);
  return NextResponse.json(logs);
}
