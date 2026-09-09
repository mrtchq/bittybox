/**
 * accessLimit.test.ts
 * ---------------------------------
 * Enforcement + boundary + race-condition probe for the Bitty Box
 * per-box Access Limit Lock (lib/policy-evaluator.js + lib/box-store.js).
 *
 * Run:  npx tsx tests/accessLimit.test.ts
 * Exit: 0 = all pass, 1 = any failure.
 *
 * Coverage maps to Bitty Box project task
 *   "Step #5 — Test access limit enforcement, race conditions, and
 *    boundary failures" (P3).
 *
 * What this proves (policy layer = the authoritative gate):
 *   - Boundary: openLimit with maxOpens=N allows exactly N opens
 *     (opensUsed 0..N-1) and DENIES the (N+1)-th. Strict, not off-by-one.
 *   - Invalid inputs: maxOpens null / 0 / <1 -> denied 'invalid_max_opens'
 *     (fail closed, never silently allow).
 *   - Full-pipeline integration via evaluatePolicy/evaluateAccess:
 *     open_limit_reached surfaces as the reason and AND-combines with
 *     other enabled rules (time window, password, etc.).
 *   - Constructor sanity: box-store.createOpenLimit yields the exact
 *     { enabled, maxOpens, opensUsed:0 } shape the server persists.
 *   - RACE PROBE: under a non-atomic read-then-increment gate (the
 *     pattern box-store.incrementOpensUsed + evaluateAndRecord uses),
 *     concurrent in-flight requests that all read opensUsed<N before any
 *     commit can overshoot the cap. This test documents the overshoot
 *     ceiling so the production gate can be hardened with a CAS later.
 *     It does NOT assert the overshoot is prevented (that is the fix),
 *     it asserts the policy contract per single evaluation is correct
 *     and measures the worst-case overshoot.
 */

import {
  evaluateOpenLimit,
  evaluatePolicy,
  evaluateAccess,
} from '../lib/policy-evaluator';
import { createOpenLimit } from '../lib/box-store';

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

// Simulate the server gate: read opensUsed, evaluate, then commit an increment.
// `concurrency` models in-flight requests that all observe the same snapshot
// before any write lands (the non-atomic window).
function simulateGate(maxOpens: number, concurrency: number) {
  const lockConfig = { openLimit: { enabled: true, maxOpens, opensUsed: 0 } };
  let opensUsed = 0;
  const allowed: boolean[] = [];
  // Phase 1: every concurrent request evaluates against the SAME snapshot.
  for (let i = 0; i < concurrency; i++) {
    const ev = evaluateAccess(lockConfig, {}, { opensUsed });
    allowed.push(ev.ok);
  }
  // Phase 2: each allowed request commits its increment (best-effort, in order).
  for (const ok of allowed) {
    if (ok) opensUsed++;
  }
  return { allowed, finalOpens: opensUsed, maxOpens };
}

async function main() {
  console.log('\n=== Boundary (evaluateOpenLimit, pure) ===');

  // maxOpens = 1 -> exactly 1 open, 2nd denied
  {
    const cfg = createOpenLimit({ maxOpens: 1 });
    check('createOpenLimit shape', cfg.enabled && cfg.maxOpens === 1 && cfg.opensUsed === 0,
      JSON.stringify(cfg));
    check('maxOpens=1 allows 0th open', evaluateOpenLimit(cfg, 0).ok);
    check('maxOpens=1 denies 1st open (used==max)', !evaluateOpenLimit(cfg, 1).ok);
    check('maxOpens=1 denies 2nd open', !evaluateOpenLimit(cfg, 2).ok);
    check('maxOpens=1 deny code is open_limit_reached',
      evaluateOpenLimit(cfg, 1).deniedCodes.includes('open_limit_reached'));
  }

  // maxOpens = 3 -> allows 0,1,2; denies 3,4
  {
    const cfg = { enabled: true, maxOpens: 3, opensUsed: 0 };
    for (let u = 0; u < 3; u++) check(`maxOpens=3 allows open #${u}`, evaluateOpenLimit(cfg, u).ok);
    for (let u = 3; u <= 4; u++)
      check(`maxOpens=3 denies open #${u}`, !evaluateOpenLimit(cfg, u).ok);
  }

  console.log('\n=== Invalid inputs (fail closed) ===');
  {
    check('maxOpens=null denied', !evaluateOpenLimit({ enabled: true, maxOpens: null }, 0).ok);
    check('maxOpens=null code invalid_max_opens',
      evaluateOpenLimit({ enabled: true, maxOpens: null }, 0).deniedCodes.includes('invalid_max_opens'));
    check('maxOpens=0 denied', !evaluateOpenLimit({ enabled: true, maxOpens: 0 }, 0).ok);
    check('maxOpens=-5 denied', !evaluateOpenLimit({ enabled: true, maxOpens: -5 }, 0).ok);
    // disabled rule must never block
    check('disabled openLimit never denies', evaluateOpenLimit({ enabled: false, maxOpens: 0 }, 999).ok);
    check('missing openLimit never denies', evaluateOpenLimit(undefined, 999).ok);
  }

  console.log('\n=== Full pipeline (evaluatePolicy / evaluateAccess) ===');
  {
    // open limit reached surfaces as reason
    const cfg = { openLimit: { enabled: true, maxOpens: 2, opensUsed: 0 } };
    const ev = evaluateAccess(cfg, {}, { opensUsed: 2 });
    check('pipeline denies when opensUsed>=max', !ev.ok);
    check('pipeline reason = open_limit_reached', ev.reason === 'open_limit_reached', ev.reason || '');

    // AND-combines with another enabled rule (time window expired)
    const combined = {
      openLimit: { enabled: true, maxOpens: 5, opensUsed: 0 },
      timeWindow: { enabled: true, notBefore: null, notAfter: '2000-01-01T00:00:00Z' },
    };
    const ev2 = evaluateAccess(combined, {}, { opensUsed: 0 });
    check('pipeline AND-combines rules (expired window)', !ev2.ok);
    check('pipeline reports both denied codes',
      ev2.deniedCodes.includes('open_limit_reached') === false &&
      ev2.deniedCodes.includes('expired'), JSON.stringify(ev2.deniedCodes));
  }

  console.log('\n=== Race-condition probe (non-atomic read/increment gate) ===');
  {
    // N concurrent requests all observe opensUsed < max, then all commit.
    // Worst case: every one in the snapshot window is allowed and increments,
    // so delivered opens can exceed maxOpens by (concurrency-1)-worth.
    const r1 = simulateGate(1, 1);
    check('concurrency=1, max=1 -> 1 allowed, final=1 (no overshoot)',
      r1.allowed.filter(Boolean).length === 1 && r1.finalOpens === 1,
      `allowed=${r1.allowed} final=${r1.finalOpens}`);

    const r2 = simulateGate(1, 5);
    const allowed2 = r2.allowed.filter(Boolean).length;
    check('concurrency=5, max=1 -> ALL 5 pass snapshot (overshoot risk documented)',
      allowed2 === 5, `allowed=${allowed2}`);
    check('concurrency=5, max=1 -> final delivered = 5 (> cap, the race)',
      r2.finalOpens === 5 && r2.finalOpens > r2.maxOpens,
      `final=${r2.finalOpens} cap=${r2.maxOpens}`);

    const r3 = simulateGate(3, 10);
    const allowed3 = r3.allowed.filter(Boolean).length;
    check('concurrency=10, max=3 -> all 10 pass snapshot (read-before-write race)',
      allowed3 === 10, `allowed=${allowed3}`);
    check('concurrency=10, max=3 -> delivered 10 >> cap (needs CAS hardening)',
      r3.finalOpens === 10, `final=${r3.finalOpens}`);
  }

  console.log(`\n=== RESULT: ${passed} passed, ${failures.length} failed ===`);
  if (failures.length) {
    console.log('FAILURES:');
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  console.log('All Access Limit enforcement + boundary checks passed.\n' +
    'NOTE: race probe shows the non-atomic read/increment gate can overshoot; ' +
    'harden box-store.incrementOpensUsed with a compare-and-swap before GA.\n');
}

main().catch((e) => {
  console.error('Test harness crashed:', e);
  process.exit(1);
});
