import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  Code2, 
  Eye, 
  Briefcase, 
  BookOpen, 
  LayoutDashboard, 
  Terminal, 
  Gamepad2, 
  Shield, 
  Utensils, 
  User, 
  Layers, 
  FileCode, 
  Check, 
  ArrowRight,
  Zap,
  ExternalLink,
  ChevronLeft,
  Crown
} from 'lucide-react';
import { TemplatePreset, BittySession, WorkspaceMode } from '../types';
import { TEMPLATE_PRESETS } from '../data/templates';
import { motion, AnimatePresence } from 'motion/react';
import { GRIP_ICON_DATA_URL } from './EdgeGripHandles';
import { CyberScrambleText } from './CyberScrambleText';

interface TemplatesSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplatePreset) => void;
  currentContentLength?: number;
  sessions?: BittySession[];
  currentSessionId?: string;
  onSwitchSession?: (sessionId: string) => void;
  onNewSession?: () => void;
  mode?: WorkspaceMode;
  isPro?: boolean;
  onOpenPaywall?: (feature?: string) => void;
}

// Quick starter boilerplate snippets
const QUICK_SNIPPETS = [
  {
    id: 'snip-html5',
    title: 'HTML5 Modern Starter',
    icon: '⚡',
    desc: 'Clean responsive HTML5 boilerplate with modern CSS resets',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bitty Modern App</title>
  <style>
    :root { color-scheme: dark; }
    body {
      background: #09090b;
      color: #f4f4f5;
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 2rem;
      max-width: 440px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h1 { color: #38bdf8; margin-top: 0; }
    button {
      background: #0284c7;
      color: white;
      border: 0;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    }
    button:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Bitty Box App</h1>
    <p>Zero-server micro-web capsule running purely from browser memory.</p>
    <button onclick="alert('Hello from Bitty Box!')">Click Me</button>
  </div>
</body>
</html>`
  },
  {
    id: 'snip-tailwind',
    title: 'Tailwind CSS CDN',
    icon: '🎨',
    desc: 'Instant Tailwind CSS CDN setup for utility-first styling',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind Bitty Box</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
    <div class="flex items-center space-x-3">
      <span class="text-3xl">📦</span>
      <h1 class="text-xl font-bold text-cyan-400">Tailwind Micro-Site</h1>
    </div>
    <p class="text-slate-400 text-sm">Powered by zero backend infrastructure. Everything is encoded in the URL hash!</p>
    <button class="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20">
      Ready to deploy
    </button>
  </div>
</body>
</html>`
  },
  {
    id: 'snip-matrix',
    title: 'Matrix Digital Rain Canvas',
    icon: '🟢',
    desc: 'Pure HTML5 60fps phosphor matrix rain stream',
    code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Matrix Terminal</title>
  <style>
    body { margin: 0; overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    const c = document.getElementById("c");
    const ctx = c.getContext("2d");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const chars = "0123456789ABCDEFBITTYBOX";
    const fontSize = 14;
    const columns = c.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);
    function draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#00ff66";
      ctx.font = fontSize + "px monospace";
      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    setInterval(draw, 33);
  </script>
</body>
</html>`
  }
];

export const TemplatesSidePanel: React.FC<TemplatesSidePanelProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentContentLength = 0,
  sessions = [],
  currentSessionId,
  onSwitchSession,
  onNewSession,
  mode = 'pro',
  isPro = true,
  onOpenPaywall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [previewTemplate, setPreviewTemplate] = useState<TemplatePreset | null>(null);
  const [confirmReplaceId, setConfirmReplaceId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    TEMPLATE_PRESETS.forEach(t => set.add(t.category));
    return ['All', ...Array.from(set)];
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return TEMPLATE_PRESETS.filter(tpl => {
      const matchCat = activeCategory === 'All' || tpl.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.title.toLowerCase().includes(q) ||
        (tpl.tags && tpl.tags.some(t => t.toLowerCase().includes(q)));
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const handleApply = (tpl: TemplatePreset) => {
    if (mode === 'simple' && !isPro) {
      if (onOpenPaywall) {
        onOpenPaywall('Template Gallery Lab');
      }
      return;
    }

    if (currentContentLength > 200 && confirmReplaceId !== tpl.id) {
      setConfirmReplaceId(tpl.id);
      return;
    }

    onSelectTemplate(tpl);
    setConfirmReplaceId(null);
    setPreviewTemplate(null);
    onClose();
  };

  const handleApplySnippet = (snippet: typeof QUICK_SNIPPETS[0]) => {
    const customTpl: TemplatePreset = {
      id: snippet.id,
      name: snippet.title,
      category: 'Starters',
      description: snippet.desc,
      icon: 'FileCode',
      title: snippet.title,
      docDescription: snippet.desc,
      favicon: snippet.icon,
      type: 'html',
      tags: ['Starter', 'Boilerplate'],
      content: snippet.code,
    };
    handleApply(customTpl);
  };

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Briefcase': return <Briefcase className="w-5 h-5 text-cyan-400" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5 text-purple-400" />;
      case 'LayoutDashboard': return <LayoutDashboard className="w-5 h-5 text-teal-400" />;
      case 'Terminal': return <Terminal className="w-5 h-5 text-emerald-400" />;
      case 'Gamepad2': return <Gamepad2 className="w-5 h-5 text-pink-400" />;
      case 'Shield': return <Shield className="w-5 h-5 text-rose-400" />;
      case 'Utensils': return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'User': return <User className="w-5 h-5 text-blue-400" />;
      default: return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Full Screen Sliding Panel from Left */}
          <motion.div
            initial={{ x: '-100%', opacity: 0.5 }}
            animate={{ x: '0%', opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 w-full max-w-5xl bg-[#060214]/98 border-r border-fuchsia-500/40 shadow-[0_0_50px_rgba(217,70,239,0.3)] flex flex-col z-50 overflow-hidden"
          >
            {/* Ambient Top Glow Beam */}
            <div className="h-1 w-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_15px_#ff00de]" />

            {/* Panel Header */}
            <div className="p-4 sm:p-6 border-b border-purple-500/25 bg-[#09031c]/90 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-950 to-purple-900 border border-fuchsia-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                    <img
                      src={GRIP_ICON_DATA_URL}
                      alt="Grip Icon"
                      className="w-5 h-5 filter invert-[70%] sepia-[80%] saturate-[500%] hue-rotate-[260deg] brightness-[120%]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-cyber font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-200 to-cyan-300">
                        <CyberScrambleText text="TEMPLATES & PRESETS LAB" speed={25} />
                      </h2>
                      <span className="text-[10px] font-mono font-bold bg-fuchsia-950 text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/40">
                        {TEMPLATE_PRESETS.length} PRESETS
                      </span>
                    </div>
                    <p className="text-xs text-purple-300/70 font-mono hidden sm:block">
                      Zero-server micro-web apps living purely in URL fragments.
                    </p>
                  </div>
                </div>

                {/* Dismiss Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-purple-950/70 hover:bg-fuchsia-950 border border-purple-500/40 text-purple-200 hover:text-white transition flex items-center gap-1 text-xs font-mono cursor-pointer"
                    title="Close Templates Panel"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">CLOSE</span>
                    <X className="w-4 h-4 sm:hidden" />
                  </button>
                </div>
              </div>

              {/* Search Bar & Category Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search templates, tags, code keywords..."
                    className="w-full bg-[#05010e] border border-fuchsia-500/40 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-cyan-100 placeholder:text-purple-400/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 cyber-scrollbar">
                  {categories.map(cat => {
                    const isSelected = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)] border border-fuchsia-300'
                            : 'bg-purple-950/50 text-purple-300/80 hover:bg-purple-900/50 hover:text-white border border-purple-500/20'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel Body: Scrollable Grid & Snippets */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 cyber-scrollbar space-y-6">
              {/* Quick Starter Snippets Row */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-cyber font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Instant Boilerplates &amp; Framework Starters
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {QUICK_SNIPPETS.map(snip => (
                    <div
                      key={snip.id}
                      onClick={() => handleApplySnippet(snip)}
                      className="p-3 rounded-xl bg-[#090218] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{snip.icon}</span>
                          <h4 className="font-cyber font-bold text-xs text-cyan-200 group-hover:text-cyan-100">
                            {snip.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-purple-300/70 font-mono line-clamp-2">
                          {snip.desc}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-purple-500/20 text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300">
                        <span>LOAD BOILERPLATE</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Presets Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-cyber font-bold text-fuchsia-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                    Curated Micro-App Presets ({filteredTemplates.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map(tpl => {
                    const isConfirming = confirmReplaceId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        className="group relative rounded-2xl bg-gradient-to-b from-[#0c0424]/90 to-[#070114]/90 border border-fuchsia-500/30 hover:border-cyan-400/70 p-4 transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_25px_rgba(0,242,255,0.2)]"
                      >
                        <div>
                          {/* Card Header: Icon & Category */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-lg">
                                {tpl.favicon || '📦'}
                              </div>
                              <div>
                                <span className="text-[10px] font-mono uppercase text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                                  {tpl.category}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-purple-300/60">
                              ~{(tpl.content.length / 1024).toFixed(1)} KB
                            </span>
                          </div>

                          {/* Title & Description */}
                          <h3 className="font-cyber font-bold text-sm text-cyan-200 group-hover:text-cyan-100 mb-1.5 transition-colors">
                            {tpl.name}
                          </h3>
                          <p className="text-xs text-purple-200/70 font-mono leading-relaxed line-clamp-3 mb-3">
                            {tpl.description}
                          </p>

                          {/* Tags */}
                          {tpl.tags && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {tpl.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300/80 border border-purple-500/20"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-purple-500/20 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(tpl)}
                            className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 hover:text-white transition cursor-pointer"
                            title="Inspect template code"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApply(tpl)}
                            className={`flex-1 py-2 px-3 rounded-xl font-cyber text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                              isConfirming
                                ? 'bg-amber-500 hover:bg-amber-400 text-black font-extrabold animate-pulse'
                                : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                            }`}
                          >
                            {isConfirming ? (
                              <span>CONFIRM OVERWRITE?</span>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>LOAD TEMPLATE</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="py-12 text-center text-purple-300/60 font-mono space-y-2">
                    <p className="text-sm">No templates matched "{searchQuery}" in {activeCategory}.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('All');
                      }}
                      className="px-4 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-cyan-300 text-xs font-mono hover:bg-purple-900"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Source Code Modal Overlay inside Template Hub */}
            {previewTemplate && (
              <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span className="font-cyber font-bold text-sm text-cyan-200">
                      Source Code: {previewTemplate.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApply(previewTemplate)}
                      className="px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-cyber text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      LOAD NOW
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(null)}
                      className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto mt-3 p-3 bg-[#03010a] rounded-xl border border-cyan-500/20 font-mono text-xs text-cyan-200 cyber-scrollbar whitespace-pre">
                  {previewTemplate.content}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
