import React, { useState } from 'react';
import { Key, Eye, EyeOff, ShieldCheck, Trash2, ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { useStage, useDraft } from '../../stores/stageStore';

export const PasswordLockStage: React.FC = () => {
  const { discardDraft, commitDraft, dispatch } = useStage();
  const draft = useDraft();
  const [showPassword, setShowPassword] = useState(false);

  if (!draft) return null;

  const isValid = draft.password.length >= 8 && draft.password.length <= 12;
  const isEmpty = draft.password.length === 0;

  const handleApply = () => {
    if (!isValid) return;
    commitDraft();
  };

  const handleCancel = () => {
    discardDraft();
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_PASSWORD' });
    dispatch({ type: 'EXIT_MODE' });
  };

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-fuchsia-500/20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-900/50 transition-all cursor-pointer"
            title="Cancel and return to editor"
            aria-label="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-fuchsia-950/80 border border-fuchsia-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(217,70,239,0.3)]">
            <Key className="w-4 h-4 text-fuchsia-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-fuchsia-200 tracking-wide font-cyber">PASSWORD LOCK</h2>
            <p className="text-[10px] text-fuchsia-400/70">8–12 digit secret PIN code</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] hover:bg-rose-900/50 hover:text-white transition-all cursor-pointer"
          title="Disable password lock"
        >
          <Trash2 className="w-3 h-3" /> Remove Lock
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-fuchsia-950/30 border border-fuchsia-500/20">
        <ShieldCheck className="w-4 h-4 text-fuchsia-400 mt-0.5 shrink-0" />
        <p className="text-xs text-fuchsia-200/85 leading-relaxed">
          Your content is encrypted locally in your browser with AES-256 before packing into the URL. Only viewers with the secret PIN can decrypt and view it.
        </p>
      </div>

      {/* PIN Code Configuration Inputs */}
      <div className="space-y-3 bg-[#050314]/70 border border-fuchsia-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-fuchsia-300">ENTER NUMERICAL PIN (8–12 DIGITS)</label>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-colors ${
              isValid
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : isEmpty
                ? 'bg-fuchsia-950/60 border-fuchsia-500/30 text-fuchsia-400'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {draft.password.length} / 12
          </span>
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            value={draft.password}
            onChange={e => {
              const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
              draft.setPassword(numbersOnly);
            }}
            placeholder="Enter 8-12 digits..."
            className="w-full rounded-xl border border-fuchsia-400/40 bg-[#02010a] px-4 py-3 text-center text-lg sm:text-xl tracking-[0.25em] text-fuchsia-100 placeholder:text-fuchsia-400/30 placeholder:text-sm placeholder:tracking-normal outline-none focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-500/25 transition-all pr-10"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fuchsia-400 hover:text-fuchsia-200 transition-colors cursor-pointer"
            title={showPassword ? 'Hide PIN' : 'Show PIN'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {!isValid && !isEmpty && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>PIN must be between 8 and 12 digits to lock the Box.</span>
          </div>
        )}

        {/* Quick PIN Presets */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10px] text-fuchsia-400/60 font-bold">QUICK PINS:</span>
          {['12345678', '87654321', '90210902', '123456789012'].map(pin => (
            <button
              key={pin}
              type="button"
              onClick={() => draft.setPassword(pin)}
              className="px-2 py-0.5 rounded-md bg-fuchsia-950/70 border border-fuchsia-500/30 text-fuchsia-300 text-[10px] hover:bg-fuchsia-900/60 hover:border-fuchsia-400 transition-all cursor-pointer"
            >
              {pin}
            </button>
          ))}
          {draft.password && (
            <button
              type="button"
              onClick={() => draft.setPassword('')}
              className="text-[10px] text-rose-400 hover:underline ml-auto cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-fuchsia-500/20">
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
          disabled={!isValid}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isValid
              ? 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:from-fuchsia-500 hover:to-fuchsia-400 hover:scale-[1.01]'
              : 'bg-fuchsia-950/40 border border-fuchsia-500/20 text-fuchsia-500/50 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4" /> Apply Lock
        </button>
      </div>
    </div>
  );
};
