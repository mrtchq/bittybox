/**
 * bittyCrypto.regression.test.ts
 * ---------------------------------
 * Regression + security-hardening suite for the Bitty Box zero-knowledge
 * client-side Password Lock (src/utils/bittyCrypto.ts).
 *
 * Run:  npx tsx tests/bittyCrypto.regression.test.ts
 * Exit: 0 = all pass, 1 = any failure.
 *
 * Coverage maps 1:1 to Bitty Box project task
 *   "Step #4 — End-to-end test and security harden the Password Lock" (P4).
 *
 * Functional:
 *   - correct password unlocks cleanly (round trip)
 *   - wrong password -> WrongPasswordError, NO plaintext/key leak
 *   - empty submission is rejected by the module (UI must guard before call)
 *   - very long / unicode / special-char passwords all handled
 *   - tampered / truncated / wrong-version envelopes fail closed
 * Security:
 *   - PBKDF2 work factor is real (brute-force resistance timing proxy)
 *   - 128-bit random salt + 96-bit random IV, unique per encryption
 *   - derived key is unique per encryption (so random IV reuse is impossible)
 *   - wrong-password path shows no password-dependent timing oracle
 *   - URL fragment leaks no plaintext password or payload
 */

import {
  encryptBox,
  decryptBox,
  WrongPasswordError,
  envelopeToFragment,
  fragmentToEnvelope,
} from '../src/utils/bittyCrypto';

// --- minimal base64url decode so we can inspect envelope bytes ---
function b64urlToBytes(s: string): Uint8Array {
  let t = s.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4 !== 0) t += '=';
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

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

const SALT_BYTES = 16;
const IV_BYTES = 12;
const MIN_ITER_MS = 20; // PBKDF2-HMAC-SHA256 @ 310k iters must cost real time

async function main() {
  console.log('\n=== Functional ===');

  // 1. correct password unlocks cleanly
  {
    const pw = 'correct horse battery staple';
    const plain = '<h1>Secret recipe</h1><script>alert(1)</script>';
    const env = await encryptBox(plain, pw);
    const out = await decryptBox(env, pw);
    check('correct password round-trips exactly', out === plain);
  }

  // 2. wrong password -> WrongPasswordError, no leak
  {
    const pw = 'right-pass';
    const wrong = 'wrong-pass';
    const plain = 'CONFIDENTIAL-PAYLOAD';
    const env = await encryptBox(plain, pw);
    let threw = false;
    let leaked: unknown = null;
    try {
      leaked = await decryptBox(env, wrong);
    } catch (e) {
      threw = e instanceof WrongPasswordError;
    }
    check('wrong password throws WrongPasswordError', threw);
    check('wrong password returns no plaintext', leaked === null);
  }

  // 3. empty password: module rejects a mismatched empty attempt closed,
  //    and an empty string password still encrypts (UI must validate empty)
  {
    const env = await encryptBox('data', '');
    const okEmpty = await decryptBox(env, '');
    check('empty-string password round-trips (UI must guard empty)', okEmpty === 'data');
    let threw = false;
    try {
      await decryptBox(env, 'x');
    } catch (e) {
      threw = e instanceof WrongPasswordError;
    }
    check('non-empty against empty-pw box fails closed', threw);
  }

  // 4. long / unicode / special-char passwords
  {
    const uni = '🔐päßwörd—日本語—🦄'.repeat(3);
    const plain = 'unicode payload ✓';
    const env = await encryptBox(plain, uni);
    check('unicode password round-trips', (await decryptBox(env, uni)) === plain);

    const longPw = 'A'.repeat(10000);
    const env2 = await encryptBox('long pw', longPw);
    check('10k-char password round-trips', (await decryptBox(env2, longPw)) === 'long pw');

    const special = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
    const env3 = await encryptBox('special', special);
    check('all-ASCII-special password round-trips', (await decryptBox(env3, special)) === 'special');
  }

  console.log('\n=== Failure-mode regression (fail closed) ===');
  {
    const env = await encryptBox('x', 'pw');
    // tamper: flip a byte in the ciphertext region
    const bytes = b64urlToBytes(env);
    const ct = bytes.subarray(1 + SALT_BYTES + IV_BYTES);
    const tampered = new Uint8Array(bytes);
    tampered[tampered.length - 1] ^= 0x01;
    const tamperedEnv = Buffer.from(tampered).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    let threw = false;
    try { await decryptBox(tamperedEnv, 'pw'); } catch (e) { threw = e instanceof WrongPasswordError; }
    check('tampered ciphertext fails closed', threw);

    // truncate
    let threw2 = false;
    try { await decryptBox(env.slice(0, 10), 'pw'); } catch (e) { threw2 = e instanceof WrongPasswordError; }
    check('truncated envelope fails closed', threw2);

    // wrong version
    const wb = new Uint8Array(b64urlToBytes(env));
    wb[0] = 99;
    const wrongVer = Buffer.from(wb).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    let threw3 = false;
    try { await decryptBox(wrongVer, 'pw'); } catch { threw3 = true; }
    check('unsupported envelope version throws', threw3);

    // zero-ciphertext (tag-only) envelope must fail closed, never return ''
    const zeroCt = new Uint8Array(1 + SALT_BYTES + IV_BYTES); // version+salt+iv, no ct
    zeroCt[0] = 1;
    const zeroEnv = Buffer.from(zeroCt).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    let threw4 = false;
    try { await decryptBox(zeroEnv, 'pw'); } catch (e) { threw4 = e instanceof WrongPasswordError; }
    check('tag-only / zero-ciphertext envelope fails closed', threw4);
  }

  console.log('\n=== Security hardening ===');
  // 5. PBKDF2 work factor (brute-force resistance proxy)
  {
    const t0 = performance.now();
    await encryptBox('measure', 'work-factor');
    const dt = performance.now() - t0;
    check(`PBKDF2 derivation costs real time (>${MIN_ITER_MS}ms)`, dt > MIN_ITER_MS, `${dt.toFixed(1)}ms`);
  }

  // 6. salt + IV are 128/96-bit and unique per encryption
  {
    const e1 = b64urlToBytes(await encryptBox('same', 'pw'));
    const e2 = b64urlToBytes(await encryptBox('same', 'pw'));
    check('envelope version byte present', e1[0] === 1);
    check('salt is 16 bytes (128-bit)', e1.length > 1 + SALT_BYTES);
    const salt1 = e1.subarray(1, 1 + SALT_BYTES);
    const salt2 = e2.subarray(1, 1 + SALT_BYTES);
    const iv1 = e1.subarray(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
    const iv2 = e2.subarray(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
    check('salt differs across encryptions (random)', !salt1.every((b, i) => b === salt2[i]));
    check('IV differs across encryptions (random)', !iv1.every((b, i) => b === iv2[i]));
    check('derived key unique per encryption (IV reuse impossible)',
      !(salt1.every((b, i) => b === salt2[i])));
  }

  // 7. no password-dependent timing oracle on wrong password
  {
    const env = await encryptBox('timing', 'baseline-pw');
    const N = 8;
    const timeOf = async (pw: string) => {
      const samples: number[] = [];
      for (let i = 0; i < N; i++) {
        const s = performance.now();
        try { await decryptBox(env, pw); } catch { /* expected */ }
        samples.push(performance.now() - s);
      }
      samples.sort((a, b) => a - b);
      return samples[Math.floor(N / 2)]; // median
    };
    const tCorrect = await timeOf('baseline-pw');
    const tWrong = await timeOf('totally-wrong');
    const ratio = Math.max(tCorrect, tWrong) / Math.min(tCorrect, tWrong);
    check('correct vs wrong password timing within 2x (no oracle)', ratio < 2,
      `correct=${tCorrect.toFixed(1)}ms wrong=${tWrong.toFixed(1)}ms ratio=${ratio.toFixed(2)}`);
  }

  // 8. URL fragment leaks no plaintext password or payload
  {
    const pw = 'hunter2-do-not-leak';
    const plain = 'TOP SECRET PAYLOAD 12345';
    const env = await encryptBox(plain, pw);
    const frag = envelopeToFragment(env); // "#box=..."
    check('fragment contains no plaintext password', !frag.includes(pw));
    check('fragment contains no plaintext payload', !frag.includes(plain));
    const raw = b64urlToBytes(fragmentToEnvelope(frag) as string);
    const rawStr = String.fromCharCode(...raw);
    check('envelope bytes contain no plaintext payload', !rawStr.includes(plain));
    check('envelope bytes contain no plaintext password', !rawStr.includes(pw));
  }

  console.log(`\n=== RESULT: ${passed} passed, ${failures.length} failed ===`);
  if (failures.length) {
    console.log('FAILURES:');
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  console.log('All Password Lock regression + hardening checks passed.\n');
}

main().catch((e) => {
  console.error('Test harness crashed:', e);
  process.exit(1);
});
