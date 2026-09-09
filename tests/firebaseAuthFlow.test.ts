import assert from 'node:assert/strict';
import {
  authGenerationIsCurrent,
  safeGoogleAuthReturn,
  shouldLoadLegacyProfile,
} from '../src/utils/firebaseAuthFlow';

console.log('Testing Firebase auth-flow race and redirect guards...');

assert.equal(
  safeGoogleAuthReturn('https://bittybox.org/#/account', 'https://bittybox.org'),
  'https://bittybox.org/#/account',
);
assert.equal(
  safeGoogleAuthReturn('https://evil.example/steal', 'https://bittybox.org'),
  null,
  'redirect restoration must reject cross-origin destinations',
);
assert.equal(safeGoogleAuthReturn('not a url', 'https://bittybox.org'), null);

assert.equal(shouldLoadLegacyProfile(true, null, 'legacy_123'), false);
assert.equal(
  shouldLoadLegacyProfile(false, null, 'legacy_123'),
  true,
  'legacy profile may load only when no Google redirect or Firebase user is active',
);
assert.equal(shouldLoadLegacyProfile(false, 'firebase_uid', 'legacy_123'), false);
assert.equal(shouldLoadLegacyProfile(false, null, 'fb_sess_uid_1'), false);

assert.equal(authGenerationIsCurrent(3, 3, false), true);
assert.equal(authGenerationIsCurrent(4, 3, false), false);
assert.equal(authGenerationIsCurrent(3, 3, true), false);

console.log('✓ Firebase auth-flow race and redirect guards passed');
