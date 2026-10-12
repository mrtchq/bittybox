/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  GitBranch,
  Cpu,
  Terminal,
  Binary,
  Code2,
  Mic,
  QrCode,
  Volume2,
  VolumeX,
  User,
} from 'lucide-react';
import { playHarmonicChime, setSfxEnabled, isSfxEnabled } from './CosmicAtmosphere';

export type NavTab = 'studio' | 'capsules' | 'chains' | 'dashboard' | 'console' | 'codec';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSdkModal: () => void;
  onOpenQrModal: () => void;
  onToggleVoice: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenSdkModal,
  onOpenQrModal,
  onToggleVoice,
}) => {
  const [sfxOn, setSfxOn] = useState<boolean>(true);
  const [eegHeights, setEegHeights] = useState<number[]>([40, 25, 75, 55, 90, 60]);

  // Animate live EEG brainwave bars
  useEffect(() => {
    const interval = setInterval(() => {
      setEegHeights([
        Math.floor(20 + Math.random() * 70),
        Math.floor(15 + Math.random() * 80),
        Math.floor(30 + Math.random() * 65),
        Math.floor(40 + Math.random() * 55),
        Math.floor(25 + Math.random() * 70),
        Math.floor(35 + Math.random() * 60),
      ]);
    }, 180);
    return () => clearInterval(interval);
  }, []);

  const handleTabClick = (tab: NavTab) => {
    playHarmonicChime(580, 0.12);
    onTabChange(tab);
  };

  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    setSfxEnabled(next);
    if (next) playHarmonicChime(880, 0.15);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080811]/85 backdrop-blur-xl border-b border-[#ffd159]/20 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Wordmark matching the Logo Reference */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => handleTabClick('studio')}
              className="cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f5b82e] via-[#9333ea] to-[#ec4899] p-[1.5px] flex items-center justify-center shadow-lg shadow-[#f5b82e]/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#040407] rounded-[10px] flex items-center justify-center relative overflow-hidden">
                  <span className="text-[#ffd159] font-black text-xl font-orbitron group-hover:rotate-12 transition-transform">
                    ⬡
                  </span>
                </div>
              </div>

              {/* Exact Logo Style: BITTY [MICRO] BOX */}
              <div className="flex items-center space-x-1.5 font-orbitron">
                <span className="gold-gradient-text font-black text-xl tracking-wider">BITTY</span>
                <div className="flex flex-col items-center justify-center px-1">
                  <div className="w-full h-[1px] bg-[#ffd159]/80"></div>
                  <span className="text-[9px] font-sans font-bold tracking-[0.22em] text-white px-1 leading-tight">
                    MICRO
                  </span>
                  <div className="w-full h-[1px] bg-[#ffd159]/80"></div>
                </div>
                <span className="rainbow-gradient-text font-black text-xl tracking-wider">BOX</span>
              </div>
            </div>
          </div>

          {/* Navigation Matrix Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#0e0d1c]/90 p-1.5 rounded-xl border border-[#ffd159]/20 shadow-inner">
            <button
              onClick={() => handleTabClick('studio')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-rajdhani font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'studio'
                  ? 'bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#d99814] text-[#040407] shadow-lg shadow-[#ffd159]/25 scale-105'
                  : 'text-slate-300 hover:text-[#ffd159] hover:bg-[#141428]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>STUDIO</span>
            </button>
            <button
              onClick={() => handleTabClick('capsules')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-rajdhani font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'capsules'
                  ? 'bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#d99814] text-[#040407] shadow-lg shadow-[#ffd159]/25 scale-105'
                  : 'text-slate-300 hover:text-[#ffd159] hover:bg-[#141428]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#ffd159]" />
              <span>CAPSULES</span>
            </button>
            <button
              onClick={() => handleTabClick('chains')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-rajdhani font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'chains'
                  ? 'bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#d99814] text-[#040407] shadow-lg shadow-[#ffd159]/25 scale-105'
                  : 'text-slate-300 hover:text-[#ffd159] hover:bg-[#141428]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-[#ec4899]" />
              <span>CHAINS</span>
            </button>
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-rajdhani font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#d99814] text-[#040407] shadow-lg shadow-[#ffd159]/25 scale-105'
                  : 'text-slate-300 hover:text-[#ffd159] hover:bg-[#141428]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[#10b981]" />
              <span>AGENT HUB</span>
            </button>
            <button
              onClick={() => handleTabClick('console')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-rajdhani font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'console'
                  ? 'bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#d99814] text-[#040407] shadow-lg shadow-[#ffd159]/25 scale-105'
                  : 'text-slate-300 hover:text-[#ffd159] hover:bg-[#141428]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>MCP & API</span>
            </button>
            <button
              onClick={() => handleTabClick('codec')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-rajdhani font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'codec'
                  ? 'bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#d99814] text-[#040407] shadow-lg shadow-[#ffd159]/25 scale-105'
                  : 'text-slate-300 hover:text-[#ffd159] hover:bg-[#141428]'
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-[#9333ea]" />
              <span>CODEC</span>
            </button>
          </nav>

          {/* Right Tools: Live EEG Spectrum, SFX Toggle, Voice, SDK, QR */}
          <div className="flex items-center gap-3">
            {/* Live Synaptic Brainwave / EEG Spectrum matching reference */}
            <div className="hidden xl:flex items-center space-x-1.5 bg-[#040407]/90 px-3 py-1.5 rounded-full border border-purple-500/30 shadow-inner">
              <span className="text-[10px] font-rajdhani text-slate-400 mr-1 tracking-wider">EEG</span>
              <div className="flex items-end space-x-1 h-3.5">
                <span className="w-1 bg-[#ffd159] rounded-sm transition-all duration-150" style={{ height: `${eegHeights[0]}%` }} />
                <span className="w-1 bg-[#00e5ff] rounded-sm transition-all duration-150" style={{ height: `${eegHeights[1]}%` }} />
                <span className="w-1 bg-[#9333ea] rounded-sm transition-all duration-150" style={{ height: `${eegHeights[2]}%` }} />
                <span className="w-1 bg-[#ec4899] rounded-sm transition-all duration-150" style={{ height: `${eegHeights[3]}%` }} />
                <span className="w-1 bg-[#10b981] rounded-sm transition-all duration-150" style={{ height: `${eegHeights[4]}%` }} />
                <span className="w-1 bg-[#ffd159] rounded-sm transition-all duration-150" style={{ height: `${eegHeights[5]}%` }} />
              </div>
              <span className="text-[10px] font-rajdhani text-[#00e5ff] ml-1 font-bold">40Hz GAMMA</span>
            </div>

            {/* Audio Feedback Toggle */}
            <button
              onClick={toggleSfx}
              className={`p-2 rounded-xl transition-all border text-xs font-rajdhani flex items-center gap-1.5 ${
                sfxOn
                  ? 'bg-[#141428] border-[#ffd159]/40 text-[#ffd159]'
                  : 'bg-[#080811] border-slate-700 text-slate-500'
              }`}
              title="Toggle Harmonic Audio Synthesizer"
            >
              {sfxOn ? <Volume2 className="w-4 h-4 text-[#ffd159]" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden lg:inline text-[11px]">{sfxOn ? 'SFX: ON' : 'SFX: OFF'}</span>
            </button>

            {/* Voice Command Button with Rainbow Border */}
            <button
              onClick={() => {
                playHarmonicChime(640, 0.1);
                onToggleVoice();
              }}
              className="p-2 rounded-xl bg-[#141428] hover:bg-[#1e1c36] text-[#ffd159] border border-[#ffd159]/30 transition-all hover:scale-105 shadow-md"
              title="Voice AI Command"
            >
              <Mic className="w-4 h-4 text-[#00e5ff]" />
            </button>

            {/* SDKs & MCP Spec Modal Button */}
            <button
              onClick={() => {
                playHarmonicChime(700, 0.1);
                onOpenSdkModal();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#141428] hover:bg-[#1e1c36] text-white text-xs font-rajdhani font-bold tracking-wider flex items-center gap-1.5 transition-all border border-[#ffd159]/30 hover:border-[#ffd159]"
            >
              <Code2 className="w-3.5 h-3.5 text-[#ffd159]" />
              <span className="hidden sm:inline">SDKs & MCP</span>
            </button>

            {/* QR Code Matrix Button */}
            <button
              onClick={() => {
                playHarmonicChime(800, 0.1);
                onOpenQrModal();
              }}
              className="btn-glow-pulse p-2 rounded-xl bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#ec4899] text-[#040407] transition-all shadow-lg shadow-[#ffd159]/25 hover:scale-105"
              title="QR Matrix Generator"
            >
              <QrCode className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Account & Identity Portal Button */}
            <a
              href="/account.html"
              className="px-3 py-1.5 rounded-xl bg-[#141428] hover:bg-[#1e1c36] text-[#ffd159] text-xs font-rajdhani font-bold tracking-wider flex items-center gap-1.5 transition-all border border-[#ffd159]/40 hover:border-[#ffd159]"
              title="Identity & Account Console"
            >
              <User className="w-3.5 h-3.5 text-[#ffd159]" />
              <span className="hidden sm:inline">ACCOUNT</span>
            </a>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t border-[#ffd159]/15">
          {(['studio', 'capsules', 'chains', 'dashboard', 'console', 'codec'] as NavTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-rajdhani font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#ffd159] to-[#f5b82e] text-[#040407]'
                  : 'text-slate-300 bg-[#0e0d1c] border border-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
