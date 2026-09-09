import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  LogOut, 
  Trash2, 
  Shield, 
  FileCode, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { BittyMetadata } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmCloseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClose: () => void;
  sessionTitle?: string;
  metadata?: BittyMetadata;
  contentLength?: number;
  isEncrypted?: boolean;
  sessionType?: 'viewer' | 'editor';
}

export const ConfirmCloseSessionModal: React.FC<ConfirmCloseSessionModalProps> = ({
  isOpen,
  onClose,
  onConfirmClose,
  sessionTitle = 'Untitled Bitty Box',
  metadata,
  contentLength = 0,
  isEncrypted = false,
  sessionType = 'editor',
}) => {
  // Listen for Escape key to cancel and Enter key to confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="confirm-close-session-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-close-title"
        >
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container with Spring Pop-in */}
          <motion.div 
            id="confirm-close-session-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-lg bg-[#0c0517] border border-amber-500/50 rounded-2xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Glowing Top Warning Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 animate-pulse" />

            {/* Ambient Corner Accents */}
            <div className="bento-corner-accent top-l !border-amber-400" />
            <div className="bento-corner-accent top-r !border-amber-400" />
            <div className="bento-corner-accent bot-l !border-amber-400" />
            <div className="bento-corner-accent bot-r !border-amber-400" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                  className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] flex-shrink-0 animate-pulse"
                >
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40 uppercase font-bold">
                      WARNING // DESTRUCTIVE ACTION
                    </span>
                  </div>
                  <h3 id="confirm-close-title" className="font-cyber text-lg sm:text-xl font-bold text-white tracking-wide mt-1">
                    CLOSE OPENED SESSION?
                  </h3>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.15, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                id="close-session-modal-x-btn"
                onClick={onClose}
                className="p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-purple-900/40 transition cursor-pointer"
                title="Cancel and return to session (Esc)"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Warning Description */}
            <p className="text-xs sm:text-sm text-purple-200/90 font-mono leading-relaxed mb-4">
              Are you sure you want to close this active {sessionType === 'viewer' ? 'transmission viewer' : 'editor'} session?
              {sessionType === 'editor' 
                ? ' Any unsaved changes in the buffer will be discarded, the session draft cache will be purged, and the workspace will be reset.'
                : ' You will exit the active transmission viewer and return to the blank studio workspace.'}
            </p>

            {/* Session Metadata Card */}
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 mb-5 space-y-2">
              <div className="text-[10px] font-cyber text-cyan-300 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>ACTIVE SESSION TARGET</span>
                <span className="text-purple-300/60 font-mono">ID: SESSION-{Math.abs(sessionTitle.length * 41 + 107)}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-black/60 border border-cyan-500/40 flex items-center justify-center text-base flex-shrink-0">
                  {metadata?.favicon || '📦'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-cyber font-bold text-xs sm:text-sm text-cyan-100 truncate">
                    {sessionTitle || 'Untitled Bitty Box'}
                  </div>
                  {metadata?.description && (
                    <div className="text-[10px] text-purple-300/70 truncate font-mono">
                      {metadata.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-500/20 text-[11px] font-mono text-purple-200/80">
                <div className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{contentLength.toLocaleString()} chars</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isEncrypted ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span className="text-fuchsia-300 font-bold">AES-256</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-teal-300">Unencrypted</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active</span>
                </div>
              </div>
            </div>

            {/* Action Button Controls */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                id="cancel-close-session-btn"
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:text-white hover:bg-purple-900/50 transition text-xs font-mono font-bold tracking-wide cursor-pointer"
              >
                KEEP SESSION OPEN
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 25px rgba(244,63,94,0.7)" }}
                whileTap={{ scale: 0.96 }}
                id="confirm-close-session-btn"
                type="button"
                onClick={() => {
                  onConfirmClose();
                  onClose();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 text-white font-cyber text-xs font-bold tracking-wider shadow-[0_0_20px_rgba(244,63,94,0.4)] transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>CONFIRM &amp; CLOSE SESSION</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
