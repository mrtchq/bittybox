// ─────────────────────────────────────────────────────────────────────────────
// src/utils/timeWindow.ts
//
// Client-side time-window lock enforcement + countdown helpers (Step #2).
//
// This is the pure contract called out by
// docs/design/time-window-lock-modes.md. It mirrors the server semantics in
// lib/policy-evaluator.js#evaluateTimeWindow EXACTLY so the browser can surface
// a live countdown and block the unlock UI without a server round-trip.
//
// Server remains authoritative: the client never blocks on a malformed
// timestamp (it ignores an unparseable bound rather than wrongly gating), and
// any real open attempt is still server-enforced + audited.
//
// Shapes:
//   TimeWindowConfig  = { enabled?: boolean, notBefore?: string|null, notAfter?: string|null }
//                       (ISO-8601 UTC strings, same as box.lockConfig.timeWindow)
//   TimeWindowStatus  = 'NONE' | 'PENDING' | 'OPEN' | 'EXPIRED'
// ─────────────────────────────────────────────────────────────────────────────

export type TimeWindowStatus = 'NONE' | 'PENDING' | 'OPEN' | 'EXPIRED';

export interface TimeWindowConfig {
  enabled?: boolean;
  /** Client-only lock mode used to drive viewer copy (expiry/delay/range/hybrid). Optional. */
  mode?: TimeLockMode;
  notBefore?: string | null;
  notAfter?: string | null;
  showCountdown?: boolean;
  expiryHours?: number;
  delayHours?: number;
  openAt?: string;
  lockAt?: string;
  hybridRevealMode?: HybridRevealMode;
  hybridSelfDestructHours?: number;
}

export type TimeLockMode = 'expiry' | 'delay' | 'range' | 'hybrid';

/**
 * Pure evaluation of a time-window lock at a given instant.
 *
 * @returns
 *   'NONE'    — no enabled time window (link has no time gate)
 *   'PENDING' — now is before `notBefore` (link inert, "unlocks in" countdown)
 *   'OPEN'    — inside the window (or window open-ended on this side)
 *   'EXPIRED' — now is after `notAfter` (link auto-revoked)
 *
 * Boundaries are EXCLUSIVE to match the server: at exactly `notBefore` the box
 * is OPEN, at exactly `notAfter` it is still OPEN (burns the instant after).
 */
export function evaluateTimeWindow(
  config: TimeWindowConfig | null | undefined,
  nowMs: number = Date.now(),
): TimeWindowStatus {
  if (!config || !config.enabled) return 'NONE';

  const nb = config.notBefore ? Date.parse(config.notBefore) : NaN;
  const na = config.notAfter ? Date.parse(config.notAfter) : NaN;

  // Malformed timestamps are ignored (treated as "no bound") so the client
  // never wrongly blocks a viewer — the server stays the source of truth.
  if (!Number.isNaN(nb) && nowMs < nb) return 'PENDING';
  if (!Number.isNaN(na) && nowMs > na) return 'EXPIRED';
  return 'OPEN';
}

/** Milliseconds from `nowMs` until `targetMs` (negative if already past). null if target missing/invalid. */
export function msUntil(targetMs: number | null, nowMs: number = Date.now()): number | null {
  if (targetMs == null || Number.isNaN(targetMs)) return null;
  return targetMs - nowMs;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Break a millisecond duration into labelled DD/HH/MM/SS parts (floor, never negative). */
export function splitCountdown(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds };
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Render a countdown as "DD : HH : MM : SS" (each unit labelled in the UI per
 * the design doc). Used for "Unlocks in", "Locks in", and "Burns in" timers.
 */
export function formatCountdown(ms: number): string {
  const { days, hours, minutes, seconds } = splitCountdown(ms);
  return `${pad2(days)} : ${pad2(hours)} : ${pad2(minutes)} : ${pad2(seconds)}`;
}

/**
 * Human label for the next boundary the viewer is waiting on.
 * Returns e.g. { kind: 'unlocks', ms } before `notBefore`, or
 * { kind: 'expires', ms } while OPEN with an `notAfter`.
 */
export interface TimeWindowCountdown {
  kind: 'unlocks' | 'expires' | null;
  ms: number | null;
}
export function nextBoundary(
  config: TimeWindowConfig | null | undefined,
  status: TimeWindowStatus,
  nowMs: number = Date.now(),
): TimeWindowCountdown {
  if (status === 'PENDING' && config?.notBefore) {
    const nb = Date.parse(config.notBefore);
    const ms = msUntil(nb, nowMs);
    if (ms != null) return { kind: 'unlocks', ms };
  }
  if (status === 'OPEN' && config?.notAfter) {
    const na = Date.parse(config.notAfter);
    const ms = msUntil(na, nowMs);
    if (ms != null) return { kind: 'expires', ms };
  }
  return { kind: null, ms: null };
}

/** Convert a Date to a `YYYY-MM-DDTHH:MM` string in *local* time for <input type="datetime-local">. */
export function formatLocalDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Build a TimeWindowConfig from the slide-03 mode selector.
 *   expiry → notBefore:null,             notAfter: now + expiryHours   (current behavior)
 *   delay  → notBefore: now + delayHours, notAfter:null                (Time Until Open)
 *   range  → notBefore: openAt,          notAfter: lockAt              (Date Range)
 * Returns null when disabled so callers can spread it conditionally.
 * Mirrors server semantics in lib/policy-evaluator.js#evaluateTimeWindow EXACTLY.
 */
export type HybridRevealMode = 'delay' | 'date';

export function buildTimeWindow(opts: {
  enabled: boolean;
  mode: TimeLockMode;
  expiryHours: number;
  delayHours: number;
  openAt: string;
  lockAt: string;
  /** Hybrid-only: how the reveal instant is chosen. */
  hybridRevealMode: HybridRevealMode;
  /** Hybrid-only: hours after the reveal instant before the box self-destructs. */
  hybridSelfDestructHours: number;
  showCountdown: boolean;
}): TimeWindowConfig | null {
  if (!opts.enabled) return null;
  const nowMs = Date.now();
  let notBefore: string | null = null;
  let notAfter: string | null = null;
  if (opts.mode === 'expiry') {
    notAfter = new Date(nowMs + opts.expiryHours * 3600 * 1000).toISOString();
  } else if (opts.mode === 'delay') {
    notBefore = new Date(nowMs + opts.delayHours * 3600 * 1000).toISOString();
  } else if (opts.mode === 'range') {
    notBefore = opts.openAt ? new Date(opts.openAt).toISOString() : null;
    notAfter = opts.lockAt ? new Date(opts.lockAt).toISOString() : null;
  } else if (opts.mode === 'hybrid') {
    // Scheduled reveal (delay-from-now OR fixed date) + self-destruct after reveal.
    const revealMs =
      opts.hybridRevealMode === 'delay'
        ? nowMs + opts.delayHours * 3600 * 1000
        : opts.openAt
          ? new Date(opts.openAt).getTime()
          : nowMs;
    notBefore = new Date(revealMs).toISOString();
    notAfter = new Date(revealMs + opts.hybridSelfDestructHours * 3600 * 1000).toISOString();
  }
  return {
    enabled: true,
    mode: opts.mode,
    notBefore,
    notAfter,
    showCountdown: opts.showCountdown,
    expiryHours: opts.expiryHours,
    delayHours: opts.delayHours,
    openAt: opts.openAt,
    lockAt: opts.lockAt,
    hybridRevealMode: opts.hybridRevealMode,
    hybridSelfDestructHours: opts.hybridSelfDestructHours,
  };
}

/**
 * Resolve the human-readable reveal/expire bounds for the hybrid mode, used by
 * the slide-05 summary. Returns nulls when unresolvable.
 */
export function buildRangeBoundaries(opts: {
  hybridRevealMode: HybridRevealMode;
  delayHours: number;
  openAt: string;
  hybridSelfDestructHours: number;
}): { revealMs: number | null; burnMs: number | null } {
  const nowMs = Date.now();
  const revealMs =
    opts.hybridRevealMode === 'delay'
      ? nowMs + opts.delayHours * 3600 * 1000
      : opts.openAt
        ? new Date(opts.openAt).getTime()
        : null;
  if (revealMs == null || Number.isNaN(revealMs)) return { revealMs: null, burnMs: null };
  return { revealMs, burnMs: revealMs + opts.hybridSelfDestructHours * 3600 * 1000 };
}

/** Format the hybrid summary line: "Reveals <date> · Self-destructs <duration> later". */
export function formatHybridSummary(opts: {
  hybridRevealMode: HybridRevealMode;
  delayHours: number;
  openAt: string;
  hybridSelfDestructHours: number;
}): string {
  const { revealMs, burnMs } = buildRangeBoundaries(opts);
  if (revealMs == null || burnMs == null) return 'Hybrid window';
  const reveal = new Date(revealMs).toLocaleString();
  const sd =
    opts.hybridSelfDestructHours === 168
      ? '7 Days'
      : opts.hybridSelfDestructHours === 72
        ? '3 Days'
        : opts.hybridSelfDestructHours === 1
          ? '1h'
          : `${opts.hybridSelfDestructHours}h`;
  return `Reveals ${reveal} · Self-destructs ${sd} after`;
}

import { useEffect, useState } from 'react';

export interface UseTimeWindowResult {
  status: TimeWindowStatus;
  /** ms until the next boundary (unlock or expire), or null when N/A. */
  remainingMs: number | null;
  /** ms remaining formatted as "DD : HH : MM : SS", or null. */
  remainingLabel: string | null;
  /** boundary kind driving the countdown, or null. */
  boundary: 'unlocks' | 'expires' | null;
}

/**
 * React hook: ticks once per second and returns the live time-window status
 * plus the countdown to the next boundary. Rendering the matching lock-screen
 * state from this is Step #3's job; this just feeds it accurate, ticking data.
 */
export function useTimeWindow(
  config: TimeWindowConfig | null | undefined,
): UseTimeWindowResult {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const status = evaluateTimeWindow(config, now);
  const { kind, ms } = nextBoundary(config, status, now);

  return {
    status,
    remainingMs: ms,
    remainingLabel: ms == null ? null : formatCountdown(ms),
    boundary: kind,
  };
}
