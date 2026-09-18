/**
 * Bitty Box • Functional Programmable Lock Evaluator Engine
 * =========================================================
 * Provides cryptographic verification predicates, deterministic 256-bit sub-key derivation (k_i),
 * RFC 5869 HKDF-Extract-and-Expand master key composition (K_master), and URL fragment recipe
 * serialization/deserialization for all 25 lock primitives.
 *
 * Exclusively conforms to WebCrypto (SubtleCrypto) standards across Node.js 18+ and modern browsers.
 */

(function (root, factory) {
  const engine = factory();
  if (typeof globalThis !== 'undefined') {
    globalThis.BittyLockEngine = engine;
  }
  if (typeof window !== 'undefined') {
    window.BittyLockEngine = engine;
    window.evaluateLock = engine.evaluateLock;
    window.verifyLock = engine.evaluateLock;
    window.composeMasterKey = engine.composeMasterKey;
    window.deriveCompositeKey = engine.composeMasterKey;
    window.serializeRecipe = engine.serializeRecipe;
    window.parseRecipe = engine.parseRecipe;
    window.LOCK_DEFINITIONS = engine.LOCK_DEFINITIONS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
    module.exports.default = engine;
    module.exports.BittyLockEngine = engine;
    module.exports.LOCK_DEFINITIONS = engine.LOCK_DEFINITIONS;
    module.exports.evaluateLock = engine.evaluateLock;
    module.exports.verifyLock = engine.evaluateLock;
    module.exports.composeMasterKey = engine.composeMasterKey;
    module.exports.composeMasterKeyRaw = engine.composeMasterKeyRaw;
    module.exports.deriveCompositeKey = engine.composeMasterKey;
    module.exports.serializeRecipe = engine.serializeRecipe;
    module.exports.parseRecipe = engine.parseRecipe;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // --- CRYPTOGRAPHIC UTILITIES & PRIMITIVES ---

  function getCrypto() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
    if (typeof window !== 'undefined' && window.crypto) return window.crypto;
    throw new Error('WebCrypto API (crypto.subtle) is unavailable in this environment.');
  }

  function getSubtle() {
    const c = getCrypto();
    if (!c.subtle) throw new Error('crypto.subtle is unavailable.');
    return c.subtle;
  }

  function textToBytes(str) {
    return new TextEncoder().encode(str);
  }

  function bytesToText(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function hexToBytes(hex) {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const len = clean.length;
    const out = new Uint8Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      out[i / 2] = parseInt(clean.substring(i, i + 2), 16);
    }
    return out;
  }

  function getRandomBytes(length = 16) {
    const c = getCrypto();
    const arr = new Uint8Array(length);
    c.getRandomValues(arr);
    return arr;
  }

  function base64UrlEncode(input) {
    let str;
    if (typeof input === 'string') {
      const bytes = textToBytes(input);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      str = (typeof btoa !== 'undefined') ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    } else if (input instanceof Uint8Array) {
      let binary = '';
      for (let i = 0; i < input.length; i++) binary += String.fromCharCode(input[i]);
      str = (typeof btoa !== 'undefined') ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    } else {
      throw new Error('base64UrlEncode requires string or Uint8Array');
    }
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlDecode(input) {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = (typeof atob !== 'undefined') ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytesToText(bytes);
  }

  async function sha256(data) {
    const bytes = (typeof data === 'string') ? textToBytes(data) : data;
    const subtle = getSubtle();
    const digest = await subtle.digest('SHA-256', bytes);
    return new Uint8Array(digest);
  }

  async function sha256Hex(data) {
    const hash = await sha256(data);
    return bytesToHex(hash);
  }

  async function hmacSha256(keyBytes, dataBytes) {
    const subtle = getSubtle();
    const rawData = (typeof dataBytes === 'string') ? textToBytes(dataBytes) : dataBytes;
    const key = await subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await subtle.sign('HMAC', key, rawData);
    return new Uint8Array(signature);
  }

  async function pbkdf2Sha256(passwordStr, saltBytes, iterations = 100000, keyLenBytes = 32) {
    const subtle = getSubtle();
    const keyMaterial = await subtle.importKey(
      'raw',
      textToBytes(passwordStr),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const bits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      keyLenBytes * 8
    );
    return new Uint8Array(bits);
  }

  async function hkdfSha256(ikmBytes, saltBytes, infoStr, keyLenBytes = 32) {
    const subtle = getSubtle();
    const rawIkm = (typeof ikmBytes === 'string') ? textToBytes(ikmBytes) : ikmBytes;
    const infoBytes = textToBytes(infoStr);
    const keyMaterial = await subtle.importKey(
      'raw',
      rawIkm,
      { name: 'HKDF' },
      false,
      ['deriveBits']
    );
    const bits = await subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: saltBytes,
        info: infoBytes
      },
      keyMaterial,
      keyLenBytes * 8
    );
    return new Uint8Array(bits);
  }

  function parseSalt(saltParam) {
    if (!saltParam) return textToBytes('bitty_salt_default_2026');
    if (saltParam instanceof Uint8Array) return saltParam;
    if (typeof saltParam === 'string') {
      if (/^[0-9a-fA-F]{32,}$/.test(saltParam) && saltParam.length % 2 === 0) {
        return hexToBytes(saltParam);
      }
      return textToBytes(saltParam);
    }
    return textToBytes('bitty_salt_default_2026');
  }

  // --- RFC 6238 TOTP IMPLEMENTATION ---

  function base32ToBytes(b32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = b32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const out = [];
    for (let i = 0; i < clean.length; i++) {
      const idx = alphabet.indexOf(clean[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  }

  async function computeTOTP(secret, timestampMs = Date.now(), stepSec = 30) {
    const subtle = getSubtle();
    let keyBytes;
    if (typeof secret === 'string') {
      keyBytes = base32ToBytes(secret);
      if (keyBytes.length === 0) keyBytes = textToBytes(secret);
    } else if (secret instanceof Uint8Array) {
      keyBytes = secret;
    } else {
      throw new Error('Invalid TOTP secret format');
    }

    const counter = Math.floor(timestampMs / 1000 / stepSec);
    const counterBytes = new Uint8Array(8);
    let tmp = BigInt(counter);
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = Number(tmp & 0xffn);
      tmp >>= 8n;
    }

    const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const hmacSig = new Uint8Array(await subtle.sign('HMAC', key, counterBytes));

    const offset = hmacSig[hmacSig.length - 1] & 0x0f;
    const binary = ((hmacSig[offset] & 0x7f) << 24) |
                   ((hmacSig[offset + 1] & 0xff) << 16) |
                   ((hmacSig[offset + 2] & 0xff) << 8) |
                   (hmacSig[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    return otp;
  }

  async function verifyTOTP(code, secret, timestampMs = Date.now(), stepSec = 30, window = 1) {
    const cleanCode = (code || '').toString().trim();
    if (!/^\d{6}$/.test(cleanCode)) return false;

    for (let offset = -window; offset <= window; offset++) {
      const stepTime = timestampMs + (offset * stepSec * 1000);
      const expected = await computeTOTP(secret, stepTime, stepSec);
      if (expected === cleanCode) return true;
    }
    return false;
  }

  // --- HAVERSINE GEODESIC DISTANCE ---

  function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // --- ED25519 VERIFICATION ---

  async function verifyEd25519Signature(publicKeyBytes, signatureBytes, messageBytes) {
    const subtle = getSubtle();
    try {
      const key = await subtle.importKey('raw', publicKeyBytes, { name: 'Ed25519' }, false, ['verify']);
      return await subtle.verify({ name: 'Ed25519' }, key, signatureBytes, messageBytes);
    } catch (err) {
      return false;
    }
  }

  // =========================================================================
  // THE 25 PROGRAMMABLE LOCK EVALUATOR IMPLEMENTATIONS
  // =========================================================================

  const LOCK_EVALUATORS = {
    // --- 01. PASSCODE LOCK (Core) ---
    passcode: async (input = {}, params = {}) => {
      const pin = (input.pin ?? input.passcode ?? input.code ?? '').toString().trim();
      if (!/^\d{4,8}$/.test(pin)) {
        return { success: false, error: 'Passcode must be a numeric PIN between 4 and 8 digits.' };
      }
      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.verifier) {
        const expected = params.verifier.toLowerCase().trim();
        const candidate1 = await sha256Hex(pin + saltHex);
        const candidate2 = await sha256Hex(pin);
        if (candidate1 !== expected && candidate2 !== expected) {
          return { success: false, error: 'Incorrect passcode PIN.' };
        }
      }

      const iterations = params.iterations || 100000;
      const subKey = await pbkdf2Sha256(pin, salt, iterations, 32);
      return { success: true, subKey };
    },

    // --- 02. PASSPHRASE LOCK (Core) ---
    passphrase: async (input = {}, params = {}) => {
      const phrase = (input.passphrase ?? input.phrase ?? input.password ?? '').toString().trim();
      const minLen = params.minLength || 8;
      if (phrase.length < minLen) {
        return { success: false, error: `Passphrase must be at least ${minLen} characters.` };
      }
      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.verifier) {
        const expected = params.verifier.toLowerCase().trim();
        const candidate1 = await sha256Hex(phrase + saltHex);
        const candidate2 = await sha256Hex(phrase);
        if (candidate1 !== expected && candidate2 !== expected) {
          return { success: false, error: 'Incorrect passphrase.' };
        }
      }

      const iterations = params.iterations || 100000;
      const subKey = await pbkdf2Sha256(phrase, salt, iterations, 32);
      return { success: true, subKey };
    },

    // --- 03. TIME CAPSULE LOCK (Core) ---
    time_capsule: async (input = {}, params = {}) => {
      if (!params.notBefore) {
        return { success: false, error: 'Time capsule configuration missing "notBefore" timestamp.' };
      }
      const notBeforeTime = new Date(params.notBefore).getTime();
      if (isNaN(notBeforeTime)) {
        return { success: false, error: 'Invalid "notBefore" date format.' };
      }
      const now = (typeof input.timestamp === 'number') ? input.timestamp : Date.now();
      if (now < notBeforeTime) {
        return {
          success: false,
          error: `Time capsule sealed until ${new Date(notBeforeTime).toISOString()}. Remaining: ${Math.ceil((notBeforeTime - now) / 1000)}s`
        };
      }
      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`time_capsule:${notBeforeTime}`));
      return { success: true, subKey };
    },

    // --- 04. BURN-AFTER-READING LOCK (Core) ---
    burn_after_reading: async (input = {}, params = {}) => {
      const burnId = params.burnId || 'default_burn_record';
      const storageKey = `burned_${burnId}`;

      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        if (globalThis.localStorage.getItem(storageKey)) {
          return { success: false, error: 'This secret has already been burned and destroyed.' };
        }
      }

      if (!input.confirm && !input.burnConfirmed && input.action !== 'unseal') {
        return { success: false, error: 'Explicit user confirmation required to unseal and burn payload.' };
      }

      if (typeof globalThis !== 'undefined' && globalThis.localStorage && input.dryRun !== true) {
        try {
          globalThis.localStorage.setItem(storageKey, Date.now().toString());
        } catch (e) {
          // Ignore storage quota errors in private browsing
        }
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`burn:${burnId}`));
      return { success: true, subKey };
    },

    // --- 05. MAX OPENS LOCK (Core) ---
    max_opens: async (input = {}, params = {}) => {
      const boxId = params.boxId || input.boxId || 'default_box';
      const maxOpens = parseInt(params.maxOpens ?? params.limit ?? 1, 10);
      const storageKey = `opens_${boxId}`;

      let currentOpens = 0;
      if (typeof input.currentOpens === 'number') {
        currentOpens = input.currentOpens;
      } else if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        currentOpens = parseInt(globalThis.localStorage.getItem(storageKey) || '0', 10);
      }

      if (currentOpens >= maxOpens) {
        return {
          success: false,
          error: `Maximum open limit (${maxOpens}) reached. Vault permanently locked.`
        };
      }

      if (typeof globalThis !== 'undefined' && globalThis.localStorage && input.dryRun !== true) {
        try {
          globalThis.localStorage.setItem(storageKey, (currentOpens + 1).toString());
        } catch (e) {}
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`max_opens:${boxId}:${maxOpens}`));
      return { success: true, subKey };
    },

    // --- 06. ACCESS WINDOW LOCK (Core) ---
    access_window: async (input = {}, params = {}) => {
      if (!params.openAt || !params.lockAt) {
        return { success: false, error: 'Access window requires "openAt" and "lockAt" parameters.' };
      }
      const openAtTime = new Date(params.openAt).getTime();
      const lockAtTime = new Date(params.lockAt).getTime();
      if (isNaN(openAtTime) || isNaN(lockAtTime)) {
        return { success: false, error: 'Invalid access window date timestamps.' };
      }
      const now = (typeof input.timestamp === 'number') ? input.timestamp : Date.now();
      if (now < openAtTime) {
        return { success: false, error: `Access window opens at ${new Date(openAtTime).toISOString()}.` };
      }
      if (now > lockAtTime) {
        return { success: false, error: `Access window expired at ${new Date(lockAtTime).toISOString()}.` };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`window:${openAtTime}:${lockAtTime}`));
      return { success: true, subKey };
    },

    // --- 07. COUNTDOWN UNLOCK LOCK (Core) ---
    countdown: async (input = {}, params = {}) => {
      const delaySec = parseInt(params.delaySec ?? params.delay ?? 10, 10);
      const requiredMs = delaySec * 1000;
      const elapsedMs = typeof input.elapsedMs === 'number' ? input.elapsedMs : 0;

      if (!input.completed && elapsedMs < requiredMs) {
        return {
          success: false,
          error: `Countdown incomplete: ${Math.ceil((requiredMs - elapsedMs) / 1000)}s remaining of ${delaySec}s requirement.`
        };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`countdown_done:${delaySec}`));
      return { success: true, subKey };
    },

    // --- 08. TAP-TO-UNSEAL LOCK (Core) ---
    tap_unseal: async (input = {}, params = {}) => {
      const sealType = params.sealType || 'wax';
      const hasTapped = input.tapped === true || input.unsealed === true ||
                        (typeof input.progress === 'number' && input.progress >= 0.8) ||
                        (Array.isArray(input.strokePoints) && input.strokePoints.length >= 5);

      if (!hasTapped) {
        return { success: false, error: `Physical ${sealType} seal is intact. Gesture interaction required.` };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`tap_unsealed:${sealType}`));
      return { success: true, subKey };
    },

    // --- 09. CHAIN KEY LOCK (Core) ---
    chain_key: async (input = {}, params = {}) => {
      const prevToken = (input.prevToken ?? input.token ?? '').toString().trim();
      if (!prevToken) {
        return { success: false, error: 'Cryptographic token from preceding box required.' };
      }

      if (params.expectedPrevHash) {
        const candidateHash = await sha256Hex(prevToken);
        if (candidateHash.toLowerCase() !== params.expectedPrevHash.toLowerCase().trim()) {
          return { success: false, error: 'Invalid chain key: does not match cryptographic output of preceding box.' };
        }
      }

      const salt = parseSalt(params.salt);
      const subKey = await hkdfSha256(prevToken, salt, 'chain_key', 32);
      return { success: true, subKey };
    },

    // --- 10. ONE-TIME MAGIC KEY (Core) ---
    one_time_magic_key: async (input = {}, params = {}) => {
      const magicToken = (input.magicToken ?? input.token ?? input.magicKey ?? '').toString().trim();
      if (!magicToken) {
        return { success: false, error: 'One-time magic key token required.' };
      }

      if (params.magicHash) {
        const candidateHash = await sha256Hex(magicToken);
        if (candidateHash.toLowerCase() !== params.magicHash.toLowerCase().trim()) {
          return { success: false, error: 'Invalid one-time magic key token.' };
        }
      }

      const salt = parseSalt(params.salt);
      const subKey = await hkdfSha256(magicToken, salt, 'magic_key', 32);
      return { success: true, subKey };
    },

    // --- 11. TOTP LOCK (Identity & Trust) ---
    totp: async (input = {}, params = {}) => {
      const code = (input.code ?? input.totp ?? '').toString().trim();
      if (!/^\d{6}$/.test(code)) {
        return { success: false, error: 'TOTP code must be a 6-digit rolling numerical code.' };
      }

      const secret = params.secret || params.totpSecret || 'JBSWY3DPEHPK3PXP';
      const stepSec = parseInt(params.stepSec || 30, 10);
      const window = params.window ?? 1;
      const timestamp = (typeof input.timestamp === 'number') ? input.timestamp : Date.now();

      const isValid = await verifyTOTP(code, secret, timestamp, stepSec, window);
      if (!isValid) {
        return { success: false, error: 'Invalid or expired 6-digit TOTP rolling code.' };
      }

      const salt = parseSalt(params.salt);
      const subKey = await pbkdf2Sha256(`${code}:${secret}`, salt, 50000, 32);
      return { success: true, subKey };
    },

    // --- 12. SIGNED SENDER LOCK (Identity & Trust) ---
    signed_sender: async (input = {}, params = {}) => {
      const creatorPubKey = params.creatorPubKey || params.publicKey;
      if (!creatorPubKey) {
        return { success: false, error: 'Signed sender requires creator public key.' };
      }

      const rawSig = input.signature;
      if (!rawSig) {
        return { success: false, error: 'Ed25519 sender signature required.' };
      }

      const pubKeyBytes = (typeof creatorPubKey === 'string') ? hexToBytes(creatorPubKey) : creatorPubKey;
      const sigBytes = (typeof rawSig === 'string') ? hexToBytes(rawSig) : rawSig;
      const msg = input.message || params.boxId || 'bittybox_sender_auth';
      const msgBytes = (typeof msg === 'string') ? textToBytes(msg) : msg;

      const isValid = await verifyEd25519Signature(pubKeyBytes, sigBytes, msgBytes);
      if (!isValid) {
        return { success: false, error: 'Creator Ed25519 signature verification failed.' };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`signed_sender:${bytesToHex(sigBytes)}`));
      return { success: true, subKey };
    },

    // --- 13. RECIPIENT EMAIL LOCK (Identity & Trust) ---
    recipient_email: async (input = {}, params = {}) => {
      const email = (input.email || '').toString().trim().toLowerCase();
      const otp = (input.otp ?? input.code ?? '').toString().trim();

      if (!email || !email.includes('@')) {
        return { success: false, error: 'Valid recipient email address required.' };
      }

      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.hashedEmail) {
        const candidateEmailHash = await sha256Hex(email + saltHex);
        if (candidateEmailHash.toLowerCase() !== params.hashedEmail.toLowerCase().trim()) {
          return { success: false, error: 'Email does not match designated vault recipient.' };
        }
      }

      if (params.otpHash) {
        const candidateOtpHash = await sha256Hex(otp + saltHex);
        if (candidateOtpHash.toLowerCase() !== params.otpHash.toLowerCase().trim()) {
          return { success: false, error: 'Invalid recipient verification challenge code.' };
        }
      } else if (!otp) {
        return { success: false, error: 'Verification challenge code required.' };
      }

      const subKey = await pbkdf2Sha256(`${email}:${otp}`, salt, 50000, 32);
      return { success: true, subKey };
    },

    // --- 14. WALLET SIGNATURE LOCK (Identity & Trust) ---
    wallet_signature: async (input = {}, params = {}) => {
      const address = (input.address || '').toString().trim().toLowerCase();
      const signature = (input.signature || '').toString().trim();

      if (!/^0x[a-f0-9]{40}$/.test(address)) {
        return { success: false, error: 'Valid Ethereum address (0x...) required.' };
      }

      if (params.authorizedAddress && address !== params.authorizedAddress.toLowerCase().trim()) {
        return { success: false, error: `Address ${address} is not authorized for this vault.` };
      }

      if (!signature || !/^0x[a-fA-F0-9]{130}$/.test(signature)) {
        return { success: false, error: 'Valid 65-byte ECDSA wallet signature required.' };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hkdfSha256(textToBytes(signature.toLowerCase()), salt, 'wallet_sig', 32);
      return { success: true, subKey };
    },

    // --- 15. INVITE-CODE LOCK (Identity & Trust) ---
    invite_code: async (input = {}, params = {}) => {
      const code = (input.code ?? input.inviteCode ?? '').toString().trim().toUpperCase();
      if (!code) {
        return { success: false, error: 'Invitation code token required.' };
      }

      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.inviteHash) {
        const candidateHash = await sha256Hex(code + saltHex);
        if (candidateHash.toLowerCase() !== params.inviteHash.toLowerCase().trim()) {
          return { success: false, error: 'Invalid or unrecognized invitation code.' };
        }
      }

      const subKey = await pbkdf2Sha256(code, salt, 50000, 32);
      return { success: true, subKey };
    },

    // --- 16. APPROVAL LOCK (Identity & Trust) ---
    approval: async (input = {}, params = {}) => {
      const ticket = (input.approvalToken ?? input.ticket ?? '').toString().trim();
      if (!ticket) {
        return { success: false, error: 'Authorized supervisor approval ticket required.' };
      }

      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.approvalHash) {
        const candidateHash = await sha256Hex(ticket + saltHex);
        if (candidateHash.toLowerCase() !== params.approvalHash.toLowerCase().trim()) {
          return { success: false, error: 'Approval authorization ticket invalid or not approved.' };
        }
      }

      const subKey = await hmacSha256(salt, textToBytes(`approval_granted:${ticket}`));
      return { success: true, subKey };
    },

    // --- 17. TWO-PERSON LOCK (Identity & Trust / Shamir 2-of-2) ---
    two_person: async (input = {}, params = {}) => {
      const raw1 = input.share1;
      const raw2 = input.share2;
      if (!raw1 || !raw2) {
        return { success: false, error: 'Two-person unlock requires both Share 1 and Share 2.' };
      }

      const s1 = (typeof raw1 === 'string') ? hexToBytes(raw1) : raw1;
      const s2 = (typeof raw2 === 'string') ? hexToBytes(raw2) : raw2;

      if (!(s1 instanceof Uint8Array) || !(s2 instanceof Uint8Array) || s1.length !== 32 || s2.length !== 32) {
        return { success: false, error: 'Both shares must be valid 32-byte (64 hex char) secrets.' };
      }

      // Recombine 2-of-2 Shamir XOR secret
      const recombined = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        recombined[i] = s1[i] ^ s2[i];
      }

      if (params.expectedHash) {
        const hash = await sha256Hex(recombined);
        if (hash.toLowerCase() !== params.expectedHash.toLowerCase().trim()) {
          return { success: false, error: 'Reconstructed two-person secret does not match vault checksum.' };
        }
      }

      return { success: true, subKey: recombined };
    },

    // --- 18. DEAD-MAN SWITCH LOCK (Identity & Trust) ---
    dead_man_switch: async (input = {}, params = {}) => {
      if (!params.lastCheckIn) {
        return { success: false, error: 'Dead-man switch missing "lastCheckIn" timestamp.' };
      }
      const lastCheckInTime = new Date(params.lastCheckIn).getTime();
      if (isNaN(lastCheckInTime)) {
        return { success: false, error: 'Invalid "lastCheckIn" date format.' };
      }

      const intervalSec = parseInt(params.intervalSec || 86400, 10);
      const expiry = lastCheckInTime + (intervalSec * 1000);
      const now = (typeof input.timestamp === 'number') ? input.timestamp : Date.now();

      if (now < expiry) {
        return {
          success: false,
          error: `Subject is currently active. Dead-man switch triggers after expiry at ${new Date(expiry).toISOString()}.`
        };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`deadman_triggered:${lastCheckInTime}:${intervalSec}`));
      return { success: true, subKey };
    },

    // --- 19. LOCATION LOCK (Contextual) ---
    location: async (input = {}, params = {}) => {
      const lat = typeof input.latitude === 'number' ? input.latitude : parseFloat(input.latitude);
      const lng = typeof input.longitude === 'number' ? input.longitude : parseFloat(input.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return { success: false, error: 'Valid GPS latitude and longitude coordinates required.' };
      }

      const targetLat = parseFloat(params.targetLat ?? 0);
      const targetLng = parseFloat(params.targetLng ?? 0);
      const radiusMeters = parseFloat(params.radiusMeters ?? 50);

      const distance = haversineDistanceMeters(lat, lng, targetLat, targetLng);
      if (distance > radiusMeters) {
        return {
          success: false,
          error: `Device is ${Math.round(distance)}m from target. Must be within ${radiusMeters}m.`
        };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`geoloc_ok:${targetLat.toFixed(4)}:${targetLng.toFixed(4)}`));
      return { success: true, subKey };
    },

    // --- 20. QR PROXIMITY LOCK (Contextual) ---
    qr_proximity: async (input = {}, params = {}) => {
      const qrCode = (input.qrCode ?? input.token ?? input.scannedCode ?? '').toString().trim();
      if (!qrCode) {
        return { success: false, error: 'Optical QR / NFC code scan required.' };
      }

      if (params.expectedQrHash) {
        const candidateHash = await sha256Hex(qrCode);
        if (candidateHash.toLowerCase() !== params.expectedQrHash.toLowerCase().trim()) {
          return { success: false, error: 'Scanned QR code does not match required companion proximity tag.' };
        }
      }

      const salt = parseSalt(params.salt);
      const subKey = await hkdfSha256(qrCode, salt, 'qr_proximity', 32);
      return { success: true, subKey };
    },

    // --- 21. DEVICE PAIRING LOCK (Contextual) ---
    device_pairing: async (input = {}, params = {}) => {
      const deviceId = params.deviceId || 'device_bound_enclave';
      const deviceKey = (input.deviceKey ?? input.deviceId ?? '').toString().trim();

      if (!deviceKey && !input.paired) {
        return { success: false, error: 'Device pairing authentication required.' };
      }

      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.expectedKeyHash) {
        const candidateHash = await sha256Hex(deviceKey + saltHex);
        if (candidateHash.toLowerCase() !== params.expectedKeyHash.toLowerCase().trim()) {
          return { success: false, error: 'Device pairing failed: unauthorized device enclave.' };
        }
      }

      const secret = deviceKey || `${deviceId}:paired`;
      const subKey = await hkdfSha256(secret, salt, 'device_pairing', 32);
      return { success: true, subKey };
    },

    // --- 22. BROWSER KEY LOCK (Contextual) ---
    browser_key: async (input = {}, params = {}) => {
      const keyId = params.keyId || 'browser_vault_key';
      const browserSecret = (input.browserSecret ?? input.keyId ?? '').toString().trim();

      if (!browserSecret && !input.authorized) {
        return { success: false, error: 'IndexedDB persistent browser credential required.' };
      }

      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.expectedHash) {
        const candidateHash = await sha256Hex(browserSecret + saltHex);
        if (candidateHash.toLowerCase() !== params.expectedHash.toLowerCase().trim()) {
          return { success: false, error: 'Browser key verification failed: no valid stored credential.' };
        }
      }

      const secret = browserSecret || `${keyId}:authorized`;
      const subKey = await hkdfSha256(secret, salt, 'browser_key', 32);
      return { success: true, subKey };
    },

    // --- 23. PUZZLE LOCK (Contextual) ---
    puzzle: async (input = {}, params = {}) => {
      const rawSolution = (input.solution ?? input.answer ?? '').toString();
      const normalized = rawSolution.trim().toLowerCase().replace(/\s+/g, ' ');

      if (!normalized) {
        return { success: false, error: 'Puzzle answer solution required.' };
      }

      const salt = parseSalt(params.salt);
      const saltHex = bytesToHex(salt);

      if (params.solutionHash) {
        const candidate1 = await sha256Hex(normalized + saltHex);
        const candidate2 = await sha256Hex(normalized);
        const expected = params.solutionHash.toLowerCase().trim();
        if (candidate1 !== expected && candidate2 !== expected) {
          return { success: false, error: 'Incorrect riddle or puzzle solution.' };
        }
      }

      const subKey = await pbkdf2Sha256(normalized, salt, 50000, 32);
      return { success: true, subKey };
    },

    // --- 24. PROOF-OF-HUMAN LOCK (Contextual) ---
    proof_of_human: async (input = {}, params = {}) => {
      const seed = params.challengeSeed || input.challengeSeed || 'poh_challenge';

      if (params.targetAngle !== undefined && input.solution !== undefined) {
        const target = parseFloat(params.targetAngle);
        const actual = parseFloat(input.solution);
        const tolerance = parseFloat(params.tolerance || 5);
        const diff = Math.abs(actual - target);

        if (isNaN(diff) || diff > tolerance) {
          return {
            success: false,
            error: `Gesture alignment failed: deviation ${diff.toFixed(1)}° exceeds tolerance of ±${tolerance}°`
          };
        }
      } else if (input.passed !== true && input.verified !== true) {
        return { success: false, error: 'Interactive anti-bot challenge incomplete.' };
      }

      const salt = parseSalt(params.salt);
      const subKey = await hmacSha256(salt, textToBytes(`poh_passed:${seed}`));
      return { success: true, subKey };
    },

    // --- 25. PAYMENT LOCK (Contextual) ---
    payment: async (input = {}, params = {}) => {
      const receipt = (input.receipt ?? input.preimage ?? input.paymentId ?? '').toString().trim();
      if (!receipt) {
        return { success: false, error: 'Micro-payment receipt or HTLC preimage required.' };
      }

      if (params.invoiceHash) {
        const candidateHash = await sha256Hex(receipt);
        if (candidateHash.toLowerCase() !== params.invoiceHash.toLowerCase().trim()) {
          return { success: false, error: 'Payment receipt does not match expected invoice hash.' };
        }
      }

      const salt = parseSalt(params.salt);
      const subKey = await hkdfSha256(receipt, salt, 'payment_cleared', 32);
      return { success: true, subKey };
    }
  };

  // --- CATALOG OF ALL 25 LOCK DEFINITIONS ---

  const LOCK_DEFINITIONS = [
    // Core Family (01 - 10)
    { id: 'passcode', num: '01', name: 'Passcode Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Numeric PIN entry (4 to 8 digits) with cryptographic derivation.', bestUse: 'Simple private notes, digital gifts, family links, and fast mobile unlocking.', icon: '🔢' },
    { id: 'passphrase', num: '02', name: 'Passphrase Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Word or full sentence secret passed through PBKDF2 / Argon2 key-derivation.', bestUse: 'Higher-security letters, legal documents, and resilient long-term secrets.', icon: '📝' },
    { id: 'time_capsule', num: '03', name: 'Time Capsule Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Timestamp verification that halts decryption until a specified date & time.', bestUse: 'Birthday messages, New Year notes, future letters, scheduled announcements.', icon: '⏳' },
    { id: 'burn_after_reading', num: '04', name: 'Burn-After-Reading Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Self-destructs ciphertext and in-memory decryption context after first open.', bestUse: 'Secrets, surprises, one-time credentials, and ephemeral confessions.', icon: '🔥' },
    { id: 'max_opens', num: '05', name: 'Max Opens Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Enforces a strict counter ceiling; permanently locks after N successful views.', bestUse: 'Limited invitations, confidential board decks, exclusive beta links.', icon: '🎟️' },
    { id: 'access_window', num: '06', name: 'Access Window Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Opens only between a specified start and end date/time window.', bestUse: 'Live event pages, flash releases, timed exhibition portals, temporary links.', icon: '📅' },
    { id: 'countdown', num: '07', name: 'Countdown Unlock Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Requires the recipient to wait through an active cinematic countdown timer.', bestUse: 'Dramatic reveals, interactive unboxing moments, suspenseful gift unsealing.', icon: '⏱️' },
    { id: 'tap_unseal', num: '08', name: 'Tap-to-Unseal Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Requires deliberate, tactile interaction (breaking seal, tearing envelope).', bestUse: 'Box chaining, surprise sequences, intentional consent & agreement moments.', icon: '✨' },
    { id: 'chain_key', num: '09', name: 'Chain Key Lock', cat: 'core', catLabel: 'Core Family', mechanic: 'Unlocks only after validating cryptographic output from a prior Bitty Box.', bestUse: 'Treasure hunts, multi-part serial narratives, step-by-step onboarding sequences.', icon: '🔗' },
    { id: 'one_time_magic_key', num: '10', name: 'One-Time Magic Key', cat: 'core', catLabel: 'Core Family', mechanic: 'A single-use asymmetric ephemeral key fragment that unlocks one target Box.', bestUse: 'Personalized VIP delivery without demanding recipient account registration.', icon: '🗝️' },

    // Identity and Trust Family (11 - 18)
    { id: 'totp', num: '11', name: 'TOTP Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Validates a 6-digit rolling authenticator app code (RFC 6238).', bestUse: 'Sensitive recovery notes, crypto seeds, master passwords, ops playbooks.', icon: '📱' },
    { id: 'signed_sender', num: '12', name: 'Signed Sender Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Recipient browser validates Ed25519 creator signature before decrypting.', bestUse: 'Legal notices, creator drops, authentic communications, leak-proof memos.', icon: '✍️' },
    { id: 'recipient_email', num: '13', name: 'Recipient Email Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Dispatches a signed one-time verification token to one designated email.', bestUse: 'Client delivery, confidential corporate proposals, contractor invoices.', icon: '📧' },
    { id: 'wallet_signature', num: '14', name: 'Wallet Signature Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Recipient signs a cryptographic challenge proving custody of a Web3 address.', bestUse: 'Token-holder drops, DAO secret governance, Web3 collector perks.', icon: '👛' },
    { id: 'invite_code', num: '15', name: 'Invite-Code Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Gated by reusable or quota-bounded invitation tokens.', bestUse: 'Private alpha communities, secret societies, club access, gated launches.', icon: '🎫' },
    { id: 'approval', num: '16', name: 'Approval Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Creator manually reviews and cryptographically approves unlock requests.', bestUse: 'High-trust documents, classified drafts, VIP early-access previews.', icon: '🛡️' },
    { id: 'two_person', num: '17', name: 'Two-Person Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Shamir Secret Sharing requires two independent keyholders to reconstruct key.', bestUse: 'Escrow releases, shared family wealth vaults, dual-cofounder corporate actions.', icon: '👥' },
    { id: 'dead_man_switch', num: '18', name: 'Dead-Man Switch Lock', cat: 'identity', catLabel: 'Identity & Trust', mechanic: 'Reveals contents only if creator fails to confirm liveness over an interval.', bestUse: 'Legacy letters, estate contingency plans, emergency survival instructions.', icon: '⚠️' },

    // Contextual and Interactive Family (19 - 25)
    { id: 'location', num: '19', name: 'Location Lock', cat: 'context', catLabel: 'Contextual', mechanic: 'Verifies recipient device geolocation within a designated GPS radius.', bestUse: 'Physical scavenger hunts, museum tours, real-estate walkthroughs, geo-drops.', icon: '📍' },
    { id: 'qr_proximity', num: '20', name: 'QR Proximity Lock', cat: 'context', catLabel: 'Contextual', mechanic: 'Requires optical scanning of a companion physical QR code or NFC tag.', bestUse: 'Physical packaging, printed art, conference installations, in-person drops.', icon: '📷' },
    { id: 'device_pairing', num: '21', name: 'Device Pairing Lock', cat: 'context', catLabel: 'Contextual', mechanic: 'Binds the encryption key to the WebCrypto / Secure Enclave of the 1st device.', bestUse: 'Personal journals, sovereign offline vaults, device-locked notebooks.', icon: '💻' },
    { id: 'browser_key', num: '22', name: 'Browser Key Lock', cat: 'context', catLabel: 'Contextual', mechanic: 'Locally stored IndexedDB private key unlocks recurring visits seamlessly.', bestUse: 'Frictionless private workspace access without conventional usernames or passwords.', icon: '🌐' },
    { id: 'puzzle', num: '23', name: 'Puzzle Lock', cat: 'context', catLabel: 'Contextual', mechanic: 'Unlocks upon correctly solving an in-browser riddle, cipher, or mini-game.', bestUse: 'ARGs, romantic Easter-egg messages, educational quests, hacker recruitment.', icon: '🧩' },
    { id: 'proof_of_human', num: '24', name: 'Proof-of-Human Lock', cat: 'context', catLabel: 'Contextual', mechanic: 'Interactive zero-knowledge puzzle or gesture challenge that stops bot scrapers.', bestUse: 'Public links protected from automated web crawlers and AI web-scraping.', icon: '🤖' },
    { id: 'payment', num: '25', name: 'Payment Lock', cat: 'context', catLabel: 'Contextual', mechanic: 'Releases decryption secret key upon confirmed payment or microtransaction.', bestUse: 'Paid creator drops, indie software releases, premium guides, digital goods.', icon: '💳' }
  ];

  function normalizeLockId(rawId) {
    if (!rawId) return '';
    const s = rawId.toString().trim().toLowerCase();
    if (LOCK_EVALUATORS[s]) return s;
    // Strip leading numbers or prefixes, e.g. "01_passcode" -> "passcode", "01" -> "passcode"
    const def = LOCK_DEFINITIONS.find(d => d.id === s || d.num === s || `${d.num}_${d.id}` === s);
    return def ? def.id : s;
  }

  // --- CORE EVALUATOR CONTRACT ---

  async function evaluateLock(lockId, inputData = {}, lockParams = {}) {
    const normalized = normalizeLockId(lockId);
    const evaluator = LOCK_EVALUATORS[normalized];
    if (!evaluator) {
      return { success: false, error: `Unknown lock identifier: "${lockId}"` };
    }

    try {
      const result = await evaluator(inputData, lockParams);
      if (result.success) {
        if (!(result.subKey instanceof Uint8Array) || result.subKey.byteLength !== 32) {
          return { success: false, error: `Internal derivation error: lock ${normalized} produced non-32-byte subKey.` };
        }
      }
      return result;
    } catch (err) {
      return { success: false, error: `Evaluation exception in lock ${normalized}: ${err.message}` };
    }
  }

  // --- RFC 5869 HKDF MASTER KEY COMPOSITION ---

  async function composeMasterKeyRaw(subKeys, salt = null) {
    if (!Array.isArray(subKeys) || subKeys.length === 0) {
      throw new Error('composeMasterKey: subKeys must be a non-empty array of Uint8Arrays');
    }
    for (let i = 0; i < subKeys.length; i++) {
      if (!(subKeys[i] instanceof Uint8Array) || subKeys[i].byteLength !== 32) {
        throw new Error(`composeMasterKey: subKey at index ${i} must be a 32-byte Uint8Array`);
      }
    }

    // 1. Initial Keying Material (IKM) Aggregation
    const ikm = new Uint8Array(subKeys.length * 32);
    for (let i = 0; i < subKeys.length; i++) {
      ikm.set(subKeys[i], i * 32);
    }

    // 2. Combination Salt (RFC 5869 defaults to HashLen zeros if omitted)
    const saltBytes = parseSalt(salt);

    // 3. RFC 5869 HKDF-Extract: PRK = HMAC-SHA256(salt, IKM)
    const prk = await hmacSha256(saltBytes, ikm);

    // 4. RFC 5869 HKDF-Expand: OKM = HMAC-SHA256(PRK, info || 0x01)
    const info = textToBytes('bittybox_and_ceremony_v2\x01');
    const okm = await hmacSha256(prk, info);

    return okm;
  }

  async function composeMasterKey(subKeys, salt = null) {
    const subtle = getSubtle();
    const okm = await composeMasterKeyRaw(subKeys, salt);

    // Import OKM as AES-256-GCM symmetric CryptoKey
    const cryptoKey = await subtle.importKey(
      'raw',
      okm,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return cryptoKey;
  }

  // --- RECIPE SERIALIZATION & DESERIALIZATION ---

  function serializeRecipe(activeLocks = []) {
    const lockIds = [];
    const pObj = {};

    for (const item of activeLocks) {
      const id = typeof item === 'string' ? item : item.id;
      if (!id) continue;
      const normalized = normalizeLockId(id);
      lockIds.push(normalized);

      if (typeof item === 'object' && item.params && Object.keys(item.params).length > 0) {
        pObj[normalized] = item.params;
      }
    }

    let qs = `v=2&c=aes-gcm&locks=${lockIds.join('+')}`;
    if (Object.keys(pObj).length > 0) {
      const jsonStr = JSON.stringify(pObj);
      const b64 = base64UrlEncode(jsonStr);
      qs += `&p=${b64}`;
    }

    return `#bittybox?${qs}`;
  }

  function parseRecipe(urlFragment) {
    if (!urlFragment || typeof urlFragment !== 'string') {
      return { version: 2, cipher: 'aes-gcm', locks: [] };
    }

    let frag = urlFragment.trim();
    if (frag.startsWith('#')) frag = frag.slice(1);

    let dataUrl = null;
    const dataIdx = frag.indexOf('#data:');
    if (dataIdx !== -1) {
      dataUrl = frag.slice(dataIdx + 1);
      frag = frag.slice(0, dataIdx);
    } else if (frag.includes('data:text/html')) {
      const dIdx = frag.indexOf('data:text/html');
      dataUrl = frag.slice(dIdx);
      frag = frag.slice(0, dIdx);
    }

    if (frag.startsWith('bittybox?')) {
      frag = frag.slice('bittybox?'.length);
    } else if (frag.startsWith('bittybox')) {
      frag = frag.slice('bittybox'.length);
      if (frag.startsWith('?')) frag = frag.slice(1);
    }

    const params = new URLSearchParams(frag);
    const version = parseInt(params.get('v') || '2', 10);
    const cipher = params.get('c') || 'aes-gcm';
    const locksStr = params.get('locks') || '';
    const lockIds = locksStr ? locksStr.split(/[\s+]+/).map(s => s.trim()).filter(Boolean) : [];

    let parsedParams = {};
    const pParam = params.get('p');
    if (pParam) {
      try {
        const decodedJson = base64UrlDecode(pParam);
        parsedParams = JSON.parse(decodedJson);
      } catch (e) {
        // Fallback for non-JSON or legacy parameters
      }
    }

    const locks = lockIds.map(id => {
      const normalized = normalizeLockId(id);
      return {
        id: normalized,
        params: parsedParams[normalized] || parsedParams[id] || {}
      };
    });

    const result = { version, cipher, locks };
    if (dataUrl) result.dataUrl = dataUrl;
    if (params.get('sig')) result.signature = params.get('sig');

    return result;
  }

  // --- RETURN ENGINE EXPORTS ---

  return {
    LOCK_DEFINITIONS,
    evaluateLock,
    verifyLock: evaluateLock,
    composeMasterKey,
    composeMasterKeyRaw,
    deriveCompositeKey: composeMasterKey,
    serializeRecipe,
    parseRecipe,
    // Utilities exported for testing and ceremony runners
    cryptoUtils: {
      getCrypto,
      getSubtle,
      textToBytes,
      bytesToText,
      bytesToHex,
      hexToBytes,
      getRandomBytes,
      base64UrlEncode,
      base64UrlDecode,
      sha256,
      sha256Hex,
      hmacSha256,
      pbkdf2Sha256,
      hkdfSha256,
      computeTOTP,
      verifyTOTP,
      haversineDistanceMeters,
      verifyEd25519Signature
    }
  };
});
