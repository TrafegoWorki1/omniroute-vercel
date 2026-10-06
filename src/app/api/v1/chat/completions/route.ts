import { NextRequest } from 'next/server';
import { executeChatRoute } from '@/lib/router';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    // Optional API key validation logic
    
    const body = await req.json();
    return await executeChatRoute(body);
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Erro interno no gateway OmniRoute',
          type: 'invalid_request_error',
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}
