import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  Code, 
  Eye, 
  Check, 
  ArrowRight, 
  Layers, 
  Briefcase, 
  BookOpen, 
  LayoutDashboard, 
  Terminal, 
  Gamepad2, 
  Shield, 
  Utensils, 
  User, 
  AlertTriangle, 
  FileCode, 
  Zap 
} from 'lucide-react';
import { TemplatePreset } from '../types';
import { TEMPLATE_PRESETS } from '../data/templates';
import { motion, AnimatePresence } from 'motion/react';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplatePreset) => void;
  currentContentLength?: number;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentContentLength = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [previewTemplate, setPreviewTemplate] = useState<TemplatePreset | null>(null);
  const [confirmReplaceId, setConfirmReplaceId] = useState<string | null>(null);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    TEMPLATE_PRESETS.forEach(t => set.add(t.category));
    return ['All', ...Array.from(set)];
  }, []);

  // Filter templates based on category and search query
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
    // If current content is non-trivial, prompt confirmation
    if (currentContentLength > 200 && confirmReplaceId !== tpl.id) {
      setConfirmReplaceId(tpl.id);
      return;
    }

    onSelectTemplate(tpl);
    setConfirmReplaceId(null);
    setPreviewTemplate(null);
    onClose();
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-[#070314] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,242,255,0.25)] flex flex-col overflow-hidden font-sans z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-black/40">
              <div className="flex items-center gap-2.5">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300"
                >
                  <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                </motion.div>
                <div>
                  <h3 className="font-cyber text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>BITTY TEMPLATE LAB &amp; GALLERY</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                      {TEMPLATE_PRESETS.length} PRESETS
                    </span>
                  </h3>
                  <p className="text-xs text-purple-300/70 font-mono">
                    Select a production-ready micro-web architecture to instantly load into your workspace.
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.15, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 text-purple-300 hover:text-white rounded-lg bg-black/50 hover:bg-purple-950/60 border border-purple-500/30 transition cursor-pointer"
                title="Close Gallery (Esc)"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Filter Bar & Search */}
            <div className="p-4 border-b border-cyan-500/15 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Category Tabs with layoutId indicator */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === cat ? 'text-cyan-200 font-bold' : 'text-purple-300/70 hover:text-white'
                    }`}
                  >
                    {activeCategory === cat && (
                      <motion.div
                        layoutId="active-template-tab"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.25)]"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{cat}</span>
                  </motion.button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates, tags, code..."
                  className="w-full bg-[#080214] border border-cyan-500/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-cyan-100 placeholder:text-purple-400/40 focus:outline-none focus:border-cyan-400 font-mono transition-all"
                />
              </div>
            </div>

            {/* Modal Main Body (Grid or Preview Mode) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTemplates.map((tpl, idx) => {
                  const rawBytes = new TextEncoder().encode(tpl.content).length;
                  const isReplacing = confirmReplaceId === tpl.id;

                  return (
                    <motion.div
                      layout
                      key={tpl.id}
                      initial={{ opacity: 0, scale: 0.96, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.25) }}
                      whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.15 } }}
                      className="group flex flex-col justify-between p-4 rounded-xl bg-black/40 hover:bg-purple-950/30 border border-cyan-500/20 hover:border-cyan-400/60 transition-colors shadow-sm hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] relative overflow-hidden"
                    >
                      {/* Corner highlight */}
                      <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-cyan-500/10 to-transparent pointer-events-none" />

                      <div>
                        {/* Top Bar: Icon + Category + Favicon */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-black/60 border border-cyan-500/30 group-hover:border-cyan-400 transition">
                              {getTemplateIcon(tpl.icon)}
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-300">
                              {tpl.category}
                            </span>
                          </div>
                          <span className="text-xl" title="Favicon Emoji">{tpl.favicon || '🚀'}</span>
                        </div>

                        {/* Title & Description */}
                        <h4 className="font-cyber text-sm font-bold text-white group-hover:text-cyan-300 transition mb-1">
                          {tpl.name}
                        </h4>
                        <p className="text-xs text-purple-200/70 font-mono leading-relaxed line-clamp-3 mb-3">
                          {tpl.description}
                        </p>

                        {/* Tags */}
                        {tpl.tags && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {tpl.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/50 border border-cyan-500/20 text-cyan-300/80"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Bar: Metrics & Actions */}
                      <div className="pt-3 border-t border-cyan-500/15 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-purple-300/60">
                          <span>RAW: <strong className="text-cyan-300">{rawBytes} B</strong></span>
                          <span>TYPE: <strong className="text-fuchsia-300 uppercase">{tpl.type}</strong></span>
                        </div>

                        {isReplacing ? (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/60 text-center"
                          >
                            <div className="flex items-center justify-center gap-1 text-[11px] text-rose-200 font-bold mb-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Overwrite Current Content?</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setConfirmReplaceId(null)}
                                className="flex-1 py-1 rounded bg-black/60 border border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleApply(tpl)}
                                className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold font-mono shadow-sm cursor-pointer"
                              >
                                Confirm Load
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setPreviewTemplate(tpl)}
                              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 border border-purple-500/30 hover:border-purple-400 text-purple-300 hover:text-white text-xs font-mono transition cursor-pointer"
                              title="Inspect template source code"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleApply(tpl)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/80 via-purple-600/80 to-fuchsia-600/80 hover:from-cyan-500 hover:to-fuchsia-500 text-white text-xs font-cyber font-bold transition shadow-sm cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 text-cyan-200" />
                              <span>LOAD TEMPLATE</span>
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredTemplates.length === 0 && (
                <div className="col-span-full py-12 text-center text-purple-300/60 font-mono">
                  <Search className="w-8 h-8 text-purple-400/40 mx-auto mb-2" />
                  <p className="text-sm">No templates matched "{searchQuery}" in {activeCategory}.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                    className="mt-3 text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Reset Search Filters
                  </button>
                </div>
              )}
            </div>

            {/* Code Preview Drawer (if user clicks Preview) */}
            <AnimatePresence>
              {previewTemplate && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="absolute inset-0 bg-[#070314]/95 backdrop-blur-md z-20 flex flex-col"
                >
                  <div className="flex items-center justify-between px-6 py-3 border-b border-cyan-500/20 bg-black/60">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      <span className="font-cyber text-sm font-bold text-white">
                        Source Code: {previewTemplate.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApply(previewTemplate)}
                        className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs cursor-pointer"
                      >
                        Load Into Workspace
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPreviewTemplate(null)}
                        className="p-1 rounded text-purple-300 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    <pre className="text-xs font-mono text-cyan-200/90 bg-black/60 p-4 rounded-xl border border-cyan-500/20 leading-relaxed whitespace-pre-wrap">
                      {previewTemplate.content}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
