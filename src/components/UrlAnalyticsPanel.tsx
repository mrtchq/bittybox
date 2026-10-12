/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  MousePointerClick,
  Eye,
  Bot,
  Copy,
  Check,
  RefreshCw,
  Zap,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import {
  BittyUrlMetric,
  AgentInteractionLog,
  getUrlMetrics,
  getInteractionLogs,
  trackUrlClick,
  trackAgentInteraction,
} from '../protocol/telemetry';
import { playHarmonicChime, spawnStardustBurst } from './CosmicAtmosphere';

export const UrlAnalyticsPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<BittyUrlMetric[]>([]);
  const [logs, setLogs] = useState<AgentInteractionLog[]>([]);
  const [activeLogFilter, setActiveLogFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || getUrlMetrics());
        setLogs(data.logs || getInteractionLogs());
      } else {
        setMetrics(getUrlMetrics());
        setLogs(getInteractionLogs());
      }
    } catch {
      setMetrics(getUrlMetrics());
      setLogs(getInteractionLogs());
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateClick = async (urlId: string, e: React.MouseEvent) => {
    spawnStardustBurst(e.clientX, e.clientY, 15);
    playHarmonicChime(760, 0.15);
    try {
      const res = await fetch('/api/telemetry/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metric) {
          setMetrics((prev) => prev.map((m) => (m.id === urlId ? data.metric : m)));
        }
      } else {
        const local = trackUrlClick(urlId);
        if (local) setMetrics(getUrlMetrics());
      }
      fetchTelemetry();
    } catch {
      const local = trackUrlClick(urlId);
      if (local) setMetrics(getUrlMetrics());
      fetchTelemetry();
    }
  };

  const handleSimulateInteraction = async (urlId: string, actionType: AgentInteractionLog['action'], e: React.MouseEvent) => {
    spawnStardustBurst(e.clientX, e.clientY, 20);
    playHarmonicChime(920, 0.2);
    try {
      const res = await fetch('/api/telemetry/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlId,
          action: actionType,
          agentId: 'autonomous-tester-bot',
          details: `Simulated agent event: ${actionType} recorded by telemetry monitor.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metric) {
          setMetrics((prev) => prev.map((m) => (m.id === urlId ? data.metric : m)));
        }
      } else {
        const local = trackAgentInteraction(urlId, actionType, 'autonomous-tester-bot');
        if (local) setMetrics(getUrlMetrics());
      }
      fetchTelemetry();
    } catch {
      const local = trackAgentInteraction(urlId, actionType, 'autonomous-tester-bot');
      if (local) setMetrics(getUrlMetrics());
      fetchTelemetry();
    }
  };

  const copyUrl = (id: string, url: string, e: React.MouseEvent) => {
    spawnStardustBurst(e.clientX, e.clientY, 10);
    playHarmonicChime(640, 0.1);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
  const totalInteractions = metrics.reduce((sum, m) => sum + m.interactions, 0);
  const avgCtr = metrics.length > 0 ? (metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length).toFixed(1) : '0.0';

  const filteredLogs = activeLogFilter === 'all'
    ? logs
    : logs.filter((l) => l.action === activeLogFilter);

  return (
    <div className="glass-hud rounded-3xl p-6 shadow-2xl space-y-6 border border-[#ffd159]/25 relative overflow-hidden">
      {/* Background Chromatic Aurora */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#ec4899]/10 via-[#9333ea]/10 to-transparent blur-3xl pointer-events-none" />

      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ffd159]/20 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-rajdhani text-[#ffd159] uppercase tracking-[0.2em] font-bold">TELEMETRY & ANALYTICS</span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs font-rajdhani text-slate-400">CLICK-THROUGH RATES & INTERACTION LOGS</span>
          </div>
          <h3 className="text-xl font-orbitron font-extrabold text-white tracking-tight mt-0.5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#ffd159]" />
            Bitty Box Link Performance & Agent Audit
          </h3>
        </div>

        <button
          onClick={() => {
            playHarmonicChime(600, 0.1);
            fetchTelemetry();
          }}
          className="p-2 rounded-xl text-slate-300 hover:text-[#ffd159] hover:bg-[#141428] transition-all self-start sm:self-auto border border-slate-700 hover:border-[#ffd159]/50"
          title="Refresh telemetry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10 font-rajdhani">
        <div className="glass-hud p-4 rounded-2xl border-[#ffd159]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-1">
            <span>TOTAL IMPRESSIONS</span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-orbitron font-bold text-white">{totalImpressions}</div>
          <div className="text-[10px] text-slate-400 tracking-wider mt-0.5">Distributed across mesh</div>
        </div>

        <div className="glass-hud p-4 rounded-2xl border-[#00e5ff]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-1">
            <span>CLICK-THROUGHS</span>
            <MousePointerClick className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div className="text-2xl font-orbitron font-bold text-[#00e5ff]">{totalClicks}</div>
          <div className="text-[10px] text-slate-400 tracking-wider mt-0.5">Artifact links opened</div>
        </div>

        <div className="glass-hud p-4 rounded-2xl border-[#10b981]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-1">
            <span>AVERAGE CTR</span>
            <TrendingUp className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-2xl font-orbitron font-bold text-[#10b981]">{avgCtr}%</div>
          <div className="text-[10px] text-slate-400 tracking-wider mt-0.5">Visits / Impressions ratio</div>
        </div>

        <div className="glass-hud p-4 rounded-2xl border-[#ec4899]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-1">
            <span>AGENT INTERACTIONS</span>
            <Bot className="w-4 h-4 text-[#ec4899]" />
          </div>
          <div className="text-2xl font-orbitron font-bold text-[#ec4899]">{totalInteractions}</div>
          <div className="text-[10px] text-slate-400 tracking-wider mt-0.5">Unlocks, widgets, branches</div>
        </div>
      </div>

      {/* URL Click-Through Table */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-rajdhani font-bold text-[#ffd159] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#ffd159]" />
            Active Bitty Box Links ({metrics.length})
          </span>
          <span className="text-[11px] font-rajdhani text-slate-400 tracking-wider">
            Simulate clicks or events to test live telemetry
          </span>
        </div>

        <div className="space-y-3">
          {metrics.map((item) => (
            <div
              key={item.id}
              className="bg-[#040407]/80 border border-[#ffd159]/20 hover:border-[#ffd159]/50 rounded-2xl p-4 transition-all space-y-3 hover:shadow-xl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-orbitron text-[#ffd159] font-bold uppercase tracking-wider">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-600 text-xs">·</span>
                    <h4 className="text-sm font-bold text-white font-sans">{item.title}</h4>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-[11px] font-rajdhani text-slate-400 font-semibold">by {item.authorAgent}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 truncate max-w-lg">
                    {item.url}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleSimulateClick(item.id, e)}
                    className="btn-glow-pulse px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd159] to-[#f5b82e] hover:from-[#ffe082] text-[#040407] text-xs font-orbitron font-bold flex items-center gap-1 transition-all shadow-md hover:scale-105"
                    title="Simulate a link click"
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>+1 Click</span>
                  </button>
                  <button
                    onClick={(e) => handleSimulateInteraction(item.id, 'widget_trigger', e)}
                    className="px-3 py-1.5 rounded-xl bg-[#141428] hover:bg-[#1e1c36] text-[#ec4899] border border-[#ec4899]/40 text-xs font-orbitron font-semibold flex items-center gap-1 transition-all hover:scale-105"
                    title="Simulate an agent widget action"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#ec4899]" />
                    <span>+1 Action</span>
                  </button>
                  <button
                    onClick={(e) => copyUrl(item.id, item.url, e)}
                    className="p-1.5 rounded-xl bg-[#0e0d1c] hover:bg-[#141428] text-slate-300 hover:text-white transition-colors border border-slate-700"
                    title="Copy URL"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Metrics Progress & Counts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs font-rajdhani">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Impressions</span>
                  <span className="text-white font-bold text-sm">{item.impressions}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Clicks</span>
                  <span className="text-[#ffd159] font-bold text-sm">{item.clicks}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">CTR (Click-Through)</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[#10b981] font-bold text-sm">{item.ctr}%</span>
                    <div className="flex-1 max-w-[80px] h-2 bg-[#141428] rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-[#10b981] to-[#00e5ff] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, item.ctr)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Agent Interactions</span>
                  <span className="text-[#ec4899] font-bold text-sm">{item.interactions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Interaction Logs Stream */}
      <div className="pt-4 border-t border-[#ffd159]/20 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-rajdhani font-bold text-[#ffd159] uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#00e5ff]" />
              Agent Interaction Audit Logs
            </span>
            <span className="text-xs text-slate-400">({filteredLogs.length})</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-rajdhani">
            {['all', 'click', 'widget_trigger', 'capsule_unlock', 'chain_branch', 'qr_scan'].map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  playHarmonicChime(520, 0.08);
                  setActiveLogFilter(filter);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeLogFilter === filter
                    ? 'bg-gradient-to-r from-[#ffd159] to-[#f5b82e] text-[#040407]'
                    : 'bg-[#080811] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {filter === 'all' ? 'All' : filter.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Feed */}
        <div className="bg-[#040407]/90 border border-slate-800 rounded-2xl p-3.5 max-h-60 overflow-y-auto space-y-2 font-rajdhani">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No interaction logs matching filter. Click "+1 Click" or "+1 Action" above to register new events.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-[#0e0d1c] border border-slate-800 hover:border-[#ffd159]/30 rounded-xl p-2.5 text-xs flex items-start justify-between gap-3 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#ffd159] font-bold">{log.agentId}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-white font-medium">{log.urlTitle}</span>
                    <span className="text-slate-600">·</span>
                    <span className="bg-[#141428] text-[#ec4899] px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                      {log.action.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] font-mono">{log.details}</div>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
