const FIREBASE_SESSION_PREFIX = 'fb_sess_';

export function normalizeFirebaseSessionId(
  firebaseUid: string,
  storedSessionId: string | null,
  now = Date.now(),
): string {
  const expectedPrefix = `${FIREBASE_SESSION_PREFIX}${firebaseUid}_`;
  if (storedSessionId?.startsWith(expectedPrefix)) return storedSessionId;
  return `${expectedPrefix}${now}`;
}

export function shouldUseLegacySession(
  firebaseUid: string | null | undefined,
  sessionId: string | null | undefined,
): sessionId is string {
  return !firebaseUid && Boolean(sessionId) && !sessionId!.startsWith(FIREBASE_SESSION_PREFIX);
}

export function buildFirebaseAuthHeaders(idToken: string): Record<string, string> {
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}
