/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Lock,
  Unlock,
  Key,
  Calendar,
  Sparkles,
  Copy,
  Check,
  QrCode,
  Eye,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  CapsuleData,
  MicroSiteData,
  compileCapsuleHTML,
  encodeHtmlToBittyUrl,
} from '../protocol/bittybox';
import { QrModal } from './QrModal';
import { notify_agent } from '../protocol/functions';
import { playHarmonicChime, spawnStardustBurst } from './CosmicAtmosphere';

interface CapsuleSchedulerProps {
  initialArtifact?: any;
}

export const CapsuleScheduler: React.FC<CapsuleSchedulerProps> = ({ initialArtifact }) => {
  const [title, setTitle] = useState<string>('Confidential Agent Assessment');
  const [authorAgent, setAuthorAgent] = useState<string>('temporal-warden');
  const [preUnlockMessage, setPreUnlockMessage] = useState<string>(
    'Encrypted telemetry capsule sealed by autonomous agent. Security integrity confirmed.'
  );
  
  // Unlock conditions
  const [unlockType, setUnlockType] = useState<'time' | 'password' | 'both'>('both');
  
  // Default: unlock 10 minutes from now for instant testing
  const [minutesFromNow, setMinutesFromNow] = useState<number>(10);
  const [targetIsoTime, setTargetIsoTime] = useState<string>(
    new Date(Date.now() + 10 * 60 * 1000).toISOString()
  );
  const [password, setPassword] = useState<string>('gold2026');

  // Capsule payload content
  const [payloadHtml, setPayloadHtml] = useState<string>(
    `<h2>Verified Executive Briefing</h2>
<p>This confidential payload was sealed at execution start and unlocked by authorized cryptographic handshake.</p>
<pre>Status: COMPLETE · Agent: temporal-warden · Integrity: 100%</pre>
<p>Self-contained inside single URL. No server storage.</p>`
  );

  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  useEffect(() => {
    if (!initialArtifact || initialArtifact.primitiveType !== 'capsule') return;
    if (initialArtifact.title) setTitle(initialArtifact.title);
    if (initialArtifact.content) setPayloadHtml(initialArtifact.content);
    if (initialArtifact.capsuleConfig) {
      if (initialArtifact.capsuleConfig.preUnlockMessage) {
        setPreUnlockMessage(initialArtifact.capsuleConfig.preUnlockMessage);
      }
      if (initialArtifact.capsuleConfig.password) {
        setPassword(initialArtifact.capsuleConfig.password);
      }
      if (initialArtifact.capsuleConfig.unlockTime) {
        setTargetIsoTime(initialArtifact.capsuleConfig.unlockTime);
      }
    }
  }, [initialArtifact]);

  const updateUnlockTimeOffset = (mins: number) => {
    setMinutesFromNow(mins);
    const newTarget = new Date(Date.now() + mins * 60 * 1000).toISOString();
    setTargetIsoTime(newTarget);
  };

  useEffect(() => {
    const site: MicroSiteData = {
      id: 'site_' + Math.random().toString(36).substring(2, 7),
      title,
      content: payloadHtml,
      theme: 'obsidian-gold',
      layout: 'document',
      metadata: { authorAgent, title },
    };

    const capsule: CapsuleData = {
      id: 'capsule_' + Math.random().toString(36).substring(2, 7),
      title,
      microSite: site,
      unlockTime: unlockType === 'time' || unlockType === 'both' ? targetIsoTime : undefined,
      password: unlockType === 'password' || unlockType === 'both' ? password : undefined,
      preUnlockMessage,
      authorAgent,
      created: new Date().toISOString(),
    };

    const html = compileCapsuleHTML(capsule);
    setCompiledHtml(html);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = encodeHtmlToBittyUrl(html, `capsule_${title}`, origin);
    setGeneratedUrl(url);
  }, [title, authorAgent, preUnlockMessage, unlockType, targetIsoTime, password, payloadHtml]);

  const copyUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration Column (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <div className="glass-hud rounded-3xl p-6 shadow-2xl border border-[#ffd159]/25">
          <div className="flex items-center justify-between pb-4 border-b border-[#ffd159]/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani text-[#ffd159] uppercase tracking-wider font-bold">PRIMITIVE 02</span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-rajdhani text-slate-400">TEMPORAL PRIMITIVE</span>
              </div>
              <h2 className="text-xl font-orbitron font-extrabold text-white tracking-tight mt-0.5">Bitty Capsule Scheduler</h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5b82e]/10 border border-[#f5b82e]/30 text-xs font-rajdhani font-bold text-[#ffd159]">
              <Clock className="w-3.5 h-3.5" />
              <span>TIME-GATED ARTIFACT</span>
            </div>
          </div>

          {/* Title & Agent */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="md:col-span-2">
              <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">Capsule Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-[#D4AF37] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">Author Agent</label>
              <input
                type="text"
                value={authorAgent}
                onChange={(e) => setAuthorAgent(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg px-3 py-2 text-sm text-[#D4AF37] font-mono focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          {/* Unlock Conditions Selector */}
          <div className="mt-4 p-4 bg-[#0A0A0B] border border-[#27272F] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                UNLOCK GATES & CONSTRAINTS
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setUnlockType('time')}
                  className={`px-2.5 py-1 text-xs font-mono rounded ${
                    unlockType === 'time' ? 'bg-[#D4AF37] text-black font-semibold' : 'text-[#8E8E98] bg-[#141417]'
                  }`}
                >
                  Time Only
                </button>
                <button
                  onClick={() => setUnlockType('password')}
                  className={`px-2.5 py-1 text-xs font-mono rounded ${
                    unlockType === 'password' ? 'bg-[#D4AF37] text-black font-semibold' : 'text-[#8E8E98] bg-[#141417]'
                  }`}
                >
                  Passcode Only
                </button>
                <button
                  onClick={() => setUnlockType('both')}
                  className={`px-2.5 py-1 text-xs font-mono rounded ${
                    unlockType === 'both' ? 'bg-[#D4AF37] text-black font-semibold' : 'text-[#8E8E98] bg-[#141417]'
                  }`}
                >
                  Time + Passcode
                </button>
              </div>
            </div>

            {/* Time Settings */}
            {(unlockType === 'time' || unlockType === 'both') && (
              <div className="space-y-2 pt-2 border-t border-[#1C1C22]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8E8E98] font-mono">SCHEDULE PRESETS:</span>
                  <div className="flex gap-1.5">
                    {[1, 5, 10, 60, 1440].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => updateUnlockTimeOffset(mins)}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded border ${
                          minutesFromNow === mins
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                            : 'bg-[#141417] border-[#27272F] text-[#8E8E98]'
                        }`}
                      >
                        {mins < 60 ? `${mins}m` : mins === 60 ? '1h' : '24h'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={targetIsoTime.substring(0, 16)}
                    onChange={(e) => setTargetIsoTime(new Date(e.target.value).toISOString())}
                    className="bg-[#141417] border border-[#27272F] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                  />
                  <div className="text-[11px] font-mono text-[#D4AF37] flex items-center gap-1.5 bg-[#141417] px-3 py-1.5 rounded-lg border border-[#27272F]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Unlocks: {new Date(targetIsoTime).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Passcode Settings */}
            {(unlockType === 'password' || unlockType === 'both') && (
              <div className="space-y-1.5 pt-2 border-t border-[#1C1C22]">
                <label className="text-[11px] font-mono text-[#8E8E98] uppercase block">Passcode Constraint</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Key className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. gold2026"
                      className="w-full bg-[#141417] border border-[#27272F] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#8E8E98]">Required at unlock prompt</span>
                </div>
              </div>
            )}
          </div>

          {/* Pre-Unlock Screen Message */}
          <div className="mt-4">
            <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">
              Pre-Unlock Screen Message (Visible Before Unlocking)
            </label>
            <textarea
              value={preUnlockMessage}
              onChange={(e) => setPreUnlockMessage(e.target.value)}
              rows={2}
              className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg p-2.5 text-xs font-mono text-[#EDEDED] outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Hidden Payload Inside Capsule */}
          <div className="mt-4">
            <label className="text-[11px] font-mono text-[#D4AF37] uppercase block mb-1">
              Protected Payload Content (Revealed Only Upon Unlock)
            </label>
            <textarea
              value={payloadHtml}
              onChange={(e) => setPayloadHtml(e.target.value)}
              rows={5}
              className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg p-2.5 text-xs font-mono text-[#EDEDED] outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* URL Output Bar */}
        <div className="glass-hud rounded-3xl p-5 shadow-2xl flex flex-col gap-2 border border-[#ffd159]/25 font-rajdhani">
          <div className="flex items-center justify-between text-xs tracking-wider">
            <span className="text-white font-bold font-orbitron">CAPSULE SIZE: {generatedUrl.length} B</span>
            <span className="text-[#ffd159] font-bold">TEMPORAL CONDITIONAL ENCODED</span>
          </div>
          <div className="bg-[#040407]/90 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 truncate flex-1">{generatedUrl}</span>
            <button
              onClick={(e) => {
                spawnStardustBurst(e.clientX, e.clientY, 16);
                playHarmonicChime(760, 0.15);
                copyUrl();
              }}
              className="btn-glow-pulse px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd159] to-[#f5b82e] hover:from-[#ffe082] text-[#040407] font-bold text-xs font-orbitron flex items-center gap-1.5 transition-all shrink-0 shadow-md hover:scale-105 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Capsule'}
            </button>
            <button
              onClick={() => {
                playHarmonicChime(800, 0.1);
                setShowQrModal(true);
              }}
              className="p-2 rounded-xl bg-[#141428] hover:bg-[#1e1c36] text-[#ffd159] border border-slate-700 hover:border-[#ffd159] transition-all shrink-0 hover:scale-105"
            >
              <QrCode className="w-4 h-4 text-[#ffd159]" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Live Interactive Sandbox (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        <div className="glass-hud rounded-3xl p-5 shadow-2xl flex flex-col h-full min-h-[580px] border border-[#00e5ff]/25">
          <div className="flex items-center justify-between pb-3 border-b border-[#00e5ff]/20 mb-3 font-rajdhani">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff] animate-pulse"></span>
              <span className="text-xs font-orbitron font-bold text-white">LIVE CAPSULE RUNTIME</span>
            </div>
            <span className="text-[11px] font-bold text-[#ffd159]">TEST PRE-UNLOCK & PASSCODE</span>
          </div>

          <div className="flex-1 bg-[#040407] border border-slate-800 rounded-2xl overflow-hidden">
            <iframe
              srcDoc={compiledHtml}
              title="Capsule Runtime Preview"
              className="w-full h-full min-h-[500px] border-none"
              sandbox="allow-scripts allow-same-origin allow-modals"
            />
          </div>
        </div>
      </div>

      <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} url={generatedUrl} title={title} />
    </div>
  );
};
