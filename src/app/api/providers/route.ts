import { NextResponse } from 'next/server';
import { getProviders } from '@/lib/store';

export async function GET() {
  const providers = await getProviders();
  // Mask API keys for security in UI response
  const safeProviders = providers.map(p => ({
    ...p,
    apiKey: p.apiKey ? `${p.apiKey.substring(0, 4)}...${p.apiKey.substring(p.apiKey.length - 4)}` : '',
    hasKey: Boolean(p.apiKey),
  }));
  return NextResponse.json(safeProviders);
}
