import React from 'react';
import { ShieldCheck, ArrowLeft, Check, Lock, Cpu, Sparkles, Trash2 } from 'lucide-react';
import { useStage, useDraft, EncryptionMode } from '../../stores/stageStore';

export const EncryptionStage: React.FC = () => {
  const { discardDraft, commitDraft, dispatch } = useStage();
  const draft = useDraft();

  if (!draft) return null;

  const handleApply = () => {
    draft.setEncryptionEnabled(true);
    commitDraft();
  };

  const handleCancel = () => {
    discardDraft();
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_ENCRYPTION' });
    dispatch({ type: 'EXIT_MODE' });
  };

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 transition-all cursor-pointer"
            title="Cancel and return to editor"
            aria-label="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,242,255,0.3)]">
            <ShieldCheck className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-cyan-200 tracking-wide font-cyber">ENCRYPTION SUITE</h2>
            <p className="text-[10px] text-cyan-400/70">Client-side cryptographic envelope</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] hover:bg-rose-900/50 hover:text-white transition-all cursor-pointer"
          title="Reset encryption"
        >
          <Trash2 className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
        <Lock className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-200/85 leading-relaxed">
          Bitty Box encrypts payloads directly in your browser. With Zero-Knowledge mode active, no server ever inspects the payload or key.
        </p>
      </div>

      {/* Encryption Mode Cards */}
      <div className="space-y-3 bg-[#050314]/70 border border-cyan-500/30 rounded-xl p-4">
        <label className="text-xs font-bold text-cyan-300">SELECT CRYPTOGRAPHIC SCHEME</label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Zero-Knowledge PBKDF2 */}
          <button
            type="button"
            onClick={() => {
              draft.setEncryptionMode('zk-aes256gcm');
              draft.setEncryptionEnabled(true);
            }}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
              draft.encryptionMode === 'zk-aes256gcm'
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'bg-[#02010a]/80 border-cyan-500/20 text-cyan-400/60 hover:border-cyan-500/40 hover:text-cyan-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Zero-Knowledge Envelope
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-bold">
                OWASP 2024
              </span>
            </div>
            <p className="text-[10px] text-cyan-200/70 leading-relaxed">
              PBKDF2 with 310,000 iterations + AES-256-GCM. 16-byte random salt and 12-byte IV encoded in URL. Maximum brute-force resistance.
            </p>
          </button>

          {/* Standard AES-GCM */}
          <button
            type="button"
            onClick={() => {
              draft.setEncryptionMode('aes-gcm');
              draft.setEncryptionEnabled(true);
            }}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
              draft.encryptionMode === 'aes-gcm'
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'bg-[#02010a]/80 border-cyan-500/20 text-cyan-400/60 hover:border-cyan-500/40 hover:text-cyan-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Standard AES-GCM
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                Fast
              </span>
            </div>
            <p className="text-[10px] text-cyan-200/70 leading-relaxed">
              Direct Web Crypto AES-GCM with SHA-256 key material. Instant decompression on resource-constrained devices.
            </p>
          </button>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 py-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs hover:bg-cyan-950/40 hover:border-cyan-400 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-black text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,255,0.5)] hover:from-cyan-500 hover:to-cyan-400 hover:scale-[1.01] transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" /> Apply Settings
        </button>
      </div>
    </div>
  );
};
