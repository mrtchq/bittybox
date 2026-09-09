/**
 * timeWindow.test.ts
 * ---------------------------------
 * Time-window ("time lock") gate coverage for the Bitty Box per-box Time Lock
 * (lib/policy-evaluator.js -> evaluateTimeWindow + evaluatePolicy).
 *
 * Run:  npx tsx tests/timeWindow.test.ts
 * Exit: 0 = all pass, 1 = any failure.
 *
 * Coverage maps to Bitty Box project task
 *   "Step #5 — Test time lock across all timezones and edge cases" (P3).
 *
 * What this proves (time lock = the authoritative before/after gate):
 *   - Disabled / absent window -> always open (ok:true).
 *   - Active window (notBefore in past, notAfter in future) -> ok:true.
 *   - too_early: notBefore in the future -> denied 'too_early'.
 *   - expired:   notAfter in the past  -> denied 'expired'.
 *   - Both edges set and both violated -> both codes present (AND is fine here
 *     since each is an independent denial; the gate just needs >=1).
 *   - Boundary: notBefore === now is NOT too_early (strict <).
 *   - Invalid inputs: malformed notBefore / notAfter -> 'invalid_not_before'
 *     / 'invalid_not_after' (fail closed, never silently allow).
 *   - Pipeline: evaluatePolicy AND-combines the time-window denial with the
 *     rest of the lock policy.
 *   - TIMEZONE SAFETY: every fixture is built as an absolute UTC ISO-8601
 *     string (suffix 'Z'). Because Date parses 'Z' as a fixed instant, the
 *     gate is independent of the host/server timezone. This test is executed
 *     by the watchdog under TZ=UTC, TZ=America/New_York, and TZ=Asia/Kolkata;
 *     if any run diverges, the time lock is NOT timezone-safe and must be
 *     fixed at the caller (UI must always send 'Z' strings, never naive local).
 */

import { evaluateTimeWindow, evaluatePolicy } from '../lib/policy-evaluator';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// Absolute UTC ISO-8601 (Z) string `offsetMs` away from now.
function utc(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function tw(over: Partial<{ enabled: boolean; notBefore: string | null; notAfter: string | null }>) {
  return { enabled: true, ...over };
}

async function main() {
  console.log('\n=== Time Lock: evaluateTimeWindow (pure) ===');

  // 1. Disabled window is always open.
  check('disabled window -> open', evaluateTimeWindow({ enabled: false }).ok === true);
  check('no config -> open', evaluateTimeWindow(undefined as any).ok === true);

  // 2. Active window (both edges, straddling now).
  {
    const r = evaluateTimeWindow(tw({ notBefore: utc(-3600_000), notAfter: utc(3600_000) }));
    check('active window -> ok', r.ok === true && r.deniedCodes.length === 0, JSON.stringify(r));
  }

  // 3. too_early
  {
    const r = evaluateTimeWindow(tw({ notBefore: utc(3600_000) }));
    check('notBefore future -> too_early', !r.ok && r.deniedCodes.includes('too_early'), JSON.stringify(r));
  }

  // 4. expired
  {
    const r = evaluateTimeWindow(tw({ notAfter: utc(-3600_000) }));
    check('notAfter past -> expired', !r.ok && r.deniedCodes.includes('expired'), JSON.stringify(r));
  }

  // 5. Both violated.
  {
    const r = evaluateTimeWindow(tw({ notBefore: utc(3600_000), notAfter: utc(-3600_000) }));
    check('both edges violated -> too_early + expired',
      !r.ok && r.deniedCodes.includes('too_early') && r.deniedCodes.includes('expired'),
      JSON.stringify(r));
  }

  // 6. Boundary: notBefore exactly now is NOT too_early (strict <).
  {
    const r = evaluateTimeWindow(tw({ notBefore: new Date(Date.now()).toISOString() }));
    check('notBefore === now -> not too_early', r.ok === true, JSON.stringify(r));
  }

  // 7. Invalid inputs fail closed.
  {
    const r = evaluateTimeWindow(tw({ notBefore: 'not-a-date' }));
    check('invalid notBefore -> invalid_not_before', !r.ok && r.deniedCodes.includes('invalid_not_before'), JSON.stringify(r));
  }
  {
    const r = evaluateTimeWindow(tw({ notAfter: '2026-13-99T00:00:00Z' }));
    check('invalid notAfter -> invalid_not_after', !r.ok && r.deniedCodes.includes('invalid_not_after'), JSON.stringify(r));
  }

  console.log('\n=== Time Lock: pipeline via evaluatePolicy ===');
  {
    const r = evaluatePolicy(
      { timeWindow: tw({ notBefore: utc(-1000), notAfter: utc(1000) }) },
      {},
      {},
    );
    check('policy: active window -> ok', r.ok === true, JSON.stringify(r.deniedCodes));
  }
  {
    const r = evaluatePolicy(
      { timeWindow: tw({ notBefore: utc(3600_000) }) },
      {},
      {},
    );
    check('policy: too_early window -> denied', r.ok === false && r.deniedCodes.includes('too_early'), JSON.stringify(r.deniedCodes));
  }

  console.log(`\n=== Time Lock: ${passed} passed, ${failures.length} failed (host TZ=${Intl.DateTimeFormat().resolvedOptions().timeZone}) ===`);
  if (failures.length) {
    console.log('FAILURES:\n - ' + failures.join('\n - '));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('UNCAUGHT', e);
  process.exit(1);
});
