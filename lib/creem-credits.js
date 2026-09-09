import fs from "fs";
import path from "path";
import crypto from "crypto";

// Creem.io Configuration
let cachedApiKey = process.env.CREEM_API_KEY || null;
let cachedBaseUrl = process.env.CREEM_API_URL || "https://api.creem.io/v1";

function loadCreemConfig() {
  if (process.env.CREEM_API_KEY) {
    cachedApiKey = process.env.CREEM_API_KEY;
  }
  if (process.env.CREEM_API_URL) {
    cachedBaseUrl = process.env.CREEM_API_URL;
  }

  if (cachedApiKey) return { apiKey: cachedApiKey, baseUrl: cachedBaseUrl };
  
  try {
    const configPath = "/root/.config/creem/config.json";
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (raw.api_key) {
        cachedApiKey = raw.api_key;
      }
      if (raw.environment === "production") {
        cachedBaseUrl = "https://api.creem.io/v1";
      } else if (raw.environment === "test") {
        cachedBaseUrl = "https://test-api.creem.io/v1";
      }
    }
  } catch (err) {
    console.warn("[creem-credits] Could not load ~/.config/creem/config.json:", err.message);
  }

  if (!cachedApiKey) {
    throw new Error("CREEM_API_KEY is required for Creem credit operations (set in production.env)");
  }

  return { apiKey: cachedApiKey, baseUrl: cachedBaseUrl };
}

/**
 * Execute HTTP request to Creem.io API
 */
export async function creemRequest(endpoint, method = "GET", body = null) {
  const { apiKey, baseUrl } = loadCreemConfig();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = {
    "x-api-key": apiKey,
    "User-Agent": "Bitty Box-Server/1.0",
    "Accept": "application/json"
  };

  const options = {
    method,
    headers
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.error(`[creem-credits] ${method} ${url} failed:`, err.message);
    throw err;
  }
}

/**
 * Find or create a Creem Customer record
 */
export async function getOrCreateCreemCustomer(email, name = "Builder") {
  const normalizedEmail = String(email).trim().toLowerCase();
  
  // 1. Try finding existing customer by email
  try {
    const existing = await creemRequest(`/customers?email=${encodeURIComponent(normalizedEmail)}`);
    if (existing && existing.id) {
      return existing;
    }
  } catch (err) {
    // If not found, proceed to create
  }

  // 2. Create customer if not exists
  const customerName = name.trim() || normalizedEmail.split("@")[0] || "Builder";
  const created = await creemRequest("/customers", "POST", {
    email: normalizedEmail,
    name: customerName
  });

  return created;
}

/**
 * Find or create a Creem Customer Credit Account (CCA)
 */
export async function getOrCreateCustomerCreditAccount(customerId, name = "Builder") {
  if (!customerId) throw new Error("Creem Customer ID required");

  // 1. Check existing accounts for this customer
  try {
    const listRes = await creemRequest(`/customer-credits/accounts?customer_id=${encodeURIComponent(customerId)}`);
    const accounts = listRes?.data || [];
    if (accounts.length > 0) {
      return { account: accounts[0], isNew: false };
    }
  } catch (err) {
    console.warn("[creem-credits] Failed listing credit accounts, attempting creation:", err.message);
  }

  // 2. Create new credit account for customer
  const createdAccount = await creemRequest("/customer-credits/accounts", "POST", {
    customer_id: customerId,
    name: name || "Builder",
    unit_label: "credits"
  });

  return { account: createdAccount, isNew: true };
}

/**
 * Ensure user has full Creem Customer & Credit Account linked
 */
export async function ensureUserCreemCreditAccount(user) {
  if (!user || !user.email) return null;

  try {
    let customerId = user.creemCustomerId;
    let creditAccountId = user.creemCreditAccountId;

    // Validate existing customer if ID is present
    if (customerId) {
      try {
        await creemRequest(`/customers/${customerId}`);
      } catch (err) {
        if (err.status === 404 || String(err.message).includes('not found')) {
          customerId = null;
          creditAccountId = null;
          user.creemCustomerId = null;
          user.creemCreditAccountId = null;
        }
      }
    }

    if (!customerId) {
      const cust = await getOrCreateCreemCustomer(user.email, user.displayName);
      customerId = cust?.id;
      user.creemCustomerId = customerId;
    }

    // Validate existing credit account if ID is present
    if (creditAccountId) {
      try {
        await creemRequest(`/customer-credits/accounts/${creditAccountId}`);
      } catch (err) {
        if (err.status === 404 || String(err.message).includes('not found')) {
          creditAccountId = null;
          user.creemCreditAccountId = null;
        }
      }
    }

    if (!creditAccountId && customerId) {
      const res = await getOrCreateCustomerCreditAccount(customerId, user.displayName);
      const acc = res?.account || res;
      creditAccountId = acc?.id;
      user.creemCreditAccountId = creditAccountId;

      // Seed initial starter balance ONLY if a brand new Creem account was created
      if (res?.isNew && creditAccountId) {
        const seedAmount = user.credits ?? 0;
        if (seedAmount > 0) {
          try {
            await issueCreemCredits(creditAccountId, seedAmount, "Account starter credits", `ik_seed_${user.id}`);
          } catch (e) {
            console.warn("[creem-credits] Failed issuing seed credits:", e.message);
          }
        }
      }
    }

    return { customerId, creditAccountId };
  } catch (err) {
    console.error(`[creem-credits] Error ensuring Creem account for user ${user.email}:`, err.message);
    return null;
  }
}

/**
 * Issue / Increment Customer Credits on Creem.io
 */
export async function issueCreemCredits(creditAccountId, amount, reference = "credit_allotment", idempotencyKey = null) {
  if (!creditAccountId) throw new Error("Credit Account ID required");
  const creditAmount = Math.max(1, parseInt(amount, 10) || 1);
  const idemp = idempotencyKey || `ik_credit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  const result = await creemRequest(`/customer-credits/accounts/${creditAccountId}/credit`, "POST", {
    amount: String(creditAmount),
    reference: String(reference).substring(0, 100),
    idempotency_key: idemp
  });

  return result;
}

/**
 * Debit / Decrement Customer Credits on Creem.io
 */
export async function debitCreemCredits(creditAccountId, amount, reference = "usage_decrement", idempotencyKey = null) {
  if (!creditAccountId) throw new Error("Credit Account ID required");
  const debitAmount = Math.max(1, parseInt(amount, 10) || 1);
  const idemp = idempotencyKey || `ik_debit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  const result = await creemRequest(`/customer-credits/accounts/${creditAccountId}/debit`, "POST", {
    amount: String(debitAmount),
    reference: String(reference).substring(0, 100),
    idempotency_key: idemp
  });

  return result;
}

/**
 * Retrieve Live Authoritative Balance from Creem.io
 */
export async function getCreemCustomerBalance(creditAccountId) {
  if (!creditAccountId) return 0;
  try {
    const data = await creemRequest(`/customer-credits/accounts/${creditAccountId}/balance`);
    const balanceNum = parseInt(data.balance, 10);
    return isNaN(balanceNum) ? 0 : balanceNum;
  } catch (err) {
    console.error(`[creem-credits] Failed fetching balance for ${creditAccountId}:`, err.message);
    return null;
  }
}

/**
 * List Customer Credit Ledger Entries from Creem.io
 */
export async function listCreemCustomerEntries(creditAccountId) {
  if (!creditAccountId) return [];
  try {
    const data = await creemRequest(`/customer-credits/accounts/${creditAccountId}/entries`);
    return data?.data || [];
  } catch (err) {
    console.error(`[creem-credits] Failed fetching entries for ${creditAccountId}:`, err.message);
    return [];
  }
}
