import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  ArrowRight,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Code2,
  Boxes,
  Cpu,
  Layers,
  Link2,
  Lock,
  CheckCircle2,
  Terminal,
  Globe,
  Radio,
  FileCode,
  Binary
} from 'lucide-react';
import { CyberScrambleText } from './CyberScrambleText';
import { LegalModal, LegalTab } from './LegalModal';

interface AnimatedSplashProps {
  onComplete: () => void;
}

interface CreationStage {
  id: number;
  phaseCode: string;
  tag: string;
  title: string;
  headline: string;
  description: string;
  accentColor: 'cyan' | 'fuchsia' | 'emerald' | 'amber';
  metricLabel: string;
  metricValue: string;
  compressionRatio: string;
  badge: string;
  icon: React.ReactNode;
}

const STAGES: CreationStage[] = [
  {
    id: 0,
    phaseCode: 'PHASE 01 // READING YOUR CODE',
    tag: 'GRAB CODE',
    title: 'READING YOUR WEBPAGE & STYLES',
    headline: 'Collecting your HTML, CSS, JavaScript, and text',
    description: 'Built for autonomous AI agents and human creators alike. We take your webpage text, styles, and scripts and prepare them right inside the browser with zero external server dependencies.',
    accentColor: 'cyan',
    metricLabel: 'ORIGINAL SIZE',
    metricValue: '64.8 KB // 100% SIZE',
    compressionRatio: 'READY TO SHRINK',
    badge: 'STEP 1 : READ',
    icon: <Code2 className="w-5 h-5 text-cyan-300" />,
  },
  {
    id: 1,
    phaseCode: 'PHASE 02 // SHRINKING DATA',
    tag: 'ZIP IT DOWN',
    title: 'SQUEEZING YOUR CODE DOWN',
    headline: 'Super-fast compression right in your browser',
    description: 'Your webpage code is zipped and shrunk down by up to 95%, making it tiny enough to fit directly inside a shareable web link.',
    accentColor: 'fuchsia',
    metricLabel: 'SHRUNK SIZE',
    metricValue: '3.8 KB // 95% SMALLER',
    compressionRatio: '94.2% SPACE SAVED',
    badge: 'STEP 2 : SHRINK',
    icon: <Cpu className="w-5 h-5 text-fuchsia-300" />,
  },
  {
    id: 2,
    phaseCode: 'PHASE 03 // PACKAGING',
    tag: 'PACK & PROTECT',
    title: 'PACKING INTO A MINI-CONTAINER',
    headline: 'Wrapping your page with optional locks and timers',
    description: 'Your shrunken webpage is bundled into an all-in-one package. You can optionally add a PIN code, a timer, or a view limit so only the right people can see it.',
    accentColor: 'amber',
    metricLabel: 'SECURITY & LOCKS',
    metricValue: 'OPTIONAL PIN & TIMER',
    compressionRatio: '100% ALL-IN-ONE',
    badge: 'STEP 3 : PACKAGE',
    icon: <Boxes className="w-5 h-5 text-amber-300" />,
  },
  {
    id: 3,
    phaseCode: 'PHASE 04 // READY TO SHARE',
    tag: 'WEB LINK READY',
    title: 'STORED ENTIRELY INSIDE THE LINK',
    headline: 'A full website that lives directly in the URL',
    description: 'Your entire webpage is now stored right inside the web link. Send it to anyone—it runs instantly in their browser with no web server, hosting, or database needed.',
    accentColor: 'emerald',
    metricLabel: 'LINK ADDRESS',
    metricValue: 'bittybox.org/#H4sIAAAA...',
    compressionRatio: 'NO SERVER NEEDED',
    badge: 'STEP 4 : READY',
    icon: <Link2 className="w-5 h-5 text-emerald-300" />,
  },
];

// Sample code tokens floating into the vortex during Phase 0 & 1
const FLOATING_CODE_TOKENS = [
  { text: '<!DOCTYPE html>', top: '14%', left: '12%', color: 'text-cyan-400' },
  { text: '<canvas id="gl">', top: '22%', right: '14%', color: 'text-fuchsia-400' },
  { text: 'deflate(payload)', top: '68%', left: '10%', color: 'text-amber-400' },
  { text: 'AES256.GCM_SEAL()', top: '74%', right: '12%', color: 'text-emerald-400' },
  { text: '01011001 01101111', top: '38%', left: '6%', color: 'text-cyan-300/70' },
  { text: 'const bitty = create()', top: '34%', right: '8%', color: 'text-purple-300' },
  { text: 'box.mount(#root)', top: '82%', left: '32%', color: 'text-teal-300' },
  { text: '100% IN-BROWSER', top: '16%', left: '44%', color: 'text-cyan-300 font-bold' },
];

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onComplete }) => {
  const [stageIndex, setStageIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('bitty_splash_sound');
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });
  const [isWarping, setIsWarping] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [mouseTilt, setMouseTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const stageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnimRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentStage = STAGES[stageIndex] || STAGES[0];

  const stageScale = useMemo(() => {
    const { width, height } = viewportSize;

    if (width < 640) {
      // Mobile: scale gracefully based on available vertical space so HUD card & footer are cleanly in view
      return Math.min(0.82, Math.max(0.58, (height - 120) / 760));
    }

    if (width < 1024) {
      // Tablet: dynamic scaling with safe limits
      return Math.min(0.88, Math.max(0.62, (height - 130) / 780));
    }

    // Desktop: smoothly zoom out so the complete 3D matrix and HUD card fit without scrolling or bottom clipping
    return Math.min(0.92, Math.max(0.68, (height - 140) / 760));
  }, [viewportSize]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  // ---------------------------------------------------------------------------
  // Web Audio Synthesizer (Synthesized Sci-Fi SFX, Zero External Assets)
  // ---------------------------------------------------------------------------
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, gainVal = 0.04, freqEnd?: number) => {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [soundEnabled, initAudio]);

  const playStageSound = useCallback((stage: number) => {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      if (stage === 0) {
        // High-tech Ingest Arpeggio
        [587.33, 739.99, 880.0, 1174.66].forEach((f, i) => {
          setTimeout(() => playTone(f, 'sine', 0.12, 0.03), i * 55);
        });
      } else if (stage === 1) {
        // Compression Resonance Sweep
        playTone(520, 'sawtooth', 0.45, 0.04, 130);
        setTimeout(() => playTone(260, 'sine', 0.35, 0.05, 90), 120);
      } else if (stage === 2) {
        // Isometric Lock & Forge Snap
        playTone(880, 'triangle', 0.18, 0.05, 440);
        setTimeout(() => playTone(1320, 'sine', 0.25, 0.06), 80);
        setTimeout(() => playTone(440, 'square', 0.1, 0.03), 160);
      } else if (stage === 3) {
        // Crystalline Creation Chord (C Major 9th Shimmer)
        const chord = [523.25, 659.25, 783.99, 987.77, 1174.66];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.025, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + 1.3);
        });
      }
    } catch {}
  }, [soundEnabled, initAudio, playTone]);

  const playWarpSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Sub-bass drop + high whoosh
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(260, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.9);
      subGain.gain.setValueAtTime(0.18, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.9);

      const highOsc = ctx.createOscillator();
      const highGain = ctx.createGain();
      highOsc.type = 'sine';
      highOsc.frequency.setValueAtTime(440, now);
      highOsc.frequency.exponentialRampToValueAtTime(1760, now + 0.7);
      highGain.gain.setValueAtTime(0.05, now);
      highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      highOsc.connect(highGain);
      highGain.connect(ctx.destination);
      highOsc.start(now);
      highOsc.stop(now + 0.7);
    } catch {}
  }, [soundEnabled, initAudio]);

  const toggleSound = useCallback(() => {
    initAudio();
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('bitty_splash_sound', String(next));
      } catch {}
      if (next) {
        playTone(880, 'sine', 0.15, 0.04);
      }
      return next;
    });
  }, [initAudio, playTone]);

  // ---------------------------------------------------------------------------
  // Launch into Live Studio
  // ---------------------------------------------------------------------------
  const handleLaunchApp = useCallback(() => {
    if (isExiting || isWarping) return;
    playWarpSound();
    setIsWarping(true);
    setIsPaused(true);

    setTimeout(() => {
      setIsExiting(true);
      onComplete();
    }, 280);
  }, [isExiting, isWarping, onComplete, playWarpSound]);

  // ---------------------------------------------------------------------------
  // Progression Logic (Cycles smoothly through stages, NEVER auto-exits without user click)
  // ---------------------------------------------------------------------------
  const STAGE_DURATION_MS = 3000;

  useEffect(() => {
    if (isPaused || isWarping || isExiting) return;

    const interval = setInterval(() => {
      setStageIndex(prev => {
        const next = (prev + 1) % STAGES.length;
        playStageSound(next);
        setProgress(((next + 1) / STAGES.length) * 100);
        return next;
      });
    }, STAGE_DURATION_MS);

    return () => clearInterval(interval);
  }, [isPaused, isWarping, isExiting, playStageSound]);

  // Initial stage sound on mount
  useEffect(() => {
    playStageSound(0);
  }, [playStageSound]);

  // Keyboard shortcut listener (Space/Enter/Esc to launch or pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleLaunchApp();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setProgress(0);
        setStageIndex(0);
        setIsPaused(false);
        playStageSound(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLaunchApp, playStageSound]);

  // Mouse Parallax movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 20; // -10 to +10 deg
    const y = (clientY / innerHeight - 0.5) * -20; // -10 to +10 deg
    setMouseTilt({ x, y });
  }, []);

  // Jump directly to a stage
  const jumpToStage = useCallback((index: number) => {
    setStageIndex(index);
    setProgress((index / STAGES.length) * 100);
    playStageSound(index);
  }, [playStageSound]);



  return (
    <div
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 overflow-hidden bg-[#03020e] text-cyan-100 flex flex-col justify-between select-none h-[100dvh] transition-all duration-300 ${
        isWarping ? 'scale-105 opacity-0 blur-lg filter' : 'opacity-100'
      }`}
    >
      {/* Parallax Starfield Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div id="stars" />
        <div id="stars2" />
        <div id="stars3" />
      </div>

      {/* Floating Syntax Atoms Orbiting in Phase 0 & Phase 1 */}
      <div className="absolute inset-0 pointer-events-none z-2 overflow-hidden">
        <AnimatePresence>
          {(stageIndex === 0 || stageIndex === 1) && (
            <>
              {FLOATING_CODE_TOKENS.map((token, idx) => (
                <motion.div
                  key={token.text}
                  initial={{ opacity: 0, scale: 0.6, y: 30 }}
                  animate={{
                    opacity: [0, 0.85, 0.4, 0.85],
                    scale: [0.8, 1.05, 0.95],
                    y: [0, -12, 0],
                  }}
                  exit={{ opacity: 0, scale: 0.2, y: -40, filter: 'blur(8px)' }}
                  transition={{
                    duration: 3 + idx * 0.4,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: idx * 0.12,
                  }}
                  style={{
                    position: 'absolute',
                    top: token.top,
                    left: token.left,
                    right: token.right,
                  }}
                  className={`font-mono text-xs px-2.5 py-1 rounded-md bg-black/60 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(0,242,255,0.2)] hidden sm:block ${token.color}`}
                >
                  <span className="opacity-40 mr-1.5">&gt;</span>
                  {token.text}
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          HEADER: HUD STATUS BAR & QUICK CONTROLS
          ─────────────────────────────────────────────────────────────────────── */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-3 flex items-center justify-between border-b border-cyan-500/20 bg-[#050314]/80 backdrop-blur-xl shrink-0">
        {/* Brand identity & live status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-950/90 border border-cyan-400/60 shadow-[0_0_18px_rgba(0,242,255,0.4)] overflow-hidden p-1">
            <img
              src="/bittybox.png"
              onError={(e) => {
                // Fallback to svg icon if custom logo png not loaded
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              alt="Bitty Box"
              className="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(0,242,255,0.8)]"
            />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div>
            <div className="text-xs font-mono font-black tracking-widest text-cyan-200 flex items-center gap-2">
              <span>BITTY BOX</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
                GENESIS v3.8
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-cyan-400/70 tracking-wider">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>MAKING WEBPAGES THAT LIVE INSIDE LINKS</span>
            </div>
          </div>
        </div>

        {/* Real-Time Phase Scramble Badge */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs px-3 py-1 rounded-full bg-black/60 border border-cyan-500/30 text-cyan-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <CyberScrambleText text={currentStage.phaseCode} speed={18} />
        </div>

        {/* Audio FX Toggle & Fast Skip Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.25)] hover:bg-cyan-900/60'
                : 'bg-black/50 border-cyan-500/20 text-cyan-600 hover:text-cyan-400'
            }`}
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Web Audio SFX'}
            aria-label="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsPaused(prev => !prev)}
            className="p-2 rounded-xl bg-black/50 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 transition-all cursor-pointer hidden sm:flex items-center justify-center"
            title={isPaused ? 'Resume Animation' : 'Pause Animation'}
            aria-label={isPaused ? 'Resume Animation' : 'Pause Animation'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={handleLaunchApp}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/30 via-teal-500/40 to-emerald-500/30 border border-cyan-400/80 hover:border-cyan-300 text-cyan-100 hover:text-white font-cyber font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer group"
          >
            <span>ENTER BITTY BOX</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────────
          MAIN STAGE: 3D HOLOGRAPHIC ISOMETRIC BITTY BOX CREATION MATRIX
          ─────────────────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-1 max-w-7xl mx-auto w-full min-h-0 overflow-hidden">
        
        {/* Holographic 3D Viewport */}
        <div
          className="relative w-full flex-1 flex flex-col items-center justify-center [perspective:1200px] origin-center"
          style={{
            transform: `scale(${stageScale}) rotateX(${mouseTilt.y * 0.4}deg) rotateY(${mouseTilt.x * 0.4}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Ambient Glow Aura */}
          <div
            className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-[90px] pointer-events-none transition-all duration-700 opacity-30 ${
              stageIndex === 0
                ? 'bg-cyan-500'
                : stageIndex === 1
                ? 'bg-fuchsia-500 scale-110'
                : stageIndex === 2
                ? 'bg-amber-500 scale-120'
                : 'bg-emerald-500 scale-125'
            }`}
          />

          {/* -----------------------------------------------------------------
              ISOMETRIC 3D CUBE SYSTEM (Pure CSS 3D Transforms)
              ----------------------------------------------------------------- */}
          <div className="relative w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72 flex items-center justify-center my-0.5 sm:my-1">
            
            {/* Holographic Gyroscope Orbit Rings (Spinning around the cube) */}
            <div
              className={`absolute inset-0 rounded-full border border-cyan-400/40 pointer-events-none transition-all duration-700 ${
                stageIndex >= 1 ? 'animate-[spin_4s_linear_infinite] scale-125 border-fuchsia-400/60 shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'scale-90 opacity-40'
              }`}
              style={{ transformStyle: 'preserve-3d', transform: 'rotateX(65deg) rotateY(20deg)' }}
            />
            <div
              className={`absolute inset-0 rounded-full border border-teal-400/40 pointer-events-none transition-all duration-700 ${
                stageIndex >= 1 ? 'animate-[spin_6s_linear_infinite_reverse] scale-140 border-cyan-400/50' : 'scale-95 opacity-30'
              }`}
              style={{ transformStyle: 'preserve-3d', transform: 'rotateX(-45deg) rotateY(45deg)' }}
            />
            {stageIndex >= 2 && (
              <div
                className="absolute inset-0 rounded-full border-2 border-emerald-400/60 pointer-events-none animate-[spin_8s_linear_infinite] scale-150 shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                style={{ transformStyle: 'preserve-3d', transform: 'rotateX(75deg)' }}
              />
            )}

            {/* The 3D Cube Container */}
            <motion.div
              className="relative w-32 h-32 sm:w-44 sm:h-44 lg:w-48 lg:h-48 [transform-style:preserve-3d] cursor-pointer"
              animate={{
                rotateX: stageIndex === 0 ? [-15, -25, -15] : stageIndex === 1 ? [-20, 20, -20] : [-18, -24, -18],
                rotateY: stageIndex === 0 ? [25, 45, 25] : stageIndex === 1 ? [0, 360] : [35, 395],
                scale: stageIndex === 0 ? 0.92 : stageIndex === 1 ? 0.85 : stageIndex === 2 ? 1.05 : 1.15,
              }}
              transition={{
                rotateX: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                rotateY: {
                  duration: stageIndex === 1 ? 3 : 8,
                  repeat: Infinity,
                  ease: stageIndex === 1 ? 'linear' : 'linear',
                },
                scale: { duration: 0.6, ease: 'easeOut' },
              }}
            >
              {/* Internal Quantum Pulsing Core */}
              <div className="absolute inset-0 m-auto w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-emerald-400 blur-[6px] animate-pulse opacity-80" />

              {/* Cube Facet 1: FRONT */}
              <div
                className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center p-2 backdrop-blur-md transition-all duration-700 ${
                  stageIndex === 0
                    ? 'bg-cyan-950/40 border-cyan-400/50 [transform:translateZ(90px)] opacity-60'
                    : stageIndex === 1
                    ? 'bg-fuchsia-950/60 border-fuchsia-400/80 [transform:translateZ(70px)] shadow-[0_0_20px_rgba(217,70,239,0.5)]'
                    : stageIndex === 2
                    ? 'bg-amber-950/70 border-amber-400 [transform:translateZ(56px)] shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                    : 'bg-emerald-950/80 border-emerald-300 [transform:translateZ(56px)] shadow-[0_0_30px_rgba(16,185,129,0.7)]'
                }`}
              >
                <div className="w-full flex items-center justify-between text-[8px] font-mono text-cyan-300/70 mb-1">
                  <span>BITTY</span>
                  <span>#01</span>
                </div>
                <Boxes className={`w-8 h-8 ${stageIndex === 3 ? 'text-emerald-300 animate-bounce' : 'text-cyan-300'}`} />
                <span className="text-[9px] font-mono font-bold mt-1 tracking-wider text-cyan-200">
                  {stageIndex === 3 ? 'SEALED' : 'HTML5'}
                </span>
                {/* Cyber Corner Brackets */}
                <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-300" />
                <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-cyan-300" />
                <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-300" />
                <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-300" />
              </div>

              {/* Cube Facet 2: BACK */}
              <div
                className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center p-2 backdrop-blur-md transition-all duration-700 ${
                  stageIndex === 0
                    ? 'bg-cyan-950/40 border-cyan-400/50 [transform:translateZ(-90px)_rotateY(180deg)] opacity-60'
                    : stageIndex === 1
                    ? 'bg-fuchsia-950/60 border-fuchsia-400/80 [transform:translateZ(-70px)_rotateY(180deg)]'
                    : stageIndex === 2
                    ? 'bg-amber-950/70 border-amber-400 [transform:translateZ(-56px)_rotateY(180deg)]'
                    : 'bg-emerald-950/80 border-emerald-300 [transform:translateZ(-56px)_rotateY(180deg)]'
                }`}
              >
                <Binary className="w-7 h-7 text-cyan-400/80" />
                <span className="text-[8px] font-mono text-cyan-300 mt-1">LZ_DEFLATE</span>
              </div>

              {/* Cube Facet 3: RIGHT */}
              <div
                className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center p-2 backdrop-blur-md transition-all duration-700 ${
                  stageIndex === 0
                    ? 'bg-cyan-950/40 border-cyan-400/50 [transform:translateX(90px)_rotateY(90deg)] opacity-60'
                    : stageIndex === 1
                    ? 'bg-fuchsia-950/60 border-fuchsia-400/80 [transform:translateX(70px)_rotateY(90deg)]'
                    : stageIndex === 2
                    ? 'bg-amber-950/70 border-amber-400 [transform:translateX(56px)_rotateY(90deg)]'
                    : 'bg-emerald-950/80 border-emerald-300 [transform:translateX(56px)_rotateY(90deg)]'
                }`}
              >
                <Lock className="w-7 h-7 text-amber-300" />
                <span className="text-[8px] font-mono text-amber-200 mt-1">AES-256</span>
              </div>

              {/* Cube Facet 4: LEFT */}
              <div
                className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center p-2 backdrop-blur-md transition-all duration-700 ${
                  stageIndex === 0
                    ? 'bg-cyan-950/40 border-cyan-400/50 [transform:translateX(-90px)_rotateY(-90deg)] opacity-60'
                    : stageIndex === 1
                    ? 'bg-fuchsia-950/60 border-fuchsia-400/80 [transform:translateX(-70px)_rotateY(-90deg)]'
                    : stageIndex === 2
                    ? 'bg-amber-950/70 border-amber-400 [transform:translateX(-56px)_rotateY(-90deg)]'
                    : 'bg-emerald-950/80 border-emerald-300 [transform:translateX(-56px)_rotateY(-90deg)]'
                }`}
              >
                <Cpu className="w-7 h-7 text-fuchsia-300" />
                <span className="text-[8px] font-mono text-fuchsia-200 mt-1">SANDBOX</span>
              </div>

              {/* Cube Facet 5: TOP */}
              <div
                className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center p-2 backdrop-blur-md transition-all duration-700 ${
                  stageIndex === 0
                    ? 'bg-cyan-950/40 border-cyan-400/50 [transform:translateY(-90px)_rotateX(90deg)] opacity-60'
                    : stageIndex === 1
                    ? 'bg-fuchsia-950/60 border-fuchsia-400/80 [transform:translateY(-70px)_rotateX(90deg)]'
                    : stageIndex === 2
                    ? 'bg-amber-950/70 border-amber-400 [transform:translateY(-56px)_rotateX(90deg)]'
                    : 'bg-emerald-950/80 border-emerald-300 [transform:translateY(-56px)_rotateX(90deg)]'
                }`}
              >
                <Sparkles className="w-6 h-6 text-cyan-300 animate-spin" />
              </div>

              {/* Cube Facet 6: BOTTOM */}
              <div
                className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center p-2 backdrop-blur-md transition-all duration-700 ${
                  stageIndex === 0
                    ? 'bg-cyan-950/40 border-cyan-400/50 [transform:translateY(90px)_rotateX(-90deg)] opacity-60'
                    : stageIndex === 1
                    ? 'bg-fuchsia-950/60 border-fuchsia-400/80 [transform:translateY(70px)_rotateX(-90deg)]'
                    : stageIndex === 2
                    ? 'bg-amber-950/70 border-amber-400 [transform:translateY(56px)_rotateX(-90deg)]'
                    : 'bg-emerald-950/80 border-emerald-300 [transform:translateY(56px)_rotateX(-90deg)]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-cyan-400/30 blur-sm" />
              </div>
            </motion.div>
          </div>

          {/* -----------------------------------------------------------------
              STAGE 04: URL CAPSULE CRYSTALLIZATION PILL
              ----------------------------------------------------------------- */}
          <AnimatePresence>
            {stageIndex === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-full max-w-lg mx-auto bg-[#07051a]/90 border border-emerald-400/80 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_35px_rgba(16,185,129,0.35)] backdrop-blur-2xl my-1.5 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1 text-emerald-300 font-mono text-[11px] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>YOUR WEB LINK IS READY TO SHARE</span>
                </div>
                <div className="font-mono text-xs sm:text-sm text-cyan-200 bg-black/70 border border-cyan-500/40 px-3 py-1.5 rounded-xl break-all select-all flex items-center justify-center gap-2 shadow-inner">
                  <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-emerald-300">bittybox.org/#</span>
                  <CyberScrambleText text="H4sIAAAAAAAA31WwW7bMAy991cI3Iptx86y9QDAy0bA" speed={15} />
                </div>
                <div className="flex items-center justify-center gap-3 mt-2 text-[10px] font-mono text-cyan-300/80">
                  <span>✓ Runs in Any Browser</span>
                  <span>•</span>
                  <span>✓ No Server or Database</span>
                  <span>•</span>
                  <span>✓ Stored in the Link</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* -----------------------------------------------------------------
              STAGE HUD CARD (Description & Real-Time Metrics)
              ----------------------------------------------------------------- */}
          <div className="w-full max-w-2xl bg-[#08051e]/85 border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_35px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(0,242,255,0.06)] backdrop-blur-2xl relative my-0.5 sm:my-1">
            {/* Cyber Corner Accents */}
            <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
            <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400/40">
                  {currentStage.icon}
                </div>
                <div>
                  <h3 className="font-cyber font-bold text-xs sm:text-sm text-cyan-100 tracking-wider">
                    {currentStage.title}
                  </h3>
                  <p className="text-[10px] font-mono text-cyan-400/70">
                    {currentStage.headline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    currentStage.accentColor === 'cyan'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                      : currentStage.accentColor === 'fuchsia'
                      ? 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500/40'
                      : currentStage.accentColor === 'amber'
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {currentStage.badge}
                </span>
              </div>
            </div>

            <p className="text-xs font-sans text-cyan-200/85 leading-relaxed mb-2.5">
              {currentStage.description}
            </p>

            {/* Real-time Telemetry Metrics Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="bg-black/50 border border-cyan-500/20 rounded-lg p-2 flex flex-col">
                <span className="text-[9px] text-cyan-400/60">PAYLOAD SIZE</span>
                <span className="text-cyan-200 font-bold mt-0.5">{currentStage.metricValue}</span>
              </div>
              <div className="bg-black/50 border border-cyan-500/20 rounded-lg p-2 flex flex-col">
                <span className="text-[9px] text-cyan-400/60">SPACE SAVED</span>
                <span className="text-emerald-300 font-bold mt-0.5">{currentStage.compressionRatio}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-black/50 border border-cyan-500/20 rounded-lg p-2 flex flex-col">
                <span className="text-[9px] text-cyan-400/60">WHERE IT RUNS</span>
                <span className="text-cyan-300 font-bold mt-0.5">100% IN YOUR BROWSER</span>
              </div>
            </div>

            {/* Primary Action Button to Advance */}
            <div className="mt-2.5 pt-2 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-[11px] font-mono text-cyan-300/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>No servers or databases &bull; Private & secure in your browser</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleLaunchApp}
                className="w-full sm:w-auto px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 text-black font-cyber font-bold text-xs tracking-wider shadow-[0_0_25px_rgba(0,242,255,0.5)] hover:shadow-[0_0_35px_rgba(0,242,255,0.7)] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>ENTER BITTY BOX</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────────────────
          FOOTER: 4-STAGE INTERACTIVE PROGRESSION TIMELINE
          ─────────────────────────────────────────────────────────────────────── */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-2.5 sm:py-3 border-t border-cyan-500/20 bg-[#050314]/90 backdrop-blur-xl shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          
          {/* Segmented Timeline Steps */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 items-center">
            {STAGES.map((stg, idx) => {
              const isActive = stageIndex === idx;
              const isPast = stageIndex > idx;

              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => jumpToStage(idx)}
                  className={`group relative text-left p-1.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer font-mono ${
                    isActive
                      ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]'
                      : isPast
                      ? 'bg-black/40 border-cyan-500/40 text-cyan-300 hover:border-cyan-400/60'
                      : 'bg-black/20 border-cyan-500/10 text-cyan-600 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[9px] sm:text-[10px] font-bold ${isActive ? 'text-cyan-300' : isPast ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      0{idx + 1}
                    </span>
                    {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                  </div>
                  <div className={`text-[10px] sm:text-xs font-cyber font-bold truncate ${isActive ? 'text-white' : 'text-cyan-400/80'}`}>
                    {stg.tag}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Continuous Progress Bar & Status */}
          <div className="flex items-center justify-between gap-3 pt-1 text-[10px] font-mono text-cyan-400/70">
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold">{Math.round(progress)}%</span>
              <span className="hidden sm:inline">LOADING PROGRESS</span>
            </div>

            {/* Glowing Fill Bar */}
            <div className="flex-1 h-1.5 rounded-full bg-black/60 border border-cyan-500/30 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 rounded-full transition-all duration-100 shadow-[0_0_10px_rgba(0,242,255,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-2.5 text-[10px] text-cyan-400/80 mr-2">
                <button
                  type="button"
                  onClick={() => {
                    setLegalModalTab('terms');
                    setIsLegalModalOpen(true);
                  }}
                  className="hover:text-cyan-200 hover:underline transition-colors cursor-pointer"
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
                  className="hover:text-cyan-200 hover:underline transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span className="text-cyan-500/40 select-none">&bull;</span>
                <a
                  href="mailto:support@bittybox.org"
                  className="hover:text-cyan-200 hover:underline transition-colors cursor-pointer"
                >
                  Contact Us
                </a>
              </div>
              <span className="hidden md:inline text-cyan-400/50">PRESS [SPACE] OR CLICK</span>
              <button
                type="button"
                onClick={handleLaunchApp}
                className="text-cyan-300 hover:text-white font-bold underline transition-colors cursor-pointer"
              >
                ENTER BITTY BOX →
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Modal (Terms of Service & Privacy Policy) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
};
