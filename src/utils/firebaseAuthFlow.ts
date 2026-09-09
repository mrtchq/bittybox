const FIREBASE_SESSION_PREFIX = 'fb_sess_';

export function safeGoogleAuthReturn(
  storedUrl: string | null,
  expectedOrigin: string,
): string | null {
  if (!storedUrl) return null;
  try {
    const parsed = new URL(storedUrl);
    return parsed.origin === expectedOrigin ? parsed.href : null;
  } catch {
    return null;
  }
}

export function shouldLoadLegacyProfile(
  googleRedirectPending: boolean,
  firebaseUid: string | null | undefined,
  sessionId: string | null,
): boolean {
  return (
    !googleRedirectPending &&
    !firebaseUid &&
    Boolean(sessionId) &&
    !sessionId!.startsWith(FIREBASE_SESSION_PREFIX)
  );
}

export function authGenerationIsCurrent(
  currentGeneration: number,
  expectedGeneration: number,
  disposed: boolean,
): boolean {
  return !disposed && currentGeneration === expectedGeneration;
}
