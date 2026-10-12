/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Sparkles,
  Clock,
  GitBranch,
  Cpu,
  Terminal,
  Binary,
  ArrowRight,
  ExternalLink,
  Shield,
  Layers,
  Zap,
  FileJson,
  Check,
  Download,
  Activity,
  Bot,
} from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar';
import { CosmicAtmosphere, playHarmonicChime, spawnStardustBurst } from './components/CosmicAtmosphere';
import { VoiceInterface } from './components/VoiceInterface';
import { MicroSiteEditor } from './components/MicroSiteEditor';
import { CapsuleScheduler } from './components/CapsuleScheduler';
import { ChainFlowEditor } from './components/ChainFlowEditor';
import { AgentDashboard } from './components/AgentDashboard';
import { McpAndApiConsole } from './components/McpAndApiConsole';
import { UrlCodecInspector } from './components/UrlCodecInspector';
import { AgentSdkModal } from './components/AgentSdkModal';
import { QrModal } from './components/QrModal';
import { decodeBittyUrl } from './protocol/bittybox';
import { triggerProjectJsonDownload } from './protocol/telemetry';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('studio');
  const [showVoiceDrawer, setShowVoiceDrawer] = useState<boolean>(true);
  const [showSdkModal, setShowSdkModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrModalUrl, setQrModalUrl] = useState<string>('');
  const [qrModalTitle, setQrModalTitle] = useState<string>('Bitty Box Artifact');
  const [hasExportedJson, setHasExportedJson] = useState<boolean>(false);

  // Transferred artifact from Voice AI or Agent generation
  const [transferredArtifact, setTransferredArtifact] = useState<any>(null);

  // Check initial hash on load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.length > 5) {
      setActiveTab('codec');
    }
  }, []);

  const handleArtifactFromAgent = (artifact: any) => {
    setTransferredArtifact(artifact);
    playHarmonicChime(820, 0.2);
    if (artifact.primitiveType === 'capsule') {
      setActiveTab('capsules');
    } else if (artifact.primitiveType === 'chain') {
      setActiveTab('chains');
    } else {
      setActiveTab('studio');
    }
  };

  const openQrForCurrent = (url: string, title: string) => {
    setQrModalUrl(url);
    setQrModalTitle(title);
    setShowQrModal(true);
  };

  const handleExportClick = (e: React.MouseEvent) => {
    spawnStardustBurst(e.clientX, e.clientY, 25);
    playHarmonicChime(960, 0.25);
    triggerProjectJsonDownload();
    setHasExportedJson(true);
    setTimeout(() => setHasExportedJson(false), 2500);
  };

  return (
    <div className="min-h-screen text-[#EDEDED] flex flex-col selection:bg-[#ec4899]/30 selection:text-[#ffd159] relative overflow-x-hidden">
      {/* Dynamic Cosmic Atmosphere (Starfields, Synapse Canvas, 3D Grid, Cursor Glow) */}
      <CosmicAtmosphere />

      {/* Flagship Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSdkModal={() => setShowSdkModal(true)}
        onOpenQrModal={() => openQrForCurrent(window.location.href, 'Bitty Box')}
        onToggleVoice={() => setShowVoiceDrawer(!showVoiceDrawer)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">
        {/* Voice AI Drawer */}
        {showVoiceDrawer && (
          <VoiceInterface onArtifactGenerated={handleArtifactFromAgent} />
        )}

        {/* Hero Header for AI-First Protocol */}
        {activeTab === 'studio' && (
          <div className="glass-hud rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden rainbow-border-pulse">
            {/* Ambient inner glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#ffd159]/15 via-[#ec4899]/10 to-transparent blur-3xl pointer-events-none" />

            <div className="max-w-4xl space-y-4 relative z-10">
              {/* Dual Hemisphere Badge */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-[#ffd159]/40 bg-[#080811]/80 text-slate-200 font-rajdhani text-xs tracking-[0.22em] uppercase shadow-lg">
                <span className="w-2 h-2 rounded-full bg-[#ffd159] animate-pulse"></span>
                <span className="text-[#ffd159] font-bold">STRUCTURED LOGIC</span>
                <span className="text-[#ffd159]">×</span>
                <span className="text-[#ec4899] font-bold">AUTONOMOUS AGENTS</span>
                <span className="w-2 h-2 rounded-full bg-[#ec4899] animate-pulse"></span>
              </div>

              {/* Hero Headline */}
              <h1 className="font-orbitron font-black text-3xl sm:text-5xl md:text-6xl tracking-tight leading-tight">
                <span className="gold-gradient-text inline-block hover:scale-105 transition-transform">BITTY</span>
                <span className="font-sans font-light text-slate-400 text-2xl sm:text-4xl mx-3 tracking-widest">MICRO</span>
                <span className="rainbow-gradient-text inline-block hover:scale-105 transition-transform">BOX</span>
              </h1>

              <p className="font-sans font-light text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
                The URL-native micro-web protocol built for autonomous AI agents. Generate, schedule, chain,
                and communicate using tiny self-contained artifacts where the <strong className="text-[#ffd159]">URL is the artifact</strong>.
              </p>

              {/* Three Agentic Primitives Selector */}
              <div className="pt-2 flex flex-wrap gap-2.5 text-xs font-rajdhani tracking-wider">
                <button
                  onClick={() => {
                    playHarmonicChime(540, 0.1);
                    setActiveTab('studio');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0e0d1c] border border-[#ffd159]/40 hover:border-[#ffd159] text-white flex items-center gap-2 transition-all hover:scale-105 shadow-md"
                >
                  <Sparkles className="w-4 h-4 text-[#ffd159]" />
                  <span className="font-bold text-white">01. Micro-Sites (Output Pages)</span>
                </button>
                <button
                  onClick={() => {
                    playHarmonicChime(640, 0.1);
                    setActiveTab('capsules');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0e0d1c] border border-[#00e5ff]/40 hover:border-[#00e5ff] text-white flex items-center gap-2 transition-all hover:scale-105 shadow-md"
                >
                  <Clock className="w-4 h-4 text-[#00e5ff]" />
                  <span className="font-bold text-white">02. Capsules (Temporal Unlocks)</span>
                </button>
                <button
                  onClick={() => {
                    playHarmonicChime(740, 0.1);
                    setActiveTab('chains');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0e0d1c] border border-[#ec4899]/40 hover:border-[#ec4899] text-white flex items-center gap-2 transition-all hover:scale-105 shadow-md"
                >
                  <GitBranch className="w-4 h-4 text-[#ec4899]" />
                  <span className="font-bold text-white">03. Chains (Branching Logic)</span>
                </button>
              </div>

              {/* Colorful KPI Metrics Bar matching the reference style */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[#ffd159]/20 font-rajdhani">
                <div className="glass-hud p-3 rounded-xl text-center border-[#ffd159]/30">
                  <div className="gold-gradient-text font-orbitron font-bold text-xl md:text-2xl">4.8×</div>
                  <div className="text-[10px] md:text-xs tracking-widest text-slate-300 uppercase mt-0.5">Task Velocity</div>
                </div>
                <div className="glass-hud p-3 rounded-xl text-center border-[#00e5ff]/30">
                  <div className="text-[#00e5ff] font-orbitron font-bold text-xl md:text-2xl">0 B</div>
                  <div className="text-[10px] md:text-xs tracking-widest text-slate-300 uppercase mt-0.5">Server Overhead</div>
                </div>
                <div className="glass-hud p-3 rounded-xl text-center border-[#ec4899]/30">
                  <div className="text-[#ec4899] font-orbitron font-bold text-xl md:text-2xl">∞ Flow</div>
                  <div className="text-[10px] md:text-xs tracking-widest text-slate-300 uppercase mt-0.5">URL Portability</div>
                </div>
                <div className="glass-hud p-3 rounded-xl text-center border-[#10b981]/30">
                  <div className="text-[#10b981] font-orbitron font-bold text-xl md:text-2xl">100%</div>
                  <div className="text-[10px] md:text-xs tracking-widest text-slate-300 uppercase mt-0.5">Agentic Autonomy</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Primitive Views */}
        {activeTab === 'studio' && (
          <MicroSiteEditor
            initialArtifact={transferredArtifact}
            onSiteGenerated={(url, site) => {
              setQrModalUrl(url);
              setQrModalTitle(site.title);
            }}
          />
        )}

        {activeTab === 'capsules' && (
          <CapsuleScheduler initialArtifact={transferredArtifact} />
        )}

        {activeTab === 'chains' && (
          <ChainFlowEditor initialArtifact={transferredArtifact} />
        )}

        {activeTab === 'dashboard' && <AgentDashboard />}

        {activeTab === 'console' && <McpAndApiConsole />}

        {activeTab === 'codec' && <UrlCodecInspector />}
      </main>

      {/* Cosmic Footer */}
      <footer className="border-t border-[#ffd159]/20 bg-[#080811]/90 backdrop-blur-xl py-6 mt-12 text-xs font-rajdhani tracking-wider text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="gold-gradient-text font-bold font-orbitron">SECTOR 01 / 06</span>
            <span className="text-slate-600">|</span>
            <span className="text-[#ffd159] font-semibold">BITTY BOX PROTOCOL</span>
            <span className="text-slate-600">·</span>
            <span>URL IS THE ARTIFACT</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                playHarmonicChime(620, 0.1);
                setShowSdkModal(true);
              }}
              className="hover:text-[#ffd159] transition-colors font-medium"
            >
              Agent SDKs (Py/TS/Go)
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                playHarmonicChime(680, 0.1);
                setActiveTab('console');
              }}
              className="hover:text-[#ffd159] transition-colors font-medium"
            >
              MCP Endpoint (/api/mcp)
            </button>
            <span className="text-slate-700">·</span>

            {/* Export to JSON Button */}
            <button
              onClick={handleExportClick}
              className="btn-glow-pulse px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#ec4899] text-[#040407] font-bold text-xs font-orbitron flex items-center gap-1.5 transition-all shadow-lg shadow-[#ffd159]/30 hover:scale-105 active:scale-95"
            >
              {hasExportedJson ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                  <span>Config Exported!</span>
                </>
              ) : (
                <>
                  <FileJson className="w-3.5 h-3.5 text-black" />
                  <span>Export to JSON</span>
                </>
              )}
            </button>
            <span className="text-slate-700">·</span>
            <span className="text-slate-500 font-mono">v2.4.0</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AgentSdkModal isOpen={showSdkModal} onClose={() => setShowSdkModal(false)} />
      <QrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        url={qrModalUrl || (typeof window !== 'undefined' ? window.location.href : '')}
        title={qrModalTitle}
      />
    </div>
  );
}
