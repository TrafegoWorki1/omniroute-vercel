import { NextRequest, NextResponse } from 'next/server';
import { getVirtualKeys, addVirtualKey } from '@/lib/store';

export async function GET() {
  const keys = await getVirtualKeys();
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const rawKey = 'sk-omni-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newKey = await addVirtualKey(name || 'Nova Chave', rawKey);
    return NextResponse.json({
      ...newKey,
      secretKey: rawKey, // only returned once upon creation
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
