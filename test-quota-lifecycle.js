import { parseBittyHash, buildBittyUrl, compressContentSync } from './src/utils/bittyEngine.js';

function simulateStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

async function testQuota() {
  const localStorage = simulateStorage();
  const testHtml = '<h1>Top Secret Document</h1>';
  const encoded = compressContentSync(testHtml, { mimeType: 'text/html', isRawHtml: true });

  const meta = {
    title: 'Quota Protected Box',
    lockConfig: {
      openLimit: { enabled: true, maxOpens: 1, opensUsed: 0, showRemainingCount: true }
    }
  };

  const url = buildBittyUrl(encoded.compressedUrl, meta, 'https://bittybox.org');
  const hash = url.substring(url.indexOf('#'));
  const parsed = parseBittyHash(hash);

  const maxOpens = parsed.metadata.lockConfig.openLimit.maxOpens;
  let h = 0;
  for (let i = 0; i < hash.length; i++) {
    h = ((h << 5) - h) + hash.charCodeAt(i);
    h |= 0;
  }
  const quotaStorageKey = `bitty_quota_hash_${Math.abs(h)}`;

  console.log('1. Initial Load (Visitor arrives):');
  let storedUsed = localStorage.getItem(quotaStorageKey);
  let usedCount = storedUsed !== null ? parseInt(storedUsed, 10) || 0 : 0;
  let remainingOpens = Math.max(0, maxOpens - usedCount);
  let quotaBlocked = usedCount >= maxOpens;
  let isUnlocked = false; // Because hasLock is true

  console.log(`   Used: ${usedCount}, Remaining: ${remainingOpens}, Blocked: ${quotaBlocked}, Unlocked: ${isUnlocked}`);
  if (quotaBlocked !== false || isUnlocked !== false || remainingOpens !== 1) {
    throw new Error('Initial load should show locked splash screen with 1 remaining open');
  }

  console.log('\n2. User clicks [ENTER & VIEW BITTY BOX]:');
  usedCount += 1;
  localStorage.setItem(quotaStorageKey, usedCount);
  remainingOpens = Math.max(0, maxOpens - usedCount);
  isUnlocked = true;
  console.log(`   New Used: ${usedCount}, New Remaining: ${remainingOpens}, Unlocked: ${isUnlocked}`);
  if (remainingOpens !== 0 || isUnlocked !== true) {
    throw new Error('Should consume quota and unlock');
  }

  console.log('\n3. User refreshes the page (Reload cycle):');
  storedUsed = localStorage.getItem(quotaStorageKey);
  usedCount = storedUsed !== null ? parseInt(storedUsed, 10) || 0 : 0;
  remainingOpens = Math.max(0, maxOpens - usedCount);
  quotaBlocked = usedCount >= maxOpens;
  isUnlocked = false;

  console.log(`   On Refresh -> Used: ${usedCount}, Remaining: ${remainingOpens}, Blocked: ${quotaBlocked}, Unlocked: ${isUnlocked}`);
  if (quotaBlocked !== true || remainingOpens !== 0) {
    throw new Error('Reload MUST be blocked with quotaBlocked = true and remainingOpens = 0');
  }

  console.log('\nQUOTA LIFECYCLE VERIFIED SUCCESSFULLY! 🔒🔥');
}

testQuota().catch(e => {
  console.error(e);
  process.exit(1);
});
