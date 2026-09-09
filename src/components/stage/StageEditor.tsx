import React, { useState, useMemo } from 'react';
import {
  Code,
  Eye,
  Key,
  Clock,
  Gauge,
  ShieldCheck,
  Bot,
  Sparkles,
  Link2,
  Copy,
  FilePlus2,
  Trash2,
  Zap,
  Radio,
  GripVertical,
} from 'lucide-react';
import { useStage, useActiveLocks, StageMode } from '../../stores/stageStore';
import { ActiveLockChips } from './ActiveLockChips';
import { HoloGenerateButton } from '../HoloGenerateButton';
import { CyberScrambleText } from '../CyberScrambleText';
import type { UseAccountResult } from '../../hooks/useAccount';
import type { BittyChainDraft } from '../../types';

interface StageEditorProps {
  onGenerate?: () => void;
  isGenerating?: boolean;
  calculatedCreditCost?: number;
  bittyUrl?: string;
  chainEnabled?: boolean;
  chainIndex?: number;
  chainTotal?: number;
  chainMax?: number;
  chainDraft?: BittyChainDraft | null;
  isLastChainBox?: boolean;
  onToggleChain?: (enabled: boolean) => void;
  onCreateNextChainPage?: (mode: 'clone' | 'scratch') => void;
  onGoToChainPage?: (index: number) => void;
  onDeleteLastChainBox?: () => void;
  account?: UseAccountResult;
  isPro?: boolean;
  onOpenPaywall?: (featureName?: string) => void;
}

const DEFAULT_STARTER_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bitty Box</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #050414;
      color: #00f2ff;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .card {
      border: 1px solid rgba(0,242,255,0.4);
      padding: 2rem;
      border-radius: 1rem;
      background: rgba(0,242,255,0.04);
      box-shadow: 0 0 30px rgba(0,242,255,0.2);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>📦 Bitty Box</h1>
    <p>Zero backend • Compressed in URL • Runs anywhere</p>
  </div>
</body>
</html>`;

export const StageEditor: React.FC<StageEditorProps> = ({
  onGenerate,
  isGenerating = false,
  calculatedCreditCost = 0,
  bittyUrl = '',
  chainEnabled = false,
  chainIndex = 0,
  chainTotal = 1,
  chainMax = 8,
  chainDraft = null,
  isLastChainBox = true,
  onToggleChain,
  onCreateNextChainPage,
  onGoToChainPage,
  onDeleteLastChainBox,
  account,
  isPro = false,
  onOpenPaywall,
}) => {
  const { state, setTitle, setDescription, setContent, enterMode } = useStage();
  const locks = useActiveLocks();
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerateClick = () => {
    if (state.password.length > 0 && state.password.length < 8) {
      enterMode('passwordLock');
      return;
    }
    if (onGenerate) {
      onGenerate();
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4 font-mono select-none">
      {/* Top Header Bar: Title, Byte Counter & Preview */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 text-xs font-bold tracking-wider shadow-[0_0_12px_rgba(0,242,255,0.2)]">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
            <span className="hidden xs:inline">BITTY STAGE //</span>
            <span>BOX COMPOSER</span>
          </div>
          <span className="text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-lg font-bold shadow-inner">
            {state.content.length} BYTES
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => enterMode('preview')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-900/50 hover:border-cyan-400 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,255,0.15)]"
            title="Preview inside Stage"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* Metadata Row: Title & Description Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={state.title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Box Title (e.g. My Secure Note)"
          maxLength={80}
          className="rounded-xl border border-cyan-400/30 bg-[#02010a] px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-400/40 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-500/30 font-mono transition-colors"
        />
        <input
          type="text"
          value={state.description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description for social cards & search"
          maxLength={180}
          className="rounded-xl border border-cyan-400/30 bg-[#02010a] px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-400/40 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-500/30 font-mono transition-colors"
        />
      </div>

      {/* The Central Content Editor Canvas */}
      <div className="w-full flex-1 relative flex flex-col min-h-[260px] sm:min-h-[320px] md:min-h-[380px]">
        <textarea
          value={state.content}
          onChange={e => setContent(e.target.value)}
          placeholder="Type or paste HTML, JavaScript, CSS, Markdown, JSON, SVG, or plain text notes here... everything is packed into a single self-contained link."
          className="w-full flex-1 min-h-[260px] sm:min-h-[320px] md:min-h-[380px] resize-y rounded-xl border border-cyan-400/40 bg-[#02010a]/90 p-4 text-xs sm:text-sm leading-relaxed text-cyan-100 placeholder:text-cyan-400/40 outline-none transition-all duration-200 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/30 focus:shadow-[0_0_25px_rgba(0,242,255,0.2)] font-mono"
        />
      </div>

      {/* Starter Code & Preset Buttons Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className="text-[10px] text-cyan-400/60 font-bold uppercase">PRESETS:</span>
          <button
            type="button"
            onClick={() => setContent(DEFAULT_STARTER_CODE)}
            className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] hover:bg-cyan-900 hover:border-cyan-300 transition-all cursor-pointer"
          >
            Starter HTML
          </button>
          <button
            type="button"
            onClick={() => setContent('# Secret Note\n\nOnly accessible to holders of the decrypted link.')}
            className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] hover:bg-cyan-900 hover:border-cyan-300 transition-all cursor-pointer"
          >
            Markdown Note
          </button>
          {state.content && (
            <button
              type="button"
              onClick={() => setContent('')}
              className="px-2 py-0.5 text-[10px] text-cyan-400/60 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Persistent Active Locks Strip */}
      <div className="p-2 rounded-xl bg-[#030112]/90 border border-cyan-500/20 flex flex-col gap-1.5 shadow-inner">
        <ActiveLockChips onOpenMode={mode => enterMode(mode)} />
      </div>

      {/* Lock Launcher Row: Quick buttons to configure each lock feature */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-cyan-500/20">
        {/* 1. Password Lock */}
        <button
          type="button"
          onClick={() => enterMode('passwordLock')}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            locks.password
              ? 'bg-fuchsia-950/70 border-fuchsia-500/60 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.3)]'
              : 'bg-[#02010a]/70 border-cyan-500/20 text-cyan-300 hover:border-fuchsia-500/40 hover:text-fuchsia-200'
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-fuchsia-950/90 border border-fuchsia-500/40 flex items-center justify-center shrink-0">
            <Key className="w-3.5 h-3.5 text-fuchsia-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold leading-tight truncate">
              {locks.password ? 'PIN Active' : 'Add PIN'}
            </div>
            <div className="text-[9px] opacity-70 truncate">
              {locks.password ? `${state.password.length} digits` : 'Passcode'}
            </div>
          </div>
        </button>

        {/* 2. Time Lock */}
        <button
          type="button"
          onClick={() => enterMode('timeLock')}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            locks.timeLock
              ? 'bg-amber-950/70 border-amber-500/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-[#02010a]/70 border-cyan-500/20 text-cyan-300 hover:border-amber-500/40 hover:text-amber-200'
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-amber-950/90 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold leading-tight truncate">
              {locks.timeLock ? 'Timer Set' : 'Add Timer'}
            </div>
            <div className="text-[9px] opacity-70 truncate">
              {locks.timeLock ? `${state.timeExpiryHours}h window` : 'Self-destruct'}
            </div>
          </div>
        </button>

        {/* 3. Access Limit Lock */}
        <button
          type="button"
          onClick={() => enterMode('accessLimitLock')}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            locks.accessLimit
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-[#02010a]/70 border-cyan-500/20 text-cyan-300 hover:border-emerald-500/40 hover:text-emerald-200'
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold leading-tight truncate">
              {locks.accessLimit ? 'Limit Active' : 'Add Limit'}
            </div>
            <div className="text-[9px] opacity-70 truncate">
              {locks.accessLimit ? `${state.accessLimitMaxOpens} views` : 'Burn on read'}
            </div>
          </div>
        </button>

        {/* 4. Encryption Lock */}
        <button
          type="button"
          onClick={() => enterMode('encryption')}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            locks.encryption
              ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(0,242,255,0.3)]'
              : 'bg-[#02010a]/70 border-cyan-500/20 text-cyan-300 hover:border-cyan-400/40 hover:text-cyan-200'
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-cyan-950/90 border border-cyan-400/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold leading-tight truncate">
              {locks.encryption ? 'ZK Active' : 'Encrypt'}
            </div>
            <div className="text-[9px] opacity-70 truncate">
              {locks.encryption ? 'AES-256-GCM' : 'Zero-knowledge'}
            </div>
          </div>
        </button>

        {/* 5. Agentic Lock */}
        <button
          type="button"
          onClick={() => enterMode('agenticLock')}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            locks.agentic
              ? 'bg-indigo-950/70 border-indigo-500/60 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
              : 'bg-[#02010a]/70 border-cyan-500/20 text-cyan-300 hover:border-indigo-500/40 hover:text-indigo-200'
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-950/90 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold leading-tight truncate">
              {locks.agentic ? 'Agentic ON' : 'Agentic Lock'}
            </div>
            <div className="text-[9px] opacity-70 truncate">
              {locks.agentic ? 'WebMCP active' : 'AI guard'}
            </div>
          </div>
        </button>
      </div>

      {/* Chaining Ribbon (if chain enabled) */}
      {chainEnabled && (
        <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-cyan-300">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">Chained Sequence:</span>
            <span>Box {chainIndex + 1} of {chainTotal}</span>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: chainTotal }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onGoToChainPage?.(idx)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  idx === chainIndex
                    ? 'bg-cyan-400 text-black shadow-[0_0_8px_rgba(0,242,255,0.6)]'
                    : 'bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50'
                }`}
              >
                {idx + 1}
              </button>
            ))}
            {chainTotal < chainMax && (
              <button
                type="button"
                onClick={() => onCreateNextChainPage?.('clone')}
                className="p-1 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-900 transition-colors cursor-pointer"
                title="Add next box in chain"
              >
                <FilePlus2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Generation & Credit Cost Footer */}
      <div className="pt-3 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-cyan-300/80 w-full sm:w-auto">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px]">
            {calculatedCreditCost === 0 ? (
              <strong className="text-emerald-400">100% Free Forever (0 Credits)</strong>
            ) : (
              <span>Requires <strong className="text-amber-300">{calculatedCreditCost} CR</strong> with active server locks</span>
            )}
          </span>
        </div>

        <div className="w-full sm:w-auto flex items-center justify-end">
          <HoloGenerateButton
            onClick={handleGenerateClick}
            isCopied={isCopied}
            label={calculatedCreditCost > 0 && (!account?.user || (account.user.credits || 0) < calculatedCreditCost) && !isPro ? `GET CREDITS (${calculatedCreditCost} CR)` : 'GENERATE BOX'}
            className="my-0 scale-[0.78] sm:scale-[0.84] origin-right"
          />
        </div>
      </div>
    </div>
  );
};
