import React from 'react';
import { Clock, Timer, CalendarClock, Trash2, ArrowLeft, Check, Flame, ShieldAlert } from 'lucide-react';
import { useStage, useDraft, TimeLockMode } from '../../stores/stageStore';

export const TimeLockStage: React.FC = () => {
  const { discardDraft, commitDraft, dispatch } = useStage();
  const draft = useDraft();

  if (!draft) return null;

  const handleApply = () => {
    draft.setTimeLock(true);
    commitDraft();
  };

  const handleCancel = () => {
    discardDraft();
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_TIME_LOCK' });
    dispatch({ type: 'EXIT_MODE' });
  };

  const tabs: Array<{ id: TimeLockMode; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'expiry', label: 'Expires After', sub: 'Timer', icon: Timer },
    { id: 'delay', label: 'Delays Reveal', sub: 'Sleeper', icon: Clock },
    { id: 'range', label: 'Date Range', sub: 'Schedule', icon: CalendarClock },
    { id: 'hybrid', label: 'Reveal + Decay', sub: 'Hybrid', icon: Flame },
  ];

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 hover:bg-amber-900/50 transition-all cursor-pointer"
            title="Cancel and return to editor"
            aria-label="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Clock className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-200 tracking-wide font-cyber">TIME-BASED LOCK</h2>
            <p className="text-[10px] text-amber-400/70">Automatic expiration & timed reveals</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] hover:bg-rose-900/50 hover:text-white transition-all cursor-pointer"
          title="Disable time lock"
        >
          <Trash2 className="w-3 h-3" /> Remove Lock
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {tabs.map(tab => {
          const isSelected = draft.timeLockMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                draft.setTimeLockMode(tab.id);
                draft.setTimeLock(true);
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                  : 'bg-[#02010a]/60 border-amber-500/20 text-amber-400/60 hover:border-amber-500/40 hover:text-amber-300'
              }`}
            >
              <div className="flex items-center gap-1 text-xs font-bold">
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </div>
              <span className="text-[9px] opacity-70 uppercase tracking-wider">{tab.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Details Form */}
      <div className="space-y-3 bg-[#050314]/70 border border-amber-500/30 rounded-xl p-4">
        {/* 1. Expiry Mode */}
        {draft.timeLockMode === 'expiry' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300">EXPIRES AFTER DURATION</label>
              <span className="text-xs font-bold text-amber-200 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
                {draft.timeExpiryHours === 168 ? '7 Days' : `${draft.timeExpiryHours} Hours`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 6, 24, 168].map(hours => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => {
                    draft.setTimeExpiryHours(hours);
                    draft.setTimeLock(true);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    draft.timeExpiryHours === hours
                      ? 'bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-[#02010a]/80 border-amber-500/20 text-amber-400/60 hover:border-amber-500/40'
                  }`}
                >
                  {hours === 168 ? '7 Days' : `${hours}h`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={1}
                max={336}
                value={draft.timeExpiryHours}
                onChange={e => {
                  draft.setTimeExpiryHours(Number(e.target.value));
                  draft.setTimeLock(true);
                }}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="text-xs text-amber-300 w-16 text-right font-bold">
                {draft.timeExpiryHours}h
              </span>
            </div>
            <p className="text-[10px] text-amber-400/70">
              The Box automatically self-destructs after this duration from creation.
            </p>
          </div>
        )}

        {/* 2. Delay Mode */}
        {draft.timeLockMode === 'delay' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300">DELAY UNTIL UNLOCKED</label>
              <span className="text-xs font-bold text-amber-200 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
                {draft.timeDelayHours === 168 ? '7 Days' : `${draft.timeDelayHours} Hours`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 6, 24, 168].map(hours => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => {
                    draft.setTimeDelayHours(hours);
                    draft.setTimeLock(true);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    draft.timeDelayHours === hours
                      ? 'bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-[#02010a]/80 border-amber-500/20 text-amber-400/60 hover:border-amber-500/40'
                  }`}
                >
                  {hours === 168 ? '7 Days' : `${hours}h`}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-amber-400/70">
              The Box stays inert and cannot be viewed until the countdown completes.
            </p>
          </div>
        )}

        {/* 3. Range Mode */}
        {draft.timeLockMode === 'range' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-300">OPENS ON (START DATE/TIME)</label>
              <input
                type="datetime-local"
                value={draft.timeOpenAt}
                onChange={e => {
                  draft.setTimeOpenAt(e.target.value);
                  draft.setTimeLock(true);
                }}
                className="w-full rounded-lg border border-amber-400/40 bg-[#02010a] px-3 py-2 text-xs text-amber-100 outline-none focus:border-amber-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-300">LOCKS ON (END DATE/TIME)</label>
              <input
                type="datetime-local"
                value={draft.timeLockAt}
                onChange={e => {
                  draft.setTimeLockAt(e.target.value);
                  draft.setTimeLock(true);
                }}
                className="w-full rounded-lg border border-amber-400/40 bg-[#02010a] px-3 py-2 text-xs text-amber-100 outline-none focus:border-amber-300"
              />
            </div>
          </div>
        )}

        {/* 4. Hybrid Mode */}
        {draft.timeLockMode === 'hybrid' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300">REVEAL TRIGGER</label>
              <div className="flex gap-1.5">
                {[
                  { value: 'delay' as const, label: 'After Delay' },
                  { value: 'date' as const, label: 'On Date' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => draft.setHybridRevealMode(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      draft.hybridRevealMode === opt.value
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                        : 'bg-[#02010a] border-amber-500/20 text-amber-400/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-amber-400/70 font-bold">SELF-DESTRUCTS AFTER REVEAL:</label>
              <div className="grid grid-cols-3 gap-2">
                {[24, 72, 168].map(hours => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => {
                      draft.setHybridSelfDestructHours(hours);
                      draft.setTimeLock(true);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      draft.hybridSelfDestructHours === hours
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                        : 'bg-[#02010a] border-amber-500/20 text-amber-400/60'
                    }`}
                  >
                    {hours === 168 ? '7 Days' : `${hours}h`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Countdown Option */}
        <label className="flex items-center gap-2 pt-2 border-t border-amber-500/20 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.showTimeCountdown}
            onChange={e => {
              draft.setShowTimeCountdown(e.target.checked);
              draft.setTimeLock(true);
            }}
            className="accent-amber-500 cursor-pointer"
          />
          <span className="text-xs text-amber-300">Show countdown display on recipient lock screen</span>
        </label>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-amber-500/20">
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
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:from-amber-500 hover:to-amber-400 hover:scale-[1.01] transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" /> Apply Lock
        </button>
      </div>
    </div>
  );
};
