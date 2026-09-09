import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Sparkles, 
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Crown
} from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
  onChangePassword: (newPassword: string) => void;
  isLocked?: boolean;
  onOpenPaywall?: (featureName?: string) => void;
}

export interface PasswordAnalysis {
  score: number; // 0 to 100
  label: string;
  color: string;
  barColor: string;
  textColor: string;
  borderColor: string;
  entropyBits: number;
  crackTimeText: string;
  hasMinLength: boolean;
  hasGoodLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export const analyzePassword = (pwd: string): PasswordAnalysis => {
  if (!pwd) {
    return {
      score: 0,
      label: 'PUBLIC (NO PASSCODE)',
      color: 'gray',
      barColor: 'bg-zinc-600',
      textColor: 'text-zinc-400',
      borderColor: 'border-zinc-700',
      entropyBits: 0,
      crackTimeText: 'Instant',
      hasMinLength: false,
      hasGoodLength: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSymbol: false,
    };
  }

  const length = pwd.length;
  const hasMinLength = length >= 4;
  const hasGoodLength = length >= 6;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

  const entropyBits = Math.round(length * 3.32);

  // Score calculation for 1-8 digit passcode (0 to 100)
  let score = Math.min(100, Math.round((length / 8) * 100));

  if (length <= 2) {
    return {
      score: Math.max(15, score),
      label: 'SHORT PASSCODE (1-2 DIGITS)',
      color: 'rose',
      barColor: 'bg-rose-500',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/50',
      entropyBits,
      crackTimeText: 'Few guesses',
      hasMinLength,
      hasGoodLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
    };
  } else if (length <= 4) {
    return {
      score: Math.max(40, score),
      label: 'STANDARD 4-DIGIT PIN',
      color: 'amber',
      barColor: 'bg-amber-400',
      textColor: 'text-amber-300',
      borderColor: 'border-amber-500/50',
      entropyBits,
      crackTimeText: '10,000 combinations',
      hasMinLength,
      hasGoodLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
    };
  } else if (length <= 6) {
    return {
      score: Math.max(75, score),
      label: 'STRONG 6-DIGIT PIN',
      color: 'teal',
      barColor: 'bg-teal-400',
      textColor: 'text-teal-300',
      borderColor: 'border-teal-500/50',
      entropyBits,
      crackTimeText: '1,000,000 combinations',
      hasMinLength,
      hasGoodLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
    };
  } else {
    return {
      score: 100,
      label: 'MAXIMUM 8-DIGIT PIN',
      color: 'emerald',
      barColor: 'bg-emerald-400',
      textColor: 'text-emerald-300',
      borderColor: 'border-emerald-500/50',
      entropyBits,
      crackTimeText: '100,000,000 combinations',
      hasMinLength,
      hasGoodLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
    };
  }
};

export const generateStrongKey = (): string => {
  const digits = '0123456789';
  const length = 6;
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += digits[values[i] % digits.length];
  }
  return result;
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  onChangePassword,
  isLocked = false,
  onOpenPaywall,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const analysis = useMemo(() => analyzePassword(password), [password]);

  const handleGenerateKey = () => {
    if (isLocked) {
      if (onOpenPaywall) onOpenPaywall('AES-256 Client-Side Encryption');
      return;
    }
    const key = generateStrongKey();
    onChangePassword(key);
  };

  const handleCopyKey = async () => {
    if (!password) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(password);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    } catch {}
  };

  if (isLocked) {
    return (
      <div 
        onClick={() => onOpenPaywall && onOpenPaywall('AES-256 Client-Side Encryption')}
        className="w-full mt-3 p-4 rounded-xl bg-gradient-to-r from-fuchsia-950/40 via-purple-950/40 to-black/60 border border-fuchsia-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer hover:border-fuchsia-400/60 transition group shadow-[0_0_20px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-lg bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300 group-hover:scale-110 transition-transform">
            <Lock className="w-5 h-5 text-fuchsia-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-fuchsia-200 uppercase">
                AES-256 Client-Side Encryption
              </span>
              <span className="px-1.5 py-0.2 bg-fuchsia-900 text-amber-300 text-[9px] font-mono font-bold border border-amber-500/40 rounded flex items-center gap-1">
                <Crown className="w-2.5 h-2.5 fill-amber-300" />
                PRO FEATURE
              </span>
            </div>
            <p className="text-[10px] font-mono text-purple-300/70 mt-0.5">
              Lock payloads with 256-bit client cryptography before generating URL capsules.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-fuchsia-950/90 border border-fuchsia-500/50 group-hover:bg-fuchsia-900 text-fuchsia-200 text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(189,0,255,0.3)] shrink-0"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>UNLOCK PRO</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mt-3 p-3.5 rounded-xl bg-black/50 border border-fuchsia-500/25 space-y-3">
      {/* Header & Passcode Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-[11px] font-mono text-fuchsia-300 flex items-center gap-1.5 uppercase font-bold">
          <Lock className="w-3.5 h-3.5 text-fuchsia-400" />
          SECURITY PASSCODE (1 TO 8 NUMBERS)
        </label>

        {/* Action button bar: Generate key & Show/hide */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleGenerateKey}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-200 hover:text-white hover:bg-fuchsia-900/80 text-[10px] font-cyber transition shadow-sm cursor-pointer"
            title="Generate random numerical PIN"
          >
            <Sparkles className="w-3 h-3 text-fuchsia-400" />
            <span>RANDOM PIN</span>
          </button>

          {password && (
            <button
              type="button"
              onClick={handleCopyKey}
              className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 border border-cyan-500/30 text-cyan-300 hover:text-white text-[10px] font-mono transition cursor-pointer"
              title="Copy passcode"
            >
              {copiedKey ? <Check className="w-3 h-3 text-teal-300" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copiedKey ? 'COPIED' : 'COPY'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Password Input field with Show/Hide toggle */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={password}
          onChange={e => onChangePassword(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="Enter 1-8 numbers to lock this link (leave empty for public)..."
          className="w-full bg-[#080214] border border-fuchsia-500/40 rounded-lg pl-3 pr-10 py-2 text-xs text-fuchsia-100 placeholder:text-purple-400/40 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400 font-mono tracking-wider"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-fuchsia-300 transition p-1 cursor-pointer"
          title={showPassword ? 'Hide passcode' : 'Show passcode'}
        >
          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Real-time Strength Meter Bar & Telemetry */}
      {password ? (
        <div className="space-y-2 pt-1">
          {/* Status Label & Score */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={analysis.textColor}>{analysis.label}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-purple-300/70">LENGTH: <strong className="text-cyan-300">{password.length} / 8 DIGITS</strong></span>
              <span className="px-1.5 py-0.5 rounded bg-black/60 border border-fuchsia-500/30 text-fuchsia-200 font-bold">
                {analysis.score}%
              </span>
            </div>
          </div>

          {/* Animated Gradient Progress Bar */}
          <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-fuchsia-500/30 p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${analysis.barColor}`}
              style={{ width: `${analysis.score}%` }}
            />
          </div>

          {/* PIN Length Milestones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
            <div className={`flex items-center gap-1 px-2 py-1 rounded border ${
              password.length >= 2 ? 'bg-teal-950/60 border-teal-500/40 text-teal-300' : 'bg-black/40 border-zinc-700/60 text-zinc-400'
            }`}>
              {password.length >= 2 ? <CheckCircle2 className="w-3 h-3 text-teal-400" /> : <XCircle className="w-3 h-3 text-zinc-500" />}
              <span>2+ Digits</span>
            </div>

            <div className={`flex items-center gap-1 px-2 py-1 rounded border ${
              password.length >= 4 ? 'bg-teal-950/60 border-teal-500/40 text-teal-300' : 'bg-black/40 border-zinc-700/60 text-zinc-400'
            }`}>
              {password.length >= 4 ? <CheckCircle2 className="w-3 h-3 text-teal-400" /> : <XCircle className="w-3 h-3 text-zinc-500" />}
              <span>4 Digits (PIN)</span>
            </div>

            <div className={`flex items-center gap-1 px-2 py-1 rounded border ${
              password.length >= 6 ? 'bg-teal-950/60 border-teal-500/40 text-teal-300' : 'bg-black/40 border-zinc-700/60 text-zinc-400'
            }`}>
              {password.length >= 6 ? <CheckCircle2 className="w-3 h-3 text-teal-400" /> : <XCircle className="w-3 h-3 text-zinc-500" />}
              <span>6 Digits (Strong)</span>
            </div>

            <div className={`flex items-center gap-1 px-2 py-1 rounded border ${
              password.length === 8 ? 'bg-teal-950/60 border-teal-500/40 text-teal-300' : 'bg-black/40 border-zinc-700/60 text-zinc-400'
            }`}>
              {password.length === 8 ? <CheckCircle2 className="w-3 h-3 text-teal-400" /> : <XCircle className="w-3 h-3 text-zinc-500" />}
              <span>8 Digits (Max)</span>
            </div>
          </div>

          {/* Security Summary Box */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] font-mono text-purple-300/80 bg-purple-950/30 p-2 rounded border border-purple-500/20 gap-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>SECURITY LEVEL: <strong className="text-white">{analysis.crackTimeText}</strong></span>
            </div>
            <span className="text-[9px] text-fuchsia-300/60 font-sans">Encrypted directly in the link</span>
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-mono text-purple-300/60 flex items-center gap-1.5">
          <Info className="w-3 h-3 text-purple-400 flex-shrink-0" />
          <span>No passcode required. Anyone with your link can view this page.</span>
        </p>
      )}
    </div>
  );
};
