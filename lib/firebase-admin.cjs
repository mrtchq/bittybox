const admin = require('firebase-admin');
const fs = require('fs');

let initialized = false;

/**
 * Initialize Firebase Admin SDK from the service-account key file.
 * Server-only. Safe to call repeatedly (no-op after first init).
 */
function initFirebaseAdmin() {
  if (initialized) return true;
  const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.warn('[firebase-admin] FIREBASE_ADMIN_KEY_PATH not set or file missing — Firebase Admin disabled.');
    return false;
  }
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log('[firebase-admin] Initialized from', keyPath);
    return true;
  } catch (err) {
    console.error('[firebase-admin] Init failed:', err.message);
    return false;
  }
}

/**
 * Verify a Firebase ID token (from client) and return the decoded claims.
 * Returns null if invalid/expired.
 */
async function verifyFirebaseIdToken(idToken) {
  if (!initFirebaseAdmin()) return null;
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    console.error('[firebase-admin] ID token verification failed:', err.message);
    return null;
  }
}

module.exports = { initFirebaseAdmin, verifyFirebaseIdToken, admin };
