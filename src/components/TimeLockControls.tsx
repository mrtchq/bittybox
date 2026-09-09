import React, { useState, useEffect } from 'react';
import { CalendarClock } from 'lucide-react';
import { formatLocalDateTime } from '../utils/timeWindow';

interface DurationOption {
  value: number;
  label: string;
}

interface DurationTimeControlProps {
  /** Currently selected duration in hours. */
  value: number;
  onChange: (hours: number) => void;
  /** Preset hour values to offer as quick-pick chips. */
  presets: number[];
  /** Label shown above the presets. */
  label?: string;
  /** Optional helper text below the control. */
  hint?: string;
  /** Renders as a compact (2-col) grid — used inside the hybrid block. */
  compact?: boolean;
}

/**
 * Shared duration picker used by every time-lock mode (expiry, delay, hybrid
 * reveal, hybrid decay). Adds a "CUSTOM" chip that swaps the presets for a
 * native datetime picker pre-set to (now + current value) so the user can
 * choose any precise instant.
 */
export const DurationTimeControl: React.FC<DurationTimeControlProps> = ({
  value,
  onChange,
  presets,
  label,
  hint,
  compact = false,
}) => {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = createCustomState(value);

  // Keep the custom input in sync when the preset changes externally.
  useEffect(() => {
    if (!customOpen) setCustomValue(formatLocalDateTime(new Date(Date.now() + value * 3600 * 1000)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, customOpen]);

  const commitCustom = (local: string) => {
    const d = new Date(local); // datetime-local parses as LOCAL wall clock
    if (Number.isNaN(d.getTime())) return;
    const hrs = Math.max(0.5, (d.getTime() - Date.now()) / 3600000);
    onChange(Math.round(hrs * 100) / 100);
    setCustomOpen(false);
  };

  const cols = compact ? 'grid-cols-2' : 'grid-cols-4';

  return (
    <div className="space-y-1.5">
      {label && <div className="text-[10px] text-amber-300/80 font-bold">{label}</div>}
      <div className={`grid gap-1.5 ${cols}`}>
        {presets.map(hrs => (
          <button
            key={hrs}
            type="button"
            onClick={() => { setCustomOpen(false); onChange(hrs); }}
            className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all ${
              !customOpen && value === hrs
                ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-400 hover:bg-amber-900/40'
            }`}
          >
            {hrs === 168 ? '7 Days' : hrs === 72 ? '3 Days' : `${hrs}h`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(o => !o)}
          className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all ${
            customOpen
              ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-400 hover:bg-amber-900/40'
          }`}
        >
          CUSTOM
        </button>
      </div>

      {customOpen && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <div className="text-[9px] text-amber-300/70 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            Pick exact date &amp; time:
          </div>
          <input
            type="datetime-local"
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            className="w-full rounded-lg border border-amber-400/50 bg-[#02010a] px-2 py-1.5 text-[11px] text-amber-100 outline-none focus:border-amber-300 font-mono"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => commitCustom(customValue)}
              className="flex-1 py-1.5 rounded-lg bg-amber-500/40 border border-amber-400 text-amber-100 text-[10px] font-bold hover:bg-amber-500/60 transition"
            >
              SET CUSTOM TIME
            </button>
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300/70 text-[10px] font-bold hover:bg-amber-900/40 transition"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {hint && !customOpen && <div className="text-[9px] text-amber-300/60 truncate">{hint}</div>}
    </div>
  );
};

/** Tiny local-state helper so each control instance owns its custom input. */
function createCustomState(initial: string) {
  const [v, setV] = useState(initial);
  return [v, setV] as const;
}

interface DateRangeControlProps {
  openAt: string;
  lockAt: string;
  onOpenAt: (v: string) => void;
  onLockAt: (v: string) => void;
}

/**
 * Date-range picker with a "CUSTOM" affordance. The two date inputs ARE the
 * custom pickers; the CUSTOM button simply focuses/scrolls to them and is shown
 * as a labeled toggle mirroring the other modes' Custom chip.
 */
export const DateRangeControl: React.FC<DateRangeControlProps> = ({
  openAt,
  lockAt,
  onOpenAt,
  onLockAt,
}) => {
  const [customOpen, setCustomOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 gap-1.5">
        <button
          type="button"
          onClick={() => setCustomOpen(o => !o)}
          className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all ${
            customOpen
              ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-400 hover:bg-amber-900/40'
          }`}
        >
          CUSTOM DATES
        </button>
      </div>

      {customOpen && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <div className="text-[10px] text-amber-300/80 font-bold">OPENS AT (DATE/TIME):</div>
          <input
            type="datetime-local"
            value={openAt}
            onChange={e => onOpenAt(e.target.value)}
            className="w-full rounded-lg border border-amber-400/50 bg-[#02010a] px-2 py-1.5 text-[11px] text-amber-100 outline-none focus:border-amber-300 font-mono"
          />
          <div className="text-[10px] text-amber-300/80 font-bold">LOCKS ON (DATE/TIME):</div>
          <input
            type="datetime-local"
            value={lockAt}
            onChange={e => onLockAt(e.target.value)}
            className="w-full rounded-lg border border-amber-400/50 bg-[#02010a] px-2 py-1.5 text-[11px] text-amber-100 outline-none focus:border-amber-300 font-mono"
          />
          {lockAt && openAt && new Date(lockAt) <= new Date(openAt) && (
            <div className="text-[9px] text-rose-400">⚠ Lock date must be after open date.</div>
          )}
        </div>
      )}
    </div>
  );
};
