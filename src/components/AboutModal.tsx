import React, { useState } from 'react';
import { Box, Zap, Shield, Globe, Cpu, Lock, Link as LinkIcon, FileCode, CheckCircle2, Compass, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { LegalModal, LegalTab } from './LegalModal';

interface AboutModalProps {
  onClose?: () => void;
  onOpenEditor?: () => void;
  onStartTour?: () => void;
  onReplaySplash?: () => void;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 15 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
};

export const AboutModal: React.FC<AboutModalProps> = ({ onOpenEditor, onStartTour, onReplaySplash }) => {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bento-card p-6 sm:p-10 relative"
      >
        <div className="bento-corner-accent top-l" />
        <div className="bento-corner-accent top-r" />
        <div className="bento-corner-accent bot-l" />
        <div className="bento-corner-accent bot-r" />

        {/* Brand Logo & Header Badge */}
        <motion.div variants={itemVariants} className="text-center max-w-2xl mx-auto mb-10 flex flex-col items-center">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: [0, -4, 4, 0] }}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-indigo-600 p-[2px] shadow-[0_0_30px_rgba(0,242,255,0.4)] mb-4 group cursor-pointer"
          >
            <div className="w-full h-full bg-[#090314]/90 rounded-[14px] flex items-center justify-center overflow-hidden p-2">
              <img
                src="/bittybox-logo.png"
                alt="Bitty Box Logo"
                className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(0,242,255,0.8)]"
              />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-2xl blur-md opacity-50 group-hover:opacity-80 transition duration-300 -z-10 animate-pulse" />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-mono mb-4">
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            BUILT FOR AGENTIC WORKFLOWS &bull; ACCESSIBLE TO HUMANS
          </div>
          <h2 className="font-cyber text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-fuchsia-400">
            HOW BITTY BOX OPERATES
          </h2>
          <p className="text-sm text-purple-200/80 mt-3 leading-relaxed">
            Bitty Box is engineered from the ground up for autonomous AI agents and developer toolchains to generate instant, zero-backend webpages and interactive apps—while providing an intuitive studio interface that human creators can easily use.
          </p>
        </motion.div>

        {/* 3 Pillars Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="p-5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col hover:border-cyan-400/40 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-400/40 flex items-center justify-center mb-4 text-cyan-300">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-cyber text-sm font-bold text-cyan-200 mb-2">1. GZIP COMPRESSION</h3>
            <p className="text-xs text-purple-200/70 leading-relaxed font-mono">
              Raw HTML and assets are passed through high-ratio Deflate/Gzip compression algorithms, collapsing code size by up to 80-90%.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="p-5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col hover:border-fuchsia-400/40 hover:shadow-[0_0_20px_rgba(255,0,222,0.2)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-fuchsia-950 border border-fuchsia-400/40 flex items-center justify-center mb-4 text-fuchsia-300">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-cyber text-sm font-bold text-fuchsia-200 mb-2">2. AES-256 CIPHER</h3>
            <p className="text-xs text-purple-200/70 leading-relaxed font-mono">
              Optional cryptographic encryption using client-side Web Crypto AES-GCM ensures only holders of the passcode can inflate the data.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="p-5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col hover:border-teal-400/40 hover:shadow-[0_0_20px_rgba(0,245,212,0.2)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-950 border border-teal-400/40 flex items-center justify-center mb-4 text-teal-300">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-cyber text-sm font-bold text-teal-200 mb-2">3. ZERO-FOOTPRINT URL</h3>
            <p className="text-xs text-purple-200/70 leading-relaxed font-mono">
              The entire application is encoded into the URL hash fragment (<code className="text-cyan-300">#...</code>). Browsers never send the hash to any server.
            </p>
          </motion.div>
        </motion.div>

        {/* Tech Specifications */}
        <motion.div variants={itemVariants} className="bg-[#080212] p-6 rounded-xl border border-cyan-500/30 mb-8">
          <h4 className="font-cyber text-xs uppercase tracking-wider text-cyan-300 mb-4 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            Supported Micro-Payload Architectures
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-purple-200/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Full HTML5 / CSS3 / JavaScript Web Apps</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Schema.org Recipe Cards with Timers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Interactive HTML5 Canvas & 2D Contexts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>MECARD / VCARD Holo Identity Cards</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Executable Bookmarklet Generators</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Raw File Compress & URL Downloader</span>
            </div>
          </div>
        </motion.div>

        {/* Call to action & Tour trigger */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {onReplaySplash && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReplaySplash}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-fuchsia-950/70 border border-fuchsia-400/50 text-fuchsia-200 hover:text-white hover:bg-fuchsia-900/80 font-cyber text-xs tracking-wider transition shadow-sm cursor-pointer"
            >
              <Zap className="w-4 h-4 text-fuchsia-300 animate-pulse" />
              <span>SEE DEMO</span>
            </motion.button>
          )}

          {onStartTour && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartTour}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-950/70 border border-teal-400/50 text-teal-200 hover:text-white hover:bg-purple-900/80 font-cyber text-xs tracking-wider transition shadow-sm cursor-pointer"
            >
              <Compass className="w-4 h-4 text-teal-300 animate-spin-slow" />
              <span>START GUIDED WALKTHROUGH</span>
            </motion.button>
          )}

          {onOpenEditor && (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(0,221,255,0.7)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenEditor}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-cyber text-xs tracking-wider shadow-[0_0_25px_rgba(0,221,255,0.5)] transition cursor-pointer"
            >
              LAUNCH BITTY BOX STUDIO
            </motion.button>
          )}
        </motion.div>

        {/* Legal & Contact Footer */}
        <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-cyan-400/70">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLegalModalTab('terms');
                setIsLegalModalOpen(true);
              }}
              className="hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-cyan-500/40 select-none">&bull;</span>
            <button
              type="button"
              onClick={() => {
                setLegalModalTab('privacy');
                setIsLegalModalOpen(true);
              }}
              className="hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-cyan-500/40 select-none">&bull;</span>
            <a
              href="mailto:support@bittybox.org"
              className="hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
            >
              Contact Us
            </a>
          </div>

          <span className="text-[10px] text-cyan-400/50">
            BITTY BOX AGENT-FIRST PROTOCOL &bull; 100% CLIENT-SIDE
          </span>
        </motion.div>
      </motion.div>

      {/* Legal Modal (Terms of Service & Privacy Policy) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
};
