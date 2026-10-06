import { NextResponse } from 'next/server';
import { getRoutes } from '@/lib/store';

export async function GET() {
  const routes = await getRoutes();
  return NextResponse.json(routes);
}
