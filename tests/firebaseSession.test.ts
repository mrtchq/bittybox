import assert from 'node:assert/strict';
import {
  buildFirebaseAuthHeaders,
  normalizeFirebaseSessionId,
  shouldUseLegacySession,
} from '../src/utils/firebaseSession';

console.log('Testing Firebase/local-session isolation...');

const now = 1_777_777_777_777;

assert.equal(
  normalizeFirebaseSessionId('google-user', null, now),
  `fb_sess_google-user_${now}`,
  'missing local session must become a Firebase-scoped session',
);
assert.equal(
  normalizeFirebaseSessionId('google-user', 'legacy_session_123', now),
  `fb_sess_google-user_${now}`,
  'legacy backend session must be replaced after Firebase sign-in',
);
assert.equal(
  normalizeFirebaseSessionId('google-user', 'fb_sess_other-user_123', now),
  `fb_sess_google-user_${now}`,
  'a Firebase session belonging to another user must be replaced',
);
assert.equal(
  normalizeFirebaseSessionId('google-user', 'fb_sess_google-user_123', now),
  'fb_sess_google-user_123',
  'the current Firebase user session should be stable',
);

assert.equal(
  shouldUseLegacySession('google-user', 'legacy_session_123'),
  false,
  'Firebase identity must always suppress legacy backend-session writes',
);
assert.equal(
  shouldUseLegacySession(null, 'legacy_session_123'),
  true,
  'legacy backend session is valid only when Firebase is signed out',
);
assert.equal(shouldUseLegacySession(null, 'fb_sess_google-user_123'), false);
assert.equal(shouldUseLegacySession(null, null), false);

assert.deepEqual(
  buildFirebaseAuthHeaders('firebase-id-token'),
  { Authorization: 'Bearer firebase-id-token' },
  'Firebase backend calls must authenticate only with the verified ID token',
);
assert.deepEqual(buildFirebaseAuthHeaders(''), {});
assert.equal('X-Session-Id' in buildFirebaseAuthHeaders('firebase-id-token'), false);

console.log('✓ Firebase/local-session isolation tests passed');
