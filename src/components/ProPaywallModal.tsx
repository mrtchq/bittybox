import React, { useState, useEffect } from 'react';
import {
  Crown,
  Lock,
  Check,
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Gauge,
  Coins,
  Flame,
  CheckCheck,
  Zap,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  paywallFeature: string | null;
  onUnlockLifetime: (key?: string) => { success: boolean; message: string };
  onSwitchToPro?: () => void;
}

// Official Checkout Links (live Bitty Box products)
const PRO_MONTHLY_CHECKOUT_URL = 'https://creem.io/product/prod_324HFJtSwkJk6B3qCSnCXq';

const FOMO_STORAGE_KEY = 'bitty_fomo_expiry_ts_v3';
const DEFAULT_COUNTDOWN_DURATION_MS = (12 * 3600 + 47 * 60 + 29) * 1000; // 12h 47m 29s initial urgency window

export const ProPaywallModal: React.FC<ProPaywallModalProps> = ({
  isOpen,
  onClose,
  isPro,
  paywallFeature,
  onUnlockLifetime,
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'credits' | 'key'>('tiers');
  const [licenseInput, setLicenseInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Synchronized persistent countdown state
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
    totalSeconds: number;
  }>({
    hours: '12',
    minutes: '47',
    seconds: '29',
    totalSeconds: 46049,
  });

  useEffect(() => {
    if (!isOpen) return;

    const getOrSetTarget = () => {
      try {
        const stored = localStorage.getItem(FOMO_STORAGE_KEY);
        const now = Date.now();
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (parsed > now) {
            return parsed;
          }
        }
        // If expired or missing, set a fresh realistic urgency target
        const newTarget = now + DEFAULT_COUNTDOWN_DURATION_MS;
        localStorage.setItem(FOMO_STORAGE_KEY, newTarget.toString());
        return newTarget;
      } catch {
        return Date.now() + DEFAULT_COUNTDOWN_DURATION_MS;
      }
    };

    const targetTs = getOrSetTarget();

    const updateTimer = () => {
      const remaining = Math.max(0, targetTs - Date.now());
      const totalSec = Math.floor(remaining / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      setTimeLeft({
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0'),
        totalSeconds: totalSec,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRedeemKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) {
      setFeedbackMsg({ text: 'Please enter a valid license key or activation code.', isError: true });
      return;
    }
    const result = onUnlockLifetime(licenseInput);
    if (result.success) {
      setFeedbackMsg({ text: result.message, isError: false });
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setFeedbackMsg({ text: result.message, isError: true });
    }
  };

  const handleProCheckout = () => {
    window.open(PRO_MONTHLY_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
  };

  const CREDIT_LOCK_COSTS = [
    {
      name: 'Passcode Lock',
      cost: 'Free (0 CR)',
      desc: '8-12 digit PIN with zero-knowledge AES-256 client encryption',
      icon: <Key className="w-3.5 h-3.5 text-fuchsia-400" />,
    },
    {
      name: 'Time-Based Locks',
      cost: '10 Credits',
      desc: 'Expires Duration, Time Until Open, or Date Range Schedule',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      name: 'Reveal + Decay',
      cost: '10 Credits',
      desc: 'Hybrid timed delay with automatic self-destruct timer',
      icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
    },
    {
      name: 'Visitor Quota',
      cost: '10 Credits',
      desc: 'Max opens / 1-open burn-on-read & visitor rate caps',
      icon: <Gauge className="w-3.5 h-3.5 text-emerald-400" />,
    },
  ];

  const CREDIT_PACKS = [
    {
      id: 'pack_starter',
      credits: 1000,
      price: '$10',
      pricePerCredit: '$0.01 / CR',
      tag: 'STARTER BATCH',
      popular: false,
      desc: 'Test PRO security locks with pay-as-you-go credits. Credits never expire.',
      checkoutUrl: 'https://creem.io/product/prod_6W2ZUtURJf1Mk02xaq6aJF',
    },
    {
      id: 'pack_growth',
      credits: 5000,
      price: '$35',
      pricePerCredit: '$0.007 / CR',
      tag: '🔥 MOST POPULAR • SAVE 30%',
      popular: true,
      desc: 'Ideal for creators & developers deploying secure encrypted micro-links.',
      checkoutUrl: 'https://creem.io/product/prod_1ybKpsP1FQPyKvVZUVSg0A',
    },
    {
      id: 'pack_pro',
      credits: 15000,
      price: '$90',
      pricePerCredit: '$0.006 / CR',
      tag: '⚡ BEST VALUE • 40% OFF',
      popular: false,
      desc: 'Maximum capacity for high-volume automated links, agent workflows & API tasks.',
      checkoutUrl: 'https://creem.io/product/prod_2qRxHcyee2IvOfAiIFKYw6',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl"
          />

          {/* Golden & Cyber Background Glow Orbs */}
          <div className="absolute w-[650px] h-[650px] bg-gradient-to-tr from-amber-600/20 via-yellow-500/10 to-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute w-[300px] h-[300px] bg-amber-400/15 rounded-full blur-[80px] pointer-events-none -top-10" />

          {/* Main Modal Card with Motion Spring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-4xl bg-[#09041a]/95 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-7 shadow-[0_0_70px_rgba(245,158,11,0.35)] backdrop-blur-2xl overflow-y-auto max-h-[92vh] cyber-scrollbar text-cyan-100 font-sans z-10"
          >
            {/* Golden Edge Accents */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.8)] pointer-events-none" />

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300 hover:text-white hover:bg-amber-900/80 transition cursor-pointer z-20 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              aria-label="Close pricing modal"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* Modal Header */}
            <div className="text-center space-y-2 mb-4 sm:mb-5">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 450 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/90 via-yellow-900/70 to-amber-950/90 border border-amber-400/80 text-amber-300 font-mono text-[11px] sm:text-xs tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.5)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span className="font-extrabold uppercase">LIMITED-TIME FOUNDER SPECIAL // SAVE 67%</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-cyber tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-100 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                Lock In $4/Month For Life Before Price Increases
              </h2>

              <p className="text-xs sm:text-sm text-cyan-200/90 font-mono max-w-xl mx-auto leading-relaxed">
                Standard subscription rate jumps to <span className="text-amber-300 font-bold line-through">$12/mo</span> once founder seats fill. Lock in <span className="text-amber-300 font-bold underline decoration-amber-400">$4/mo forever</span> with complete access to uncrackable AES-256 client locks, timed decays &amp; quotas.
              </p>
            </div>

            {/* =========================================================================
                GOLDEN GLOWING COUNTDOWN TIMER (FOMO ENGINE)
               ========================================================================= */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-5 sm:mb-6 rounded-xl bg-gradient-to-r from-amber-950/90 via-[#261502] to-amber-950/90 border-2 border-amber-400 p-3.5 sm:p-4 shadow-[0_0_35px_rgba(245,158,11,0.4)] relative overflow-hidden"
            >
              {/* Pulsing Light Beam Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/15 to-transparent animate-pulse pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
                {/* Left FOMO Copy & Scarcity */}
                <div className="text-center md:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] sm:text-xs font-cyber font-black tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-bounce">
                      <Zap className="w-3 h-3 fill-black text-black" />
                      PRICE INCREASE IMMINENT
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono text-amber-200 font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0 fill-rose-400" />
                      87% Claimed (Only 13 Founder Passes Left)
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-amber-200/80 font-mono">
                    When this golden timer hits zero, Bitty Box PRO reverts to standard $12/month pricing.
                  </p>
                </div>

                {/* Right Golden Countdown Boxes */}
                <div className="flex items-center gap-1.5 sm:gap-2 font-mono shrink-0">
                  {/* Hours Block */}
                  <div className="flex flex-col items-center">
                    <div className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-black/90 border border-amber-400 text-amber-300 font-cyber font-black text-lg sm:text-2xl shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                      {timeLeft.hours}
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-amber-300 font-extrabold tracking-widest mt-1">HOURS</span>
                  </div>

                  <span className="text-amber-400 font-black text-lg sm:text-2xl -mt-4 animate-pulse">:</span>

                  {/* Minutes Block */}
                  <div className="flex flex-col items-center">
                    <div className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-black/90 border border-amber-400 text-amber-300 font-cyber font-black text-lg sm:text-2xl shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                      {timeLeft.minutes}
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-amber-300 font-extrabold tracking-widest mt-1">MINUTES</span>
                  </div>

                  <span className="text-amber-400 font-black text-lg sm:text-2xl -mt-4 animate-pulse">:</span>

                  {/* Seconds Block */}
                  <div className="flex flex-col items-center">
                    <div className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-black/90 border border-amber-400 text-amber-300 font-cyber font-black text-lg sm:text-2xl shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                      {timeLeft.seconds}
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-amber-300 font-extrabold tracking-widest mt-1">SECONDS</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Specific Paywalled Feature Alert */}
            {paywallFeature && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 rounded-xl bg-amber-950/70 border border-amber-400/70 flex items-center gap-3 text-xs font-mono text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                <Lock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold text-yellow-300">{paywallFeature}</span> is unlocked with PRO or credits. Lock in the early founder rate now for instant access.
                </div>
              </motion.div>
            )}

            {/* Segmented Mode Navigation with layoutId indicator */}
            <div className="flex items-center justify-center gap-2 mb-6 border-b border-amber-500/20 pb-4">
              <div className="flex p-1 rounded-xl bg-[#04010f] border border-cyan-500/30 font-mono text-xs relative">
                <button
                  type="button"
                  onClick={() => setActiveTab('tiers')}
                  className={`relative px-3.5 sm:px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeTab === 'tiers' ? 'text-black' : 'text-cyan-300 hover:text-white'
                  }`}
                >
                  {activeTab === 'tiers' && (
                    <motion.div
                      layoutId="active-paywall-tab"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" />
                    FOUNDER TIERS
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('credits')}
                  className={`relative px-3.5 sm:px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'credits' ? 'text-black' : 'text-emerald-400 hover:text-emerald-200'
                  }`}
                >
                  {activeTab === 'credits' && (
                    <motion.div
                      layoutId="active-paywall-tab"
                      className="absolute inset-0 rounded-lg bg-emerald-400 shadow-[0_0_12px_rgba(0,255,150,0.4)]"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  <Coins className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">CREDIT PACKS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('key')}
                  className={`relative px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    activeTab === 'key' ? 'text-white' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  {activeTab === 'key' && (
                    <motion.div
                      layoutId="active-paywall-tab"
                      className="absolute inset-0 rounded-lg bg-purple-500 shadow-[0_0_12px_rgba(189,0,255,0.4)]"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  <Key className="w-3 h-3 relative z-10" />
                  <span className="relative z-10">REDEEM KEY</span>
                </button>
              </div>
            </div>

            {/* =========================================================================
                VIEW 1: MEMBERSHIP TIERS (FREE / PRO WITH FOMO SALES COPY)
               ========================================================================= */}
            {activeTab === 'tiers' && (
              <div className="space-y-6 font-mono">
                {/* 2-Tier Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto items-stretch">
                  {/* TIER 1: FREE */}
                  <div className="p-5 sm:p-6 rounded-xl bg-[#060214] border border-cyan-500/30 flex flex-col justify-between space-y-5 hover:border-cyan-400/50 transition shadow-inner">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          FREE TIER
                        </span>
                        <span className="text-[10px] text-cyan-400/70 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                          BASIC ACCESS
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-3xl font-black font-cyber text-white">$0</div>
                        <div className="text-[11px] text-cyan-300/70 mt-0.5">Free forever &bull; No credit card</div>
                      </div>

                      <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                        Create unlimited standalone micro-pages in URL hashes with zero server storage.
                      </p>

                      <div className="space-y-2.5 mt-4 pt-4 border-t border-cyan-500/20 text-xs">
                        <div className="flex items-start gap-2 text-cyan-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Unlimited Bitty Boxes &amp; URL generation</span>
                        </div>
                        <div className="flex items-start gap-2 text-cyan-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Syntax highlighting &amp; live preview</span>
                        </div>
                        <div className="flex items-start gap-2 text-cyan-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Default standard themes</span>
                        </div>
                        <div className="flex items-start gap-2 text-zinc-500">
                          <X className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                          <span>No advanced access locks (Time, Quota, Decay)</span>
                        </div>
                        <div className="flex items-start gap-2 text-zinc-500">
                          <X className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                          <span>No telemetry or analytics events</span>
                        </div>
                        <div className="flex items-start gap-2 text-zinc-500">
                          <X className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                          <span>No monthly credits included</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold font-cyber hover:bg-cyan-900/60 transition cursor-pointer"
                    >
                      STAY ON BASIC FREE
                    </button>
                  </div>

                  {/* TIER 2: PRO (HIGH CONVERTING FOMO FOUNDER TIER) */}
                  <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-b from-[#1c0a38] via-[#0e0422] to-[#070114] border-2 border-amber-400 shadow-[0_0_45px_rgba(245,158,11,0.4)] flex flex-col justify-between space-y-5 relative">
                    {/* Floating Urgency Ribbon */}
                    <div className="absolute -top-3.5 right-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black text-[10px] font-cyber font-black px-3.5 py-1 rounded-full uppercase shadow-[0_0_15px_rgba(245,158,11,0.7)] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-black text-black" />
                      SAVE 67% • RATE LOCKED FOR LIFE
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                          EARLY ADOPTER PRO
                        </span>
                        <span className="text-[10px] text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-400/60 font-black">
                          FOUNDER SPECIAL
                        </span>
                      </div>

                      {/* Pricing with Strikethrough & Savings Tag */}
                      <div className="mt-3">
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-base line-through text-amber-200/50 font-bold">$12</span>
                          <span className="text-4xl sm:text-5xl font-black font-cyber text-white drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                            $4
                          </span>
                          <span className="text-xs text-amber-200/90 font-bold">
                            / month
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-black shadow">
                            -67%
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-300 mt-1 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Price locked forever &bull; All features &bull; Cancel anytime</span>
                        </div>
                      </div>

                      <p className="text-xs text-amber-100 mt-2.5 leading-relaxed font-sans">
                        Full unrestricted access to military-grade AES-256 client PIN locks, burn-on-read quotas, scheduled locks, and all creator tools.
                      </p>

                      {/* Benefits Checklist */}
                      <div className="space-y-2.5 mt-4 pt-4 border-t border-amber-500/30 text-xs">
                        <div className="flex items-start gap-2 text-amber-100 font-bold">
                          <CheckCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Passcode Locks (Client-side AES-256-GCM PIN encryption)</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-100 font-bold">
                          <CheckCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Time-Based Locks (Duration, Delayed Open, Date Schedule)</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-100 font-bold">
                          <CheckCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Reveal + Decay (Hybrid timed delay with auto-destruct)</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-100 font-bold">
                          <CheckCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Visitor Quotas (Max opens &amp; 1-open burn-on-read caps)</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-100 font-bold">
                          <CheckCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>1,000 monthly Credits included free ($10 value)</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-200">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>All Premium Cyber Themes (Matrix Phosphor, Synthwave)</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-200">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Real-time access telemetry &amp; unlock event counters</span>
                        </div>
                      </div>
                    </div>

                    {/* Golden Glowing High-Impact CTA */}
                    <div className="space-y-2">
                      <motion.button
                        whileHover={{ scale: 1.03, filter: 'brightness(1.15)' }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleProCheckout}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black font-cyber font-extrabold text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.6)] cursor-pointer transition-all"
                      >
                        <Crown className="w-4 h-4 text-black fill-black" />
                        <span>CLAIM $4/MO FOUNDER ACCESS NOW</span>
                        <ArrowRight className="w-4 h-4 text-black font-bold" />
                      </motion.button>
                      <div className="text-[10px] text-center text-amber-300/80 font-mono">
                        ⚡ Instant zero-delay activation &bull; 100% money-back guarantee
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                VIEW 2: CREDIT REFILL PACKS (PAY AS YOU GO)
               ========================================================================= */}
            {activeTab === 'credits' && (
              <div className="space-y-6 font-mono">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-[#071a17] to-cyan-950/70 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-cyber font-bold text-emerald-200 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>ADD-ON CREDITS (PAY-AS-YOU-GO)</span>
                    </h3>
                    <p className="text-xs text-emerald-300/80 mt-1 max-w-xl leading-relaxed">
                      Deploy PRO locks on-demand without subscribing. Credits never expire and carry over indefinitely.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-950 border border-emerald-400/50 text-emerald-300 whitespace-nowrap">
                    NO SUBSCRIPTION REQUIRED
                  </span>
                </div>

                {/* Lock Credit Costs Reference Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    LOCK CREDIT COSTS PER GENERATION:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {CREDIT_LOCK_COSTS.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[#04010f] border border-cyan-500/25 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white flex items-center gap-1.5">
                              {item.icon}
                              {item.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                              {item.cost}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-tight">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credit Packs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {CREDIT_PACKS.map(pack => (
                    <div
                      key={pack.id}
                      className={`p-5 rounded-xl flex flex-col justify-between space-y-4 transition ${
                        pack.popular
                          ? 'bg-gradient-to-b from-emerald-950/70 to-[#04010f] border-2 border-emerald-400 shadow-[0_0_25px_rgba(0,255,150,0.25)] relative'
                          : 'bg-[#060214] border border-cyan-500/30 hover:border-cyan-400/60'
                      }`}
                    >
                      {pack.popular && (
                        <div className="absolute -top-3 right-4 bg-emerald-400 text-black text-[9px] font-cyber font-extrabold px-3 py-0.5 rounded-full uppercase shadow-md">
                          {pack.tag}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-300 uppercase">
                            {pack.credits} CREDITS
                          </span>
                          {!pack.popular && (
                            <span className="text-[9px] text-cyan-400/80 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                              {pack.tag}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black font-cyber text-white">{pack.price}</span>
                          <span className="text-xs text-zinc-400 font-normal">one-time &bull; {pack.pricePerCredit}</span>
                        </div>

                        <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{pack.desc}</p>
                      </div>

                      <a
                        href={pack.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full py-2.5 rounded-lg font-cyber font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          pack.popular
                            ? 'bg-emerald-400 text-black hover:brightness-110 shadow-[0_0_15px_rgba(0,255,150,0.4)]'
                            : 'bg-cyan-950/80 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-900/60'
                        }`}
                      >
                        <span>GET {pack.credits} CREDITS ({pack.price})</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =========================================================================
                VIEW 3: REDEEM LICENSE KEY
               ========================================================================= */}
            {activeTab === 'key' && (
              <div className="max-w-md mx-auto py-6 space-y-4 font-mono">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-cyber font-bold text-purple-200 flex items-center justify-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>ACTIVATE LICENSE KEY</span>
                  </h3>
                  <p className="text-xs text-purple-300/70">
                    Purchased via Creem or received an official founder key? Enter it below to unlock Bitty Box PRO instantly.
                  </p>
                </div>

                <form onSubmit={handleRedeemKey} className="space-y-3">
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={e => setLicenseInput(e.target.value)}
                    placeholder="BITTY-PRO-XXXX-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#04010f] border border-purple-500/50 text-cyan-100 placeholder-purple-600 text-xs font-mono focus:outline-none focus:border-cyan-400 text-center tracking-widest uppercase shadow-inner"
                  />

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 text-white font-cyber font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(189,0,255,0.4)] hover:brightness-110 transition cursor-pointer"
                  >
                    ACTIVATE PRO ACCESS
                  </button>
                </form>
              </div>
            )}

            {/* Feedback / Toast Message */}
            <AnimatePresence>
              {feedbackMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mt-4 p-3 rounded-lg font-mono text-xs flex items-center gap-2 ${
                    feedbackMsg.isError
                      ? 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
                      : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                  }`}
                >
                  {feedbackMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{feedbackMsg.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
