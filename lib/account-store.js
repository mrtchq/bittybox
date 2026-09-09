import fs from "fs";
import path from "path";
import crypto from "crypto";
import { constantTimeEqual } from "./secure-compare.js";
import {
  ensureUserCreemCreditAccount,
  issueCreemCredits,
  debitCreemCredits,
  getCreemCustomerBalance,
  listCreemCustomerEntries
} from "./creem-credits.js";

const DATA_DIR = process.env.BITTYBOX_DATA_DIR || "/var/lib/bittybox";
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");

// In-memory cache
let accountsData = null;
let saveTimeout = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAccounts() {
  if (accountsData) return accountsData;
  ensureDataDir();

  if (fs.existsSync(ACCOUNTS_FILE)) {
    try {
      const raw = fs.readFileSync(ACCOUNTS_FILE, "utf8");
      accountsData = JSON.parse(raw);
    } catch (err) {
      console.error("[account-store] Failed to parse accounts.json, initializing new store:", err);
    }
  }

  if (!accountsData) {
    accountsData = {
      version: 1,
      users: {},
      magicLinks: {},
      sessions: {},
      apiKeys: {},
      events: []
    };
    saveAccountsSync();
  }

  // Ensure top level structures
  if (!accountsData.users) accountsData.users = {};
  if (!accountsData.apiKeys) accountsData.apiKeys = {};
  if (!accountsData.sessions) accountsData.sessions = {};
  if (!accountsData.events) accountsData.events = [];

  return accountsData;
}

function saveAccountsSync() {
  try {
    ensureDataDir();
    const tmpFile = `${ACCOUNTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(accountsData, null, 2), "utf8");
    fs.renameSync(tmpFile, ACCOUNTS_FILE);
  } catch (err) {
    console.error("[account-store] Error saving accounts:", err);
  }
}

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveAccountsSync();
    saveTimeout = null;
  }, 100);
}

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { hash: `${salt}:${hash}`, salt };
}

function verifyPasswordHash(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const computed = crypto.scryptSync(password, salt, 32).toString("hex");
  return constantTimeEqual(computed, key);
}

/**
 * Sanitize user object for client delivery
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  const safeApiKeys = (rest.apiKeys || []).map(k => {
    const { hash, ...kRest } = k;
    return kRest;
  });
  return {
    ...rest,
    apiKeys: safeApiKeys
  };
}

/**
 * Get or create a default demo user if database is empty
 */
export async function getDefaultUser() {
  const data = loadAccounts();
  const userIds = Object.keys(data.users);
  if (userIds.length > 0) {
    return data.users[userIds[0]];
  }

  return getOrCreateUser("developer@bittybox.org", "Bitty Developer");
}

/**
 * Register a new user or get existing, linking Creem Customer Credit Account
 */
export async function registerUser(email, displayName = "", password = "") {
  const data = loadAccounts();
  const normalizedEmail = String(email).trim().toLowerCase();

  for (const user of Object.values(data.users)) {
    if (user.email && user.email.toLowerCase() === normalizedEmail) {
      if (displayName && user.displayName !== displayName) {
        user.displayName = displayName;
      }
      user.lastSignedInAt = new Date().toISOString();
      await ensureUserCreemCreditAccount(user);
      scheduleSave();
      return user;
    }
  }

  const userId = `bb_usr_${crypto.randomBytes(7).toString("hex")}`;
  const name = displayName.trim() || normalizedEmail.split("@")[0] || "Builder";
  const newUser = {
    id: userId,
    email: normalizedEmail,
    displayName: name,
    tier: "Pro Builder",
    avatar: "⚡",
    creemCustomerId: null,
    creemCreditAccountId: null,
    credits: 0,
    creditsUsedTotal: 0,
    creditsHumanUsed: 0,
    creditsApiUsed: 0,
    creditsMcpUsed: 0,
    joinedDate: new Date().toISOString(),
    lastSignedInAt: new Date().toISOString(),
    passwordHash: password ? hashPassword(password).hash : null,
    settings: {
      autoSaveLinks: true
    },
    apiKeys: [],
    links: [],
    transactions: [],
    lastBonusClaim: null
  };

  data.users[userId] = newUser;
  scheduleSave();

  // Create Creem Customer & Credit Account and sync starter credits
  try {
    const creemInfo = await ensureUserCreemCreditAccount(newUser);
    if (creemInfo && creemInfo.creditAccountId) {
      const creemBal = await getCreemCustomerBalance(creemInfo.creditAccountId);
      if (creemBal !== null && !isNaN(creemBal)) {
        newUser.credits = creemBal;
      }
    }
  } catch (err) {
    console.error(`[account-store] Failed initializing Creem Customer Credits for ${newUser.email}:`, err.message);
  }

  scheduleSave();
  return newUser;
}

/**
 * Synchronize user credit balance with Creem.io Customer Credits API
 */
export async function syncUserCreditsWithCreem(user) {
  if (!user || !user.email) return;
  try {
    const creemInfo = await ensureUserCreemCreditAccount(user);
    if (creemInfo && creemInfo.creditAccountId) {
      const creemBal = await getCreemCustomerBalance(creemInfo.creditAccountId);
      if (creemBal !== null) {
        user.credits = creemBal;
        scheduleSave();
      }
    }
  } catch (err) {
    console.warn(`[account-store] Creem credit sync warning for ${user.email}:`, err.message);
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email, password = "") {
  const data = loadAccounts();
  const normalizedEmail = String(email).trim().toLowerCase();

  let foundUser = null;
  for (const user of Object.values(data.users)) {
    if (user.email && user.email.toLowerCase() === normalizedEmail) {
      foundUser = user;
      break;
    }
  }

  if (!foundUser) {
    return registerUser(normalizedEmail, "", password);
  }

  if (foundUser.passwordHash && password) {
    if (!verifyPasswordHash(password, foundUser.passwordHash)) {
      throw new Error("Invalid password for this account");
    }
  } else if (password && !foundUser.passwordHash) {
    foundUser.passwordHash = hashPassword(password).hash;
  }

  foundUser.lastSignedInAt = new Date().toISOString();
  await ensureUserCreemCreditAccount(foundUser);
  await syncUserCreditsWithCreem(foundUser);
  scheduleSave();
  return foundUser;
}

/**
 * Get or create user by email (backwards-compat)
 */
export async function getOrCreateUser(email, displayName = "") {
  return registerUser(email, displayName);
}

/**
 * Get user by user ID
 */
export function getUser(userId) {
  const data = loadAccounts();
  return data.users[userId] || null;
}

/**
 * Get user by email address
 */
export function getUserByEmail(email) {
  if (!email) return null;
  const data = loadAccounts();
  const normalized = String(email).trim().toLowerCase();
  for (const user of Object.values(data.users)) {
    if (user.email && user.email.toLowerCase() === normalized) {
      return user;
    }
  }
  return null;
}

/**
 * Create a session for a user
 */
export function createSession(userId, durationHours = 720) {
  const data = loadAccounts();
  const sessionId = `bb_sess_${crypto.randomBytes(24).toString("hex")}`;
  const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;

  if (!data.sessions) data.sessions = {};
  data.sessions[sessionId] = {
    sessionId,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString()
  };

  scheduleSave();
  return sessionId;
}

/**
 * Destroy a session
 */
export function destroySession(sessionId) {
  if (!sessionId) return false;
  const data = loadAccounts();
  if (data.sessions && data.sessions[sessionId]) {
    delete data.sessions[sessionId];
    scheduleSave();
    return true;
  }
  return false;
}

/**
 * Get user by session ID
 */
/**
 * Get raw session details by session ID
 */
export function getSession(sessionId) {
  if (!sessionId) return null;
  const data = loadAccounts();
  for (const [sid, s] of Object.entries(data.sessions || {})) {
    if (constantTimeEqual(sid, sessionId)) {
      if (new Date(s.expiresAt) < new Date()) {
        delete data.sessions[sid];
        scheduleSave();
        return null;
      }
      return s;
    }
  }
  return null;
}

/**
 * Update session trust and expiration duration (30 days vs 24h)
 */
export function updateSessionTrust(sessionId, trusted = true, durationDays = 30) {
  if (!sessionId) return null;
  const data = loadAccounts();
  let matchedSid = null;
  let sess = null;
  for (const [sid, s] of Object.entries(data.sessions || {})) {
    if (constantTimeEqual(sid, sessionId)) {
      matchedSid = sid;
      sess = s;
      break;
    }
  }
  if (!sess) return null;

  const durationHours = trusted ? (parseInt(durationDays, 10) || 30) * 24 : 24;
  sess.trusted = Boolean(trusted);
  sess.expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  sess.updatedAt = new Date().toISOString();

  const user = data.users[sess.userId];
  if (user) {
    if (!user.settings) user.settings = {};
    user.settings.trustThisDevice = Boolean(trusted);
    user.settings.deviceTrustExpiresAt = sess.expiresAt;
  }

  scheduleSave();
  return {
    success: true,
    trusted: sess.trusted,
    expiresAt: sess.expiresAt,
    user: user ? sanitizeUser(user) : null
  };
}

export function getUserBySession(sessionId) {
  if (!sessionId) return null;
  const data = loadAccounts();
  let matchedSid = null;
  let sess = null;
  for (const [sid, s] of Object.entries(data.sessions || {})) {
    if (constantTimeEqual(sid, sessionId)) {
      matchedSid = sid;
      sess = s;
      break;
    }
  }
  if (!sess) return null;

  if (new Date(sess.expiresAt) < new Date()) {
    delete data.sessions[matchedSid];
    scheduleSave();
    return null;
  }

  return data.users[sess.userId] || null;
}

/**
 * Create a secure magic link token (valid for 15 minutes)
 */
export function createMagicToken(email, displayName = "", trustDevice = true) {
  const data = loadAccounts();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Valid email address is required");
  }

  if (!data.magicLinks) data.magicLinks = {};

  const token = `bb_magic_${crypto.randomBytes(24).toString("hex")}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  data.magicLinks[token] = {
    token,
    email: normalizedEmail,
    displayName: displayName ? String(displayName).trim() : "",
    trustDevice: Boolean(trustDevice !== false),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    used: false
  };

  scheduleSave();

  return {
    token,
    email: normalizedEmail,
    trustDevice: Boolean(trustDevice !== false),
    expiresAt: new Date(expiresAt).toISOString()
  };
}

/**
 * Verify a magic link token, authenticate/register user, and create a session
 */
export async function verifyMagicToken(token, trustDeviceOverride) {
  if (!token || typeof token !== "string") {
    throw new Error("Magic token is required");
  }

  const data = loadAccounts();
  if (!data.magicLinks) data.magicLinks = {};

  const record = data.magicLinks[token];
  if (!record || record.used) {
    throw new Error("This magic sign-in link is invalid or has already been used.");
  }

  if (new Date(record.expiresAt) < new Date()) {
    delete data.magicLinks[token];
    scheduleSave();
    throw new Error("This magic sign-in link has expired. Please request a new one.");
  }

  record.used = true;
  record.usedAt = new Date().toISOString();

  const isTrusted = trustDeviceOverride !== undefined ? Boolean(trustDeviceOverride) : Boolean(record.trustDevice !== false);
  const durationHours = isTrusted ? 720 : 24;

  const user = await registerUser(record.email, record.displayName);
  const sessionId = createSession(user.id, durationHours);

  if (user) {
    if (!user.settings) user.settings = {};
    user.settings.trustThisDevice = isTrusted;
    user.settings.deviceTrustExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  }

  scheduleSave();

  return {
    user: sanitizeUser(user),
    sessionId,
    trusted: isTrusted,
    expiresAt: user ? user.settings?.deviceTrustExpiresAt : null
  };
}

/**
 * Generate a new API Key for a user
 */
export function createApiKey(userId, label = "API Key", scopes = ["links:create", "links:read", "mcp:access"]) {
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user) throw new Error("User not found");

  const randomSecret = crypto.randomBytes(20).toString("base64url");
  const rawKey = `bb_live_${randomSecret}`;
  const keyId = `bb_key_${crypto.randomBytes(7).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const prefix = `bb_live_${randomSecret.substring(0, 8)}...`;

  const keyMeta = {
    id: keyId,
    label: label.trim() || "API Key",
    prefix,
    hash: keyHash,
    scopes: Array.isArray(scopes) ? scopes : ["links:create", "links:read", "mcp:access"],
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    requestCount: 0
  };

  if (!user.apiKeys) user.apiKeys = [];
  user.apiKeys.push(keyMeta);

  if (!data.apiKeys) data.apiKeys = {};
  data.apiKeys[keyHash] = {
    keyId,
    userId: user.id,
    scopes: keyMeta.scopes,
    createdAt: keyMeta.createdAt
  };

  scheduleSave();

  return {
    keyId,
    rawKey,
    label: keyMeta.label,
    prefix: keyMeta.prefix,
    scopes: keyMeta.scopes,
    createdAt: keyMeta.createdAt
  };
}

/**
 * Revoke an API Key
 */
export function revokeApiKey(userId, keyId) {
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user || !user.apiKeys) return false;

  const idx = user.apiKeys.findIndex(k => k.id === keyId);
  if (idx === -1) return false;

  const [removedKey] = user.apiKeys.splice(idx, 1);
  if (removedKey && removedKey.hash && data.apiKeys) {
    delete data.apiKeys[removedKey.hash];
  }

  scheduleSave();
  return true;
}

/**
 * Validate an incoming API key
 */
export function validateApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string" || !rawKey.startsWith("bb_live_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const data = loadAccounts();
  const keyHash = hashApiKey(rawKey);

  const entry = data.apiKeys ? data.apiKeys[keyHash] : null;
  if (!entry) {
    return { valid: false, error: "API key not found or revoked" };
  }

  const user = data.users[entry.userId];
  if (!user) {
    return { valid: false, error: "User associated with API key not found" };
  }

  const keyMeta = (user.apiKeys || []).find(k => k.id === entry.keyId);
  if (keyMeta) {
    keyMeta.lastUsedAt = new Date().toISOString();
    keyMeta.requestCount = (keyMeta.requestCount || 0) + 1;
    scheduleSave();
  }

  return {
    valid: true,
    user,
    keyMeta: keyMeta || { id: entry.keyId, scopes: entry.scopes }
  };
}

/**
 * Record link creation for user
 */
export function recordLinkCreation(userId, linkData) {
  if (!userId || !linkData) return null;
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user) return null;

  if (!user.links) user.links = [];

  const linkRecord = {
    id: linkData.id || `bb_link_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    title: linkData.title || "Untitled Bitty Box",
    url: linkData.url || "",
    format: linkData.format || "html",
    byteSize: linkData.byteSize || 0,
    compressedSize: linkData.compressedSize || 0,
    encrypted: !!linkData.encrypted,
    locks: linkData.locks || {},
    cost: Math.max(0, parseInt(linkData.cost, 10) || 0),
    boxBreakdowns: Array.isArray(linkData.boxBreakdowns) ? linkData.boxBreakdowns : undefined,
    createdAt: linkData.createdAt || new Date().toISOString()
  };

  user.links.unshift(linkRecord);
  if (user.links.length > 250) {
    user.links = user.links.slice(0, 250);
  }

  scheduleSave();
  return linkRecord;
}

/**
 * Delete a user tracked link
 */
export function deleteUserLink(userId, linkId) {
  if (!userId || !linkId) return false;
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user || !user.links) return false;

  const idx = user.links.findIndex(l => l.id === linkId);
  if (idx === -1) return false;

  user.links.splice(idx, 1);
  scheduleSave();
  return true;
}

/**
 * Purchase / Refill credits for a user via Creem.io Customer Credits
 */
export async function purchaseCredits(userId, packageId, amount, costCents = 0) {
  if (!userId) throw new Error("User required");
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user) throw new Error("User not found");

  const creditAmount = parseInt(amount, 10) || 100;

  // Issue on Creem.io Customer Credits API
  try {
    const creemInfo = await ensureUserCreemCreditAccount(user);
    if (creemInfo && creemInfo.creditAccountId) {
      await issueCreemCredits(
        creemInfo.creditAccountId,
        creditAmount,
        `Purchased ${packageId || "custom"} refill package`,
        `ik_purchase_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
      );
      const creemBal = await getCreemCustomerBalance(creemInfo.creditAccountId);
      if (creemBal !== null) {
        user.credits = creemBal;
      } else {
        user.credits = (user.credits || 0) + creditAmount;
      }
    } else {
      user.credits = (user.credits || 0) + creditAmount;
    }
  } catch (err) {
    console.error(`[account-store] Creem credit issue failed for ${user.id}:`, err.message);
    user.credits = (user.credits || 0) + creditAmount;
  }

  if (!user.transactions) user.transactions = [];
  user.transactions.unshift({
    id: `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    type: "purchase",
    amount: creditAmount,
    costCents,
    packageId: packageId || "custom",
    description: `Purchased ${creditAmount} Credits (${packageId || "Top-up"})`,
    createdAt: new Date().toISOString()
  });

  if (user.transactions.length > 100) {
    user.transactions = user.transactions.slice(0, 100);
  }

  scheduleSave();
  return {
    success: true,
    newBalance: user.credits,
    transaction: user.transactions[0]
  };
}

/**
 * Deduct credits from user account via Creem.io Customer Credits
 */
export async function deductCredits(userId, amount = 1, category = "human", reference = "Usage deduction") {
  if (!userId) return false;
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user) return false;

  const deductNum = Math.max(1, parseInt(amount, 10) || 1);

  // Update local balances immediately
  user.credits = Math.max(0, (user.credits || 0) - deductNum);
  user.creditsUsedTotal = (user.creditsUsedTotal || 0) + deductNum;

  if (category === "mcp") {
    user.creditsMcpUsed = (user.creditsMcpUsed || 0) + deductNum;
  } else if (category === "api") {
    user.creditsApiUsed = (user.creditsApiUsed || 0) + deductNum;
  } else {
    user.creditsHumanUsed = (user.creditsHumanUsed || 0) + deductNum;
  }

  if (!user.transactions) user.transactions = [];
  user.transactions.unshift({
    id: `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    type: "usage",
    amount: -deductNum,
    description: reference || `Box Generation (${deductNum} CR)`,
    createdAt: new Date().toISOString()
  });
  if (user.transactions.length > 100) {
    user.transactions = user.transactions.slice(0, 100);
  }

  scheduleSave();

  // Sync debit with Creem.io Customer Credits in background
  try {
    const creemInfo = await ensureUserCreemCreditAccount(user);
    if (creemInfo && creemInfo.creditAccountId) {
      await debitCreemCredits(
        creemInfo.creditAccountId,
        deductNum,
        reference || `Bitty Box ${category.toUpperCase()} usage`,
        `ik_debit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
      );
      const creemBal = await getCreemCustomerBalance(creemInfo.creditAccountId);
      if (creemBal !== null && !isNaN(creemBal)) {
        user.credits = creemBal;
        scheduleSave();
      }
    }
  } catch (err) {
    console.warn(`[account-store] Creem debit failed for ${user.id}:`, err.message);
  }

  return true;
}

export function createInsufficientCreditsError(user, required) {
  const available = Math.max(0, parseInt(user?.credits, 10) || 0);
  const err = new Error(`Insufficient credits: ${required} required, ${available} available`);
  err.status = 402;
  err.code = "INSUFFICIENT_CREDITS";
  err.creditsRequired = required;
  err.creditsAvailable = available;
  return err;
}

export async function requireCreditsAvailable(userId, amount = 1) {
  if (!userId) throw new Error("User required");
  const required = Math.max(0, parseInt(amount, 10) || 0);
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user) throw new Error("User not found");
  if (required <= 0) return { success: true, user, creditsRequired: 0, creditsAvailable: user.credits || 0 };

  await syncUserCreditsWithCreem(user);
  const available = Math.max(0, parseInt(user.credits, 10) || 0);
  if (available < required) {
    throw createInsufficientCreditsError(user, required);
  }

  return { success: true, user, creditsRequired: required, creditsAvailable: available };
}

export async function deductCreditsEnforced(userId, amount = 1, category = "human", reference = "Usage deduction") {
  const required = Math.max(0, parseInt(amount, 10) || 0);
  if (required <= 0) return true;
  await requireCreditsAvailable(userId, required);
  return deductCredits(userId, required, category, reference);
}

/**
 * Fetch Creem.io customer credit ledger entries
 */
export async function getUserCreemEntries(userId) {
  if (!userId) return [];
  const data = loadAccounts();
  const user = data.users[userId];
  if (!user) return [];

  const creemInfo = await ensureUserCreemCreditAccount(user);
  if (!creemInfo || !creemInfo.creditAccountId) return [];

  return listCreemCustomerEntries(creemInfo.creditAccountId);
}
