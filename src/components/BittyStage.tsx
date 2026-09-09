import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StageMode, useStage } from '../stores/stageStore';

// ============================================================
// The "Ether" Transition System
// ============================================================
// Signature Bitty Box Stage Transition:
// Content → soft blur → slight fade → slight contraction
// → near-empty Stage beat (~70ms)
// → incoming content appears through blur → slight expansion → fully sharp
// Total perceived transition: ~470ms (within 350-500ms target)
// GPU-friendly transform, opacity, and filter: blur — no layout thrashing.
// ============================================================

interface EtherTransitionProps {
  mode: StageMode;
  children: React.ReactNode;
}

export function EtherTransition({ mode, children }: EtherTransitionProps) {
  const respectReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Variants conforming directly to the Ether transition specification
  const exitVariants = respectReducedMotion
    ? {
        opacity: 0,
        transition: { duration: 0.12, ease: 'linear' },
      }
    : {
        opacity: 0,
        scale: 0.98,
        y: -4,
        filter: 'blur(8px)',
        transition: {
          duration: 0.18,
          ease: [0.32, 0, 0.67, 0], // subtle clean exit curve
        },
      };

  const enterVariants = respectReducedMotion
    ? {
        opacity: 1,
        transition: { duration: 0.14, ease: 'linear' },
      }
    : {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 0.22,
          delay: 0.07, // Subtle ~70ms near-empty beat before incoming materialization
          ease: [0.22, 1, 0.36, 1], // fluid cubic expansion
        },
      };

  const initialVariants = respectReducedMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        scale: 0.98,
        y: 4,
        filter: 'blur(8px)',
      };

  return (
    <div className="relative w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={initialVariants}
          animate={enterVariants}
          exit={exitVariants}
          className="w-full transform-gpu"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// BittyStage — The Persistent Central Workspace Container
// ============================================================
interface BittyStageProps {
  children: React.ReactNode;
  className?: string;
}

export function BittyStage({ children, className = '' }: BittyStageProps) {
  return (
    <section
      className={`bitty-stage relative w-full max-w-5xl mx-auto rounded-2xl bg-[#07041a]/90 border border-cyan-500/30 p-3 sm:p-5 md:p-6 shadow-[0_0_40px_rgba(0,0,0,0.85),inset_0_0_20px_rgba(0,242,255,0.06)] backdrop-blur-2xl flex flex-col min-h-[480px] transition-all duration-300 ${className}`}
      aria-label="Bitty Stage"
    >
      {/* Precision Corner Accents */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

      {/* Subtle Ambient Radial Glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

      {/* Persistent Stage Content Body */}
      <div className="stage-inner relative z-10 flex-1 flex flex-col w-full">
        {children}
      </div>
    </section>
  );
}
