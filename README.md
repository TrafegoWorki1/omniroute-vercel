# OmniRoute — Vercel & Supabase Edition

Roteador de IA de alta disponibilidade com fallback automático e streaming no Edge Runtime da Vercel.

## 🚀 Funcionalidades

- **Endpoint OpenAI Compatible (`/api/v1/chat/completions` & `/api/v1/models`)**: Funciona direto com Hermes Agent, Cursor, Claude Code, LangChain e OpenAI SDKs.
- **Roteamento Inteligente & Fallback Automático**: Se o provedor principal cair ou sofrer rate limit (429/500/timeout), redireciona automaticamente para os modelos da fila (Claude → GPT-4o → Gemini → DeepSeek).
- **Vercel Edge Runtime**: Zero cold start e suporte completo a streaming (`stream: true`) via Web Streams API.
- **Supabase Ready**: Esquema SQL pronto (`supabase/schema.sql`) para armazenar logs, métricas, chaves virtuais e provedores.
- **Dashboard Moderno**: Painel visual com métricas em tempo real, gerador de chaves de API virtuais, auditoria de logs e Playground interativo.

## ⚙️ Variáveis de Ambiente (Opcionais)

No painel da Vercel ou no arquivo `.env.local`:

```env
# Provedores de IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=sk-...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...

# Supabase (Opcional - caso queira persistência em banco)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ey...
```

## 📦 Deploy na Vercel

```bash
vercel --prod
```
