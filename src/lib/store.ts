import { ProviderConfig, ModelRoute, VirtualApiKey, RequestLog, DashboardMetrics } from './types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
    isActive: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    isActive: true,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    type: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    isActive: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    isActive: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    type: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    isActive: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    isActive: true,
  },
];

export const DEFAULT_ROUTES: ModelRoute[] = [
  {
    id: 'smart',
    alias: 'omni-smart',
    description: 'Roteador inteligente de alta capacidade com fallback automático',
    fallbackChain: [
      { providerId: 'anthropic', model: 'claude-3-5-sonnet-20241022', priority: 1, timeoutMs: 15000 },
      { providerId: 'openai', model: 'gpt-4o', priority: 2, timeoutMs: 15000 },
      { providerId: 'google', model: 'gemini-2.0-flash', priority: 3, timeoutMs: 10000 },
      { providerId: 'deepseek', model: 'deepseek-chat', priority: 4, timeoutMs: 15000 },
    ],
    isActive: true,
  },
  {
    id: 'fast',
    alias: 'omni-fast',
    description: 'Roteamento ultra-rápido de baixo custo para tarefas frequentes',
    fallbackChain: [
      { providerId: 'google', model: 'gemini-2.0-flash', priority: 1, timeoutMs: 8000 },
      { providerId: 'groq', model: 'llama-3.3-70b-versatile', priority: 2, timeoutMs: 8000 },
      { providerId: 'openai', model: 'gpt-4o-mini', priority: 3, timeoutMs: 10000 },
      { providerId: 'anthropic', model: 'claude-3-5-haiku-20241022', priority: 4, timeoutMs: 10000 },
    ],
    isActive: true,
  },
  {
    id: 'code',
    alias: 'omni-code',
    description: 'Roteador especializado em programação e raciocínio técnico',
    fallbackChain: [
      { providerId: 'anthropic', model: 'claude-3-5-sonnet-20241022', priority: 1, timeoutMs: 20000 },
      { providerId: 'deepseek', model: 'deepseek-reasoner', priority: 2, timeoutMs: 20000 },
      { providerId: 'openai', model: 'gpt-4o', priority: 3, timeoutMs: 20000 },
    ],
    isActive: true,
  },
];

// Fallback in-memory cache for demo/serverless environments
let memoryLogs: RequestLog[] = [];
let memoryKeys: VirtualApiKey[] = [
  {
    id: 'default-key',
    name: 'Default Master Key',
    keyPrefix: 'sk-omni-live',
    keyHash: 'default-active-key',
    createdAt: new Date().toISOString(),
    isActive: true,
    totalTokens: 12450,
    totalRequests: 42,
  },
];

export async function getProviders(): Promise<ProviderConfig[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('omni_providers').select('*');
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          baseUrl: d.base_url,
          apiKey: d.api_key,
          isActive: d.is_active,
          createdAt: d.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch providers error:', e);
    }
  }
  return DEFAULT_PROVIDERS;
}

export async function getRoutes(): Promise<ModelRoute[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('omni_routes').select('*');
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          alias: d.alias,
          description: d.description,
          fallbackChain: d.fallback_chain,
          isActive: d.is_active,
          temperature: d.temperature,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch routes error:', e);
    }
  }
  return DEFAULT_ROUTES;
}

export async function getVirtualKeys(): Promise<VirtualApiKey[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('omni_api_keys').select('*');
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          keyPrefix: d.key_prefix,
          keyHash: d.key_hash,
          createdAt: d.created_at,
          lastUsedAt: d.last_used_at,
          isActive: d.is_active,
          totalTokens: d.total_tokens || 0,
          totalRequests: d.total_requests || 0,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch keys error:', e);
    }
  }
  return memoryKeys;
}

export async function addVirtualKey(name: string, rawKey: string): Promise<VirtualApiKey> {
  const keyPrefix = rawKey.substring(0, 12);
  const newKey: VirtualApiKey = {
    id: 'key-' + Math.random().toString(36).substring(2, 9),
    name,
    keyPrefix,
    keyHash: rawKey,
    createdAt: new Date().toISOString(),
    isActive: true,
    totalTokens: 0,
    totalRequests: 0,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('omni_api_keys').insert({
        id: newKey.id,
        name: newKey.name,
        key_prefix: newKey.keyPrefix,
        key_hash: newKey.keyHash,
        is_active: newKey.isActive,
      });
    } catch (e) {
      console.warn('Supabase insert key error:', e);
    }
  }

  memoryKeys.unshift(newKey);
  return newKey;
}

export async function getLogs(limit: number = 50): Promise<RequestLog[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('omni_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          apiKeyId: d.api_key_id,
          timestamp: d.created_at,
          alias: d.alias,
          modelUsed: d.model_used,
          providerUsed: d.provider_used,
          status: d.status,
          statusCode: d.status_code,
          latencyMs: d.latency_ms,
          promptTokens: d.prompt_tokens,
          completionTokens: d.completion_tokens,
          totalTokens: d.total_tokens,
          errorMessage: d.error_message,
          fallbackAttempts: d.fallback_attempts,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch logs error:', e);
    }
  }
  return memoryLogs.slice(0, limit);
}

export async function saveLog(log: RequestLog): Promise<void> {
  memoryLogs.unshift(log);
  if (memoryLogs.length > 200) {
    memoryLogs = memoryLogs.slice(0, 200);
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('omni_logs').insert({
        id: log.id,
        alias: log.alias,
        model_used: log.modelUsed,
        provider_used: log.providerUsed,
        status: log.status,
        status_code: log.statusCode,
        latency_ms: log.latencyMs,
        prompt_tokens: log.promptTokens,
        completion_tokens: log.completionTokens,
        total_tokens: log.totalTokens,
        error_message: log.errorMessage,
        fallback_attempts: log.fallbackAttempts,
      });
    } catch (e) {
      console.warn('Supabase save log error:', e);
    }
  }
}

export async function getMetrics(): Promise<DashboardMetrics> {
  const logs = await getLogs(100);
  const totalRequests = logs.length;
  if (totalRequests === 0) {
    return {
      totalRequests: 0,
      successRate: 100,
      avgLatencyMs: 0,
      fallbackCount: 0,
      totalTokens: 0,
      requestsToday: 0,
    };
  }

  const successCount = logs.filter(l => l.status === 'success' || l.status === 'fallback').length;
  const fallbackCount = logs.filter(l => l.status === 'fallback').length;
  const totalLatency = logs.reduce((acc, l) => acc + l.latencyMs, 0);
  const totalTokens = logs.reduce((acc, l) => acc + l.totalTokens, 0);

  return {
    totalRequests,
    successRate: Math.round((successCount / totalRequests) * 100),
    avgLatencyMs: Math.round(totalLatency / totalRequests),
    fallbackCount,
    totalTokens,
    requestsToday: totalRequests,
  };
}
