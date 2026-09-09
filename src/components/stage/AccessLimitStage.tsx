import React from 'react';
import { Gauge, Trash2, ArrowLeft, Check, Flame } from 'lucide-react';
import { useStage, useDraft } from '../../stores/stageStore';

export const AccessLimitStage: React.FC = () => {
  const { discardDraft, commitDraft, dispatch } = useStage();
  const draft = useDraft();

  if (!draft) return null;

  const presets = [1, 3, 5, 10];

  const handleApply = () => {
    draft.setAccessLimit(true);
    commitDraft();
  };

  const handleCancel = () => {
    discardDraft();
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_ACCESS_LIMIT' });
    dispatch({ type: 'EXIT_MODE' });
  };

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 transition-all cursor-pointer"
            title="Cancel and return to editor"
            aria-label="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Gauge className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-200 tracking-wide font-cyber">ACCESS LIMIT LOCK</h2>
            <p className="text-[10px] text-emerald-400/70">Burn-on-read & visitor quotas</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] hover:bg-rose-900/50 hover:text-white transition-all cursor-pointer"
          title="Disable view limit lock"
        >
          <Trash2 className="w-3 h-3" /> Remove Lock
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
        <Flame className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-200/85 leading-relaxed">
          Set how many times your Bitty Box can be opened before it permanently locks. Once the view quota is exhausted, the link immediately expires.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="space-y-3 bg-[#050314]/70 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-emerald-300">MAXIMUM OPENS</label>
          <span className="text-xs font-bold text-emerald-200 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
            {draft.accessLimitMaxOpens === 1 ? '1 Open (Burn on Read)' : `${draft.accessLimitMaxOpens} Opens Allowed`}
          </span>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2">
          {presets.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => {
                draft.setAccessLimitMaxOpens(count);
                draft.setAccessLimit(true);
              }}
              className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                draft.accessLimitMaxOpens === count
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-[#02010a]/80 border-emerald-500/20 text-emerald-400/60 hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
            >
              {count === 1 ? '1 (Burn)' : `${count} Views`}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] text-emerald-400/70 font-bold uppercase">CUSTOM VIEW LIMIT (UP TO 1,000,000)</label>
          <input
            type="number"
            min={1}
            max={1000000}
            value={draft.accessLimitMaxOpens}
            onChange={e => {
              const val = Math.max(1, Math.min(1000000, Number(e.target.value) || 1));
              draft.setAccessLimitMaxOpens(val);
              draft.setAccessLimit(true);
            }}
            className="w-full rounded-xl border border-emerald-400/40 bg-[#02010a] px-3 py-2 text-sm text-emerald-100 placeholder:text-emerald-400/30 outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        {/* Remaining Count Toggle */}
        <label className="flex items-center gap-2 pt-2 border-t border-emerald-500/20 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.showRemainingAccessCount}
            onChange={e => {
              draft.setShowRemainingAccessCount(e.target.checked);
              draft.setAccessLimit(true);
            }}
            className="accent-emerald-500 cursor-pointer"
          />
          <span className="text-xs text-emerald-300">Display remaining views on recipient lock screen</span>
        </label>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-emerald-500/20">
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
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:from-emerald-500 hover:to-emerald-400 hover:scale-[1.01] transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" /> Apply Lock
        </button>
      </div>
    </div>
  );
};
