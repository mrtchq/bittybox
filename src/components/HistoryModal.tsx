import React, { useState } from 'react';
import { Search, Trash2, ExternalLink, Copy, Check, Shield, Box, ArrowRight, Sparkles } from 'lucide-react';
import { BittyHistoryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryModalProps {
  history: BittyHistoryItem[];
  onSelect: (item: BittyHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  history,
  onSelect,
  onDelete,
  onClearAll,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = history.filter(item => {
    const query = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.type && item.type.toLowerCase().includes(query))
    );
  });

  const handleCopy = (e: React.MouseEvent, item: BittyHistoryItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bento-card p-6 sm:p-8 relative"
      >
        <div className="bento-corner-accent top-l" />
        <div className="bento-corner-accent top-r" />
        <div className="bento-corner-accent bot-l" />
        <div className="bento-corner-accent bot-r" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-purple-500/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-cyber text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-fuchsia-400">
                QUANTUM VAULT
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-fuchsia-300">
                {history.length} ARCHIVES
              </span>
            </div>
            <p className="text-xs text-purple-200/70 font-mono mt-1">
              Locally persisted Bitty Box transmissions stored securely in browser cache.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClearAll}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/40 transition font-mono cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>PURGE ALL</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative my-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search archive titles, tags, descriptions..."
            className="w-full bg-[#080212]/90 border border-cyan-500/30 rounded-xl pl-10 pr-4 py-3 text-sm text-cyan-100 placeholder:text-purple-300/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition-all"
          />
        </div>

        {/* List of items */}
        {filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 px-4 bg-purple-950/20 border border-purple-500/20 rounded-xl"
          >
            <Box className="w-12 h-12 text-cyan-400/40 mx-auto mb-3 animate-pulse" />
            <h4 className="font-cyber text-sm text-cyan-200 mb-1">NO ARCHIVES FOUND</h4>
            <p className="text-xs text-purple-300/60 font-mono">
              {search ? 'Try adjusting your search query.' : 'Generate or visit a Bitty Box to store it in your Vault.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 cyber-scrollbar max-h-[60vh] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, idx) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 15, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -30, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                  whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.15 } }}
                  onClick={() => onSelect(item)}
                  className="group relative p-4 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.favicon ? (
                          <span className="text-lg flex-shrink-0">{item.favicon}</span>
                        ) : (
                          <Box className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        )}
                        <h4 className="font-cyber text-sm font-bold text-cyan-100 group-hover:text-cyan-300 truncate transition">
                          {item.title || 'Untitled Bitty Box'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.encrypted && (
                          <span title="AES-256 Encrypted">
                            <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
                          </span>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={e => handleCopy(e, item)}
                          title="Copy URL"
                          className="p-1 rounded text-purple-300 hover:text-white hover:bg-purple-800/50 transition cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-teal-300" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15, color: "#f43f5e" }}
                          whileTap={{ scale: 0.9 }}
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(item.id);
                          }}
                          title="Delete from history"
                          className="p-1 rounded text-purple-400/60 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-purple-200/60 line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-purple-500/10 text-[11px] font-mono text-purple-300/60">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-300 font-bold">{item.compressedSize} B</span>
                      <span>&bull;</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-1 transition-transform font-cyber text-[10px]">
                      <span>LAUNCH</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};
