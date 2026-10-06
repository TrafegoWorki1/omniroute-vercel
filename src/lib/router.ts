import { getProviders, getRoutes, saveLog } from './store';
import { RequestLog } from './types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ChatCompletionPayload {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export async function executeChatRoute(payload: ChatCompletionPayload) {
  const startTime = Date.now();
  const providers = await getProviders();
  const routes = await getRoutes();

  const requestedModel = payload.model || 'omni-smart';
  const matchingRoute = routes.find(r => r.alias === requestedModel);

  // Build candidate chain
  let candidates: { providerId: string; model: string; timeoutMs?: number }[] = [];

  if (matchingRoute && matchingRoute.fallbackChain.length > 0) {
    candidates = matchingRoute.fallbackChain.sort((a, b) => a.priority - b.priority);
  } else {
    // If exact provider model or unknown alias
    const guessedProvider = providers.find(p => p.isActive && p.apiKey && (
      (p.type === 'openai' && requestedModel.includes('gpt')) ||
      (p.type === 'anthropic' && requestedModel.includes('claude')) ||
      (p.type === 'google' && requestedModel.includes('gemini')) ||
      (p.type === 'deepseek' && requestedModel.includes('deepseek')) ||
      (p.type === 'groq' && (requestedModel.includes('llama') || requestedModel.includes('mixtral'))) ||
      p.type === 'openrouter'
    ));

    if (guessedProvider) {
      candidates.push({ providerId: guessedProvider.id, model: requestedModel, timeoutMs: 15000 });
    }

    // Add general fallbacks
    for (const p of providers.filter(p => p.isActive && p.apiKey)) {
      if (p.id !== guessedProvider?.id) {
        if (p.type === 'openai') candidates.push({ providerId: p.id, model: 'gpt-4o-mini', timeoutMs: 10000 });
        if (p.type === 'google') candidates.push({ providerId: p.id, model: 'gemini-2.0-flash', timeoutMs: 10000 });
        if (p.type === 'deepseek') candidates.push({ providerId: p.id, model: 'deepseek-chat', timeoutMs: 15000 });
        if (p.type === 'openrouter') candidates.push({ providerId: p.id, model: 'auto', timeoutMs: 15000 });
      }
    }
  }

  if (candidates.length === 0) {
    // Return a mock simulated response if no provider key is configured yet
    const simulatedText = `[OmniRoute Vercel Gateway] Roteador ativo! Para respostas reais de IA, adicione suas chaves de API (OpenAI, Anthropic, Gemini, DeepSeek) no painel. Modelo solicitado: "${requestedModel}".`;
    const latency = Date.now() - startTime;
    
    if (payload.stream) {
      return createSimulatedStreamResponse(simulatedText, requestedModel);
    }

    return new Response(JSON.stringify({
      id: `chatcmpl-${Math.random().toString(36).substring(2, 10)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: requestedModel,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: simulatedText },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 15, completion_tokens: 45, total_tokens: 60 }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fallbackErrors: { provider: string; model: string; error: string }[] = [];
  let successfulResponse: Response | null = null;
  let successfulCandidate: { providerId: string; model: string } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const provider = providers.find(p => p.id === candidate.providerId);
    if (!provider || !provider.apiKey) continue;

    try {
      const resp = await callProvider(provider, candidate.model, payload, candidate.timeoutMs || 15000);
      if (resp.ok) {
        successfulResponse = resp;
        successfulCandidate = candidate;
        break;
      } else {
        const errText = await resp.text().catch(() => 'Status: ' + resp.status);
        fallbackErrors.push({
          provider: provider.name,
          model: candidate.model,
          error: `HTTP ${resp.status}: ${errText.substring(0, 100)}`,
        });
      }
    } catch (err: any) {
      fallbackErrors.push({
        provider: provider.name,
        model: candidate.model,
        error: err.message || 'Timeout / Network Error',
      });
    }
  }

  const latencyMs = Date.now() - startTime;

  if (successfulResponse && successfulCandidate) {
    const isFallback = fallbackErrors.length > 0;
    
    // Log asynchronously
    const log: RequestLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      alias: requestedModel,
      modelUsed: successfulCandidate.model,
      providerUsed: successfulCandidate.providerId,
      status: isFallback ? 'fallback' : 'success',
      statusCode: 200,
      latencyMs,
      promptTokens: 50,
      completionTokens: 120,
      totalTokens: 170,
      fallbackAttempts: isFallback ? fallbackErrors : undefined,
    };
    saveLog(log).catch(() => {});

    // Return stream or JSON
    const headers = new Headers(successfulResponse.headers);
    headers.set('X-OmniRoute-Model-Used', successfulCandidate.model);
    headers.set('X-OmniRoute-Provider-Used', successfulCandidate.providerId);
    headers.set('X-OmniRoute-Fallback-Triggered', isFallback ? 'true' : 'false');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(successfulResponse.body, {
      status: 200,
      headers,
    });
  }

  // If all candidates failed
  const errorLog: RequestLog = {
    id: 'log-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    alias: requestedModel,
    modelUsed: 'none',
    providerUsed: 'none',
    status: 'error',
    statusCode: 502,
    latencyMs,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    errorMessage: 'All fallback providers failed',
    fallbackAttempts: fallbackErrors,
  };
  saveLog(errorLog).catch(() => {});

  return new Response(JSON.stringify({
    error: {
      message: 'Todos os provedores na cadeia de fallback falharam.',
      type: 'omniroute_fallback_exhausted',
      fallbackErrors,
    }
  }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function callProvider(provider: any, model: string, payload: ChatCompletionPayload, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let url = `${provider.baseUrl}/chat/completions`;
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let body: any = {
    model: model,
    messages: payload.messages,
    stream: Boolean(payload.stream),
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
  };

  if (provider.type === 'openai' || provider.type === 'deepseek' || provider.type === 'groq' || provider.type === 'openrouter') {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
    if (provider.type === 'openrouter') {
      headers['HTTP-Referer'] = 'https://omniroute.vercel.app';
      headers['X-Title'] = 'OmniRoute Vercel';
    }
  } else if (provider.type === 'google') {
    url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  } else if (provider.type === 'anthropic') {
    // Standard Anthropic Messages API
    url = 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = provider.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    
    // Map messages
    const systemMessage = payload.messages.find(m => m.role === 'system')?.content || '';
    const userMessages = payload.messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    body = {
      model,
      system: systemMessage || undefined,
      messages: userMessages,
      max_tokens: payload.max_tokens || 4096,
      stream: Boolean(payload.stream),
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function createSimulatedStreamResponse(text: string, model: string) {
  const encoder = new TextEncoder();
  const chunks = text.split(' ');

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + chunks[i];
        const data = {
          id: `chatcmpl-${Math.random().toString(36).substring(2, 9)}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              delta: { content: chunk },
              finish_reason: i === chunks.length - 1 ? 'stop' : null,
            },
          ],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        await new Promise(r => setTimeout(r, 25));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
