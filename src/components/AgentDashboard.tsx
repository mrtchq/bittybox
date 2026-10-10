/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Radio,
  Send,
  Database,
  Terminal,
  Clock,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  FileJson,
  Check,
  Zap,
} from 'lucide-react';
import { AgentEventMessage, get_agent_event_log, notify_agent } from '../protocol/functions';
import { UrlAnalyticsPanel } from './UrlAnalyticsPanel';
import { triggerProjectJsonDownload } from '../protocol/telemetry';
import { playHarmonicChime, spawnStardustBurst } from './CosmicAtmosphere';

export const AgentDashboard: React.FC = () => {
  const [events, setEvents] = useState<AgentEventMessage[]>([]);
  const [senderAgent, setSenderAgent] = useState<string>('agent-supervisor-01');
  const [eventType, setEventType] = useState<AgentEventMessage['eventType']>('workflow_trigger');
  const [customPayload, setCustomPayload] = useState<string>('{"state": "HEALTHY", "action": "MESH_SYNC"}');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [hasExportedJson, setHasExportedJson] = useState<boolean>(false);

  const AGENTS = [
    { id: 'agent-prime', role: 'Micro-Site Architect', status: 'ACTIVE', tasks: 142, uptime: '99.98%', color: '#ffd159' },
    { id: 'temporal-warden', role: 'Capsule Scheduler', status: 'ACTIVE', tasks: 38, uptime: '100%', color: '#00e5ff' },
    { id: 'logic-orchestrator', role: 'Branching Chain Builder', status: 'ACTIVE', tasks: 87, uptime: '99.95%', color: '#ec4899' },
    { id: 'qr-synthesizer', role: 'Codec & QR Matrix Engine', status: 'STANDBY', tasks: 219, uptime: '100%', color: '#10b981' },
  ];

  const STATE_CONTAINERS = [
    { key: 'workflow.session_token', value: 'bitty_sess_89a0f4', owner: 'agent-prime', size: '24 B' },
    { key: 'capsule.pending_unlocks', value: '3 scheduled items', owner: 'temporal-warden', size: '128 B' },
    { key: 'chain.active_decision_path', value: 'root -> node_soft -> node_final', owner: 'logic-orchestrator', size: '64 B' },
    { key: 'protocol.compression_mode', value: 'DEFLATE_LV9 + BASE64_URL', owner: 'system', size: '32 B' },
  ];

  const refreshEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      } else {
        setEvents(get_agent_event_log());
      }
    } catch {
      setEvents(get_agent_event_log());
    }
  };

  useEffect(() => {
    refreshEvents();
    const interval = setInterval(refreshEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleEmitEvent = (e: React.MouseEvent) => {
    spawnStardustBurst(e.clientX, e.clientY, 18);
    playHarmonicChime(840, 0.15);

    let payloadObj = {};
    try {
      payloadObj = JSON.parse(customPayload);
    } catch {
      payloadObj = { raw: customPayload };
    }

    notify_agent({
      senderAgent,
      eventType,
      payload: payloadObj,
    });

    refreshEvents();
  };

  const filteredEvents = activeFilter === 'all'
    ? events
    : events.filter((e) => e.eventType === activeFilter);

  const handleExportJson = (e: React.MouseEvent) => {
    spawnStardustBurst(e.clientX, e.clientY, 30);
    playHarmonicChime(950, 0.25);
    triggerProjectJsonDownload();
    setHasExportedJson(true);
    setTimeout(() => setHasExportedJson(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview with Cosmic Glass HUD styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-rajdhani">
        <div className="glass-hud rounded-2xl p-4 shadow-xl border-[#ffd159]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-2">
            <span>ACTIVE AGENT WORKERS</span>
            <Cpu className="w-4 h-4 text-[#ffd159]" />
          </div>
          <div className="text-3xl font-orbitron font-bold text-white tracking-tight">4 Autonomous</div>
          <div className="text-xs text-[#10b981] mt-1 flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span>All nodes responding &lt; 15ms</span>
          </div>
        </div>

        <div className="glass-hud rounded-2xl p-4 shadow-xl border-[#00e5ff]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-2">
            <span>URL-NATIVE PROTOCOL</span>
            <Activity className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div className="text-3xl font-orbitron font-bold text-[#00e5ff] tracking-tight">Zero-Database</div>
          <div className="text-xs text-slate-400 mt-1">
            Artifacts stored in URL hash
          </div>
        </div>

        <div className="glass-hud rounded-2xl p-4 shadow-xl border-[#9333ea]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-2">
            <span>MCP PROTOCOL STATUS</span>
            <Terminal className="w-4 h-4 text-[#ec4899]" />
          </div>
          <div className="text-3xl font-orbitron font-bold text-[#ffd159] tracking-tight">JSON-RPC 2.0</div>
          <div className="text-xs text-slate-400 mt-1">
            9 tools mounted at /api/mcp
          </div>
        </div>

        <div className="glass-hud rounded-2xl p-4 shadow-xl border-[#10b981]/30">
          <div className="flex items-center justify-between text-slate-300 text-xs tracking-wider mb-2">
            <span>EVENT BUS TRAFFIC</span>
            <Radio className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-3xl font-orbitron font-bold text-white tracking-tight">{events.length} Events</div>
          <div className="text-xs text-[#10b981] mt-1 font-semibold">
            Inter-agent signaling active
          </div>
        </div>
      </div>

      {/* Agents Cluster Grid & State Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Agents (6 cols) */}
        <div className="lg:col-span-6 glass-hud rounded-3xl p-6 shadow-xl border-[#ffd159]/25">
          <div className="flex items-center justify-between pb-3 border-b border-[#ffd159]/20 mb-4">
            <div>
              <span className="text-xs font-rajdhani text-[#ffd159] uppercase tracking-wider font-bold">CLUSTER ORCHESTRATION</span>
              <h3 className="text-base font-orbitron font-bold text-white tracking-tight mt-0.5">Autonomous Workers</h3>
            </div>
            <span className="text-xs font-rajdhani text-[#10b981] flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              CLUSTER HEALTHY
            </span>
          </div>

          <div className="space-y-3 font-rajdhani">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="bg-[#040407]/80 border border-slate-800 hover:border-[#ffd159]/50 rounded-2xl p-3.5 transition-all flex items-center justify-between hover:shadow-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-orbitron">{agent.id}</span>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-xs text-slate-300">{agent.role}</span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>TASKS: {agent.tasks}</span>
                    <span>·</span>
                    <span>UPTIME: {agent.uptime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-orbitron font-bold px-2.5 py-1 rounded-full border shadow-sm"
                    style={{
                      backgroundColor: `${agent.color}15`,
                      color: agent.color,
                      borderColor: `${agent.color}40`,
                    }}
                  >
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* State Containers & Memory (6 cols) */}
        <div className="lg:col-span-6 glass-hud rounded-3xl p-6 shadow-xl border-[#ec4899]/25">
          <div className="flex items-center justify-between pb-3 border-b border-[#ec4899]/20 mb-4">
            <div>
              <span className="text-xs font-rajdhani text-[#ec4899] uppercase tracking-wider font-bold">SHARED CONTEXT</span>
              <h3 className="text-base font-orbitron font-bold text-white tracking-tight mt-0.5">Agent State Containers</h3>
            </div>
            <Database className="w-4 h-4 text-[#ec4899]" />
          </div>

          <div className="space-y-3 font-rajdhani">
            {STATE_CONTAINERS.map((item, idx) => (
              <div key={idx} className="bg-[#040407]/80 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#ffd159] font-bold font-orbitron">{item.key}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{item.size}</span>
                </div>
                <div className="text-xs font-mono text-white bg-[#0e0d1c] p-2 rounded-xl border border-slate-800 truncate">
                  {item.value}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span>MAINTAINER: {item.owner}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inter-Agent Event Emitter & Live Bus */}
      <div className="glass-hud rounded-3xl p-6 shadow-2xl space-y-4 border border-[#00e5ff]/25">
        <div className="flex items-center justify-between pb-3 border-b border-[#00e5ff]/20">
          <div>
            <span className="text-xs font-rajdhani text-[#00e5ff] uppercase tracking-wider font-bold">COMMUNICATION BUS</span>
            <h3 className="text-lg font-orbitron font-bold text-white tracking-tight mt-0.5">Inter-Agent Messaging & Audit Trail</h3>
          </div>
          <button
            onClick={() => {
              playHarmonicChime(580, 0.1);
              refreshEvents();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#ffd159] hover:bg-[#141428] transition-colors"
            title="Refresh events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Dispatch Form */}
        <div className="p-4 bg-[#040407]/90 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end font-rajdhani">
          <div className="md:col-span-3">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-bold">Sender Agent</label>
            <input
              type="text"
              value={senderAgent}
              onChange={(e) => setSenderAgent(e.target.value)}
              className="w-full bg-[#0e0d1c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#ffd159]"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-bold">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="w-full bg-[#0e0d1c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-[#ffd159] font-mono outline-none focus:border-[#ffd159]"
            >
              <option value="workflow_trigger">workflow_trigger</option>
              <option value="unlock">unlock</option>
              <option value="branch_chosen">branch_chosen</option>
              <option value="qr_scanned">qr_scanned</option>
              <option value="site_updated">site_updated</option>
              <option value="ping">ping</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-bold">JSON Payload</label>
            <input
              type="text"
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              className="w-full bg-[#0e0d1c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#ffd159]"
            />
          </div>

          <div className="md:col-span-2">
            <button
              onClick={handleEmitEvent}
              className="btn-glow-pulse w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#ffd159] to-[#f5b82e] hover:from-[#ffe082] text-[#040407] font-bold text-xs font-orbitron flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Broadcast</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 text-xs font-rajdhani">
          <span className="text-slate-400 font-bold">FILTER:</span>
          {['all', 'workflow_trigger', 'unlock', 'branch_chosen', 'qr_scanned', 'site_updated'].map((f) => (
            <button
              key={f}
              onClick={() => {
                playHarmonicChime(500, 0.08);
                setActiveFilter(f);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === f
                  ? 'bg-gradient-to-r from-[#ffd159] to-[#f5b82e] text-[#040407] shadow-sm'
                  : 'bg-[#080811] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Events Feed */}
        <div className="bg-[#040407]/90 border border-slate-800 rounded-2xl p-3.5 max-h-72 overflow-y-auto space-y-2 font-rajdhani">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No inter-agent events recorded yet. Broadcast an event above or trigger actions in micro-sites!
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-[#0e0d1c] border border-slate-800 hover:border-[#ffd159]/30 rounded-xl p-2.5 text-xs flex items-start justify-between gap-3 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#ffd159] font-bold font-orbitron">{evt.senderAgent}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-white bg-[#141428] px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {evt.eventType}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 text-[10px] font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-300 text-[11px] font-mono truncate max-w-xl">
                    {JSON.stringify(evt.payload)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0 font-mono">{evt.id}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* URL Click-Through Rates & Interaction Telemetry Panel */}
      <UrlAnalyticsPanel />

      {/* Main Dashboard Footer with Shimmering Export to JSON Button */}
      <div className="glass-hud rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#ffd159]/30 rainbow-border-pulse">
        <div className="space-y-1 text-center sm:text-left font-rajdhani">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-sm font-bold text-white font-orbitron">ACTIVE PROJECT STATE</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-bold text-[#10b981]">PERSISTENT ACROSS SESSIONS</span>
          </div>
          <p className="text-xs text-slate-300">
            Download complete project configuration including micro-sites, scheduled capsules, chains, and telemetry logs.
          </p>
        </div>

        <button
          onClick={handleExportJson}
          className="btn-glow-pulse px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#ec4899] text-[#040407] font-bold text-xs font-orbitron flex items-center gap-2 transition-all shadow-xl shadow-[#ffd159]/30 hover:scale-105 active:scale-95 shrink-0"
        >
          {hasExportedJson ? (
            <>
              <Check className="w-4 h-4 text-black stroke-[3]" />
              <span>Project Exported!</span>
            </>
          ) : (
            <>
              <FileJson className="w-4 h-4 stroke-[2.5]" />
              <span>Export to JSON</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
