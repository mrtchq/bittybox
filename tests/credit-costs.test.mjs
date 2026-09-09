import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  calculateBoxCreditCost,
  calculateChainCreditCost,
  calculateRecordedLinkCreditCost,
} from '../lib/credit-costs.js';

const lockedBox = {
  title: 'Three Block Box',
  password: 'secret-passcode',
  lockConfig: {
    timeWindow: { enabled: true, mode: 'expiry', expiryHours: 24 },
    openLimit: { enabled: true, maxOpens: 3 },
  },
};

assert.equal(calculateBoxCreditCost(lockedBox), 20);

const chain = calculateChainCreditCost([
  { title: 'Original', metadata: lockedBox },
  { title: 'Clone', isCloned: true, metadata: lockedBox },
  { title: 'Timer Only', metadata: { lockConfig: { timeWindow: { enabled: true } } } },
]);

assert.equal(chain.totalCost, 50);
assert.deepEqual(chain.boxBreakdowns.map((box) => box.totalCost), [20, 20, 10]);
assert.equal(chain.boxBreakdowns[1].isCloned, true);

assert.equal(
  calculateRecordedLinkCreditCost({
    cost: 0,
    locks: { timeWindow: true, accessLimit: true },
  }),
  20,
);
assert.equal(
  calculateRecordedLinkCreditCost({
    cost: '10',
    boxBreakdowns: [{ totalCost: 20 }, { totalCost: 20 }],
  }),
  40,
);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bittybox-credit-enforce-'));
process.env.BITTYBOX_DATA_DIR = tempDir;
process.env.CREEM_API_KEY = 'test-disabled';
process.env.CREEM_API_URL = 'http://127.0.0.1:9';

const accountStore = await import(`../lib/account-store.js?credit-test=${Date.now()}`);
const user = await accountStore.registerUser('credit-enforce@example.com', 'Credit Enforce', 'test-password');
await accountStore.purchaseCredits(user.id, 'test', 30, 0);
await accountStore.deductCreditsEnforced(user.id, 20, 'api', 'test charge');
assert.equal(accountStore.getUser(user.id).credits, 10);

await assert.rejects(
  () => accountStore.deductCreditsEnforced(user.id, 20, 'api', 'over budget'),
  (err) => err.code === 'INSUFFICIENT_CREDITS' && err.status === 402 && err.creditsRequired === 20 && err.creditsAvailable === 10,
);

console.log('✓ credit cost calculation and enforced deduction tests passed');
