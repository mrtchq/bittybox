import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Coins,
  History,
  Bot,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Plus,
  Shield,
  Clock,
  Flame,
  Zap,
  Lock,
  Sparkles,
  RefreshCw,
  LogOut,
  Terminal,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Info,
  Code,
  Layers,
  Search,
  SlidersHorizontal,
  Crown,
  Share2,
  QrCode,
  Mail,
  Send,
  Inbox,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Volume2,
  VolumeX,
  CheckCheck
} from "lucide-react";
import { BittyUser, ApiKeyMeta, TrackedBittyBox } from "../types";
import { UseAccountResult } from "../hooks/useAccount";
import { CyberScrambleText } from "./CyberScrambleText";
import { PrismCheckbox } from "./PrismCheckbox";
import { UserAvatar } from "./UserAvatar";
import { TimeWindowConfig, evaluateTimeWindow, formatCountdown, nextBoundary } from "../utils/timeWindow";
import { SessionSaveIndicator } from "./SessionSaveIndicator";

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface AccountDashboardProps {
  account: UseAccountResult;
  onNavigateToSlide01?: () => void;
  onOpenQr?: (url: string) => void;
  lastSavedAt?: number | null;
  isSaving?: boolean;
  activeSessionTitle?: string;
  onManualSave?: () => void;
}

export const AccountDashboard: React.FC<AccountDashboardProps> = ({
  account,
  onNavigateToSlide01,
  onOpenQr,
  lastSavedAt,
  isSaving,
  activeSessionTitle,
  onManualSave,
}) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    signInWithGoogle,
    login,
    register,
    logout,
    refreshUser,
    generateApiKey,
    revokeApiKey,
    testApiKey,
    purchaseCredits,
    deleteTrackedBox,
  } = account;

  // Navigation tab inside Account Dashboard
  const [activeTab, setActiveTab] = useState<"boxes" | "keys" | "credits" | "mcp">("boxes");

  // Auth form states (Google & Magic Link)
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [trustDeviceOnLogin, setTrustDeviceOnLogin] = useState<boolean>(() => {
    try {
      return localStorage.getItem("bitty_device_trusted") !== "false";
    } catch {
      return true;
    }
  });
  const [displayName, setDisplayName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicSentEmail, setMagicSentEmail] = useState("");

  // Key creation state
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("My AI Agent Key");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["links:create", "links:read", "mcp:access"]);
  const [revealedKey, setRevealedKey] = useState<{ rawKey: string; key: ApiKeyMeta } | null>(null);
  const [isCopiedRawKey, setIsCopiedRawKey] = useState(false);

  // Key testing state
  const [testKeyInput, setTestKeyInput] = useState("");
  const [testKeyResult, setTestKeyResult] = useState<any>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);

  // Box search, filter, and details
  const [boxSearchQuery, setBoxSearchQuery] = useState("");
  const [copiedBoxId, setCopiedBoxId] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<TrackedBittyBox | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Credit purchasing state
  const [purchasingPkg, setPurchasingPkg] = useState<string | null>(null);
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState<string | null>(null);



  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setAuthMsg(null);
    try {
      const result = await signInWithGoogle();
      if (!result.success && !result.redirecting) {
        setAuthMsg(result.error || "Google sign-in could not be completed.");
      }
    } catch (err: any) {
      setAuthMsg(err.message || "Google sign-in encountered an issue.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Magic Link Submission
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setAuthMsg("Please enter a valid email address.");
      return;
    }
    setAuthSubmitting(true);
    setAuthMsg(null);

    const res = await account.requestMagicLink(email.trim(), displayName.trim(), trustDeviceOnLogin);
    setAuthSubmitting(false);

    if (res.success) {
      setMagicLinkSent(true);
      setMagicSentEmail(email.trim());
    } else {
      setAuthMsg(res.error || "Failed to dispatch magic link. Please check your email.");
    }
  };

  // Handle Key Generation
  const handleGenerateKey = async () => {
    setIsCreatingKey(true);
    const created = await generateApiKey(newKeyLabel, newKeyScopes);
    setIsCreatingKey(false);
    if (created) {
      setRevealedKey(created);
      setNewKeyLabel("New Key");
    }
  };

  // Handle Key Copy
  const handleCopyRawKey = () => {
    if (revealedKey?.rawKey) {
      navigator.clipboard.writeText(revealedKey.rawKey);
      setIsCopiedRawKey(true);
      setTimeout(() => setIsCopiedRawKey(false), 2500);
    }
  };

  // Handle Box URL Copy
  const handleCopyBoxUrl = (box: TrackedBittyBox) => {
    navigator.clipboard.writeText(box.url);
    setCopiedBoxId(box.id);
    setTimeout(() => setCopiedBoxId(null), 2500);
  };

  // Handle Test Key
  const handleRunTestKey = async () => {
    if (!testKeyInput.trim()) return;
    setIsTestingKey(true);
    const res = await testApiKey(testKeyInput.trim());
    setTestKeyResult(res);
    setIsTestingKey(false);
  };

  // Handle Credit Refill
  const handleBuyCredits = async (packageId: string, amount: number, costCents: number) => {
    setPurchasingPkg(packageId);
    setPurchaseSuccessMsg(null);
    const success = await purchaseCredits(packageId, amount, costCents);
    setPurchasingPkg(null);
    if (success) {
      setPurchaseSuccessMsg(`Successfully added ${amount} Credits to your account!`);
      setTimeout(() => setPurchaseSuccessMsg(null), 4000);
    }
  };

  const getBoxTimeWindow = useCallback((box: TrackedBittyBox): TimeWindowConfig | null => {
    try {
      const hash = new URL(box.url, window.location.origin).hash || "";
      const parts = hash.replace(/^#\/?/, "").split("/");
      const twIndex = parts.indexOf("tw");
      if (twIndex === -1 || !parts[twIndex + 1]) return null;
      const [nb, na, sc, mode] = decodeURIComponent(parts[twIndex + 1]).split("~");
      return {
        enabled: true,
        mode: (mode as TimeWindowConfig["mode"]) || undefined,
        notBefore: nb && nb !== "_" ? nb : null,
        notAfter: na && na !== "_" ? na : null,
        showCountdown: sc !== "0",
      };
    } catch {
      return null;
    }
  }, []);

  const getBoxLockSnapshot = useCallback((box: TrackedBittyBox) => {
    const timeWindow = getBoxTimeWindow(box);
    const timeStatus = evaluateTimeWindow(timeWindow, nowMs);
    const boundary = nextBoundary(timeWindow, timeStatus, nowMs);
    return {
      hasPassword: Boolean(box.locks?.password || box.encrypted),
      hasTimeWindow: Boolean(box.locks?.timeWindow || timeWindow),
      hasAccessLimit: Boolean(box.locks?.accessLimit),
      timeWindow,
      timeStatus,
      timeRemainingLabel: boundary.ms == null ? null : formatCountdown(boundary.ms),
      timeBoundary: boundary.kind,
    };
  }, [getBoxTimeWindow, nowMs]);

  // Filtered Boxes
  const filteredBoxes = (user?.links || []).filter(box => {
    if (!boxSearchQuery.trim()) return true;
    const query = boxSearchQuery.toLowerCase();
    return (
      (box.title && box.title.toLowerCase().includes(query)) ||
      (box.format && box.format.toLowerCase().includes(query)) ||
      box.url.toLowerCase().includes(query)
    );
  });

  // =========================================================================
  // VIEW 1: NOT AUTHENTICATED -> STUDIO CYBER SIGN IN / REGISTER
  // =========================================================================
  if (!isAuthenticated || !user) {
    return (
      <div
        className="relative min-h-[calc(100vh-4rem)] bg-transparent text-cyan-100 font-sans py-8 px-4 sm:px-6 overflow-hidden flex items-center justify-center select-none"
      >
        <div className="w-full max-w-lg relative z-10">
          {/* Main Cyber Bento Login Card */}
          <div className="bg-[#08041c]/95 backdrop-blur-2xl border-2 border-cyan-500/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,242,255,0.2)] font-mono relative overflow-hidden">
            {/* Bento Corner Accents */}
            <div className="bento-corner-accent top-l" />
            <div className="bento-corner-accent top-r" />
            <div className="bento-corner-accent bot-l" />
            <div className="bento-corner-accent bot-r" />

            {/* Cyber scanlines overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.35)_51%)] bg-[length:100%_4px] pointer-events-none opacity-25" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,242,255,0.12),transparent_70%)] pointer-events-none" />

            {/* Card Header Badge & Top Right Saved Status */}
            <div className="space-y-2 mb-6 relative z-30">
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-mono text-[10px] tracking-widest shadow-[0_0_15px_rgba(0,242,255,0.3)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BITTY BOX // QUANTUM AUTH TERMINAL</span>
                </div>
                <SessionSaveIndicator
                  lastSavedAt={lastSavedAt}
                  isSaving={isSaving}
                  activeSessionTitle={activeSessionTitle}
                  onManualSave={onManualSave}
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-black font-cyber text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-teal-200 to-fuchsia-200 tracking-wide mt-2">
                <CyberScrambleText text="AUTHENTICATE IDENTITY" speed={20} />
              </h2>

              <p className="text-xs text-center text-cyan-300/80 max-w-sm mx-auto leading-relaxed">
                Sign in to manage your credits balance, tracked Bitty Boxes, API keys, and autonomous AI Agent tools.
              </p>
            </div>

            {/* Primary Google Sign In Button */}
            <div className="mb-5 relative z-10">
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || authSubmitting}
                className="w-full py-3.5 px-4 rounded-xl font-sans font-bold text-sm tracking-wide text-white bg-gradient-to-r from-[#0d1c30] via-[#10243d] to-[#0c1c2e] hover:from-[#132845] hover:to-[#173254] border-2 border-cyan-400/70 hover:border-cyan-300 active:scale-[0.99] transition-all duration-200 shadow-[0_0_30px_rgba(0,242,255,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center group"
              >
                {googleLoading ? (
                  <div className="flex items-center justify-center gap-2 w-full">
                    <RefreshCw className="w-4 h-4 text-cyan-300 animate-spin" />
                    <span className="font-mono text-xs text-cyan-200">AUTHENTICATING WITH GOOGLE...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-md p-1 group-hover:scale-105 transition-transform">
                      <GoogleIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-100 group-hover:text-white font-mono tracking-wide">
                      CONTINUE WITH GOOGLE
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* Visual Divider */}
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400/60">
                OR SIGN IN WITH EMAIL
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            </div>

            {magicLinkSent ? (
              <div className="p-6 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(0,242,255,0.4)]">
                  <Mail className="w-7 h-7 text-cyan-300 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-cyber text-base font-bold text-white tracking-wide">
                    <CyberScrambleText text="TRANSMISSION DISPATCHED" speed={20} />
                  </h3>
                  <p className="text-xs text-cyan-200 font-mono mt-1.5 break-all">
                    Sent to: <span className="font-bold text-cyan-300">{magicSentEmail}</span>
                  </p>
                  <p className="text-[11px] text-cyan-300/70 mt-2 leading-relaxed">
                    Check your email inbox and click the magic link to instantly access your account.
                    The link is single-use and valid for 15 minutes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setAuthMsg(null);
                  }}
                  className="w-full py-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-cyan-900/40 transition cursor-pointer"
                >
                  SEND TO A DIFFERENT EMAIL
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4 relative z-10">
                <div className="input-container">
                  <div className="input-field-container">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="holo-input"
                      placeholder=""
                    />
                    <div className="input-border" />
                    <div className="holo-scan-line" />
                    <div className="input-glow" />
                    <div className="input-active-indicator" />
                    <div className="input-label">E-MAIL</div>

                    <div className="input-data-visualization">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div className="data-segment" style={{ '--index': i + 1 }} key={i} />
                      ))}
                    </div>

                    <div className="input-particles">
                      <div className="input-particle" style={{ '--index': 1, top: '20%', left: '10%' }} />
                      <div className="input-particle" style={{ '--index': 2, top: '65%', left: '25%' }} />
                      <div className="input-particle" style={{ '--index': 3, top: '40%', left: '40%' }} />
                      <div className="input-particle" style={{ '--index': 4, top: '75%', left: '60%' }} />
                      <div className="input-particle" style={{ '--index': 5, top: '30%', left: '75%' }} />
                      <div className="input-particle" style={{ '--index': 6, top: '60%', left: '90%' }} />
                    </div>

                    <div className="input-holo-overlay" />
                    <div className="interface-lines">
                      <div className="interface-line" />
                      <div className="interface-line" />
                      <div className="interface-line" />
                      <div className="interface-line" />
                    </div>
                    <div className="hex-decoration" />
                    <div className="input-status">Ready for input</div>
                    <div className="power-indicator" />

                    <div className="input-decoration">
                      <div className="decoration-dot" />
                      <div className="decoration-line" />
                      <div className="decoration-dot" />
                      <div className="decoration-line" />
                      <div className="decoration-dot" />
                      <div className="decoration-line" />
                      <div className="decoration-dot" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-300 mb-1">
                    CALLSIGN / DISPLAY NAME (OPTIONAL):
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Cypher_01, Alex Developer"
                    className="w-full bg-[#02010c] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-cyan-100 placeholder:text-cyan-600 outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition font-mono shadow-inner"
                  />
                </div>

                {authMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{authMsg}</span>
                  </div>
                )}

                <div className="py-1">
                  <PrismCheckbox
                    checked={trustDeviceOnLogin}
                    onChange={(checked) => {
                      setTrustDeviceOnLogin(checked);
                      try {
                        localStorage.setItem("bitty_device_trusted", String(checked));
                      } catch {}
                    }}
                    label="Trust this device for 30 days"
                    description="Stay signed in without having to re-authenticate on this device."
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 rounded-xl font-cyber font-bold text-xs tracking-wider text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:brightness-110 active:scale-[0.99] transition shadow-[0_0_25px_rgba(0,242,255,0.4)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {authSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING MAGIC LINK...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SEND MAGIC SIGN-IN LINK</span>
                    </>
                  )}
                </button>
                <div className="text-[10px] text-cyan-400/60 text-center font-mono">
                  ⚡ Passwordless email sign-in &bull; Instant single-use magic link
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED -> COMPLETE STUDIO BENTO DASHBOARD
  // =========================================================================
  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] bg-transparent text-cyan-100 font-sans py-6 sm:py-8 px-3 sm:px-6 overflow-hidden"
    >
      <div className="max-w-4xl mx-auto space-y-5 relative z-10">

        {/* =========================================================================
            TOP PROFILE & SYSTEM TELEMETRY BENTO HEADER
           ========================================================================= */}
        <div className="bg-[#08041c]/95 backdrop-blur-2xl border-2 border-cyan-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_40px_rgba(0,242,255,0.18)] font-mono relative overflow-hidden">
          {/* Bento Corner Accents */}
          <div className="bento-corner-accent top-l" />
          <div className="bento-corner-accent top-r" />
          <div className="bento-corner-accent bot-l" />
          <div className="bento-corner-accent bot-r" />

          {/* Scanlines & Glow */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.35)_51%)] bg-[length:100%_4px] pointer-events-none opacity-25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,242,255,0.1),transparent_70%)] pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-cyan-500/20 pb-4 mb-4 relative z-30">
            {/* User Details */}
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <UserAvatar
                user={user}
                size="xl"
                showStatusDot={true}
                isOnline={true}
                altText={user.displayName || user.email}
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-cyber font-bold text-lg sm:text-xl text-cyan-200 flex items-center gap-2 truncate">
                    <CyberScrambleText text={user.displayName || "Bitty Builder"} speed={25} />
                  </h1>
                  <span className="text-[10px] uppercase font-mono font-bold bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 px-2 py-0.5 rounded shadow-sm shrink-0">
                    {user.tier || "PRO BUILDER"}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/60 hidden sm:inline shrink-0">
                    ID: {user.id}
                  </span>
                </div>
                <div className="text-xs text-cyan-300/70 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="truncate">{user.email}</span>
                  <span>•</span>
                  <span>Member since {new Date(user.joinedDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Session Save Status at top right, Action buttons) */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-start md:justify-end gap-2 shrink-0 relative z-30">
              <SessionSaveIndicator
                lastSavedAt={lastSavedAt}
                isSaving={isSaving}
                activeSessionTitle={activeSessionTitle}
                onManualSave={onManualSave}
              />
              {onNavigateToSlide01 && (
                <button
                  type="button"
                  onClick={onNavigateToSlide01}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 border border-cyan-400/60 hover:border-cyan-300 text-cyan-100 hover:text-white text-xs font-cyber font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.25)] hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 text-cyan-300" />
                  <span>LAUNCH STUDIO BUILDER</span>
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
                title="Sign out of this session"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">SIGN OUT</span>
              </button>
            </div>
          </div>

          {/* High-Level Stat Bento Counters */}
          <div className="grid grid-cols-1 gap-3 relative z-10">
            {/* Stat 1: Credits Balance */}
            <div className="p-3.5 rounded-xl bg-[#03010f] border border-cyan-500/30 flex flex-col justify-between relative group hover:border-cyan-400 transition shadow-inner">
              <div className="text-[10px] text-cyan-400/80 font-bold uppercase flex items-center justify-between">
                <span>CREDITS BALANCE</span>
                <Coins className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-cyber text-cyan-200 mt-1">
                {user.credits} <span className="text-xs font-mono text-cyan-400/60 font-normal">CR</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                {user.creditsUsedTotal} credits used total
              </div>
            </div>

            {/* Stat 2: Tracked Bitty Boxes */}
            <div className="p-3.5 rounded-xl bg-[#03010f] border border-fuchsia-500/30 flex flex-col justify-between relative group hover:border-fuchsia-400 transition shadow-inner">
              <div className="text-[10px] text-fuchsia-400/80 font-bold uppercase flex items-center justify-between">
                <span>TRACKED BOXES</span>
                <History className="w-3.5 h-3.5 text-fuchsia-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-cyber text-fuchsia-200 mt-1">
                {(user.links || []).length}
              </div>
              <div className="text-[10px] text-fuchsia-400/70 mt-0.5">
                Auto-saved upon generation
              </div>
            </div>

            {/* Stat 3: Active API Keys */}
            <div className="p-3.5 rounded-xl bg-[#03010f] border border-amber-500/30 flex flex-col justify-between relative group hover:border-amber-400 transition shadow-inner">
              <div className="text-[10px] text-amber-400/80 font-bold uppercase flex items-center justify-between">
                <span>ACTIVE API KEYS</span>
                <Key className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-cyber text-amber-200 mt-1">
                {(user.apiKeys || []).length}
              </div>
              <div className="text-[10px] text-amber-400/70 mt-0.5">
                REST & MCP server enabled
              </div>
            </div>

            {/* Stat 4: Programmatic Usage */}
            <div className="p-3.5 rounded-xl bg-[#03010f] border border-teal-500/30 flex flex-col justify-between relative group hover:border-teal-400 transition shadow-inner">
              <div className="text-[10px] text-teal-400/80 font-bold uppercase flex items-center justify-between">
                <span>MCP & API CALLS</span>
                <Bot className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-cyber text-teal-200 mt-1">
                {(user.creditsMcpUsed || 0) + (user.creditsApiUsed || 0)}
              </div>
              <div className="text-[10px] text-teal-400/70 mt-0.5">
                Autonomous AI Agent hits
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MAIN SEGMENTED TAB NAVIGATION (BOXES | API KEYS | CREDITS & BILLING | MCP)
           ========================================================================= */}
        <div className="flex flex-col items-stretch gap-1.5 p-1.5 bg-[#08041c]/95 border-2 border-cyan-500/30 rounded-2xl font-mono text-xs shadow-lg backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab("boxes")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cyber font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "boxes"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,255,0.45)]"
                : "text-cyan-300/70 hover:text-cyan-100 hover:bg-cyan-950/40"
            }`}
          >
            <History className="w-4 h-4" />
            <span>TRACKED BITTY BOXES ({(user.links || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("keys")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cyber font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "keys"
                ? "bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.45)]"
                : "text-amber-300/70 hover:text-amber-100 hover:bg-amber-950/40"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API & AGENT KEYS ({(user.apiKeys || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("credits")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cyber font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "credits"
                ? "bg-emerald-400 text-black shadow-[0_0_15px_rgba(0,255,150,0.45)]"
                : "text-emerald-300/70 hover:text-emerald-100 hover:bg-emerald-950/40"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>CREDITS & PLANS ({user.credits})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mcp")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cyber font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "mcp"
                ? "bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(189,0,255,0.45)]"
                : "text-fuchsia-300/70 hover:text-fuchsia-100 hover:bg-fuchsia-950/40"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>MCP SERVER CONFIG</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: TRACKED BITTY BOXES LOG
           ========================================================================= */}
        {activeTab === "boxes" && (
          <div className="bg-[#08041c]/95 backdrop-blur-2xl border-2 border-cyan-500/30 rounded-2xl p-5 sm:p-7 shadow-[0_0_35px_rgba(0,242,255,0.15)] font-mono space-y-4 relative overflow-hidden">
            {/* Bento Corner Accents */}
            <div className="bento-corner-accent top-l" />
            <div className="bento-corner-accent top-r" />
            <div className="bento-corner-accent bot-l" />
            <div className="bento-corner-accent bot-r" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3 relative z-10">
              <div>
                <h2 className="text-base sm:text-lg font-cyber font-bold text-cyan-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>DEDICATED ACCOUNT TRANSMISSION LOG</span>
                </h2>
                <p className="text-xs text-cyan-300/70 mt-0.5">
                  Bitty Boxes generated while signed in are automatically preserved here with 1-click sharing and metadata inspection.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-cyan-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={boxSearchQuery}
                  onChange={e => setBoxSearchQuery(e.target.value)}
                  placeholder="Filter by title / format..."
                  className="w-full bg-[#02010c] border border-cyan-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-600 outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,242,255,0.25)] transition shadow-inner"
                />
              </div>
            </div>

            {/* Boxes List */}
            {filteredBoxes.length === 0 ? (
              <div className="py-14 text-center text-cyan-400/60 space-y-3 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.25)]">
                  <History className="w-7 h-7 text-cyan-400 animate-pulse" />
                </div>
                <div className="text-sm font-cyber font-bold text-cyan-200">NO TRACKED BITTY BOXES FOUND</div>
                <p className="text-xs text-cyan-300/70 max-w-sm mx-auto">
                  {boxSearchQuery
                    ? "No boxes matched your search query."
                    : "Create a Bitty Box in the studio builder while logged in, and it will appear here automatically!"}
                </p>
                {onNavigateToSlide01 && (
                  <button
                    type="button"
                    onClick={onNavigateToSlide01}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black text-xs font-bold font-cyber hover:brightness-110 transition cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.4)]"
                  >
                    + CREATE YOUR FIRST BOX
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 relative z-10">
                {filteredBoxes.map(box => (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => setSelectedBox(box)}
                    className="w-full text-left p-4 rounded-xl bg-[#03010b] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/20 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 transition flex flex-col justify-between gap-3 shadow-inner group relative cursor-pointer"
                    aria-label={`Open details for ${box.title || "Untitled Bitty Box"}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-cyan-200 line-clamp-1 group-hover:text-white transition-colors">
                          {box.title || "Untitled Bitty Box"}
                        </div>
                        <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/50 text-cyan-300 shrink-0">
                          {box.format || "HTML"}
                        </span>
                      </div>

                      {/* URL Preview */}
                      <div className="text-[10px] text-cyan-400/70 font-mono truncate mt-2 bg-black/60 p-2 rounded-lg border border-cyan-500/20 select-all">
                        {box.url}
                      </div>

                      {/* Metadata row: Date, Size, Locks */}
                      <div className="flex items-center gap-2 mt-2.5 text-[10px] text-cyan-300/70 flex-wrap">
                        <span>{new Date(box.createdAt).toLocaleDateString()}</span>
                        {box.stats?.rawLength && (
                          <>
                            <span>•</span>
                            <span>{box.stats.rawLength} Bytes</span>
                          </>
                        )}
                        {box.locks?.password && (
                          <span className="inline-flex items-center gap-1 text-fuchsia-300 bg-fuchsia-950/80 border border-fuchsia-500/40 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3 text-fuchsia-400" /> Passcode (FREE)
                          </span>
                        )}
                        {box.locks?.timeWindow && (
                          <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-amber-400" /> Time Lock (10 CR)
                          </span>
                        )}
                        {box.locks?.accessLimit && (
                          <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                            <Flame className="w-3 h-3 text-emerald-400" /> Visitor Quota (10 CR)
                          </span>
                        )}
                        {(() => {
                          const lock = getBoxLockSnapshot(box);
                          if (!lock.hasTimeWindow) return null;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                              lock.timeStatus === "OPEN"
                                ? "text-emerald-300 bg-emerald-950/80 border-emerald-500/40"
                                : lock.timeStatus === "PENDING"
                                  ? "text-amber-300 bg-amber-950/80 border-amber-500/40"
                                  : "text-rose-300 bg-rose-950/80 border-rose-500/40"
                            }`}>
                              <Clock className="w-3 h-3" />
                              {lock.timeStatus}
                              {lock.timeRemainingLabel ? ` · ${lock.timeBoundary === "unlocks" ? "unlocks" : "expires"} ${lock.timeRemainingLabel}` : ""}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-1 pt-2.5 border-t border-cyan-500/20 text-xs" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyBoxUrl(box)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 hover:bg-cyan-900 text-[10px] font-cyber font-bold flex items-center gap-1.5 transition cursor-pointer"
                          title="Copy full URL"
                        >
                          {copiedBoxId === box.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-cyan-400" />
                              <span>COPY LINK</span>
                            </>
                          )}
                        </button>

                        <a
                          href={box.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-500/50 text-purple-200 hover:bg-purple-900 text-[10px] font-cyber font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3 text-purple-400" />
                          <span>OPEN</span>
                        </a>

                        {onOpenQr && (
                          <button
                            type="button"
                            onClick={() => onOpenQr(box.url)}
                            className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-[10px] transition cursor-pointer"
                            title="Show QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteTrackedBox(box.id)}
                        className="p-1.5 rounded-lg text-cyan-400/50 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete from log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: API KEYS GENERATOR & MANAGEMENT
           ========================================================================= */}
        {activeTab === "keys" && (
          <div className="space-y-4 font-mono">
            {/* Key Reveal Dialog (if freshly generated) */}
            {revealedKey && (
              <div className="p-5 rounded-2xl bg-amber-950/90 border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)] space-y-3 animate-in fade-in duration-300 relative overflow-hidden">
                <div className="flex items-center gap-2 text-amber-200 font-cyber font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                  <span>SAVE YOUR NEW API KEY SECURELY</span>
                </div>
                <p className="text-xs text-amber-300/80">
                  Please copy this key now. For your security, this secret token will never be shown again.
                </p>
                <div className="flex items-center gap-2 bg-black/90 p-3 rounded-xl border border-amber-500/50">
                  <code className="text-xs text-amber-200 font-mono break-all flex-1 select-all">
                    {revealedKey.rawKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyRawKey}
                    className="px-3.5 py-2 rounded-lg bg-amber-400 text-black font-cyber font-bold text-xs flex items-center gap-1.5 shrink-0 hover:bg-amber-300 transition cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  >
                    {isCopiedRawKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-black" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-black" />
                        <span>COPY KEY</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setRevealedKey(null)}
                    className="text-[11px] text-amber-300/80 hover:text-white underline cursor-pointer"
                  >
                    I have safely saved my secret token &rarr; Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Keys Table & Generator Card */}
            <div className="bg-[#08041c]/95 backdrop-blur-2xl border-2 border-amber-500/30 rounded-2xl p-5 sm:p-7 shadow-[0_0_35px_rgba(245,158,11,0.15)] space-y-4 relative overflow-hidden">
              {/* Bento Corner Accents */}
              <div className="bento-corner-accent top-l" />
              <div className="bento-corner-accent top-r" />
              <div className="bento-corner-accent bot-l" />
              <div className="bento-corner-accent bot-r" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3 relative z-10">
                <div>
                  <h2 className="text-base sm:text-lg font-cyber font-bold text-amber-200 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>API & MCP ACCESS KEYS</span>
                  </h2>
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    Generate developer keys to authenticate against the REST API and Streamable HTTP MCP Server.
                  </p>
                </div>

                {/* Generate New Key Inline Form */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={e => setNewKeyLabel(e.target.value)}
                    placeholder="Key Label (e.g. Claude MCP)"
                    className="bg-[#02010c] border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-amber-100 placeholder:text-amber-600 outline-none focus:border-amber-300 transition w-48 shadow-inner"
                  />
                  <button
                    type="button"
                    disabled={isCreatingKey}
                    onClick={handleGenerateKey}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-black font-cyber font-bold text-xs hover:brightness-110 transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>GENERATE KEY</span>
                  </button>
                </div>
              </div>

              {/* Existing Keys List */}
              {(user.apiKeys || []).length === 0 ? (
                <div className="py-12 text-center text-amber-400/60 space-y-2 relative z-10">
                  <Key className="w-10 h-10 mx-auto text-amber-500/30" />
                  <div className="text-sm font-cyber font-bold text-amber-300">NO API KEYS GENERATED YET</div>
                  <p className="text-xs text-amber-400/70 max-w-sm mx-auto">
                    Create an API key above to connect Claude Desktop, Cursor, Antigravity, or your scripts to Bitty Box.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 relative z-10">
                  {(user.apiKeys || []).map(k => (
                    <div
                      key={k.id}
                      className="p-3.5 rounded-xl bg-[#03010b] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-amber-200">{k.label}</span>
                          <span className="text-[10px] text-amber-400/80 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
                            {k.prefix}
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-300/70 mt-1.5 flex items-center gap-2 flex-wrap">
                          <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{k.requestCount || 0} Requests</span>
                          {k.lastUsedAt && (
                            <>
                              <span>•</span>
                              <span>Last active {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-amber-300">Scopes: {(k.scopes || []).join(", ")}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => revokeApiKey(k.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900 text-[10px] font-cyber font-bold self-start sm:self-center transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>REVOKE</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Key Tester */}
            <div className="bg-[#08041c]/95 backdrop-blur-2xl border-2 border-cyan-500/30 rounded-2xl p-5 sm:p-6 shadow-inner space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2 text-cyan-200 font-cyber font-bold text-sm">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>LIVE API KEY VALIDATOR</span>
              </div>
              <p className="text-xs text-cyan-300/70">
                Paste any Bitty Box API Key (`bb_live_...`) to test network connection, scope permissions, and linked account balance.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testKeyInput}
                  onChange={e => setTestKeyInput(e.target.value)}
                  placeholder="Paste bb_live_... key to test"
                  className="flex-1 bg-[#02010c] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-xs text-cyan-100 placeholder:text-cyan-600 outline-none focus:border-cyan-300 transition shadow-inner"
                />
                <button
                  type="button"
                  disabled={isTestingKey || !testKeyInput.trim()}
                  onClick={handleRunTestKey}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-cyber font-bold text-xs hover:brightness-110 transition cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                >
                  {isTestingKey ? "TESTING..." : "TEST KEY"}
                </button>
              </div>

              {testKeyResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    testKeyResult.valid
                      ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/70 border-rose-500/50 text-rose-200"
                  }`}
                >
                  {testKeyResult.valid ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>API KEY IS VALID & ACTIVE</span>
                      </div>
                      <div className="text-[11px] opacity-90">
                        Account: {testKeyResult.user?.displayName} ({testKeyResult.user?.email}) • Credits: {testKeyResult.user?.credits}
                      </div>
                      <div className="text-[10px] opacity-75">
                        Key Label: {testKeyResult.key?.label} • Scopes: {(testKeyResult.key?.scopes || []).join(", ")}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{testKeyResult.error || "Invalid or revoked API key"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: CREDITS BALANCE & REFILL PACKAGES
           ========================================================================= */}
        {activeTab === "credits" && (
          <div className="space-y-4 font-mono">
            {purchaseSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,150,0.3)] animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{purchaseSuccessMsg}</span>
              </div>
            )}

            <div className="bg-[#08041c]/95 backdrop-blur-2xl border-2 border-emerald-500/30 rounded-2xl p-5 sm:p-7 shadow-[0_0_35px_rgba(0,255,150,0.15)] space-y-5 relative overflow-hidden">
              {/* Bento Corner Accents */}
              <div className="bento-corner-accent top-l" />
              <div className="bento-corner-accent top-r" />
              <div className="bento-corner-accent bot-l" />
              <div className="bento-corner-accent bot-r" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-cyber font-bold text-emerald-200 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>CREDITS BALANCE & USAGE METER</span>
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>CUSTOMER CREDITS ACCOUNT</span>
                    </span>
                  </div>
                  <p className="text-xs text-emerald-300/70 mt-1">
                    Credits are issued, incremented, and decremented across every generated Bitty Box, REST API creation, or MCP tool call.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-400/60 text-emerald-200 font-cyber font-bold text-sm shadow-[0_0_15px_rgba(0,255,150,0.3)]">
                    {user.credits} CREDITS AVAILABLE
                  </div>
                  {user.creemCreditAccountId && (
                    <div className="text-[10px] font-mono text-emerald-400/60">
                      Ledger ID: {user.creemCreditAccountId}
                    </div>
                  )}
                </div>
              </div>

              {/* Usage Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                <div className="p-3.5 rounded-xl bg-[#03010b] border border-cyan-500/30 space-y-1">
                  <div className="text-[10px] text-cyan-400/80 font-bold uppercase">HUMAN BROWSER USAGE</div>
                  <div className="text-xl font-bold font-cyber text-cyan-200">
                    {user.creditsHumanUsed || 0}
                  </div>
                  <div className="text-[10px] text-cyan-400/60">Boxes generated via UI</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#03010b] border border-amber-500/30 space-y-1">
                  <div className="text-[10px] text-amber-400/80 font-bold uppercase">REST API CALLS</div>
                  <div className="text-xl font-bold font-cyber text-amber-200">
                    {user.creditsApiUsed || 0}
                  </div>
                  <div className="text-[10px] text-amber-400/60">Programmatic API endpoint hits</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#03010b] border border-fuchsia-500/30 space-y-1">
                  <div className="text-[10px] text-fuchsia-400/80 font-bold uppercase">MCP SERVER CALLS</div>
                  <div className="text-xl font-bold font-cyber text-fuchsia-200">
                    {user.creditsMcpUsed || 0}
                  </div>
                  <div className="text-[10px] text-fuchsia-400/60">Autonomous AI Agent Tool Invocations</div>
                </div>
              </div>

              {/* Membership Plans Overview */}
              <div className="space-y-3 pt-2 relative z-10">
                <div className="text-xs font-bold text-emerald-300 font-cyber flex items-center justify-between">
                  <span>MEMBERSHIP TIERS:</span>
                  <span className="text-[10px] text-amber-300/80">FREE &bull; PRO ($4/MO)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                  {/* Tier 1: FREE */}
                  <div className="p-4.5 rounded-xl bg-[#03010b] border border-cyan-500/30 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-200 font-cyber">FREE TIER</span>
                        <span className="text-[9px] font-mono bg-cyan-950 px-2 py-0.5 rounded text-cyan-300 border border-cyan-500/40">
                          $0 / FOREVER
                        </span>
                      </div>
                      <div className="text-xl font-extrabold font-cyber text-white mt-1">
                        UNLIMITED BOXES
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                        Unlimited Bitty Boxes, basic builder, and default themes with zero server storage.
                      </p>
                      <div className="mt-3 pt-2 border-t border-cyan-500/20 text-[10px] text-zinc-400 space-y-1">
                        <div>&bull; No access locks included</div>
                        <div>&bull; Use add-on credits for locks</div>
                      </div>
                    </div>
                    <div className="py-2 text-center text-[10px] text-cyan-400/80 bg-cyan-950/40 rounded-lg border border-cyan-500/30 font-mono">
                      CURRENT BASE ACCESS
                    </div>
                  </div>

                  {/* Tier 2: PRO */}
                  <div className="p-4.5 rounded-xl bg-gradient-to-b from-[#14062e] via-[#09031c] to-[#050112] border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col justify-between space-y-3 relative">
                    <div className="absolute -top-2.5 right-3 bg-amber-400 text-black text-[9px] font-cyber font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow-md">
                      ⭐ RECOMMENDED
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-200 font-cyber flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          BITTY BOX PRO
                        </span>
                        <span className="text-[9px] font-mono bg-amber-950 px-2 py-0.5 rounded text-amber-300 border border-amber-500/50 font-bold">
                          $4/MO FLAT RATE
                        </span>
                      </div>
                      <div className="text-xl font-extrabold font-cyber text-white mt-1">
                        ALL FEATURES UNLOCKED
                      </div>
                      <p className="text-[11px] text-amber-100/90 mt-1 leading-relaxed">
                        Passcode PIN locks, Time Locks (Duration, Delay, Date Schedule), Reveal + Decay, Visitor Quota, and premium themes.
                      </p>
                      <div className="mt-2 pt-2 border-t border-amber-500/30 text-[10px] text-amber-200/90 space-y-0.5">
                        <div className="text-emerald-300 font-bold">&bull; Unlimited lock generation with 0 credits</div>
                        <div>&bull; 1,000 monthly Credits included</div>
                        <div>&bull; Views &amp; unlock event telemetry</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="https://creem.io/product/prod_324HFJtSwkJk6B3qCSnCXq"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-black font-cyber font-bold text-[10px] tracking-wider flex items-center justify-center gap-1 transition shadow-sm hover:brightness-110"
                      >
                        <span>$4 / MO</span>
                        <ExternalLink className="w-3 h-3 text-black" />
                      </a>
                      <a
                        href="https://creem.io/product/prod_324HFJtSwkJk6B3qCSnCXq"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 rounded-lg bg-amber-950 border border-amber-400/60 text-amber-200 font-cyber font-bold text-[10px] tracking-wider flex items-center justify-center gap-1 transition hover:bg-amber-900"
                        title="Includes 1,000 monthly credits"
                      >
                        <span>1,000 CR/MO</span>
                        <ExternalLink className="w-3 h-3 text-amber-300" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lock Credit Costs Reference Bar */}
              <div className="p-4 rounded-xl bg-[#03010b] border border-cyan-500/30 space-y-2 relative z-10">
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between">
                  <span>PAY-AS-YOU-GO LOCK CREDIT COSTS:</span>
                  <span className="text-[10px] text-emerald-400 font-bold">CREDITS NEVER EXPIRE</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/25 flex items-center justify-between">
                    <span className="text-zinc-300 text-[11px]">Passcode (PIN)</span>
                    <span className="font-bold text-emerald-400">FREE (0 CR)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/25 flex items-center justify-between">
                    <span className="text-zinc-300 text-[11px]">Time-Based Locks</span>
                    <span className="font-bold text-amber-400">10 CR</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/25 flex items-center justify-between">
                    <span className="text-zinc-300 text-[11px]">Reveal + Decay</span>
                    <span className="font-bold text-rose-400">10 CR</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/25 flex items-center justify-between">
                    <span className="text-zinc-300 text-[11px]">Visitor Quota</span>
                    <span className="font-bold text-emerald-400">10 CR</span>
                  </div>
                </div>
              </div>

              {/* Credit Top-Up Packages */}
              <div className="space-y-3 pt-2 relative z-10">
                <div className="text-xs font-bold text-emerald-300 font-cyber">CREDIT REFILL PACKAGES:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Pack 1: 1,000 Credits (Starter) */}
                  <div className="p-4.5 rounded-xl bg-[#03010b] border border-cyan-500/40 hover:border-cyan-300 transition flex flex-col justify-between space-y-3 shadow-inner">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-200 font-cyber flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-cyan-400" />
                          1,000 CREDITS
                        </span>
                        <span className="text-[10px] font-mono bg-cyan-950 px-2 py-0.5 rounded text-cyan-300 border border-cyan-500/40">
                          $10.00
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold font-cyber text-cyan-300 mt-2">
                        1,000 <span className="text-xs font-normal text-cyan-400/70 font-mono">CREDITS</span>
                      </div>
                      <p className="text-[11px] text-cyan-300/70 mt-1 leading-relaxed">
                        Starter top-up: $0.01 / credit. Test PRO access locks with pay-as-you-go credits.
                      </p>
                    </div>

                    <a
                      href="https://creem.io/product/prod_6W2ZUtURJf1Mk02xaq6aJF"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 font-cyber font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                    >
                      <span>BUY 1,000 CREDITS ($10)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
                    </a>
                  </div>

                  {/* Pack 2: 5,000 Credits (Growth) */}
                  <div className="p-4.5 rounded-xl bg-gradient-to-b from-emerald-950/40 to-[#03010b] border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(0,255,150,0.2)] flex flex-col justify-between space-y-3 relative">
                    <div className="absolute -top-2.5 right-3 bg-emerald-400 text-black text-[9px] font-cyber font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow-md">
                      POPULAR &bull; BEST VALUE
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-200 font-cyber flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-emerald-400" />
                          5,000 CREDITS
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 border border-emerald-500/40">
                          $35.00
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold font-cyber text-emerald-300 mt-2">
                        5,000 <span className="text-xs font-normal text-emerald-400/70 font-mono">CREDITS</span>
                      </div>
                      <p className="text-[11px] text-emerald-300/80 mt-1 leading-relaxed">
                        Growth top-up: $0.007 / credit. Ideal for creators deploying secured micro-links.
                      </p>
                    </div>

                    <a
                      href="https://creem.io/product/prod_1ybKpsP1FQPyKvVZUVSg0A"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-emerald-400 text-black font-cyber font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(0,255,150,0.4)] hover:brightness-110 active:scale-[0.99]"
                    >
                      <span>BUY 5,000 CREDITS ($35)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-black" />
                    </a>
                  </div>

                  {/* Pack 3: 15,000 Credits (Pro) */}
                  <div className="p-4.5 rounded-xl bg-[#03010b] border border-cyan-500/40 hover:border-cyan-300 transition flex flex-col justify-between space-y-3 shadow-inner">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-200 font-cyber flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-cyan-400" />
                          15,000 CREDITS
                        </span>
                        <span className="text-[10px] font-mono bg-cyan-950 px-2 py-0.5 rounded text-cyan-300 border border-cyan-500/40">
                          $90.00
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold font-cyber text-cyan-300 mt-2">
                        15,000 <span className="text-xs font-normal text-cyan-400/70 font-mono">CREDITS</span>
                      </div>
                      <p className="text-[11px] text-cyan-300/70 mt-1 leading-relaxed">
                        Pro power bundle: $0.006 / credit. Maximum volume for automated links &amp; agent tools.
                      </p>
                    </div>

                    <a
                      href="https://creem.io/product/prod_2qRxHcyee2IvOfAiIFKYw6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 font-cyber font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                    >
                      <span>BUY 15,000 CREDITS ($90)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Transactions Log */}
              <div className="space-y-2 pt-3 border-t border-emerald-500/20 relative z-10">
                <div className="text-xs font-bold text-emerald-300 font-cyber">CREDIT TRANSACTION HISTORY:</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(user.transactions || []).map(t => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-[#02010c] border border-emerald-500/20 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase ${
                            t.type === "purchase"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                          }`}
                        >
                          {t.type}
                        </span>
                        <span className="text-emerald-100">{t.description}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-emerald-400/70 shrink-0">
                        <span className="font-bold text-emerald-300">+{t.amount} CR</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: MCP SERVER CONFIGURATION
           ========================================================================= */}
        {activeTab === "mcp" && (
          <div className="bg-[#08041c]/95 backdrop-blur-2xl border-2 border-fuchsia-500/30 rounded-2xl p-5 sm:p-7 shadow-[0_0_35px_rgba(189,0,255,0.15)] font-mono space-y-4 relative overflow-hidden">
            {/* Bento Corner Accents */}
            <div className="bento-corner-accent top-l" />
            <div className="bento-corner-accent top-r" />
            <div className="bento-corner-accent bot-l" />
            <div className="bento-corner-accent bot-r" />

            <div className="border-b border-fuchsia-500/20 pb-3 relative z-10">
              <h2 className="text-base sm:text-lg font-cyber font-bold text-fuchsia-200 flex items-center gap-2">
                <Bot className="w-4 h-4 text-fuchsia-400" />
                <span>MODEL CONTEXT PROTOCOL (MCP) INTEGRATION</span>
              </h2>
              <p className="text-xs text-fuchsia-300/70 mt-0.5">
                Connect Claude Desktop, Cursor, Antigravity, and AI Agents to Bitty Box via Streamable HTTP.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/70 border border-fuchsia-500/30 space-y-2 relative z-10">
              <div className="text-xs font-bold text-fuchsia-300 font-cyber">MCP SERVER ENDPOINT:</div>
              <div className="flex items-center gap-2 bg-[#02010c] p-2.5 rounded-xl border border-fuchsia-500/20">
                <code className="text-xs text-cyan-200 font-mono flex-1 select-all">
                  https://bittybox.org/mcp
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText("https://bittybox.org/mcp")}
                  className="px-3 py-1.5 rounded-lg bg-fuchsia-950 border border-fuchsia-500/40 text-fuchsia-200 text-[10px] font-bold font-cyber hover:bg-fuchsia-900 cursor-pointer transition"
                >
                  COPY URL
                </button>
              </div>
            </div>

            {/* Claude Desktop Config Snippet */}
            <div className="p-4 rounded-xl bg-black/70 border border-fuchsia-500/30 space-y-2 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fuchsia-300 font-cyber">CLAUDE DESKTOP CONFIG:</span>
                <span className="text-[10px] text-fuchsia-400/60">claude_desktop_config.json</span>
              </div>
              <pre className="text-[11px] text-cyan-200 bg-[#02010c] p-3.5 rounded-xl border border-fuchsia-500/20 overflow-x-auto select-all leading-5">
{`{
  "mcpServers": {
    "bittybox": {
      "url": "https://bittybox.org/mcp",
      "headers": {
        "Authorization": "Bearer ${user.apiKeys?.[0]?.prefix ? "YOUR_API_KEY" : "YOUR_API_KEY"}"
      }
    }
  }
}`}
              </pre>
            </div>

            {/* Available MCP Tools */}
            <div className="space-y-2 pt-2 relative z-10">
              <div className="text-xs font-bold text-fuchsia-300 font-cyber">EXPOSED MCP TOOLS:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#02010c] border border-fuchsia-500/25 space-y-1.5">
                  <div className="font-bold font-cyber text-cyan-200">create_bitty_link</div>
                  <div className="text-[10px] text-fuchsia-300/70 leading-relaxed">
                    Creates universal compressed browser links for any HTML, markdown, code, or data with optional passcode and time locks.
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#02010c] border border-fuchsia-500/25 space-y-1.5">
                  <div className="font-bold font-cyber text-cyan-200">create_code_bitty_link</div>
                  <div className="text-[10px] text-fuchsia-300/70 leading-relaxed">
                    Creates syntax-highlighted code viewers with line numbers, copy actions, and custom themes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {selectedBox && (() => {
          const lock = getBoxLockSnapshot(selectedBox);
          const hasAnyLock = lock.hasPassword || lock.hasTimeWindow || lock.hasAccessLimit;
          return (
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBox(null)}
            >
              <motion.div
                className="w-full max-w-2xl rounded-2xl border-2 border-cyan-400/50 bg-[#050316] shadow-[0_0_60px_rgba(0,242,255,0.25)] p-5 sm:p-6 font-mono text-cyan-100 space-y-4"
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-cyan-500/25 pb-3">
                  <div className="min-w-0">
                    <div className="text-[10px] text-cyan-400/70 uppercase tracking-[0.24em]">Box detail telemetry</div>
                    <h3 className="text-lg font-cyber font-bold text-cyan-100 truncate">{selectedBox.title || "Untitled Bitty Box"}</h3>
                    <p className="text-[11px] text-cyan-300/70">Created {new Date(selectedBox.createdAt).toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedBox(null)} className="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60 text-xs cursor-pointer">CLOSE</button>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase text-cyan-400/70 font-bold">Share URL</div>
                  <div className="rounded-xl border border-cyan-500/25 bg-black/60 p-3 text-[11px] break-all select-all">{selectedBox.url}</div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
                    <div className="text-[10px] uppercase text-cyan-300/70 font-bold mb-1">Format / size</div>
                    <div className="text-sm text-cyan-100">{selectedBox.format || "HTML"}{selectedBox.stats?.rawLength ? ` · ${selectedBox.stats.rawLength} bytes raw` : ""}</div>
                  </div>

                  <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/15 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-fuchsia-200 font-cyber font-bold text-sm"><Shield className="w-4 h-4" /> Lock status</div>
                    {!hasAnyLock ? (
                      <div className="text-xs text-cyan-300/70">No locks detected on this box.</div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {lock.hasPassword && <div className="flex items-center justify-between gap-3 rounded-lg bg-black/40 border border-fuchsia-500/25 p-2"><span className="inline-flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-fuchsia-300" /> Passcode / encryption</span><span className="text-fuchsia-200">ENABLED</span></div>}
                        {lock.hasAccessLimit && <div className="flex items-center justify-between gap-3 rounded-lg bg-black/40 border border-emerald-500/25 p-2"><span className="inline-flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-emerald-300" /> Visitor quota</span><span className="text-emerald-200">ENABLED</span></div>}
                        {lock.hasTimeWindow && (
                          <div className="rounded-lg bg-black/40 border border-amber-500/25 p-2 space-y-2">
                            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-300" /> Time lock</span><span className="text-amber-200">{lock.timeStatus}</span></div>
                            {lock.timeRemainingLabel && <div className="text-xl font-cyber text-cyan-100 tracking-wider">{lock.timeBoundary === "unlocks" ? "UNLOCKS IN" : lock.timeWindow?.mode === "hybrid" ? "BURNS IN" : "EXPIRES IN"}: {lock.timeRemainingLabel}</div>}
                            {lock.timeWindow?.notBefore && <div className="text-[10px] text-cyan-300/65">Opens: {new Date(lock.timeWindow.notBefore).toLocaleString()}</div>}
                            {lock.timeWindow?.notAfter && <div className="text-[10px] text-cyan-300/65">Closes: {new Date(lock.timeWindow.notAfter).toLocaleString()}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button type="button" onClick={() => handleCopyBoxUrl(selectedBox)} className="flex-1 px-4 py-2 rounded-xl bg-cyan-500 text-black font-cyber font-bold text-xs hover:brightness-110 cursor-pointer">COPY LINK</button>
                  <a href={selectedBox.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-2 rounded-xl border border-purple-500/50 text-purple-200 hover:bg-purple-950/50 font-cyber font-bold text-xs">OPEN BOX</a>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
