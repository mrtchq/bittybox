import React from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HoloGenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  isCopied?: boolean;
  byteCount?: number;
  compressedCount?: number;
  label?: string;
  subLabel?: string;
  className?: string;
}

// Pleasant two-note chime synthesized with the Web Audio API (no asset needed).
// Must be called synchronously from a user-gesture handler so audio is allowed.
export function playGenerateChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') void ctx.resume();

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    master.connect(ctx.destination);

    // Two-note rising chime: E5 -> B5 with soft sine partials
    const notes: Array<{ freq: number; startOffset: number; peak: number }> = [
      { freq: 659.25, startOffset: 0.0, peak: 0.9 },  // E5
      { freq: 987.77, startOffset: 0.12, peak: 1.0 }, // B5
    ];
    for (const n of notes) {
      const t0 = ctx.currentTime + n.startOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(n.peak * 0.5, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + 1.0);

      // Soft shimmer overtone one octave up, quieter
      const shimmer = ctx.createOscillator();
      const sGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(n.freq * 2, t0);
      sGain.gain.setValueAtTime(0.0001, t0);
      sGain.gain.exponentialRampToValueAtTime(n.peak * 0.12, t0 + 0.03);
      sGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      shimmer.connect(sGain);
      sGain.connect(master);
      shimmer.start(t0);
      shimmer.stop(t0 + 0.7);
    }

    setTimeout(() => void ctx.close().catch(() => {}), 1400);
  } catch {
    /* audio unavailable — silent fallback */
  }
}

export const HoloGenerateButton: React.FC<HoloGenerateButtonProps> = ({
  onClick,
  isLoading = false,
  isCopied = false,
  label = 'GENERATE BOX',
  className,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const pressTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (pressTimeoutRef.current) window.clearTimeout(pressTimeoutRef.current);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playGenerateChime();
    setIsPressed(true);
    if (pressTimeoutRef.current) window.clearTimeout(pressTimeoutRef.current);
    pressTimeoutRef.current = window.setTimeout(() => setIsPressed(false), 700);
    onClick();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`button-container select-none relative ${className || 'my-6'}`}
    >
      {/* Press shockwave ring burst */}
      <AnimatePresence>
        {isPressed && (
          <>
            <motion.div
              key="shockwave"
              aria-hidden="true"
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-[-30%] rounded-full z-20 border-2 border-cyan-300 shadow-[0_0_40px_rgba(0,242,255,0.8),inset_0_0_40px_rgba(217,70,239,0.5)]"
            />
            <motion.div
              key="shockwave-2"
              aria-hidden="true"
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 3.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.08 }}
              className="pointer-events-none absolute inset-[-30%] rounded-full z-20 border border-fuchsia-300/80 shadow-[0_0_50px_rgba(217,70,239,0.6)]"
            />
            {/* Particle explosion */}
            {[...Array(12)].map((_, i) => (
              <motion.span
                key={`spark-${i}`}
                aria-hidden="true"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i / 12) * Math.PI * 2) * (70 + (i % 3) * 22),
                  y: Math.sin((i / 12) * Math.PI * 2) * (70 + (i % 4) * 18),
                  opacity: 0,
                  scale: 0.2,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-1 w-1 rounded-full bg-cyan-200 shadow-[0_0_8px_rgba(0,242,255,1)]"
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <div className="button-hexagons">
        <div className="hexagon"></div>
        <div className="hexagon"></div>
        <div className="hexagon"></div>
        <div className="hexagon"></div>
        <div className="hexagon"></div>
        <div className="hexagon"></div>
      </div>

      <motion.button
        id="holo-generate-btn"
        className="holo-button relative cursor-pointer holo-btn-idle"
        onClick={handleClick}
        type="button"
        whileHover={{ scale: 1.025, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.96 }}
        title="Generate & Copy shareable Bitty Box URL"
      >
        <div className="button-text flex items-center justify-center gap-2">
          <AnimatePresence mode="wait">
            {isCopied ? (
              <motion.div
                key="state-copied"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="flex items-center gap-2"
              >
                <Check className="w-5 h-5 text-teal-300 animate-bounce" />
                <span className="text-teal-200">LINK COPIED!</span>
              </motion.div>
            ) : isLoading ? (
              <motion.div
                key="state-loading"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-fuchsia-400 animate-spin" />
                <span>GENERATING...</span>
              </motion.div>
            ) : (
              <motion.div
                key="state-default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Zap className={`w-4 h-4 text-cyan-300 ${isPressed ? 'animate-bounce' : 'animate-pulse'}`} />
                <span>{label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="holo-glow"></div>
        <div className={`button-glitch ${isPressed ? 'button-glitch-active' : ''}`}></div>
        <div className="corner-accents">
          <div className="corner-accent"></div>
          <div className="corner-accent"></div>
          <div className="corner-accent"></div>
          <div className="corner-accent"></div>
        </div>
        <div className="holo-lines">
          <div className="holo-line"></div>
          <div className="holo-line"></div>
          <div className="holo-line"></div>
          <div className="holo-line"></div>
        </div>
        <div className="scan-line"></div>
        <div className="holo-particles">
          <div className="holo-particle"></div>
          <div className="holo-particle"></div>
          <div className="holo-particle"></div>
          <div className="holo-particle"></div>
          <div className="holo-particle"></div>
          <div className="holo-particle"></div>
        </div>
      </motion.button>

      <div className="sound-wave">
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
      </div>
    </motion.div>
  );
};
