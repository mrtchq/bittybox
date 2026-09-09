import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Key,
  Eye,
  EyeOff,
  AlertTriangle, 
  RefreshCw,
  Clock,
  Timer,
  Flame,
  Shield,
  Zap,
  X
} from 'lucide-react';
import { BittyMetadata } from '../types';
import { decompressBittyData, getRenderedHtml } from '../utils/bittyEngine';
import { CyberScrambleText } from './CyberScrambleText';
import { useTimeWindow, type TimeLockMode } from '../utils/timeWindow';
import { motion, AnimatePresence } from 'motion/react';

interface BittyRendererProps {
  hashFragment: string;
  metadata: BittyMetadata;
  activeContent?: string;
  onEdit?: (content: string, metadata: Partial<BittyMetadata>) => void;
  onHome?: () => void;
  onOpenQr?: () => void;
  onShare?: () => void;
  onCloseSession?: () => void;
  onNextChainBox?: () => void;
}

export const BittyRenderer: React.FC<BittyRendererProps> = ({
  hashFragment,
  metadata,
  activeContent,
  onEdit,
  onHome,
  onNextChainBox,
}) => {
  const effectiveHash = React.useMemo(() => {
    if (hashFragment) return hashFragment;
    if (typeof window === 'undefined') return '';
    const h = window.location.hash || '';
    if (h.includes('auth/') || h.includes('token=') || h === '#/studio' || h === '#/edit' || h === '#/account') {
      return '';
    }
    return h;
  }, [hashFragment]);
  const isEncryptedFragment = Boolean(
    effectiveHash &&
    (effectiveHash.includes('cipher=') ||
     effectiveHash.includes('cipher%3D') ||
     decodeURIComponent(effectiveHash).includes('cipher='))
  );

  // Time-window configuration & live ticking hook
  const twConfig = metadata?.lockConfig?.timeWindow ?? null;
  const twEnabled = Boolean(twConfig && twConfig.enabled && (twConfig.notBefore || twConfig.notAfter));
  const showCountdown = twConfig?.showCountdown !== false;
  const tw = useTimeWindow(twEnabled ? twConfig : null);
  const twBlocked = twEnabled && (tw.status === 'PENDING' || tw.status === 'EXPIRED');

  // Access-limit quota configuration
  const olConfig = metadata?.lockConfig?.openLimit ?? null;
  const olEnabled = Boolean(olConfig && olConfig.enabled);
  const maxOpens = olConfig?.maxOpens || 1;

  // Active lock state
  const hasLock = Boolean(twEnabled || olEnabled || isEncryptedFragment);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !hasLock);
  const [isHudDismissed, setIsHudDismissed] = useState<boolean>(false);

  // Stable storage key for quota tracking per URL payload / box ID
  const quotaStorageKey = React.useMemo(() => {
    if (metadata?.boxId) return `bitty_quota_box_${metadata.boxId}`;
    let h = 0;
    for (let i = 0; i < effectiveHash.length; i++) {
      h = ((h << 5) - h) + effectiveHash.charCodeAt(i);
      h |= 0;
    }
    return `bitty_quota_hash_${Math.abs(h)}`;
  }, [effectiveHash, metadata?.boxId]);

  const [localOpensUsed, setLocalOpensUsed] = useState<number>(() => {
    if (!olEnabled) return 0;
    try {
      const stored = localStorage.getItem(quotaStorageKey);
      return stored !== null ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [remainingOpens, setRemainingOpens] = useState<number | null>(() => {
    if (!olEnabled) return null;
    try {
      const stored = localStorage.getItem(quotaStorageKey);
      const used = stored !== null ? parseInt(stored, 10) || 0 : 0;
      return Math.max(0, maxOpens - used);
    } catch {}
    return maxOpens;
  });

  const [quotaBlocked, setQuotaBlocked] = useState<boolean>(() => {
    if (!olEnabled) return false;
    try {
      const stored = localStorage.getItem(quotaStorageKey);
      const used = stored !== null ? parseInt(stored, 10) || 0 : 0;
      return used >= maxOpens;
    } catch {
      return false;
    }
  });

  const [content, setContent] = useState<string>(() => {
    if (activeContent && activeContent.trim()) {
      return activeContent;
    }
    return '';
  });
  const [isEncrypted, setIsEncrypted] = useState<boolean>(isEncryptedFragment);
  const [needsPassword, setNeedsPassword] = useState<boolean>(isEncryptedFragment);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return Boolean(effectiveHash && effectiveHash.trim() && !isEncryptedFragment);
  });
  const [shake, setShake] = useState<boolean>(false);
  const [unlocking, setUnlocking] = useState<boolean>(false);

  const [isCheckingQuota, setIsCheckingQuota] = useState<boolean>(() => Boolean(olConfig?.enabled && metadata?.boxId));
  const [quotaReason, setQuotaReason] = useState<string | null>(null);

  const loadData = async (passcode?: string) => {
    const targetHash = hashFragment || (typeof window !== 'undefined' ? window.location.hash : '');
    if (!targetHash || !targetHash.trim()) {
      if (activeContent) {
        setContent(activeContent);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await decompressBittyData(targetHash, passcode);
    setIsLoading(false);

    if (result.error) {
      if (result.needsPassword) {
        setNeedsPassword(true);
        setIsEncrypted(true);
        setContent('');
        setError(result.error);
        if (passcode) {
          setShake(false);
          requestAnimationFrame(() => requestAnimationFrame(() => setShake(true)));
        }
        return;
      }
      setContent('');
      setError(result.error);
      return;
    }

    if (result.needsPassword) {
      setIsEncrypted(true);
      setNeedsPassword(true);
      setContent('');
      return;
    }

    setIsEncrypted(result.isEncrypted);
    setContent(result.content);

    // If passcode was submitted, consume quota and unlock.
    // Server-authoritative: when a boxId exists, the shared server counter is
    // consumed exactly once via the unlock gate — failed or premature attempts
    // never reach this path. Local counter is UX/fallback state only.
    if (passcode) {
      if (olEnabled) {
        if (metadata?.boxId) {
          try {
            const res = await fetch(`/api/boxes/${metadata.boxId}/unlock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: passcode }),
            });
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data.allowed === false) {
                setQuotaBlocked(true);
                setQuotaReason(data.reason || 'This Bitty Box has reached its maximum allowable opens and is permanently sealed.');
                return;
              }
              if (data.remainingOpens !== undefined) {
                setRemainingOpens(data.remainingOpens);
              }
            }
          } catch {}
        }
        const newUsed = localOpensUsed + 1;
        try {
          localStorage.setItem(quotaStorageKey, String(newUsed));
          setLocalOpensUsed(newUsed);
        } catch {}
      }
      setUnlocking(true);
      window.setTimeout(() => {
        setNeedsPassword(false);
        setIsUnlocked(true);
        setUnlocking(false);
      }, 320);
    } else if (!hasLock) {
      // Unlocked immediately ONLY when there are no locks
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    const targetHash = hashFragment || (typeof window !== 'undefined' ? window.location.hash : '');
    setIsEncrypted(isEncryptedFragment);
    setNeedsPassword(isEncryptedFragment);
    setPasswordInput('');
    setError(null);
    setIsUnlocked(!hasLock);
    setIsHudDismissed(false);

    if (!targetHash && activeContent && activeContent.trim()) {
      setContent(activeContent);
    }
    if (targetHash && targetHash.trim()) {
      loadData();
    }
  }, [hashFragment, hasLock, isEncryptedFragment]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    if (passwordInput.trim().length < 8) {
      setError('Passcode must be at least 8 digits.');
      setShake(true);
      return;
    }
    loadData(passwordInput.trim());
  };

  // Check box quota status from server if boxId is present and quota is enabled
  useEffect(() => {
    if (!olConfig?.enabled || !metadata?.boxId) {
      setIsCheckingQuota(false);
      return;
    }

    let isMounted = true;
    setIsCheckingQuota(true);
    const checkQuotaStatus = async () => {
      try {
        const res = await fetch(`/api/boxes/${metadata.boxId}/status`);
        if (!res.ok) {
          if (isMounted) setIsCheckingQuota(false);
          return;
        }
        const data = await res.json();
        if (!isMounted) return;

        setIsCheckingQuota(false);
        if (data.remainingOpens !== undefined && data.remainingOpens !== null) {
          setRemainingOpens(data.remainingOpens);
          // Only block if total opensUsed actually reached or exceeded maxOpens on server
          if (data.remainingOpens <= 0 && typeof data.maxOpens === 'number' && (data.opensUsed || 0) >= data.maxOpens) {
            setQuotaBlocked(true);
            setQuotaReason('This Bitty Box has reached its maximum allowable opens and is permanently sealed.');
          }
        }
      } catch {
        if (isMounted) setIsCheckingQuota(false);
      }
    };

    checkQuotaStatus();
    return () => { isMounted = false; };
  }, [metadata?.boxId]);

  // Unlocking for non-password protected boxes with Time Lock or Access Limit
  const handleUnlockAndEnter = async () => {
    if (olEnabled) {
      const currentUsed = localOpensUsed;
      if (currentUsed >= maxOpens) {
        setQuotaBlocked(true);
        setQuotaReason('This Bitty Box has reached its maximum allowable opens and is permanently sealed.');
        return;
      }

      if (metadata?.boxId) {
        try {
          const res = await fetch(`/api/boxes/${metadata.boxId}/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (res.status === 403) {
            const data = await res.json().catch(() => ({}));
            setQuotaBlocked(true);
            setQuotaReason(data.reason || 'This Bitty Box has reached its maximum allowable opens and is permanently sealed.');
            return;
          }
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.allowed === false) {
              setQuotaBlocked(true);
              setQuotaReason(data.reason || 'This Bitty Box has reached its maximum allowable opens and is permanently sealed.');
              return;
            }
            if (data.remainingOpens !== undefined) {
              setRemainingOpens(data.remainingOpens);
            }
          }
        } catch {}
      }

      const newUsed = currentUsed + 1;
      try {
        localStorage.setItem(quotaStorageKey, String(newUsed));
        setLocalOpensUsed(newUsed);
        setRemainingOpens(Math.max(0, maxOpens - newUsed));
      } catch {}
    }

    setUnlocking(true);
    window.setTimeout(() => {
      setIsUnlocked(true);
      setUnlocking(false);
    }, 320);
  };

  // ── 1. Standalone Expired or Pending Time-Window Screen ────────────────────
  // AND-gate policy: when a passcode and/or access-limit lock is ALSO configured,
  // fall through to the combined protected splash so every configured lock stays
  // visible. This dedicated screen is only for a lone time lock.
  const hasOtherLocks = Boolean(needsPassword || olEnabled);
  if (twBlocked && !hasOtherLocks) {
    const expired = tw.status === 'EXPIRED';
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-[#050515] flex flex-col items-center justify-center p-4 z-50 overflow-y-auto font-sans">
        <div className="w-full max-w-md p-6 bento-card-purple shadow-[0_0_50px_rgba(255,0,222,0.3)] relative animate-in zoom-in-95 duration-200">
          <div className="bento-corner-accent top-l bento-corner-accent-purple" />
          <div className="bento-corner-accent top-r bento-corner-accent-purple" />
          <div className="bento-corner-accent bot-l bento-corner-accent-purple" />
          <div className="bento-corner-accent bot-r bento-corner-accent-purple" />

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-950 border border-fuchsia-500/50 mx-auto flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,0,222,0.4)]">
              {expired ? (
                <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
              ) : (
                <Clock className="w-6 h-6 text-fuchsia-400 animate-pulse" />
              )}
            </div>
            <h3 className="font-cyber text-lg font-bold text-white tracking-wide">
              <CyberScrambleText text={expired ? 'LINK EXPIRED' : 'TIME-LOCKED BITTY BOX'} speed={25} />
            </h3>
            <p className="text-xs text-purple-200/80 font-mono mt-1">
              {expired
                ? 'This time-limited link has auto-revoked and is permanently unavailable.'
                : 'This link is scheduled. It is not yet unlocked — check back when the timer reaches zero.'}
            </p>
          </div>

          {!expired && showCountdown && (
            <div className="mb-4 bg-black/50 border border-fuchsia-500/30 rounded-xl p-4">
              <div className="text-center text-[10px] font-mono text-fuchsia-300 uppercase tracking-widest mb-1.5">
                Unlocks In
              </div>
              <div className="text-center font-cyber text-2xl text-white tracking-[0.15em] tabular-nums">
                {tw.remainingLabel ?? '00 : 00 : 00 : 00'}
              </div>
              <div className="text-center text-[9px] font-mono text-purple-300/60 mt-1">
                DAYS : HOURS : MINS : SECS
              </div>
            </div>
          )}

                    {(onHome || onEdit) && (
            <a
              href="https://bittybox.org/"
              className="w-full block text-center py-3 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-cyber tracking-wider hover:bg-cyan-900 transition cursor-pointer"
            >
              VISIT BITTYBOX.ORG
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── 2. Access Quota Limit Exhausted Screen ──────────────────────────────────
  if (quotaBlocked) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-[#050515] flex flex-col items-center justify-center p-4 z-50 overflow-y-auto font-sans">
        <div className="w-full max-w-md p-6 bento-card border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.3)] relative animate-in zoom-in-95 duration-200">
          <div className="bento-corner-accent top-l" />
          <div className="bento-corner-accent top-r" />
          <div className="bento-corner-accent bot-l" />
          <div className="bento-corner-accent bot-r" />

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-500/50 mx-auto flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              <Flame className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>
            <h3 className="font-cyber text-lg font-bold text-white tracking-wide">
              <CyberScrambleText text="ACCESS LIMIT EXHAUSTED" speed={25} />
            </h3>
            <p className="text-xs text-rose-200/80 font-mono mt-2 leading-relaxed">
              {quotaReason || 'This Bitty Box was configured with a strict allowable open quota and has burned.'}
            </p>
          </div>

          <div className="bg-black/50 border border-rose-500/30 rounded-xl p-3.5 mb-5 text-center font-mono text-[11px] text-rose-300">
            <span className="font-bold">0 VISITS REMAINING</span> • BOX PERMANENTLY SEALED
          </div>

                    {(onHome || onEdit) && (
            <a
              href="https://bittybox.org/"
              className="w-full block text-center py-3 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-cyber tracking-wider hover:bg-cyan-900 transition cursor-pointer"
            >
              VISIT BITTYBOX.ORG
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── 3. Access Quota Checking Loader ─────────────────────────────────────────
  if (isCheckingQuota) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-[#050515] flex flex-col items-center justify-center p-4 z-50 overflow-y-auto font-sans">
        <div className="text-center p-8 flex flex-col items-center">
          <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
          <h4 className="font-cyber text-sm text-emerald-300 tracking-wider">VERIFYING ACCESS QUOTA...</h4>
          <p className="text-xs font-mono text-emerald-300/70 mt-2">Checking allowable session limit</p>
        </div>
      </div>
    );
  }

  // ── 4. Protected Lock Splash Screen (Time Lock / Access Limit / Passcode) ────
  if (!isUnlocked && hasLock) {
    const formattedExpiry = twConfig?.notAfter
      ? new Date(twConfig.notAfter).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    return (
      <div className={`fixed inset-0 w-screen h-[100dvh] bg-[#050515] flex flex-col items-center justify-center p-4 z-50 overflow-y-auto font-sans ${unlocking ? 'bitty-fade-out' : ''}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="w-full max-w-lg p-5 sm:p-7 bg-[#090620]/90 border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(0,242,255,0.25),inset_0_0_30px_rgba(0,242,255,0.06)] backdrop-blur-2xl relative font-mono"
        >
          {/* Bento Corner Accents */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-5">
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs mb-3 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>PROTECTED BITTY BOX</span>
            </motion.div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-teal-100 to-fuchsia-300 tracking-wide">
              <CyberScrambleText text={metadata.title || 'UNTITLED BITTY BOX'} speed={20} />
            </h2>
            <p className="text-xs text-cyan-300/70 mt-1">
              Guarded by active security & self-destruct mechanisms.
            </p>
          </div>

          {/* Lock Status Badges Grid */}
          <div className="space-y-3 mb-6">
            {/* Time Lock Card — renders PENDING / OPEN / EXPIRED states so a
                stacked box always discloses the time rule, never hides it. */}
            {twEnabled && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                className={`p-3.5 sm:p-4 rounded-xl border flex flex-col gap-2 shadow-[0_0_20px_rgba(217,70,239,0.15)] ${
                  twBlocked
                    ? 'bg-fuchsia-950/60 border-fuchsia-500/60'
                    : 'bg-fuchsia-950/40 border-fuchsia-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-fuchsia-300 text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                    <span>
                      {tw.status === 'PENDING'
                        ? 'TIME LOCK — PENDING'
                        : tw.status === 'EXPIRED'
                          ? 'TIME LOCK — EXPIRED'
                          : 'TIME-LIMITED ACCESS'}
                    </span>
                  </div>
                  {formattedExpiry && (
                    <span className="text-[10px] text-fuchsia-300/70">
                      Expires: {formattedExpiry}
                    </span>
                  )}
                </div>

                {twBlocked ? (
                  tw.status === 'PENDING' && showCountdown ? (
                    <div className="bg-black/60 border border-fuchsia-500/30 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-fuchsia-300 uppercase tracking-widest mb-1">
                        Unlocks In
                      </div>
                      <div className="text-xl sm:text-2xl font-cyber text-white tracking-[0.18em] tabular-nums">
                        {tw.remainingLabel || '00 : 00 : 00 : 00'}
                      </div>
                      <div className="text-[9px] text-fuchsia-300/60 mt-0.5">
                        DAYS : HOURS : MINS : SECS
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-lg p-2.5 text-center text-[11px] font-mono ${
                        tw.status === 'EXPIRED'
                          ? 'bg-black/60 border border-rose-500/40 text-rose-300'
                          : 'bg-black/60 border border-fuchsia-500/30 text-purple-200/70'
                      }`}
                    >
                      {tw.status === 'EXPIRED'
                        ? 'This link has auto-revoked and is permanently unavailable.'
                        : 'Scheduled transmission — countdown hidden by creator.'}
                    </div>
                  )
                ) : (
                  <>
                    <div className="bg-black/60 border border-fuchsia-500/30 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-fuchsia-300 uppercase tracking-widest mb-1">
                        {twConfig?.mode === 'hybrid' ? 'Burns In' : 'Auto-Destructs In'}
                      </div>
                      <div className="text-xl sm:text-2xl font-cyber text-white tracking-[0.18em] tabular-nums">
                        {tw.remainingLabel || '00 : 00 : 00 : 00'}
                      </div>
                      <div className="text-[9px] text-fuchsia-300/60 mt-0.5">
                        DAYS : HOURS : MINS : SECS
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Access Limit Card */}
            {olEnabled && (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="p-3.5 sm:p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>ACCESS QUOTA LIMITED</span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 font-bold">
                    BURN ON READ
                  </span>
                </div>

                <div className="bg-black/60 border border-amber-500/30 rounded-lg p-3 text-center">
                  <div className="text-lg sm:text-xl font-cyber text-amber-200 tracking-wider font-bold">
                    {remainingOpens !== null ? remainingOpens : maxOpens} OF {maxOpens} VISITS REMAINING
                  </div>
                  <div className="text-[10px] text-amber-300/70 mt-1">
                    This transmission permanently seals when allowable open quota is exhausted.
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Passcode Form or Direct Enter Button */}
          {twBlocked ? (
            /* AND-gate: while the time rule is pending/expired, no lock may be
               attempted — the box stays sealed and the full stack stays visible. */
            <div className="rounded-xl bg-black/50 border border-fuchsia-500/30 p-3 text-center text-[11px] font-mono text-fuchsia-300">
              {tw.status === 'EXPIRED'
                ? '🔒 BOX PERMANENTLY SEALED — time window has closed.'
                : '⏳ SEALED UNTIL TIMER REACHES ZERO' +
                  (needsPassword || olEnabled
                    ? ' — passcode & quota unlock after the time boundary.'
                    : '.')}
            </div>
          ) : needsPassword || (isEncrypted && !content) ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 overflow-hidden"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <div className="flex items-center justify-between text-[11px] text-fuchsia-300 mb-1.5 uppercase tracking-wider">
                  <span>NUMERICAL PASSCODE</span>
                  <span className="text-fuchsia-400/80 text-[10px]">{passwordInput.length} / 12 DIGITS</span>
                </div>
                <div className="relative">
                  <motion.input
                    animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    minLength={8}
                    value={passwordInput}
                    onChange={e => {
                      const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setPasswordInput(numbersOnly);
                      if (error) setError(null);
                    }}
                    placeholder="Enter 8-12 digit passcode..."
                    autoFocus
                    className="w-full bg-[#090314] border border-fuchsia-500/40 rounded-xl pl-4 pr-11 py-3 text-center text-lg tracking-[0.25em] text-white placeholder:text-purple-400/40 placeholder:text-xs placeholder:tracking-normal focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400"
                    onAnimationEnd={() => setShake(false)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-fuchsia-300 transition cursor-pointer"
                    title={showPassword ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(255,0,222,0.6)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || !passwordInput.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 disabled:opacity-50 text-white font-cyber text-xs tracking-widest shadow-[0_0_25px_rgba(255,0,222,0.4)] transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING PASSCODE...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>UNLOCK TRANSMISSION</span>
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 35px rgba(0,242,255,0.7)" }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleUnlockAndEnter}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-extrabold text-xs tracking-widest shadow-[0_0_30px_rgba(0,242,255,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 font-mono"
              >
                <Zap className="w-4 h-4 text-black fill-black" />
                <span>ENTER & VIEW BITTY BOX</span>
              </motion.button>
              <div className="text-center text-[10px] text-cyan-300/60">
                {olEnabled ? 'Consumes 1 allowable open on entry.' : 'Click to render self-contained transmission.'}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // If there's an unrecoverable decoding error
  if (error && !content) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-[#050515] flex flex-col items-center justify-center p-4 z-50 overflow-y-auto font-sans">
        <div className="text-center max-w-md p-6 bento-card border-rose-500/40 relative">
          <div className="bento-corner-accent top-l" />
          <div className="bento-corner-accent top-r" />
          <div className="bento-corner-accent bot-l" />
          <div className="bento-corner-accent bot-r" />

          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="font-cyber text-base text-rose-200 mb-1">TRANSMISSION DECODE ERROR</h3>
          <p className="text-xs text-purple-200/70 font-mono mb-4">{error}</p>
                    {(onHome || onEdit) && (
            <a
              href="https://bittybox.org/"
              className="px-4 py-2 inline-block rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-cyber hover:bg-cyan-900 transition cursor-pointer"
            >
              VISIT BITTYBOX.ORG
            </a>
          )}
        </div>
      </div>
    );
  }

  // If loading without cached content
  if (isLoading && !content) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-[#050515] flex flex-col items-center justify-center p-4 z-50 overflow-y-auto font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 flex flex-col items-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          >
            <RefreshCw className="w-10 h-10 text-cyan-400 mb-4" />
          </motion.div>
          <h4 className="font-cyber text-sm text-cyan-300 tracking-wider">INFLATING BITTY BOX TRANSMISSION...</h4>
          <p className="text-xs font-mono text-purple-300/70 mt-2">Decompressing URL hash data stream</p>
        </motion.div>
      </div>
    );
  }

  // Compute final HTML for the iframe
  const finalHtml = getRenderedHtml(content || '', metadata);

  // ── 5. Rendered Live Content with Floating Lock HUD (Top-Right) ───────────
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden bg-[#050515]">
      <AnimatePresence>
        {onNextChainBox && isUnlocked && !twBlocked && !quotaBlocked && (
          <motion.div
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[65] flex items-center select-none"
          >
            <motion.button
              id="edge-grip-viewer-chain-next"
              type="button"
              onClick={onNextChainBox}
              aria-label="Next chained Bitty Box"
              whileHover={{ x: -5, scale: 1.03 }}
              whileTap={{ scale: 0.94 }}
              className="group relative flex min-h-[124px] w-[44px] flex-col items-center justify-center gap-2 rounded-l-2xl border-y-2 border-l-2 border-cyan-400 bg-gradient-to-l from-[#0d041e] via-[#170836] to-[#230d4e] px-1.5 py-3 text-cyan-200 shadow-[0_0_30px_rgba(0,242,255,0.38)] backdrop-blur-xl transition-all cursor-pointer hover:border-fuchsia-300 hover:text-fuchsia-100 hover:shadow-[0_0_38px_rgba(217,70,239,0.56)]"
            >
              <div className="absolute bottom-2 top-2 left-0 w-1 rounded-r bg-gradient-to-b from-cyan-400 via-fuchsia-400 to-emerald-300 shadow-[0_0_12px_#00f2ff]" />
              <span className="text-lg leading-none text-cyan-300 transition-colors group-hover:text-fuchsia-200">›</span>
              <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-cyber font-extrabold tracking-[0.18em] uppercase text-cyan-100 transition-colors group-hover:text-fuchsia-100">NEXT BOX</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Collapsible Lock Status HUD Pill */}
      <AnimatePresence>
        {hasLock && !isHudDismissed && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-3 right-3 z-[60] max-w-[90vw] flex items-center gap-2 bg-[#050314]/90 border border-cyan-500/40 rounded-full px-3 py-1.5 shadow-[0_0_20px_rgba(0,0,0,0.8),0_0_10px_rgba(0,242,255,0.25)] backdrop-blur-xl font-mono text-[10px] text-cyan-100"
          >
            {twEnabled && (
              <div className="flex items-center gap-1 text-fuchsia-300 font-bold">
                <Clock className="w-3 h-3 text-fuchsia-400 animate-pulse" />
                {twConfig?.mode === 'hybrid'
                  ? <span>BURNS IN {tw.remainingLabel || 'ACTIVE'}</span>
                  : <span>{tw.remainingLabel || 'AUTO-DESTRUCT ACTIVE'}</span>}
              </div>
            )}

            {twEnabled && olEnabled && <span className="text-cyan-500/40">|</span>}

            {olEnabled && (
              <div className="flex items-center gap-1 text-amber-300 font-bold">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>{remainingOpens !== null ? `${remainingOpens} Opens Left` : 'Active Quota'}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.2, rotate: 90 }}
              whileTap={{ scale: 0.85 }}
              type="button"
              onClick={() => setIsHudDismissed(true)}
              className="text-cyan-400/50 hover:text-cyan-200 ml-1 cursor-pointer transition-colors p-0.5"
              title="Dismiss Lock HUD"
            >
              <X className="w-3 h-3" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sandboxed Iframe with Rendered Output */}
      <iframe
        srcDoc={finalHtml}
        title={metadata.title || 'Bitty Box'}
        className="w-full h-full border-0 m-0 p-0 block bg-white"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads"
      />
    </div>
  );
};
