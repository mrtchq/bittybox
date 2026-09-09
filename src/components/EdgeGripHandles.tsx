import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const GripVerticalIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

export const GripHorizontalIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="9" r="1" />
    <circle cx="5" cy="9" r="1" />
    <circle cx="19" cy="9" r="1" />
    <circle cx="12" cy="15" r="1" />
    <circle cx="5" cy="15" r="1" />
    <circle cx="19" cy="15" r="1" />
  </svg>
);

export const GRIP_ICON_DATA_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>';

export const GRIP_HORIZONTAL_ICON_DATA_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="1"/><circle cx="5" cy="9" r="1"/><circle cx="19" cy="9" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="5" cy="15" r="1"/><circle cx="19" cy="15" r="1"/></svg>';

export interface EdgeGripHandlesProps {
  onOpenPreview?: () => void;
  onOpenAccount?: () => void;
  isPreviewOpen?: boolean;
  isAccountOpen?: boolean;
  onOpenLeft?: () => void;
  onOpenRight?: () => void;
  isLeftOpen?: boolean;
  isRightOpen?: boolean;
  onOpenChainNext?: () => void;
  isChainNextVisible?: boolean;
  chainNextLabel?: string;
  chainNextDisabled?: boolean;
  bottomClassName?: string;
  topClassName?: string;
}

export const EdgeGripHandles: React.FC<EdgeGripHandlesProps> = ({
  onOpenPreview,
  isPreviewOpen,
  onOpenLeft,
  isLeftOpen,
  onOpenChainNext,
  isChainNextVisible = false,
  chainNextLabel = 'NEXT BOX',
  chainNextDisabled = false,
  topClassName,
}) => {
  const handleOpenPreview = onOpenPreview || onOpenLeft;
  const previewOpen = isPreviewOpen !== undefined ? isPreviewOpen : Boolean(isLeftOpen);
  const [gripBurst, setGripBurst] = useState(false);
  const lastScrollTargetRef = useRef<EventTarget | null>(null);
  const lastScrollPositionRef = useRef(0);
  const lastScrollDirectionRef = useRef<0 | 1 | -1>(0);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getScrollPosition = (event: Event) => {
      if (event.target instanceof HTMLElement) return event.target.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const flareOnReversal = () => {
      setGripBurst(true);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      burstTimerRef.current = setTimeout(() => setGripBurst(false), 950);
    };

    const handleScroll = (event: Event) => {
      const target = event.target || window;
      const currentPosition = getScrollPosition(event);

      if (target !== lastScrollTargetRef.current) {
        lastScrollTargetRef.current = target;
        lastScrollPositionRef.current = currentPosition;
        lastScrollDirectionRef.current = 0;
        return;
      }

      const delta = currentPosition - lastScrollPositionRef.current;
      if (Math.abs(delta) < 3) return;

      const direction: 1 | -1 = delta > 0 ? 1 : -1;
      if (lastScrollDirectionRef.current !== 0 && direction !== lastScrollDirectionRef.current) {
        flareOnReversal();
      }

      lastScrollDirectionRef.current = direction;
      lastScrollPositionRef.current = currentPosition;
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  const topGripMotion = gripBurst
    ? { y: 6, scale: 1.08, opacity: 1, boxShadow: '0 0 46px rgba(217,70,239,0.72), 0 0 18px rgba(0,242,255,0.42)' }
    : { y: -8, scale: 0.96, opacity: 0.82, boxShadow: '0 0 18px rgba(217,70,239,0.28)' };
  const gripTransition = { type: 'spring' as const, stiffness: gripBurst ? 520 : 280, damping: gripBurst ? 18 : 28 };

  return (
    <>
      {/* =========================================================================
          TOP CENTER GRIP HANDLE (Center Top of Screen right below header)
         ========================================================================= */}
      <AnimatePresence>
        {!previewOpen && handleOpenPreview && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`fixed ${topClassName || 'top-[52px] sm:top-[56px]'} left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-auto`}
          >
            <motion.button
              id="edge-grip-preview"
              onClick={handleOpenPreview}
              aria-label="Preview"
              data-scroll-state={gripBurst ? 'reversal-flare' : 'idle-retracted'}
              animate={topGripMotion}
              transition={gripTransition}
              whileHover={{ scale: 1.06, y: 2 }}
              whileTap={{ scale: 0.94 }}
              className="group relative flex items-center justify-center gap-2 px-4 py-1.5 rounded-b-2xl bg-gradient-to-b from-[#0d041e] via-[#170836] to-[#230d4e] border-x-2 border-b-2 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.5)] backdrop-blur-xl transition-colors cursor-pointer"
            >
              {/* Ambient Neon Pulse Glow Bar along Top Edge */}
              <div className="absolute top-0 left-2 right-2 h-1 bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 rounded-b shadow-[0_0_12px_#ff00de]" />

              {/* Grip SVG Icon */}
              <div className="relative flex items-center justify-center text-fuchsia-300 group-hover:text-cyan-300 transition-colors">
                <GripHorizontalIcon className="w-4 h-4 text-fuchsia-300 group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
              </div>

              {/* Horizontal Micro-Label */}
              <span className="text-[10px] sm:text-[11px] font-cyber font-extrabold tracking-widest text-fuchsia-200 group-hover:text-cyan-200 uppercase">
                PREVIEW
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          RIGHT CENTER CHAIN HANDLE (linked-list tunnel to the next Box)
         ========================================================================= */}
      <AnimatePresence>
        {isChainNextVisible && onOpenChainNext && (
          <motion.div
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[55] flex items-center select-none pointer-events-auto"
          >
            <motion.button
              id="edge-grip-chain-next"
              type="button"
              onClick={chainNextDisabled ? undefined : onOpenChainNext}
              disabled={chainNextDisabled}
              aria-label="Next chained Bitty Box"
              whileHover={chainNextDisabled ? undefined : { x: -5, scale: 1.03 }}
              whileTap={chainNextDisabled ? undefined : { scale: 0.94 }}
              className={`group relative flex min-h-[112px] w-[42px] flex-col items-center justify-center gap-2 rounded-l-2xl border-y-2 border-l-2 border-cyan-400 bg-gradient-to-l from-[#0d041e] via-[#170836] to-[#230d4e] px-1.5 py-3 text-cyan-200 shadow-[0_0_30px_rgba(0,242,255,0.38)] backdrop-blur-xl transition-all ${
                chainNextDisabled
                  ? 'cursor-not-allowed opacity-50 grayscale'
                  : 'cursor-pointer hover:border-fuchsia-300 hover:text-fuchsia-100 hover:shadow-[0_0_38px_rgba(217,70,239,0.56)]'
              }`}
            >
              <div className="absolute bottom-2 top-2 left-0 w-1 rounded-r bg-gradient-to-b from-cyan-400 via-fuchsia-400 to-emerald-300 shadow-[0_0_12px_#00f2ff]" />
              <GripVerticalIcon className="h-4 w-4 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,242,255,0.8)] transition-colors group-hover:text-fuchsia-200" />
              <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-cyber font-extrabold tracking-[0.18em] uppercase text-cyan-100 transition-colors group-hover:text-fuchsia-100">
                {chainNextLabel}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
