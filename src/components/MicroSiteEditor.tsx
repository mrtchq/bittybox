/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Code,
  Eye,
  Plus,
  Trash2,
  Share2,
  RefreshCw,
  Layers,
  Palette,
  Terminal,
} from 'lucide-react';
import {
  MicroSiteData,
  BittyThemeId,
  BittyLayout,
  compileMicroSiteHTML,
  encodeHtmlToBittyUrl,
} from '../protocol/bittybox';
import { BITTY_THEMES } from '../protocol/themes';
import { QrModal } from './QrModal';
import { playHarmonicChime, spawnStardustBurst } from './CosmicAtmosphere';

interface MicroSiteEditorProps {
  initialArtifact?: any;
  onSiteGenerated?: (url: string, site: MicroSiteData) => void;
}

export const MicroSiteEditor: React.FC<MicroSiteEditorProps> = ({ initialArtifact, onSiteGenerated }) => {
  const [title, setTitle] = useState<string>('Autonomous Agent Telemetry');
  const [content, setContent] = useState<string>(
    `<h2>Mission Directive: Alpha Prime</h2>
<p>Autonomous crawler concluded cycle #891. All 1,420 micro-services reported nominal status.</p>
<pre>Latency: 8.4ms · Memory: 214MB · Checksum: SHA256_VALID</pre>
<p>State container serialized to URL fragment. Zero database overhead.</p>`
  );
  const [theme, setTheme] = useState<BittyThemeId>('obsidian-gold');
  const [layout, setLayout] = useState<BittyLayout>('document');
  const [authorAgent, setAuthorAgent] = useState<string>('agent-nexus-09');
  const [customJs, setCustomJs] = useState<string>('');
  const [customCss, setCustomCss] = useState<string>('');
  
  // Widgets list
  const [widgets, setWidgets] = useState<MicroSiteData['widgets']>([
    { type: 'status-grid', label: 'Protocol Health', value: 'OPTIMAL' },
    { type: 'counter', label: 'Active Sub-Agents', value: 7 },
    { type: 'event-emitter', label: 'Ping Mesh Network', action: 'agent_mesh_ping' },
  ]);

  // View mode
  const [activeTab, setActiveTab] = useState<'content' | 'widgets' | 'code' | 'metadata'>('content');
  const [previewTab, setPreviewTab] = useState<'preview' | 'html'>('preview');

  // Generated results
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // When initialArtifact changes (e.g. from Voice AI or Agent Generator)
  useEffect(() => {
    if (!initialArtifact) return;
    if (initialArtifact.title) setTitle(initialArtifact.title);
    if (initialArtifact.content) setContent(initialArtifact.content);
    if (initialArtifact.theme) setTheme(initialArtifact.theme as BittyThemeId);
    if (initialArtifact.layout) setLayout(initialArtifact.layout as BittyLayout);
    if (initialArtifact.widgets) setWidgets(initialArtifact.widgets);
  }, [initialArtifact]);

  // Recompile whenever inputs change
  useEffect(() => {
    const site: MicroSiteData = {
      id: 'site_' + title.toLowerCase().replace(/\s+/g, '_'),
      title,
      content,
      theme,
      layout,
      metadata: {
        title,
        authorAgent,
        version: 'v2.4',
        created: new Date().toISOString(),
      },
      widgets,
      customJs,
      customCss,
    };

    const html = compileMicroSiteHTML(site);
    setCompiledHtml(html);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = encodeHtmlToBittyUrl(html, title, origin);
    setGeneratedUrl(url);

    if (onSiteGenerated) {
      onSiteGenerated(url, site);
    }
  }, [title, content, theme, layout, authorAgent, widgets, customJs, customCss]);

  const copyUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addWidget = (type: 'counter' | 'status-grid' | 'action-button' | 'event-emitter') => {
    const newWidget = {
      type,
      label: type === 'counter' ? 'Counter Metric' : type === 'status-grid' ? 'Cluster Status' : 'Agent Action',
      value: type === 'counter' ? 0 : 'ONLINE',
      action: 'agent_signal',
    };
    setWidgets([...(widgets || []), newWidget]);
  };

  const removeWidget = (index: number) => {
    const next = [...(widgets || [])];
    next.splice(index, 1);
    setWidgets(next);
  };

  const rawBytes = compiledHtml.length;
  const compressedBytes = generatedUrl.length;
  const compressionPercent = rawBytes > 0 ? Math.round((1 - compressedBytes / rawBytes) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Editor controls (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <div className="glass-hud rounded-3xl p-6 shadow-2xl border border-[#ffd159]/25">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#ffd159]/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani text-[#ffd159] uppercase tracking-wider font-bold">PRIMITIVE 01</span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-rajdhani text-slate-400">OUTPUT PAGES</span>
              </div>
              <h2 className="text-xl font-orbitron font-extrabold text-white tracking-tight mt-0.5">AI Micro-Site Generator</h2>
            </div>

            {/* Theme Picker */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#ffd159]" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as BittyThemeId)}
                className="bg-[#040407] border border-slate-700 text-[#EDEDED] text-xs font-rajdhani font-semibold rounded-xl px-3 py-1.5 outline-none focus:border-[#ffd159]"
              >
                {Object.values(BITTY_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title & Author Agent row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="md:col-span-2">
              <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">Micro-Site Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-[#D4AF37] outline-none"
                placeholder="Title..."
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">Author Agent</label>
              <input
                type="text"
                value={authorAgent}
                onChange={(e) => setAuthorAgent(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg px-3 py-2 text-sm text-[#D4AF37] font-mono focus:border-[#D4AF37] outline-none"
                placeholder="agent-id"
              />
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-2 mt-4 border-b border-[#27272F] pb-3">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                activeTab === 'content'
                  ? 'bg-[#D4AF37] text-black font-semibold'
                  : 'text-[#8E8E98] hover:text-white bg-[#0A0A0B]'
              }`}
            >
              Content (HTML/MD)
            </button>
            <button
              onClick={() => setActiveTab('widgets')}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'widgets'
                  ? 'bg-[#D4AF37] text-black font-semibold'
                  : 'text-[#8E8E98] hover:text-white bg-[#0A0A0B]'
              }`}
            >
              <Layers className="w-3 h-3" />
              Widgets ({widgets?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-[#D4AF37] text-black font-semibold'
                  : 'text-[#8E8E98] hover:text-white bg-[#0A0A0B]'
              }`}
            >
              <Terminal className="w-3 h-3" />
              Logic & CSS
            </button>
          </div>

          {/* Tab 1: Content Editor */}
          {activeTab === 'content' && (
            <div className="mt-4">
              <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">Payload Content (HTML/Semantic)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={9}
                className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-xl p-3.5 text-xs font-mono text-[#EDEDED] leading-relaxed outline-none focus:border-[#D4AF37] resize-y"
                placeholder="Enter HTML or text payload..."
              />
            </div>
          )}

          {/* Tab 2: Widgets Builder */}
          {activeTab === 'widgets' && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E8E98] font-mono">EMBEDDED AGENTIC CONTROLS</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => addWidget('counter')}
                    className="px-2 py-1 text-[11px] font-mono bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] rounded border border-[#27272F] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Counter
                  </button>
                  <button
                    onClick={() => addWidget('status-grid')}
                    className="px-2 py-1 text-[11px] font-mono bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] rounded border border-[#27272F] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Status
                  </button>
                  <button
                    onClick={() => addWidget('event-emitter')}
                    className="px-2 py-1 text-[11px] font-mono bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] rounded border border-[#27272F] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Emitter
                  </button>
                </div>
              </div>

              {(widgets || []).map((w, idx) => (
                <div key={idx} className="bg-[#0A0A0B] border border-[#27272F] rounded-lg p-3 flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#D4AF37] uppercase bg-[#141417] px-2 py-1 rounded">
                    {w.type}
                  </span>
                  <input
                    type="text"
                    value={w.label}
                    onChange={(e) => {
                      const next = [...(widgets || [])];
                      next[idx].label = e.target.value;
                      setWidgets(next);
                    }}
                    placeholder="Widget Label"
                    className="flex-1 bg-[#141417] border border-[#27272F] rounded px-2.5 py-1 text-xs text-white font-mono outline-none"
                  />
                  <input
                    type="text"
                    value={w.value ?? ''}
                    onChange={(e) => {
                      const next = [...(widgets || [])];
                      next[idx].value = e.target.value;
                      setWidgets(next);
                    }}
                    placeholder="Initial Value"
                    className="w-24 bg-[#141417] border border-[#27272F] rounded px-2.5 py-1 text-xs text-[#D4AF37] font-mono outline-none"
                  />
                  <button
                    onClick={() => removeWidget(idx)}
                    className="p-1 text-[#8E8E98] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Logic & CSS */}
          {activeTab === 'code' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">Custom JS Handler</label>
                <textarea
                  value={customJs}
                  onChange={(e) => setCustomJs(e.target.value)}
                  rows={6}
                  className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg p-3 text-xs font-mono text-[#EDEDED] outline-none"
                  placeholder="console.log('Custom micro-site logic');"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">Custom CSS Rules</label>
                <textarea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  rows={6}
                  className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg p-3 text-xs font-mono text-[#EDEDED] outline-none"
                  placeholder=".bitty-title { letter-spacing: -0.02em; }"
                />
              </div>
            </div>
          )}
        </div>

        {/* URL Metrics & Quick Bar */}
        <div className="glass-hud rounded-3xl p-5 shadow-2xl flex flex-col gap-3 border border-[#ffd159]/25 font-rajdhani">
          <div className="flex items-center justify-between text-xs tracking-wider">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">ARTIFACT SIZE:</span>
              <span className="text-white font-bold font-orbitron">{compressedBytes} B</span>
              <span className="text-slate-600">·</span>
              <span className="text-[#ffd159] font-bold">{compressionPercent}% COMPRESSION</span>
            </div>
            <span className="text-[#10b981] flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              STANDALONE URL READY
            </span>
          </div>

          {/* URL Bar */}
          <div className="bg-[#040407]/90 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 truncate flex-1 select-all">{generatedUrl}</span>
            <button
              onClick={(e) => {
                spawnStardustBurst(e.clientX, e.clientY, 16);
                playHarmonicChime(720, 0.15);
                copyUrl();
              }}
              className="btn-glow-pulse px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd159] to-[#f5b82e] hover:from-[#ffe082] text-[#040407] font-bold text-xs font-orbitron flex items-center gap-1.5 transition-all shrink-0 shadow-md hover:scale-105 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy URL'}
            </button>
            <button
              onClick={() => {
                playHarmonicChime(800, 0.1);
                setShowQrModal(true);
              }}
              className="p-2 rounded-xl bg-[#141428] hover:bg-[#1e1c36] text-[#ffd159] border border-slate-700 hover:border-[#ffd159] transition-all shrink-0 hover:scale-105"
              title="Generate QR code"
            >
              <QrCode className="w-4 h-4 text-[#ffd159]" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Live Micro-Site Preview (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        <div className="glass-hud rounded-3xl p-5 shadow-2xl flex flex-col h-full min-h-[580px] border border-[#ec4899]/25">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#ec4899]/20 mb-3 font-rajdhani">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
              <span className="text-xs font-orbitron font-bold text-white ml-2">BITTY BOX RUNTIME</span>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  playHarmonicChime(560, 0.08);
                  setPreviewTab('preview');
                }}
                className={`px-3 py-1 text-xs font-orbitron font-bold rounded-lg transition-all ${
                  previewTab === 'preview'
                    ? 'bg-gradient-to-r from-[#ffd159] to-[#f5b82e] text-[#040407]'
                    : 'text-slate-400 hover:text-white bg-[#0e0d1c]'
                }`}
              >
                <Eye className="w-3 h-3 inline mr-1" />
                Live
              </button>
              <button
                onClick={() => {
                  playHarmonicChime(600, 0.08);
                  setPreviewTab('html');
                }}
                className={`px-3 py-1 text-xs font-orbitron font-bold rounded-lg transition-all ${
                  previewTab === 'html'
                    ? 'bg-gradient-to-r from-[#ffd159] to-[#f5b82e] text-[#040407]'
                    : 'text-slate-400 hover:text-white bg-[#0e0d1c]'
                }`}
              >
                <Code className="w-3 h-3 inline mr-1" />
                HTML
              </button>
            </div>
          </div>

          {/* Runtime Display */}
          <div className="flex-1 bg-[#0A0A0B] border border-[#27272F] rounded-xl overflow-hidden relative">
            {previewTab === 'preview' ? (
              <iframe
                srcDoc={compiledHtml}
                title="Bitty Box Preview"
                className="w-full h-full min-h-[480px] border-none"
                sandbox="allow-scripts allow-same-origin allow-modals"
              />
            ) : (
              <pre className="p-4 text-[11px] font-mono text-[#D4AF37] overflow-auto h-full max-h-[500px] leading-relaxed whitespace-pre-wrap break-all">
                {compiledHtml}
              </pre>
            )}
          </div>
        </div>
      </div>

      <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} url={generatedUrl} title={title} />
    </div>
  );
};
