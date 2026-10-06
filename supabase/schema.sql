-- OmniRoute Vercel + Supabase Database Schema
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela de Provedores de IA
CREATE TABLE IF NOT EXISTS omni_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Rotas de Modelos e Regras de Fallback
CREATE TABLE IF NOT EXISTS omni_routes (
    id TEXT PRIMARY KEY,
    alias TEXT UNIQUE NOT NULL,
    description TEXT,
    fallback_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    temperature NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Chaves Virtuais de API
CREATE TABLE IF NOT EXISTS omni_api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_tokens BIGINT DEFAULT 0,
    total_requests BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Logs de Requisições e Fallbacks
CREATE TABLE IF NOT EXISTS omni_logs (
    id TEXT PRIMARY KEY,
    api_key_id TEXT REFERENCES omni_api_keys(id) ON DELETE SET NULL,
    alias TEXT NOT NULL,
    model_used TEXT NOT NULL,
    provider_used TEXT NOT NULL,
    status TEXT NOT NULL,
    status_code INT NOT NULL,
    latency_ms INT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    error_message TEXT,
    fallback_attempts JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas de métricas e filtros
CREATE INDEX IF NOT EXISTS idx_omni_logs_created_at ON omni_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_omni_logs_status ON omni_logs(status);
CREATE INDEX IF NOT EXISTS idx_omni_logs_alias ON omni_logs(alias);

-- Dados Iniciais Padrão (Seed)
INSERT INTO omni_routes (id, alias, description, fallback_chain)
VALUES 
(
    'smart', 
    'omni-smart', 
    'Roteador inteligente de alta capacidade com fallback automático', 
    '[
        {"providerId": "anthropic", "model": "claude-3-5-sonnet-20241022", "priority": 1, "timeoutMs": 15000},
        {"providerId": "openai", "model": "gpt-4o", "priority": 2, "timeoutMs": 15000},
        {"providerId": "google", "model": "gemini-2.0-flash", "priority": 3, "timeoutMs": 10000},
        {"providerId": "deepseek", "model": "deepseek-chat", "priority": 4, "timeoutMs": 15000}
    ]'::jsonb
),
(
    'fast', 
    'omni-fast', 
    'Roteamento ultra-rápido de baixo custo para tarefas frequentes', 
    '[
        {"providerId": "google", "model": "gemini-2.0-flash", "priority": 1, "timeoutMs": 8000},
        {"providerId": "groq", "model": "llama-3.3-70b-versatile", "priority": 2, "timeoutMs": 8000},
        {"providerId": "openai", "model": "gpt-4o-mini", "priority": 3, "timeoutMs": 10000},
        {"providerId": "anthropic", "model": "claude-3-5-haiku-20241022", "priority": 4, "timeoutMs": 10000}
    ]'::jsonb
),
(
    'code', 
    'omni-code', 
    'Roteador especializado em programação e raciocínio técnico', 
    '[
        {"providerId": "anthropic", "model": "claude-3-5-sonnet-20241022", "priority": 1, "timeoutMs": 20000},
        {"providerId": "deepseek", "model": "deepseek-reasoner", "priority": 2, "timeoutMs": 20000},
        {"providerId": "openai", "model": "gpt-4o", "priority": 3, "timeoutMs": 20000}
    ]'::jsonb
)
ON CONFLICT (alias) DO NOTHING;
