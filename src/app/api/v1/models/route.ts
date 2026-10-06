import { getRoutes, getProviders } from '@/lib/store';

export const runtime = 'edge';

export async function GET() {
  const routes = await getRoutes();
  const providers = await getProviders();

  const modelItems = [
    ...routes.map(r => ({
      id: r.alias,
      object: 'model',
      created: 1700000000,
      owned_by: 'omniroute',
      permission: [],
      root: r.alias,
      parent: null,
      description: r.description,
    })),
    // Provider specific models
    { id: 'gpt-4o', object: 'model', owned_by: 'openai' },
    { id: 'gpt-4o-mini', object: 'model', owned_by: 'openai' },
    { id: 'claude-3-5-sonnet-20241022', object: 'model', owned_by: 'anthropic' },
    { id: 'claude-3-5-haiku-20241022', object: 'model', owned_by: 'anthropic' },
    { id: 'gemini-2.0-flash', object: 'model', owned_by: 'google' },
    { id: 'deepseek-chat', object: 'model', owned_by: 'deepseek' },
    { id: 'llama-3.3-70b-versatile', object: 'model', owned_by: 'groq' },
    { id: 'meta/llama-3.3-70b-instruct', object: 'model', owned_by: 'nvidia' },
    { id: 'deepseek-ai/deepseek-r1', object: 'model', owned_by: 'nvidia' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', object: 'model', owned_by: 'nvidia' },
  ];

  return new Response(
    JSON.stringify({
      object: 'list',
      data: modelItems,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
