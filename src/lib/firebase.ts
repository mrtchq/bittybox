import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { BittyUser } from '../types';
import { safeGoogleAuthReturn } from '../utils/firebaseAuthFlow';

const getFirebaseEnv = (key: string, fallback: string = ''): string => {
  const value = import.meta.env[key];
  if (value && typeof value === 'string' && !value.startsWith('YOUR_FIREBASE_')) {
    return value;
  }
  return fallback;
};

const firebaseConfig = {
  projectId: getFirebaseEnv('VITE_FIREBASE_PROJECT_ID', 'bitty-box-project'),
  appId: getFirebaseEnv('VITE_FIREBASE_APP_ID', '1:123456789:web:bittyboxapplet'),
  apiKey: getFirebaseEnv('VITE_FIREBASE_API_KEY', 'AIzaSyDemoApiKeyForBittyBoxWorkspace'),
  authDomain: getFirebaseEnv('VITE_FIREBASE_AUTH_DOMAIN', 'bitty-box-project.firebaseapp.com'),
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
  recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || '',
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with custom database ID if specified
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider — identity only. Do not add Workspace/API scopes here.
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface GoogleSignInResult {
  success: boolean;
  user?: BittyUser;
  redirecting?: boolean;
  returnUrl?: string;
  error?: string;
}

const GOOGLE_AUTH_RETURN_KEY = 'bitty_google_auth_return';

export function hasPendingGoogleRedirect(): boolean {
  try {
    return Boolean(sessionStorage.getItem(GOOGLE_AUTH_RETURN_KEY));
  } catch {
    return false;
  }
}

function googleAuthError(error: any): string {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in window closed before completing.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in request is already in progress.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in.';
    case 'auth/network-request-failed':
      return 'Google sign-in could not reach Firebase. Check your connection and retry.';
    case 'auth/web-storage-unsupported':
      return 'This browser is blocking the storage required to stay signed in.';
    default:
      return error?.message || 'Failed to sign in with Google.';
  }
}

/**
 * Sign in using Google OAuth. Prefer a popup so Bitty Box keeps its current
 * hash-based route; fall back to Firebase redirect auth when popups are blocked.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user) {
      return { success: false, error: 'No user returned from Google authentication.' };
    }
    // onAuthStateChanged is the sole owner of profile synchronization.
    return { success: true };
  } catch (error: any) {
    console.error('[Firebase Auth] Google Sign-In error:', error);
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        sessionStorage.setItem(GOOGLE_AUTH_RETURN_KEY, window.location.href);
        await signInWithRedirect(auth, googleProvider);
        return { success: false, redirecting: true };
      } catch (redirectError: any) {
        return { success: false, error: googleAuthError(redirectError) };
      }
    }
    return { success: false, error: googleAuthError(error) };
  }
}

/** Complete a Firebase redirect flow after the app reloads. */
export async function completeGoogleRedirectSignIn(): Promise<GoogleSignInResult> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await getRedirectResult(auth);
    if (!result?.user) {
      if (!auth.currentUser && hasPendingGoogleRedirect()) {
        sessionStorage.removeItem(GOOGLE_AUTH_RETURN_KEY);
      }
      return { success: false };
    }
    const returnUrl = safeGoogleAuthReturn(
      sessionStorage.getItem(GOOGLE_AUTH_RETURN_KEY),
      window.location.origin,
    );
    try {
      sessionStorage.removeItem(GOOGLE_AUTH_RETURN_KEY);
    } catch {}
    // onAuthStateChanged is the sole owner of Firestore profile synchronization.
    return { success: true, returnUrl: returnUrl || undefined };
  } catch (error: any) {
    try {
      sessionStorage.removeItem(GOOGLE_AUTH_RETURN_KEY);
    } catch {}
    console.error('[Firebase Auth] Google redirect completion error:', error);
    return { success: false, error: googleAuthError(error) };
  }
}

/**
 * Sign out current Firebase user
 */
export async function signOutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Bootstrap/read the authoritative account through the server. The browser
 * proves identity with a Firebase ID token but cannot assign credits or keys.
 */
export async function getOrCreateFirestoreUser(fbUser: FirebaseUser): Promise<BittyUser> {
  const idToken = await fbUser.getIdToken();
  const response = await fetch('/api/accounts/firebase/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !data.user) {
    throw new Error(data.error || 'Could not load the server-authoritative account');
  }
  return data.user as BittyUser;
}

/**
 * Subscribe to real-time updates for a user document
 */
export function subscribeToUserProfile(uid: string, onUpdate: (user: BittyUser | null) => void) {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      onUpdate({
        id: uid,
        email: data.email || '',
        displayName: data.displayName || 'Bitty Builder',
        tier: data.tier || 'PRO BUILDER',
        avatar: data.avatar || '⚡',
        credits: data.credits ?? 100,
        creditsUsedTotal: data.creditsUsedTotal ?? 0,
        creditsHumanUsed: data.creditsHumanUsed ?? 0,
        creditsApiUsed: data.creditsApiUsed ?? 0,
        creditsMcpUsed: data.creditsMcpUsed ?? 0,
        joinedDate: data.joinedDate || new Date().toISOString(),
        lastSignedInAt: data.lastSignedInAt || new Date().toISOString(),
        settings: data.settings || { autoSaveLinks: true, trustThisDevice: true },
        apiKeys: data.apiKeys || [],
        links: data.links || [],
        transactions: data.transactions || []
      });
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.error('[Firebase Firestore] User profile subscription error:', err);
  });
}


