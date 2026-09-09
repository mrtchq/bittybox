import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  QrCode, 
  FolderArchive, 
  ExternalLink, 
  RefreshCw, 
  LogOut, 
  Sparkles, 
  Search, 
  Shield, 
  Palette, 
  Check, 
  HardDrive, 
  Layers, 
  Crown, 
  Zap, 
  Copy, 
  UploadCloud, 
  FileCode2, 
  Activity, 
  History, 
  Info,
  ChevronRight,
  ChevronDown,
  Lock,
  FileText,
  User,
  Key,
  Coins,
  Bot,
  Trash2,
  Plus,
  Clock,
  Flame,
  Terminal,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Code,
  Mail,
  Send,
  Inbox
} from 'lucide-react';
import { BittyMetadata, BittySession, WorkspaceMode, WorkspaceTheme, TrackedBittyBox, ApiKeyMeta } from '../types';
import { UseAccountResult } from '../hooks/useAccount';
import { motion, AnimatePresence } from 'motion/react';
import { GRIP_ICON_DATA_URL } from './EdgeGripHandles';
import { CyberScrambleText } from './CyberScrambleText';
import { PrismCheckbox } from './PrismCheckbox';
import { AccountDashboard, GoogleIcon } from './AccountDashboard';
import { UserAvatar } from './UserAvatar';
import { LegalModal, LegalTab } from './LegalModal';

interface StudioToolsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  account: UseAccountResult;
  onGenerate?: () => void;
  bittyUrl?: string;
  originalBytes?: number;
  compressedBytes?: number;
  isCopied?: boolean;
  onOpenQr?: (url?: string) => void;
  onShare?: () => void;
  onPreviewInTab?: () => void;
  onExportZip?: () => void;
  onNewBox?: () => void;
  onReplaySplash?: () => void;
  onNavigateToSlide01?: () => void;
  theme?: WorkspaceTheme;
  onThemeChange?: (theme: WorkspaceTheme) => void;
  mode?: WorkspaceMode;
  onModeChange?: (mode: WorkspaceMode) => void;
  isPro?: boolean;
  onOpenPaywall?: (featureName?: string) => void;
  metadata?: BittyMetadata;
}

const THEMES: { id: WorkspaceTheme; name: string; desc: string; previewBg: string }[] = [
  {
    id: 'synthwave',
    name: 'Neon Synthwave',
    desc: 'Deep cosmic violet, vibrant cyan glow & retro magenta highlights',
    previewBg: 'from-[#050515] via-[#240b36] to-[#00f2ff]',
  },
  {
    id: 'monochrome',
    name: 'Minimalist Monochrome',
    desc: 'High-contrast obsidian dark base with crisp paper-white typography',
    previewBg: 'from-[#08080c] via-[#1c1c24] to-[#f4f4f8]',
  },
  {
    id: 'matrix',
    name: 'Matrix Cyber',
    desc: 'Pure hacker green phosphor scanlines, deep carbon base & emerald rain',
    previewBg: 'from-[#020d06] via-[#052b14] to-[#00ff66]',
  },
];

export const StudioToolsSidePanel: React.FC<StudioToolsSidePanelProps> = ({
  isOpen,
  onClose,
  account,
  onGenerate,
  bittyUrl = '',
  originalBytes = 0,
  compressedBytes = 0,
  isCopied = false,
  onOpenQr,
  onShare,
  onPreviewInTab,
  onExportZip,
  onNewBox,
  onReplaySplash,
  onNavigateToSlide01,
  theme = 'synthwave',
  onThemeChange,
  mode = 'beginner',
  onModeChange,
  isPro = false,
  onOpenPaywall,
  metadata,
}) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    signInWithGoogle,
    login,
    register,
    requestMagicLink,
    logout,
    refreshUser,
    generateApiKey,
    revokeApiKey,
    testApiKey,
    purchaseCredits,
    deleteTrackedBox,
  } = account;

  const [activeTab, setActiveTab] = useState<'account' | 'boxes' | 'keys' | 'credits' | 'mcp'>('account');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');

  // Auth Form local state (Google & Magic Link)
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicSentEmail, setMagicSentEmail] = useState('');
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [trustDeviceOnLogin, setTrustDeviceOnLogin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bitty_device_trusted') !== 'false';
    } catch {
      return true;
    }
  });

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setAuthMsg(null);
    try {
      const result = await signInWithGoogle();
      if (!result.success && !result.redirecting) {
        setAuthMsg(result.error || 'Google sign-in could not be completed.');
      }
    } catch (err: any) {
      setAuthMsg(err.message || 'Google sign-in error.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Tracked Boxes Filter
  const [boxSearchQuery, setBoxSearchQuery] = useState('');
  const [copiedBoxId, setCopiedBoxId] = useState<string | null>(null);

  // API Key Generator Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('Production Agent');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['links:create', 'links:read', 'mcp:access']);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);
  const [keyGenerating, setKeyGenerating] = useState(false);
  const [testKeyInput, setTestKeyInput] = useState('');
  const [testKeyResult, setTestKeyResult] = useState<any>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const compressionRatio =
    originalBytes > 0
      ? Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100))
      : 0;

  // Handle Magic Link Submission
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setAuthMsg('Please provide a valid email address.');
      return;
    }
    setAuthSubmitting(true);
    setAuthMsg(null);
    try {
      const res = await requestMagicLink(email.trim(), displayName.trim(), trustDeviceOnLogin);
      if (res.success) {
        setMagicSentEmail(email.trim());
        setMagicLinkSent(true);
      } else {
        setAuthMsg(res.error || 'Failed to dispatch magic link. Please retry.');
      }
    } catch (err: any) {
      setAuthMsg(err.message || 'Transmission error. Check connectivity.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle API Key Creation
  const handleCreateApiKey = async () => {
    setKeyGenerating(true);
    try {
      const result = await generateApiKey(newKeyLabel.trim() || 'API Key', newKeyScopes);
      if (result && result.rawKey) {
        setCreatedKeySecret(result.rawKey);
        setNewKeyLabel('Production Agent');
      }
    } finally {
      setKeyGenerating(false);
    }
  };

  // Handle Testing Key
  const handleTestKey = async () => {
    if (!testKeyInput.trim()) return;
    setIsTestingKey(true);
    try {
      const res = await testApiKey(testKeyInput.trim());
      setTestKeyResult(res);
    } finally {
      setIsTestingKey(false);
    }
  };

  // Filtered Boxes
  const filteredBoxes = (user?.links || []).filter(link => {
    if (!boxSearchQuery.trim()) return true;
    const q = boxSearchQuery.toLowerCase();
    return (
      (link.title || '').toLowerCase().includes(q) ||
      (link.url || '').toLowerCase().includes(q) ||
      (link.format || '').toLowerCase().includes(q)
    );
  });

  const handleCopyBoxUrl = (box: TrackedBittyBox) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(box.url);
      setCopiedBoxId(box.id);
      setTimeout(() => setCopiedBoxId(null), 2500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none font-sans">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Sliding Panel from Bottom */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 w-full max-w-5xl mx-auto h-[88vh] max-h-[92vh] bg-[#040d18]/98 border-t-2 border-x-2 border-cyan-500/40 rounded-t-3xl shadow-[0_0_60px_rgba(0,242,255,0.35)] flex flex-col z-50 overflow-hidden"
          >
            {/* Ambient Top Glow Beam */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-teal-400 to-purple-500 shadow-[0_0_15px_#00f2ff]" />

            {/* Panel Header */}
            <div className="p-4 sm:p-5 border-b border-cyan-500/25 bg-[#051426]/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tl from-cyan-950 to-teal-900 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                  <img
                    src={GRIP_ICON_DATA_URL}
                    alt="Tools Grip Icon"
                    className="w-5 h-5 filter invert-[80%] sepia-[90%] saturate-[600%] hue-rotate-[140deg] brightness-[120%]"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-cyber font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-fuchsia-300">
                      <CyberScrambleText text="BITTY TOOLS & ACCOUNT" speed={25} />
                    </h2>
                    {user && (
                      <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                        {user.credits} CR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cyan-300/70 font-mono hidden sm:block">
                    {user ? `Signed in as ${user.displayName || user.email}` : 'Autonomous agent tools, API keys & account management.'}
                  </p>
                </div>
              </div>

              {/* Close / Dismiss */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 hover:text-white transition flex items-center gap-1 text-xs font-mono cursor-pointer"
                  title="Close Tools Panel"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span className="hidden sm:inline">CLOSE</span>
                </button>
              </div>
            </div>

            {/* Segmented Tab Navigation Header (Authenticated only) */}
            {isAuthenticated && (
              <div className="px-4 py-2 border-b border-cyan-500/20 bg-[#030d1a]/90 flex items-center gap-1.5 overflow-x-auto font-mono text-xs scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('account')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'account'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-400/50 shadow-sm'
                      : 'text-cyan-400/60 hover:text-cyan-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ACCOUNT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('boxes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'boxes'
                      ? 'bg-fuchsia-950 text-fuchsia-200 border border-fuchsia-400/50 shadow-sm'
                      : 'text-fuchsia-400/60 hover:text-fuchsia-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>TRACKED BOXES ({(user?.links || []).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('keys')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'keys'
                      ? 'bg-amber-950 text-amber-200 border border-amber-400/50 shadow-sm'
                      : 'text-amber-400/60 hover:text-amber-200'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>API KEYS ({(user?.apiKeys || []).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('credits')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'credits'
                      ? 'bg-emerald-950 text-emerald-200 border border-emerald-400/50 shadow-sm'
                      : 'text-emerald-400/60 hover:text-emerald-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CREDITS ({user?.credits || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('mcp')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'mcp'
                      ? 'bg-purple-950 text-purple-200 border border-purple-400/50 shadow-sm'
                      : 'text-purple-400/60 hover:text-purple-200'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>MCP SERVER</span>
                </button>
              </div>
            )}

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 cyber-scrollbar space-y-6">

              {activeTab === 'account' && (
                <div className="-m-4 sm:-m-6">
                  <AccountDashboard
                    account={account}
                    onNavigateToSlide01={onNavigateToSlide01 || onReplaySplash || (() => {})}
                    onOpenQr={onOpenQr}
                  />
                </div>
              )}

              {/* =========================================================================
                  TAB 1: ACCOUNT (LEGACY PANEL ACCOUNT - disabled; official AccountDashboard renders above)
                 ========================================================================= */}
              {false && activeTab === 'account' && (
                <div>
                  {!isAuthenticated ? (
                    <div className="max-w-md mx-auto space-y-4 font-mono">
                      {/* Sign In Form */}
                      <div className="bg-[#06182c]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl relative">
                        {/* Primary Google Sign In Button */}
                        <div className="mb-4">
                          <button
                            id="sidepanel-google-signin-btn"
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || authSubmitting}
                            className="w-full py-3 px-3.5 rounded-xl font-sans font-bold text-xs tracking-wide text-white bg-gradient-to-r from-[#0d1c30] via-[#10243d] to-[#0c1c2e] hover:from-[#132845] hover:to-[#173254] border-2 border-cyan-400/60 hover:border-cyan-300 active:scale-[0.99] transition-all duration-200 shadow-[0_0_25px_rgba(0,242,255,0.25)] cursor-pointer disabled:opacity-50 flex items-center justify-center group"
                          >
                            {googleLoading ? (
                              <div className="flex items-center justify-center gap-2 w-full">
                                <RefreshCw className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                                <span className="font-mono text-cyan-200 text-[11px]">AUTHENTICATING...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-md p-0.5 group-hover:scale-105 transition-transform">
                                  <GoogleIcon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold text-slate-100 group-hover:text-white">
                                  Sign In with Google
                                </span>
                              </div>
                            )}
                          </button>
                        </div>

                        {/* Visual Divider */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                          <span className="text-[9px] uppercase font-mono tracking-widest text-cyan-400/60">
                            OR SIGN IN WITH EMAIL
                          </span>
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        </div>

                        {magicLinkSent ? (
                          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 mx-auto flex items-center justify-center">
                              <Mail className="w-6 h-6 text-cyan-300 animate-bounce" />
                            </div>
                            <h4 className="font-cyber text-sm font-bold text-white">TRANSMISSION DISPATCHED</h4>
                            <p className="text-xs text-cyan-200 break-all">Sent to: <span className="font-bold text-cyan-300">{magicSentEmail}</span></p>
                            <p className="text-[11px] text-cyan-300/70">
                              Check your email and click the magic link to access your account instantly.
                            </p>
                            <button
                              type="button"
                              onClick={() => { setMagicLinkSent(false); setAuthMsg(null); }}
                              className="w-full py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-cyan-900/40 transition cursor-pointer"
                            >
                              SEND TO A DIFFERENT EMAIL
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                            <div>
                              <label className="block text-[11px] font-bold text-cyan-300 mb-1">YOUR EMAIL ADDRESS:</label>
                              <div className="relative">
                                <input
                                  type="email"
                                  required
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                                  placeholder="developer@yourdomain.com"
                                  className="w-full bg-[#02010c] border border-cyan-500/30 rounded-lg pl-9 pr-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-500/40 outline-none focus:border-cyan-400 transition"
                                />
                                <Mail className="w-4 h-4 text-cyan-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-cyan-300 mb-1">CALLSIGN / NAME (OPTIONAL):</label>
                              <input
                                type="text"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder="e.g. Cypher_01, Alex Developer"
                                className="w-full bg-[#02010c] border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-500/40 outline-none focus:border-cyan-400 transition"
                              />
                            </div>

                            {authMsg && (
                              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>{authMsg}</span>
                              </div>
                            )}

                            {/* Trust this device for 30 days (Prism Checkbox) */}
                            <div className="py-1">
                              <PrismCheckbox
                                checked={trustDeviceOnLogin}
                                onChange={(checked) => {
                                  setTrustDeviceOnLogin(checked);
                                  try {
                                    localStorage.setItem('bitty_device_trusted', String(checked));
                                  } catch {}
                                }}
                                label="Trust this device for 30 days"
                                description="Stay signed in without having to authenticate on this device."
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={authSubmitting}
                              className="w-full py-2.5 rounded-xl font-cyber font-bold text-xs tracking-wider text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:brightness-110 active:scale-[0.99] transition shadow-[0_0_20px_rgba(0,242,255,0.4)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
                            <div className="text-[10px] text-cyan-400/60 text-center font-mono mt-2">
                              ⚡ Passwordless email sign-in • Instant single-use magic link
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Authenticated Profile Overview */
                    <div className="space-y-5 font-mono">
                      {/* Top User Bento Header */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#06182c]/90 via-[#0a203a]/90 to-[#0c132c]/90 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={user}
                            size="lg"
                            showStatusDot={true}
                            isOnline={true}
                            altText={user.displayName || user.email}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold font-cyber text-white">
                                {user.displayName || 'Anonymous Builder'}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-400/40">
                                {user.tier || 'FREE TIER'}
                              </span>
                            </div>
                            <div className="text-xs text-cyan-300/70 font-mono mt-0.5">{user.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={logout}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5 text-rose-400" />
                            <span>SIGN OUT</span>
                          </button>
                        </div>
                      </div>

                      {/* Metric Stats Bento Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-[#030d1a] border border-cyan-500/25">
                          <div className="text-[10px] text-cyan-400/70 uppercase font-bold flex items-center justify-between">
                            <span>CREDITS</span>
                            <Coins className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div className="text-xl font-bold font-cyber text-cyan-200 mt-1">
                            {user.credits} <span className="text-xs text-cyan-400/60 font-normal">CR</span>
                          </div>
                          <button
                            onClick={() => setActiveTab('credits')}
                            className="text-[10px] text-teal-300 hover:underline mt-1 block"
                          >
                            + Refill Credits ?
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-[#030d1a] border border-fuchsia-500/25">
                          <div className="text-[10px] text-fuchsia-400/70 uppercase font-bold flex items-center justify-between">
                            <span>TRACKED BOXES</span>
                            <History className="w-3.5 h-3.5 text-fuchsia-400" />
                          </div>
                          <div className="text-xl font-bold font-cyber text-fuchsia-200 mt-1">
                            {(user.links || []).length}
                          </div>
                          <button
                            onClick={() => setActiveTab('boxes')}
                            className="text-[10px] text-fuchsia-300 hover:underline mt-1 block"
                          >
                            View All Logs ?
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-[#030d1a] border border-amber-500/25">
                          <div className="text-[10px] text-amber-400/70 uppercase font-bold flex items-center justify-between">
                            <span>API KEYS</span>
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <div className="text-xl font-bold font-cyber text-amber-200 mt-1">
                            {(user.apiKeys || []).length}
                          </div>
                          <button
                            onClick={() => setActiveTab('keys')}
                            className="text-[10px] text-amber-300 hover:underline mt-1 block"
                          >
                            Manage Keys ?
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-[#030d1a] border border-purple-500/25">
                          <div className="text-[10px] text-purple-400/70 uppercase font-bold flex items-center justify-between">
                            <span>MCP / AGENTS</span>
                            <Bot className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                          <div className="text-xl font-bold font-cyber text-purple-200 mt-1">
                            {(user.creditsMcpUsed || 0) + (user.creditsApiUsed || 0)}
                          </div>
                          <button
                            onClick={() => setActiveTab('mcp')}
                            className="text-[10px] text-purple-300 hover:underline mt-1 block"
                          >
                            MCP Config ?
                          </button>
                        </div>
                      </div>

                      {/* Quick Navigation Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div
                          onClick={() => setActiveTab('boxes')}
                          className="p-4 rounded-xl bg-[#06182c]/80 border border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-cyan-200 font-bold text-xs">
                              <History className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
                              <span>DEDICATED BOXES LOG</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <p className="text-[11px] text-cyan-300/70 mt-1">
                            Access links generated while signed in with instant 1-click sharing and QR code modal.
                          </p>
                        </div>

                        <div
                          onClick={() => setActiveTab('keys')}
                          className="p-4 rounded-xl bg-[#06182c]/80 border border-amber-500/30 hover:border-amber-400 transition cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-200 font-bold text-xs">
                              <Key className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                              <span>API KEYS & TOKENS</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <p className="text-[11px] text-amber-300/70 mt-1">
                            Provision live programmatic tokens for AI agents and developer toolchains.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================================
                  TAB 2: TRACKED BOXES LOG
                 ========================================================================= */}
              {activeTab === 'boxes' && isAuthenticated && (
                <div className="bg-[#06182c]/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-xl font-mono space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                    <div>
                      <h3 className="text-sm font-cyber font-bold text-cyan-200 flex items-center gap-2">
                        <History className="w-4 h-4 text-cyan-400" />
                        <span>TRACKED BITTY BOXES</span>
                      </h3>
                      <p className="text-[11px] text-cyan-300/70 mt-0.5">
                        Boxes generated while signed in are automatically logged here.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-cyan-400/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={boxSearchQuery}
                        onChange={e => setBoxSearchQuery(e.target.value)}
                        placeholder="Search boxes..."
                        className="w-full bg-[#02010c] border border-cyan-500/30 rounded-lg pl-8 pr-3 py-1 text-xs text-cyan-100 placeholder:text-cyan-500/40 outline-none focus:border-cyan-400 transition"
                      />
                    </div>
                  </div>

                  {filteredBoxes.length === 0 ? (
                    <div className="py-8 text-center text-cyan-400/60 space-y-2">
                      <History className="w-8 h-8 mx-auto text-cyan-500/30 animate-pulse" />
                      <div className="text-xs font-cyber text-cyan-300">NO BOXES FOUND</div>
                      <p className="text-[11px] text-cyan-400/70">
                        {boxSearchQuery ? 'No boxes matched your search.' : 'Generate a Bitty Box on the homepage and it will appear here!'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto cyber-scrollbar pr-1">
                      {filteredBoxes.map(box => (
                        <div
                          key={box.id}
                          className="p-3 rounded-xl bg-[#03010b] border border-cyan-500/25 hover:border-cyan-400/50 transition flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-xs text-cyan-200 line-clamp-1">
                              {box.title || 'Untitled Bitty Box'}
                            </div>
                            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 shrink-0">
                              {box.format || 'HTML'}
                            </span>
                          </div>

                          <div className="text-[10px] text-cyan-400/60 font-mono truncate bg-black/50 p-1.5 rounded border border-cyan-500/15">
                            {box.url}
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyBoxUrl(box)}
                                className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                {copiedBoxId === box.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-300">COPIED</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-cyan-400" />
                                    <span>COPY</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={box.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 hover:bg-purple-900 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>OPEN</span>
                              </a>

                              {onOpenQr && (
                                <button
                                  type="button"
                                  onClick={() => onOpenQr(box.url)}
                                  className="px-2.5 py-1 rounded bg-teal-950/80 border border-teal-500/40 text-teal-300 hover:bg-teal-900 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <QrCode className="w-3 h-3" />
                                  <span>QR</span>
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteTrackedBox(box.id)}
                              className="p-1 rounded text-rose-400/60 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                              title="Delete tracked link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================================
                  TAB 3: API KEYS & ACCESS TOKENS
                 ========================================================================= */}
              {activeTab === 'keys' && isAuthenticated && (
                <div className="bg-[#06182c]/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl font-mono space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                    <div>
                      <h3 className="text-sm font-cyber font-bold text-amber-200 flex items-center gap-2">
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>PROGRAMMATIC API KEYS</span>
                      </h3>
                      <p className="text-[11px] text-amber-300/70 mt-0.5">
                        Live API tokens for autonomous agents, REST APIs & MCP integrations.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCreatedKeySecret(null);
                        setIsKeyModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-cyber font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:brightness-110 transition cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>GENERATE NEW KEY</span>
                    </button>
                  </div>

                  {/* Active Keys List */}
                  {(user?.apiKeys || []).length === 0 ? (
                    <div className="py-8 text-center text-amber-400/60 space-y-2">
                      <Key className="w-8 h-8 mx-auto text-amber-500/30 animate-pulse" />
                      <div className="text-xs font-cyber text-amber-300">NO API KEYS GENERATED</div>
                      <p className="text-[11px] text-amber-400/70">
                        Create an API key to allow external scripts and AI agents to generate Bitty Boxes automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(user?.apiKeys || []).map(k => (
                        <div
                          key={k.id}
                          className="p-3 rounded-xl bg-[#03010b] border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-bold text-xs text-amber-200 flex items-center gap-2">
                              <span>{k.label}</span>
                              <span className="text-[9px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                                {k.keyPrefix}...
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-300/70 mt-1 flex items-center gap-2">
                              <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                              <span>?</span>
                              <span>Scopes: {(k.scopes || []).join(', ')}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => revokeApiKey(k.id)}
                            className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer self-start sm:self-center"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>REVOKE</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Key Generator Modal Inline */}
                  {isKeyModalOpen && (
                    <div className="p-4 rounded-xl bg-black/60 border border-amber-400/40 space-y-3 animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-200 font-cyber">CREATE API KEY</span>
                        <button
                          onClick={() => setIsKeyModalOpen(false)}
                          className="text-zinc-400 hover:text-white text-xs"
                        >
                          ?
                        </button>
                      </div>

                      {createdKeySecret ? (
                        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 space-y-2">
                          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>KEY GENERATED (COPY NOW - WILL NOT BE SHOWN AGAIN)</span>
                          </div>
                          <div className="p-2 rounded bg-black/80 font-mono text-xs text-cyan-200 break-all border border-emerald-500/30">
                            {createdKeySecret}
                          </div>
                          <button
                            onClick={() => {
                              if (navigator.clipboard) navigator.clipboard.writeText(createdKeySecret);
                            }}
                            className="w-full py-1.5 rounded bg-emerald-500 text-black font-bold text-xs hover:brightness-110 transition"
                          >
                            COPY SECRET KEY
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] text-amber-300 mb-1">KEY LABEL:</label>
                            <input
                              type="text"
                              value={newKeyLabel}
                              onChange={e => setNewKeyLabel(e.target.value)}
                              placeholder="e.g. Anthropic MCP Server"
                              className="w-full bg-[#02010c] border border-amber-500/30 rounded px-2.5 py-1.5 text-xs text-amber-100 outline-none focus:border-amber-400"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateApiKey}
                            disabled={keyGenerating}
                            className="w-full py-2 rounded-lg bg-amber-500 text-black font-cyber font-bold text-xs hover:brightness-110 transition disabled:opacity-50"
                          >
                            {keyGenerating ? 'GENERATING...' : 'CONFIRM & CREATE KEY'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================================
                  TAB 4: CREDITS & BILLING
                 ========================================================================= */}
              {activeTab === 'credits' && isAuthenticated && (
                <div className="bg-[#06182c]/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl font-mono space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div>
                      <h3 className="text-sm font-cyber font-bold text-emerald-200 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-emerald-400" />
                        <span>CREDITS BALANCE & REFILLS</span>
                      </h3>
                      <p className="text-[11px] text-emerald-300/70 mt-0.5">
                        Credits power pay-as-you-go passcode locks, time-based locks, and visitor quotas.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-cyber font-bold text-emerald-300">{user?.credits || 0} CR</div>
                      <div className="text-[10px] text-emerald-400/70">{user?.creditsUsedTotal || 0} used total</div>
                    </div>
                  </div>

                  {/* Lock Credit Costs Reference */}
                  <div className="p-3 rounded-xl bg-[#03010b] border border-cyan-500/25 space-y-1.5 text-xs">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      LOCK CREDIT COSTS PER BOX:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center justify-between p-1.5 rounded bg-black/50">
                        <span className="text-zinc-300">Passcode PIN Lock:</span>
                        <span className="font-bold text-emerald-400">FREE (0 CR)</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-black/50">
                        <span className="text-zinc-300">Time-Based Locks:</span>
                        <span className="font-bold text-amber-400">10 CR</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-black/50">
                        <span className="text-zinc-300">Reveal + Decay:</span>
                        <span className="font-bold text-rose-400">10 CR</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-black/50">
                        <span className="text-zinc-300">Visitor Quota:</span>
                        <span className="font-bold text-emerald-400">10 CR</span>
                      </div>
                    </div>
                  </div>

                  {/* Refill Packages Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#03010b] border border-emerald-500/30 flex flex-col justify-between gap-3 text-center">
                      <div>
                        <div className="text-xs font-cyber font-bold text-emerald-200">STARTER PACK</div>
                        <div className="text-lg font-bold font-cyber text-white mt-1">50 CR</div>
                        <div className="text-[11px] text-emerald-400/70 mt-0.5">$5.00 USD</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => purchaseCredits('pack_50', 50, 500)}
                        className="w-full py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold font-cyber hover:bg-emerald-500/30 transition cursor-pointer"
                      >
                        REFILL 50 CR
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gradient-to-b from-emerald-950/40 to-teal-950/40 border border-emerald-400/50 flex flex-col justify-between gap-3 text-center relative shadow-lg">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono uppercase bg-emerald-400 text-black px-2 py-0.2 rounded-full">
                        SAVE 20%
                      </span>
                      <div>
                        <div className="text-xs font-cyber font-bold text-emerald-200">CREATOR PACK</div>
                        <div className="text-lg font-bold font-cyber text-white mt-1">150 CR</div>
                        <div className="text-[11px] text-emerald-400/70 mt-0.5">$12.00 USD</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => purchaseCredits('pack_150', 150, 1200)}
                        className="w-full py-1.5 rounded-lg bg-emerald-400 text-black text-xs font-bold font-cyber hover:brightness-110 transition cursor-pointer"
                      >
                        REFILL 150 CR
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#03010b] border border-emerald-500/30 flex flex-col justify-between gap-3 text-center">
                      <div>
                        <div className="text-xs font-cyber font-bold text-emerald-200">PRO BUNDLE</div>
                        <div className="text-lg font-bold font-cyber text-white mt-1">400 CR</div>
                        <div className="text-[11px] text-emerald-400/70 mt-0.5">$25.00 USD (38% OFF)</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => purchaseCredits('pack_400', 400, 2500)}
                        className="w-full py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold font-cyber hover:bg-emerald-500/30 transition cursor-pointer"
                      >
                        REFILL 400 CR
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 5: MCP SERVER CONFIGURATION
                 ========================================================================= */}
              {activeTab === 'mcp' && isAuthenticated && (
                <div className="bg-[#06182c]/90 border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xl font-mono space-y-4">
                  <div className="border-b border-purple-500/20 pb-3">
                    <h3 className="text-sm font-cyber font-bold text-purple-200 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span>MODEL CONTEXT PROTOCOL (MCP) INTEGRATION</span>
                    </h3>
                    <p className="text-[11px] text-purple-300/70 mt-0.5">
                      Enable AI coding assistants (Cursor, Claude Desktop, Antigravity) to compress and deploy Bitty Boxes autonomously.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] text-purple-300 font-bold mb-1">MCP HTTP STREAMABLE ENDPOINT:</label>
                      <div className="p-2 rounded bg-black/80 font-mono text-cyan-200 break-all border border-purple-500/30 flex items-center justify-between gap-2">
                        <span>https://bittybox.org/mcp</span>
                        <button
                          onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText('https://bittybox.org/mcp'); }}
                          className="px-2 py-0.5 bg-purple-950 text-purple-300 rounded border border-purple-500/40 text-[10px] font-bold hover:bg-purple-900"
                        >
                          COPY
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/50 border border-purple-500/20 space-y-2">
                      <div className="text-[11px] font-bold text-purple-200">Claude Desktop / Cursor Config (.json):</div>
                      <pre className="p-2.5 rounded bg-[#02010c] text-[10px] text-cyan-300 overflow-x-auto border border-cyan-500/20">
{`{
  "mcpServers": {
    "bittybox": {
      "url": "https://bittybox.org/mcp",
      "headers": {
        "Authorization": "Bearer bb_live_YOUR_API_KEY"
      }
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel Bottom Legal & Support Footer */}
              <div className="pt-4 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-purple-300/70">
                <div className="flex items-center gap-2.5">
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
                  <span className="text-purple-500/40 select-none">&bull;</span>
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
                  <span className="text-purple-500/40 select-none">&bull;</span>
                  <a
                    href="mailto:support@bittybox.org"
                    className="hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
                  >
                    Contact Us
                  </a>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* Legal Modal (Terms of Service & Privacy Policy) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </AnimatePresence>
  );
};
