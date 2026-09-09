import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, FilePlus2, X, Link2 } from 'lucide-react';
import { CyberScrambleText } from './CyberScrambleText';

interface ChainNextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloneCurrent: () => void;
  onStartBlank: () => void;
  currentTitle?: string;
  currentIndex?: number;
  maxPages?: number;
}

export const ChainNextModal: React.FC<ChainNextModalProps> = ({
  isOpen,
  onClose,
  onCloneCurrent,
  onStartBlank,
  currentTitle = 'My Box',
  currentIndex = 0,
  maxPages = 5,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Create the next chained Bitty Box"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onMouseDown={event => event.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-400/45 bg-[#050314]/95 p-5 font-mono text-cyan-100 shadow-[0_0_55px_rgba(0,242,255,0.28),inset_0_0_22px_rgba(217,70,239,0.08)]"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.22),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(0,242,255,0.18),transparent_44%)]" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full border border-cyan-500/30 bg-black/40 p-1.5 text-cyan-300 transition hover:border-fuchsia-400 hover:text-fuchsia-200"
              aria-label="Close chain modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-950/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                <Link2 className="h-3.5 w-3.5 text-cyan-300" />
                <CyberScrambleText text={`CHAIN SLOT ${currentIndex + 2}/${maxPages}`} speed={18} />
              </div>

              <div>
                <h3 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-emerald-200">
                  Create the next Box
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-cyan-200/75">
                  Continue the chain from <span className="font-bold text-cyan-100">{currentTitle || 'My Box'}</span>. Clone the current text/content, or open a fresh empty chamber.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onCloneCurrent}
                  className="group rounded-xl border border-cyan-400/45 bg-cyan-950/30 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-900/40 hover:shadow-[0_0_24px_rgba(0,242,255,0.28)]"
                >
                  <Copy className="mb-3 h-6 w-6 text-cyan-300 transition group-hover:text-white" />
                  <div className="text-sm font-black uppercase tracking-wider text-cyan-100">Clone Current</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-cyan-200/65">Duplicate the current text and page setup into the next Box.</div>
                </button>

                <button
                  type="button"
                  onClick={onStartBlank}
                  className="group rounded-xl border border-fuchsia-400/45 bg-fuchsia-950/25 p-4 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-fuchsia-900/35 hover:shadow-[0_0_24px_rgba(217,70,239,0.28)]"
                >
                  <FilePlus2 className="mb-3 h-6 w-6 text-fuchsia-300 transition group-hover:text-white" />
                  <div className="text-sm font-black uppercase tracking-wider text-fuchsia-100">Start Scratch</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-fuchsia-100/65">Create a clean empty Box for the next beat in the chain.</div>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
