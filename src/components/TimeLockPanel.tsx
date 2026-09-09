import React, { useState, useMemo } from 'react';
import {
  Clock,
  CalendarClock,
  Globe,
  AlertTriangle,
  Info,
  Crown,
  Eye,
  Timer,
} from 'lucide-react';
import {
  TimeWindowConfig,
  useTimeWindow,
} from '../utils/timeWindow';

type TimeLockMode = 'opens' | 'expires' | 'window';

interface TimeLockPanelProps {
  config?: TimeWindowConfig;
  onChangeConfig: (cfg: TimeWindowConfig) => void;
  isLocked?: boolean;
  onOpenPaywall?: (featureName?: string) => void;
}

/** Convert a UTC ISO-8601 string into a `datetime-local` value (local wall clock). */
function utcIsoToLocalInput(utc?: string | null): string {
  if (!utc) return '';
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return '';
  // Shift the UTC instant by the local offset so .toISOString() yields local wall clock.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

/** Parse a `datetime-local` value (interpreted as LOCAL time) into a UTC ISO-8601 string. */
function localInputToUtcIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local); // datetime-local strings parse as local time
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const TimeLockPanel: React.FC<TimeLockPanelProps> = ({
  config,
  onChangeConfig,
  isLocked = false,
  onOpenPaywall,
}) => {
  const enabled = !!config?.enabled;
  const notBefore = config?.notBefore ?? null;
  const notAfter = config?.notAfter ?? null;

  // Derive the active mode from which bounds are populated.
  const activeMode: TimeLockMode = useMemo(() => {
    if (notBefore && notAfter) return 'window';
    if (notAfter && !notBefore) return 'expires';
    return 'opens';
  }, [notBefore, notAfter]);

  const tz = detectTimeZone();

  const startInput = utcIsoToLocalInput(notBefore);
  const endInput = utcIsoToLocalInput(notAfter);

  const setMode = (mode: TimeLockMode) => {
    // Switching mode clears the bound that no longer applies.
    if (mode === 'opens') {
      onChangeConfig({ enabled: true, notBefore: notBefore ?? null, notAfter: null });
    } else if (mode === 'expires') {
      onChangeConfig({ enabled: true, notBefore: null, notAfter: notAfter ?? null });
    } else {
      onChangeConfig({ enabled: true, notBefore: notBefore ?? null, notAfter: notAfter ?? null });
    }
  };

  const updateStart = (localValue: string) => {
    const iso = localInputToUtcIso(localValue);
    onChangeConfig({ enabled: true, notBefore: iso, notAfter });
  };

  const updateEnd = (localValue: string) => {
    const iso = localInputToUtcIso(localValue);
    onChangeConfig({ enabled: true, notBefore, notAfter: iso });
  };

  const toggleEnabled = () => {
    if (enabled) {
      onChangeConfig({ enabled: false, notBefore: null, notAfter: null });
    } else {
      onChangeConfig({ enabled: true, notBefore: null, notAfter: null });
    }
  };

  // Validation: end strictly after start for window mode, and warn if not in future.
  const nowMs = Date.now();
  const startMs = notBefore ? Date.parse(notBefore) : NaN;
  const endMs = notAfter ? Date.parse(notAfter) : NaN;

  const orderError =
    activeMode === 'window' &&
    !Number.isNaN(startMs) &&
    !Number.isNaN(endMs) &&
    endMs <= startMs;

  const pastStartWarn =
    enabled && activeMode !== 'expires' && !Number.isNaN(startMs) && startMs <= nowMs;
  const pastEndWarn =
    enabled && activeMode !== 'opens' && !Number.isNaN(endMs) && endMs <= nowMs;

  // Live recipient-perspective preview (uses the same client hook the lock screen uses).
  const tw = useTimeWindow(enabled ? { enabled: true, notBefore, notAfter } : null);

  const previewLabel = useMemo(() => {
    if (!enabled) return 'No time lock — link is open immediately.';
    if (tw.status === 'PENDING' && tw.remainingLabel)
      return `Recipient sees: 🔒 Unlocks in ${tw.remainingLabel}`;
    if (tw.status === 'OPEN' && tw.boundary === 'expires' && tw.remainingLabel)
      return `Recipient sees: 🔓 Open — locks in ${tw.remainingLabel}`;
    if (tw.status === 'OPEN') return 'Recipient sees: 🔓 Open now';
    if (tw.status === 'EXPIRED') return 'Recipient sees: ⌛ Link expired';
    return 'Recipient sees: checking…';
  }, [enabled, tw]);

  if (isLocked) {
    return (
      <div
        onClick={() => onOpenPaywall && onOpenPaywall('Timed Lock (Auto-Open or Expire)')}
        className="w-full mt-3 p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-black/60 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer hover:border-cyan-400/60 transition group shadow-[0_0_20px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-200 uppercase">
                Timed Lock (Auto-Open or Expire)
              </span>
              <span className="px-1.5 py-0.2 bg-fuchsia-900 text-amber-300 text-[9px] font-mono font-bold border border-amber-500/40 rounded flex items-center gap-1">
                <Crown className="w-2.5 h-2.5 fill-amber-300" />
                PRO FEATURE
              </span>
            </div>
            <p className="text-[10px] font-mono text-purple-300/70 mt-0.5">
              Schedule when your link opens or automatically expires after a specific date.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-500/50 group-hover:bg-cyan-900 text-cyan-200 text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,242,255,0.3)] shrink-0"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>UNLOCK PRO</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mt-3 p-3.5 rounded-xl bg-black/50 border border-cyan-500/25 space-y-3">
      {/* Header + Enable toggle */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 uppercase font-bold">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          TIMED ACCESS LOCK (OPTIONAL)
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggleEnabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? 'bg-cyan-500/80 shadow-[0_0_10px_rgba(0,242,255,0.4)]' : 'bg-zinc-700'
          }`}
          title="Enable Timed Lock"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { key: 'opens', label: 'Open On', sub: 'Unlock at date' },
              { key: 'expires', label: 'Expire On', sub: 'Burn after date' },
              { key: 'window', label: 'Date Range', sub: 'Start to end' },
            ] as { key: TimeLockMode; label: string; sub: string }[]).map((m) => {
              const selected = activeMode === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-center transition ${
                    selected
                      ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-[0_0_10px_rgba(0,242,255,0.25)]'
                      : 'border-cyan-500/20 bg-black/40 text-cyan-300/60 hover:border-cyan-400/40'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold uppercase">{m.label}</span>
                  <span className="text-[8px] font-mono text-purple-300/60 mt-0.5">{m.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Start (Opens-After / Open-Window) */}
          {(activeMode === 'opens' || activeMode === 'window') && (
            <div>
              <label
                htmlFor="tw-start-input"
                className="block text-[10px] font-mono text-cyan-300 mb-1 uppercase"
              >
                <CalendarClock className="w-3 h-3 inline mr-1 text-cyan-400" />
                Opens On (Date & Time):
              </label>
              <input
                id="tw-start-input"
                type="datetime-local"
                value={startInput}
                onChange={(e) => updateStart(e.target.value)}
                className="w-full bg-[#080212] border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-cyan-100 font-mono focus:outline-none focus:border-cyan-400"
              />
              {notBefore && (
                <p className="text-[9px] font-mono text-teal-300/70 mt-1">
                  UTC: {notBefore}
                </p>
              )}
            </div>
          )}

          {/* End (Expires-After / Open-Window) */}
          {(activeMode === 'expires' || activeMode === 'window') && (
            <div>
              <label
                htmlFor="tw-end-input"
                className="block text-[10px] font-mono text-cyan-300 mb-1 uppercase"
              >
                <Timer className="w-3 h-3 inline mr-1 text-cyan-400" />
                Expires On (Date & Time):
              </label>
              <input
                id="tw-end-input"
                type="datetime-local"
                value={endInput}
                onChange={(e) => updateEnd(e.target.value)}
                className="w-full bg-[#080212] border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-cyan-100 font-mono focus:outline-none focus:border-cyan-400"
              />
              {notAfter && (
                <p className="text-[9px] font-mono text-teal-300/70 mt-1">
                  UTC: {notAfter}
                </p>
              )}
            </div>
          )}

          {/* Validation messages */}
          {orderError && (
            <p className="flex items-center gap-1.5 text-[10px] font-mono text-rose-400">
              <AlertTriangle className="w-3 h-3" />
              Close time must be strictly after open time.
            </p>
          )}
          {(pastStartWarn || pastEndWarn) && (
            <p className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300/80">
              <Info className="w-3 h-3" />
              Warning: a selected time is in the past. The link may already be open/expired.
            </p>
          )}

          {/* Countdown visibility toggle */}
          <label className="flex items-center gap-2 text-xs text-cyan-200 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={config?.showCountdown !== false}
              onChange={(e) => onChangeConfig({
                ...config,
                enabled: true,
                notBefore,
                notAfter,
                showCountdown: e.target.checked,
              })}
              className="w-3.5 h-3.5 rounded border border-cyan-500/40 bg-[#080212] text-cyan-500 accent-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
            <span className="font-mono text-[10px] text-cyan-200/80">
              Show live countdown timer to viewers
            </span>
          </label>

          {/* Timezone display */}
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-purple-300/70 bg-purple-950/30 border border-purple-500/20 rounded px-2 py-1">
            <Globe className="w-3 h-3 text-purple-300" />
            <span>Builder TZ: {tz}</span>
            <span className="text-purple-300/40">·</span>
            <span>Stored as UTC ISO-8601</span>
          </div>

          {/* Live recipient preview */}
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-2.5 py-2">
            <Eye className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span className="text-[10px] font-mono text-cyan-200">{previewLabel}</span>
          </div>
        </>
      )}
    </div>
  );
};
