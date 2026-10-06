'use client';

import { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  ShieldCheck,
  Key,
  Activity,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Play,
  Sliders,
  Database,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { ModelRoute, ProviderConfig, VirtualApiKey, RequestLog, DashboardMetrics } from '@/lib/types';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'routes' | 'providers' | 'keys' | 'logs' | 'playground' | 'docs'>('routes');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRequests: 124,
    successRate: 99,
    avgLatencyMs: 420,
    fallbackCount: 14,
    totalTokens: 284500,
    requestsToday: 124,
  });
  const [routes, setRoutes] = useState<ModelRoute[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [keys, setKeys] = useState<VirtualApiKey[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Playground state
  const [selectedRoute, setSelectedRoute] = useState('omni-smart');
  const [playgroundPrompt, setPlaygroundPrompt] = useState('Explique em 2 parágrafos o que é um roteador de IA com fallback automático.');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundMeta, setPlaygroundMeta] = useState<{ model?: string; provider?: string; fallback?: boolean; latency?: number } | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);

  // Key creation state
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const loadData = async () => {
    try {
      const [resMetrics, resRoutes, resProviders, resKeys, resLogs] = await Promise.all([
        fetch('/api/metrics').then(r => r.json()).catch(() => null),
        fetch('/api/routes').then(r => r.json()).catch(() => []),
        fetch('/api/providers').then(r => r.json()).catch(() => []),
        fetch('/api/keys').then(r => r.json()).catch(() => []),
        fetch('/api/logs').then(r => r.json()).catch(() => []),
      ]);

      if (resMetrics && resMetrics.totalRequests > 0) setMetrics(resMetrics);
      if (resRoutes && resRoutes.length > 0) setRoutes(resRoutes);
      if (resProviders && resProviders.length > 0) setProviders(resProviders);
      if (resKeys && resKeys.length > 0) setKeys(resKeys);
      if (resLogs && resLogs.length > 0) setLogs(resLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (data.secretKey) {
        setCreatedKey(data.secretKey);
        setNewKeyName('');
        loadData();
      }
    } catch (err) {
      alert('Erro ao criar chave');
    }
  };

  const handleTestPlayground = async () => {
    setPlaygroundLoading(true);
    setPlaygroundOutput('');
    setPlaygroundMeta(null);
    const start = Date.now();

    try {
      const response = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-omni-live-tester',
        },
        body: JSON.stringify({
          model: selectedRoute,
          messages: [{ role: 'user', content: playgroundPrompt }],
          stream: isStreaming,
        }),
      });

      const modelUsed = response.headers.get('X-OmniRoute-Model-Used') || selectedRoute;
      const providerUsed = response.headers.get('X-OmniRoute-Provider-Used') || 'default';
      const fallbackTriggered = response.headers.get('X-OmniRoute-Fallback-Triggered') === 'true';

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: 'Erro na requisição' } }));
        setPlaygroundOutput(`Erro (${response.status}): ${err.error?.message || 'Falha ao processar requisição'}`);
        setPlaygroundLoading(false);
        return;
      }

      if (isStreaming && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content || '';
                fullText += content;
                setPlaygroundOutput(fullText);
              } catch (e) {}
            }
          }
        }
      } else {
        const data = await response.json();
        setPlaygroundOutput(data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2));
      }

      setPlaygroundMeta({
        model: modelUsed,
        provider: providerUsed,
        fallback: fallbackTriggered,
        latency: Date.now() - start,
      });
    } catch (err: any) {
      setPlaygroundOutput(`Erro de conexão: ${err.message}`);
    } finally {
      setPlaygroundLoading(false);
      loadData();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">OmniRoute</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Vercel Edge
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Quick Endpoint Copy */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
              <span className="text-slate-500">Base URL:</span>
              <span className="text-blue-400 font-medium">/api/v1</span>
              <button
                onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'https://omniroute.vercel.app/api/v1', 'base-url')}
                className="text-slate-400 hover:text-white transition-colors ml-1"
                title="Copiar URL Base"
              >
                {copied === 'base-url' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors border border-slate-800"
              title="Atualizar Dados"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-900/60 overflow-x-auto scrollbar-none">
          {[
            { id: 'routes', label: 'Roteamento & Fallback', icon: Layers },
            { id: 'providers', label: 'Provedores de IA', icon: Server },
            { id: 'keys', label: 'Chaves Virtuais', icon: Key },
            { id: 'logs', label: 'Logs & Auditoria', icon: Activity },
            { id: 'playground', label: 'Playground', icon: Play },
            { id: 'docs', label: 'Como Conectar', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Chamadas</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.totalRequests.toLocaleString('pt-BR')}</div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
              <Zap className="h-3 w-3" /> 100% Serverless Edge
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Taxa de Sucesso</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.successRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">Com auto-recuperação</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Latência Média</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{metrics.avgLatencyMs} ms</div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">Vercel Global Edge</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fallbacks Acionados</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{metrics.fallbackCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">Falhas contornadas</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 col-span-2 md:col-span-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tokens Roteados</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">{(metrics.totalTokens / 1000).toFixed(1)}k</div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">Prompt + Completion</div>
          </div>
        </div>

        {/* TAB 1: ROUTES & FALLBACK */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Pipelines de Roteamento & Fallback Inteligente</h2>
                <p className="text-sm text-slate-400">
                  Quando uma requisição chega para um modelo, o OmniRoute tenta o provedor primário. Se falhar (erro 429, 500 ou timeout), aciona automaticamente o próximo da fila.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {routes.map((route) => (
                <div key={route.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-sm font-semibold">
                        {route.alias}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{route.description}</div>
                        <div className="text-xs text-slate-400">Alias OpenAI: <span className="font-mono text-blue-400">{route.alias}</span></div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Ativo
                    </span>
                  </div>

                  {/* Fallback chain visualizer */}
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Ordem de Execução & Fallback ({route.fallbackChain.length} Provedores)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {route.fallbackChain.map((step, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border flex flex-col justify-between ${
                            idx === 0
                              ? 'bg-blue-950/30 border-blue-500/30 text-blue-200'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-semibold text-slate-400">
                              {idx === 0 ? '👑 1º Primário' : `🔄 ${idx + 1}º Fallback`}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">
                              {step.timeoutMs ? `${step.timeoutMs / 1000}s` : '15s'}
                            </span>
                          </div>
                          <div className="font-mono text-xs font-medium text-white truncate" title={step.model}>
                            {step.model}
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize mt-1">
                            via {step.providerId}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PROVIDERS */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Provedores de IA Conectados</h2>
              <p className="text-sm text-slate-400">
                O OmniRoute unifica múltiplos provedores em um único endpoint compatível com OpenAI. Configure suas chaves de API via variáveis de ambiente da Vercel ou no Supabase.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((p) => (
                <div key={p.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <Server className="h-4 w-4 text-blue-400" />
                        {p.name}
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        p.apiKey
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {p.apiKey ? 'Configurado' : 'Chave Pendente'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500">Base URL:</span>
                        <div className="font-mono text-slate-300 truncate mt-0.5">{p.baseUrl}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Chave de API:</span>
                        <div className="font-mono text-slate-300 mt-0.5">
                          {p.apiKey ? p.apiKey : <span className="text-slate-500 italic">Configure no .env ou Vercel</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Protocolo: {p.type}</span>
                    <span className="text-emerald-400">✓ Edge Streaming</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VIRTUAL KEYS */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Chaves Virtuais de Acesso (API Keys)</h2>
                <p className="text-sm text-slate-400">
                  Crie chaves de API virtuais para conectar o Hermes Agent, Cursor, Claude Code, ou aplicações clientes ao seu OmniRoute.
                </p>
              </div>
            </div>

            {/* Create Key Form */}
            <form onSubmit={handleCreateKey} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                placeholder="Nome da chave (ex: Hermes Agent, Cursor IDE, App Produção)..."
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" /> Criar Chave Virtual
              </button>
            </form>

            {/* Created Key Modal/Alert */}
            {createdKey && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Chave Criada com Sucesso!</div>
                  <div className="text-xs text-slate-300 mt-0.5">Copie agora, ela não será exibida novamente:</div>
                  <div className="font-mono text-sm text-emerald-300 font-semibold mt-1">{createdKey}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(createdKey, 'new-secret-key')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copied === 'new-secret-key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copiar
                </button>
              </div>
            )}

            {/* Keys Table */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Prefixo da Chave</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Requisições</th>
                    <th className="py-3 px-4">Tokens Consumidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-sans font-medium text-white">{k.name}</td>
                      <td className="py-3 px-4 text-blue-400">{k.keyPrefix}...</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ativa
                        </span>
                      </td>
                      <td className="py-3 px-4">{k.totalRequests || 0}</td>
                      <td className="py-3 px-4 font-semibold text-purple-400">{k.totalTokens.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LOGS & AUDIT */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Auditoria & Logs de Requisições em Tempo Real</h2>
                <p className="text-sm text-slate-400">
                  Acompanhe em tempo real as chamadas de IA, o modelo requisitado vs. modelo entregue e quando um fallback foi acionado.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Horário</th>
                    <th className="py-3 px-4">Modelo Requisitado</th>
                    <th className="py-3 px-4">Modelo Usado</th>
                    <th className="py-3 px-4">Provedor</th>
                    <th className="py-3 px-4">Latência</th>
                    <th className="py-3 px-4">Tokens</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        Nenhum log gravado ainda. Faça um teste no Playground para gerar logs!
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-blue-400 font-semibold">{log.alias}</td>
                        <td className="py-3 px-4 text-slate-200">{log.modelUsed}</td>
                        <td className="py-3 px-4 capitalize font-sans">{log.providerUsed}</td>
                        <td className="py-3 px-4 text-cyan-400">{log.latencyMs} ms</td>
                        <td className="py-3 px-4 text-purple-400">{log.totalTokens}</td>
                        <td className="py-3 px-4 font-sans">
                          {log.status === 'success' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> 200 OK
                            </span>
                          )}
                          {log.status === 'fallback' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              <AlertTriangle className="h-3 w-3" /> Fallback
                            </span>
                          )}
                          {log.status === 'error' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                              <XCircle className="h-3 w-3" /> {log.statusCode} Erro
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PLAYGROUND */}
        {activeTab === 'playground' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Playground Interativo de Teste</h2>
              <p className="text-sm text-slate-400">
                Teste as rotas, simulação de streaming e fallback em tempo real direto pela interface do OmniRoute.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Rota / Alias Selecionado
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="omni-smart">omni-smart (Claude 3.5 Sonnet → GPT-4o → Gemini → DeepSeek)</option>
                    <option value="omni-fast">omni-fast (Gemini 2.0 Flash → Groq Llama 3.3 → GPT-4o-mini)</option>
                    <option value="omni-code">omni-code (Claude 3.5 Sonnet → DeepSeek Reasoner → GPT-4o)</option>
                    <option value="gpt-4o">gpt-4o (Direto OpenAI)</option>
                    <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022 (Direto Anthropic)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Direto Google)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Prompt de Teste
                  </label>
                  <textarea
                    rows={5}
                    value={playgroundPrompt}
                    onChange={(e) => setPlaygroundPrompt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isStreaming}
                      onChange={(e) => setIsStreaming(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                    />
                    Habilitar Streaming (SSE)
                  </label>

                  <button
                    onClick={handleTestPlayground}
                    disabled={playgroundLoading}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                  >
                    {playgroundLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Executar Roteamento
                  </button>
                </div>
              </div>

              {/* Output Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resposta do Gateway</span>
                    {playgroundMeta && (
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-cyan-400">{playgroundMeta.latency} ms</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-blue-400">{playgroundMeta.model}</span>
                        {playgroundMeta.fallback && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Fallback OK
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 min-h-[220px] max-h-[350px] overflow-y-auto text-sm font-sans text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {playgroundOutput || (
                      <span className="text-slate-600 italic">
                        Clique em "Executar Roteamento" para disparar a requisição e ver o streaming ao vivo...
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Endpoint: POST /api/v1/chat/completions (OpenAI Compatible)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DOCS & INTEGRATION */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Como Conectar ao OmniRoute Vercel</h2>
              <p className="text-sm text-slate-400">
                O OmniRoute é 100% compatível com a especificação da OpenAI. Basta mudar a `Base URL` e passar a chave virtual.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hermes Agent Setup */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                  <Terminal className="h-4 w-4" /> Hermes Agent (config.yaml)
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`providers:
  omniroute:
    base_url: "https://${typeof window !== 'undefined' ? window.location.host : 'sua-url.vercel.app'}/api/v1"
    api_key: "sk-omni-sua-chave"

model: "omni-smart" # ou "omni-fast", "omni-code"`}</pre>
                </div>
              </div>

              {/* cURL Example */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                  <Terminal className="h-4 w-4" /> cURL / HTTP Request
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`curl -X POST "https://${typeof window !== 'undefined' ? window.location.host : 'sua-url.vercel.app'}/api/v1/chat/completions" \\
  -H "Authorization: Bearer sk-omni-sua-chave" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "omni-smart",
    "messages": [{"role": "user", "content": "Olá!"}],
    "stream": true
  }'`}</pre>
                </div>
              </div>

              {/* Python OpenAI SDK */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Terminal className="h-4 w-4" /> Python (OpenAI SDK)
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`from openai import OpenAI

client = OpenAI(
    base_url="https://${typeof window !== 'undefined' ? window.location.host : 'sua-url.vercel.app'}/api/v1",
    api_key="sk-omni-sua-chave",
)

response = client.chat.completions.create(
    model="omni-smart",
    messages=[{"role": "user", "content": "Olá!"}],
    stream=True,
)`}</pre>
                </div>
              </div>

              {/* Node.js OpenAI SDK */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Terminal className="h-4 w-4" /> Node.js / TypeScript
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://${typeof window !== 'undefined' ? window.location.host : 'sua-url.vercel.app'}/api/v1",
  apiKey: "sk-omni-sua-chave",
});

const stream = await openai.chat.completions.create({
  model: "omni-smart",
  messages: [{ role: "user", content: "Olá!" }],
  stream: true,
});`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OmniRoute — AI Gateway & Fallback Router (Vercel Edge + Supabase)</span>
          <span className="text-slate-600">Alta Disponibilidade • Zero Cold Start • Streaming Nativo</span>
        </div>
      </footer>
    </div>
  );
}
