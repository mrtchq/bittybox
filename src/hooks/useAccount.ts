import { useState, useEffect, useCallback } from 'react';
import { BittyUser, ApiKeyMeta } from '../types';
import { 
  auth, 
  signInWithGoogle as firebaseSignInWithGoogle,
  completeGoogleRedirectSignIn,
  hasPendingGoogleRedirect,
  type GoogleSignInResult,
  signOutFirebase, 
  getOrCreateFirestoreUser, 
  subscribeToUserProfile,
} from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  buildFirebaseAuthHeaders,
  normalizeFirebaseSessionId,
  shouldUseLegacySession,
} from '../utils/firebaseSession';
import {
  authGenerationIsCurrent,
  shouldLoadLegacyProfile,
} from '../utils/firebaseAuthFlow';
import {
  deleteFirebaseTrackedBox,
  recordFirebaseTrackedBox,
  type FirebaseTrackedBoxInput,
} from '../utils/firebaseAccountMutations';

export interface UseAccountResult {
  user: BittyUser | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isDeviceTrusted: boolean;
  trustExpiresAt: string | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  login: (email: string, password?: string, displayName?: string, trustDevice?: boolean) => Promise<boolean>;
  register: (email: string, displayName?: string, password?: string, trustDevice?: boolean) => Promise<boolean>;
  requestMagicLink: (email: string, displayName?: string, trustDevice?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyMagicLink: (token: string, trustDevice?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  generateApiKey: (label?: string, scopes?: string[]) => Promise<{ rawKey: string; key: ApiKeyMeta } | null>;
  revokeApiKey: (keyId: string) => Promise<boolean>;
  testApiKey: (key: string) => Promise<{ valid: boolean; error?: string; user?: any; key?: any }>;
  purchaseCredits: (packageId: string, amount?: number, costCents?: number) => Promise<boolean>;
  recordCreatedBox: (linkData: FirebaseTrackedBoxInput) => Promise<boolean>;
  syncUserCreditsWithCreem: () => Promise<boolean>;
  deleteTrackedBox: (linkId: string) => Promise<boolean>;
}

export function useAccount(): UseAccountResult {
  const [user, setUser] = useState<BittyUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bitty_session_id');
    } catch {
      return null;
    }
  });
  const [isDeviceTrusted, setIsDeviceTrusted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bitty_device_trusted') !== 'false';
    } catch {
      return true;
    }
  });
  const [trustExpiresAt, setTrustExpiresAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bitty_device_trust_until');
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // One redirect-completion owner, one auth listener, and a generation guard
  // prevent old users or StrictMode's probe mount from updating current state.
  useEffect(() => {
    let disposed = false;
    let authGeneration = 0;
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;

    const startAuthListener = () => {
      unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
        const generation = ++authGeneration;
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }

        if (fbUser) {
          try {
            setIsLoading(true);
            const currentSid = normalizeFirebaseSessionId(
              fbUser.uid,
              localStorage.getItem('bitty_session_id'),
            );
            if (!authGenerationIsCurrent(authGeneration, generation, disposed)) return;
            setSessionId(currentSid);
            setIsDeviceTrusted(true);
            try {
              localStorage.setItem('bitty_session_id', currentSid);
              localStorage.setItem('bitty_device_trusted', 'true');
            } catch {}

            const bittyUser = await getOrCreateFirestoreUser(fbUser);
            if (!authGenerationIsCurrent(authGeneration, generation, disposed)) return;
            setUser(bittyUser);

            unsubscribeFirestore = subscribeToUserProfile(fbUser.uid, (firestoreUser) => {
              if (
                firestoreUser &&
                auth.currentUser?.uid === fbUser.uid &&
                authGenerationIsCurrent(authGeneration, generation, disposed)
              ) {
                setUser(firestoreUser);
              }
            });
          } catch (err: any) {
            if (!authGenerationIsCurrent(authGeneration, generation, disposed)) return;
            console.error('[useAccount] Firebase auth init error:', err);
            setError(err.message || 'Firebase sync error');
          } finally {
            if (authGenerationIsCurrent(authGeneration, generation, disposed)) {
              setIsLoading(false);
            }
          }
          return;
        }

        const storedSid = localStorage.getItem('bitty_session_id');
        if (shouldLoadLegacyProfile(hasPendingGoogleRedirect(), null, storedSid)) {
          await fetchProfile(storedSid!);
        } else {
          if (storedSid?.startsWith('fb_sess_')) {
            localStorage.removeItem('bitty_session_id');
          }
          if (authGenerationIsCurrent(authGeneration, generation, disposed)) {
            setSessionId(null);
            setUser(null);
            setIsLoading(false);
          }
        }
      });
    };

    void completeGoogleRedirectSignIn().then((result) => {
      if (disposed) return;
      if (result.error) setError(result.error);
      if (result.returnUrl && result.returnUrl !== window.location.href) {
        window.history.replaceState(null, '', result.returnUrl);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      startAuthListener();
    });

    return () => {
      disposed = true;
      authGeneration += 1;
      unsubscribeAuth?.();
      unsubscribeFirestore?.();
    };
  }, []);

  const fetchProfile = useCallback(async (sid: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/accounts/me', {
        headers: {
          'X-Session-Id': sid,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          const trusted = Boolean(data.trusted ?? data.user.settings?.trustThisDevice);
          setIsDeviceTrusted(trusted);
          const exp = data.sessionExpiresAt || data.user.settings?.deviceTrustExpiresAt || null;
          setTrustExpiresAt(exp);
          try {
            localStorage.setItem('bitty_device_trusted', String(trusted));
            if (exp) {
              localStorage.setItem('bitty_device_trust_until', exp);
            }
          } catch {}
          setError(null);
          return;
        }
      }
      if (res.status === 401) {
        localStorage.removeItem('bitty_session_id');
        localStorage.removeItem('bitty_device_trust_until');
        setSessionId(null);
        setUser(null);
        setTrustExpiresAt(null);
      }
    } catch (err: any) {
      console.error('[useAccount] Error fetching user profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign in with Google via Firebase. The helper uses a popup first and may
   * switch to a redirect when the browser blocks popups.
   */
  const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await firebaseSignInWithGoogle();
      if (res.success) return res;
      if (res.redirecting) return res;

      const message = res.error || 'Google Sign-In failed';
      setError(message);
      return { ...res, error: message };
    } catch (err: any) {
      const message = err.message || 'Failed to sign in with Google';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password = '', displayName = '', trustDevice = true): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await fetch('/api/accounts/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, trustDevice }),
      });
      const data = await res.json();
      if (data.success && data.user && data.sessionId) {
        setUser(data.user);
        setSessionId(data.sessionId);
        setIsDeviceTrusted(Boolean(data.trusted));
        setTrustExpiresAt(data.expiresAt || null);
        try {
          localStorage.setItem('bitty_session_id', data.sessionId);
          localStorage.setItem('bitty_device_trusted', String(Boolean(data.trusted)));
          if (data.expiresAt) localStorage.setItem('bitty_device_trust_until', data.expiresAt);
        } catch {}
        return true;
      } else {
        setError(data.error || 'Login failed');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Login network error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, displayName = '', password = '', trustDevice = true): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await fetch('/api/accounts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, password, trustDevice }),
      });
      const data = await res.json();
      if (data.success && data.user && data.sessionId) {
        setUser(data.user);
        setSessionId(data.sessionId);
        setIsDeviceTrusted(Boolean(data.trusted));
        setTrustExpiresAt(data.expiresAt || null);
        try {
          localStorage.setItem('bitty_session_id', data.sessionId);
          localStorage.setItem('bitty_device_trusted', String(Boolean(data.trusted)));
          if (data.expiresAt) localStorage.setItem('bitty_device_trust_until', data.expiresAt);
        } catch {}
        return true;
      } else {
        setError(data.error || 'Registration failed');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Registration network error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const requestMagicLink = async (email: string, displayName = '', trustDevice = true): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      setError(null);
      setIsLoading(true);
      try {
        localStorage.setItem('bitty_device_trusted', String(trustDevice));
      } catch {}
      const res = await fetch('/api/accounts/magic/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, trustDevice }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message || 'Magic link sent!' };
      } else {
        const msg = data.error || 'Failed to send magic link';
        setError(msg);
        return { success: false, error: msg };
      }
    } catch (err: any) {
      const msg = err.message || 'Network error requesting magic link';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMagicLink = async (token: string, trustDeviceOverride?: boolean): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      let trustDevice = trustDeviceOverride;
      if (trustDevice === undefined) {
        try {
          trustDevice = localStorage.getItem('bitty_device_trusted') !== 'false';
        } catch {
          trustDevice = true;
        }
      }
      const res = await fetch('/api/accounts/magic/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, trustDevice }),
      });
      const data = await res.json();
      if (data.success && data.user && data.sessionId) {
        setUser(data.user);
        setSessionId(data.sessionId);
        setIsDeviceTrusted(Boolean(data.trusted));
        setTrustExpiresAt(data.expiresAt || null);
        try {
          localStorage.setItem('bitty_session_id', data.sessionId);
          localStorage.setItem('bitty_device_trusted', String(Boolean(data.trusted)));
          if (data.expiresAt) localStorage.setItem('bitty_device_trust_until', data.expiresAt);
        } catch {}
        return true;
      } else {
        setError(data.error || 'Magic link verification failed');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Network error verifying magic link');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    const firebaseUid = auth.currentUser?.uid;
    if (firebaseUid) {
      await signOutFirebase();
      if (auth.currentUser) {
        throw new Error('Google sign-out did not complete. Your session is still active.');
      }
    }
    try {
      if (shouldUseLegacySession(firebaseUid, sessionId)) {
        await fetch('/api/accounts/logout', {
          method: 'POST',
          headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      }
    } catch {}
    try {
      localStorage.removeItem('bitty_session_id');
      localStorage.removeItem('bitty_device_trust_until');
    } catch {}
    setSessionId(null);
    setUser(null);
    setTrustExpiresAt(null);
  };

  const refreshUser = async (): Promise<void> => {
    if (auth.currentUser) {
      const u = await getOrCreateFirestoreUser(auth.currentUser);
      setUser(u);
    } else if (sessionId) {
      await fetchProfile(sessionId);
    }
  };

  const generateApiKey = async (label = 'API Key', scopes = ['links:create', 'links:read', 'mcp:access']) => {
    try {
      let headers: Record<string, string>;
      if (auth.currentUser) {
        headers = {
          ...buildFirebaseAuthHeaders(await auth.currentUser.getIdToken()),
          'Content-Type': 'application/json',
        };
      } else if (shouldUseLegacySession(null, sessionId)) {
        headers = { 'X-Session-Id': sessionId!, 'Content-Type': 'application/json' };
      } else {
        setError('Sign in before generating an API key.');
        return null;
      }

      const res = await fetch('/api/accounts/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({ label, scopes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.key?.rawKey) {
        setError(data.error || 'Could not generate API key');
        return null;
      }
      if (data.user) setUser(data.user);
      const { rawKey, ...key } = data.key;
      return { rawKey, key: key as ApiKeyMeta };
    } catch (err: any) {
      console.error('[useAccount] Failed to generate API key via API:', err);
      setError(err.message || 'Could not generate API key');
      return null;
    }
  };

  const revokeApiKey = async (keyId: string): Promise<boolean> => {
    if (!keyId) return false;
    try {
      let headers: Record<string, string>;
      if (auth.currentUser) {
        headers = buildFirebaseAuthHeaders(await auth.currentUser.getIdToken());
      } else if (shouldUseLegacySession(null, sessionId)) {
        headers = { 'X-Session-Id': sessionId! };
      } else {
        return false;
      }
      const res = await fetch(`/api/accounts/keys/${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.user) setUser(data.user);
      if (!res.ok) setError(data.error || 'Could not revoke API key');
      return res.ok && Boolean(data.success);
    } catch (err: any) {
      console.error('[useAccount] Failed to revoke key:', err);
      setError(err.message || 'Could not revoke API key');
      return false;
    }
  };

  const testApiKey = async (key: string) => {
    try {
      const res = await fetch('/api/accounts/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      return await res.json();
    } catch (err: any) {
      return { valid: false, error: err.message || 'Network error' };
    }
  };

  // SECURITY: credits are NEVER granted client-side. The dashboard's
  // "Buy" buttons are <a href> links that open the Creem checkout; real
  // credits are issued ONLY by the server billing webhook after a paid
  // event (via Creem Customer Credit Accounts). This function is a no-op
  // guard so no code path can self-grant free credits.
  const purchaseCredits = async (packageId?: string, amount = 50, costCents = 500): Promise<boolean> => {
    console.warn('[useAccount] purchaseCredits is disabled: credits are issued only via the Creem paid webhook.');
    return false;
  };

  // Reconcile the Firebase display ledger with the authoritative Creem CCA
  // balance. Firebase users' purchases land in Creem (via webhook), not
  // Firestore — so we mirror Creem's balance into Firestore here. Call this
  // on login and after returning from a Creem checkout.
  const syncUserCreditsWithCreem = async (): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return false;
    try {
      // Firebase users have no server session. Send the verified Firebase ID
      // token so the server can prove identity (never trust a raw email).
      const idToken = await firebaseUser.getIdToken();
      const headers = buildFirebaseAuthHeaders(idToken);
      const res = await fetch('/api/accounts/credits/sync-from-creem', {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUser(data.user);
        return Boolean(data.synced);
      }
      return false;
    } catch (err) {
      console.error('[useAccount] syncUserCreditsWithCreem failed:', err);
      return false;
    }
  };

  const recordCreatedBox = async (linkData: FirebaseTrackedBoxInput): Promise<boolean> => {
    setError(null);
    if (auth.currentUser) {
      const result = await recordFirebaseTrackedBox(auth.currentUser, linkData);
      if (result.success && result.user) {
        setUser(result.user);
        return true;
      }
      setError(result.error || 'Could not record box');
      return false;
    }

    const activeSid = sessionId || (typeof localStorage !== 'undefined' ? localStorage.getItem('bitty_session_id') : null);
    if (!shouldUseLegacySession(null, activeSid)) {
      setError('Sign in before saving a box to your account.');
      return false;
    }
    try {
      const res = await fetch('/api/accounts/links', {
        method: 'POST',
        headers: {
          'X-Session-Id': activeSid,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkData),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        setUser(data.user);
        return true;
      }
      setError(data.error || 'Could not record box');
      return false;
    } catch (err: any) {
      console.error('[useAccount] Failed to record created box via backend API:', err);
      setError(err.message || 'Could not record box');
      return false;
    }
  };

  const deleteTrackedBox = async (linkId: string): Promise<boolean> => {
    if (!linkId) return false;
    setError(null);
    if (auth.currentUser) {
      const result = await deleteFirebaseTrackedBox(auth.currentUser, linkId);
      if (result.success && result.user) {
        setUser(result.user);
        return true;
      }
      setError(result.error || 'Could not delete box');
      return false;
    }

    const activeSid = sessionId || (typeof localStorage !== 'undefined' ? localStorage.getItem('bitty_session_id') : null);
    if (!shouldUseLegacySession(null, activeSid)) return false;

    try {
      const res = await fetch(`/api/accounts/links/${encodeURIComponent(linkId)}`, {
        method: 'DELETE',
        headers: { 'X-Session-Id': activeSid },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        setUser(data.user);
        return true;
      }
      setError(data.error || 'Could not delete box');
      return false;
    } catch (err: any) {
      console.error('[useAccount] Failed to delete tracked box:', err);
      setError(err.message || 'Could not delete box');
      return false;
    }
  };

  return {
    user,
    sessionId,
    isAuthenticated: Boolean(user && (sessionId || auth.currentUser)),
    isDeviceTrusted,
    trustExpiresAt,
    isLoading,
    error,
    signInWithGoogle,
    login,
    register,
    requestMagicLink,
    verifyMagicLink,
    logout,
    refreshUser,
    generateApiKey,
    revokeApiKey,
    testApiKey,
    purchaseCredits,
    recordCreatedBox,
    syncUserCreditsWithCreem,
    deleteTrackedBox,
  };
}
