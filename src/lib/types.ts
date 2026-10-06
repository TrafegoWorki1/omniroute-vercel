export type ProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'deepseek' 
  | 'groq' 
  | 'openrouter' 
  | 'custom';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  isActive: boolean;
  createdAt?: string;
}

export interface ModelRoute {
  id: string;
  alias: string; // e.g. "smart-router", "claude-3-5-sonnet", "fast-fallback"
  description: string;
  fallbackChain: {
    providerId: string;
    model: string;
    priority: number;
    timeoutMs?: number;
  }[];
  isActive: boolean;
  temperature?: number;
}

export interface VirtualApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
  totalTokens: number;
  totalRequests: number;
}

export interface RequestLog {
  id: string;
  apiKeyId?: string;
  timestamp: string;
  alias: string;
  modelUsed: string;
  providerUsed: string;
  status: 'success' | 'fallback' | 'error';
  statusCode: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  errorMessage?: string;
  fallbackAttempts?: {
    provider: string;
    model: string;
    error: string;
  }[];
}

export interface DashboardMetrics {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  fallbackCount: number;
  totalTokens: number;
  requestsToday: number;
}
