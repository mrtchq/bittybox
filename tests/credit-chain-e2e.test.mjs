import assert from 'node:assert/strict';
import { calculateBoxCreditCost, calculateChainCreditCost, getBoxCreditBreakdown } from '../lib/credit-costs.js';

const BASE_URL = process.env.BITTYBOX_API_URL || 'http://127.0.0.1:3020';

console.log(`Starting Credit & Chain Enforcement Tests against ${BASE_URL}...`);

// 1. Verify pure unit calculation for the requested example:
// Box 1 has 3 blocks: Base Content (0 CR) + Time Lock (10 CR) + View Limit (10 CR) = 20 CR
const box1 = {
  title: 'Box 1 (Genesis)',
  lockConfig: {
    timeWindow: { enabled: true, mode: 'expiry', expiryHours: 24 },
    openLimit: { enabled: true, maxOpens: 5 },
  },
};

const box1Breakdown = getBoxCreditBreakdown(box1, 0, false);
assert.equal(box1Breakdown.blockCount, 3, 'Box 1 must have 3 active blocks (Base Content, Time Lock, View Limit)');
assert.equal(box1Breakdown.totalCost, 20, 'Box 1 with 3 blocks must require 20 credits');
assert.equal(box1Breakdown.allBlocks.length, 4, 'All 4 block mechanisms must be present in breakdown schema');

const chainPages = [
  { title: 'Box 1 Genesis', metadata: box1 },
  { title: 'Box 2 Cloned', isCloned: true, metadata: box1 },
  { title: 'Box 3 Timer Only', metadata: { title: 'Box 3', lockConfig: { timeWindow: { enabled: true, mode: 'delay', delayHours: 12 } } } },
  { title: 'Box 4 PIN Only', metadata: { title: 'Box 4', password: 'free-secret-pin-123' } },
];

const chainCalculation = calculateChainCreditCost(chainPages);
assert.equal(chainCalculation.totalCost, 50, 'Total chain cost must be 20 + 20 + 10 + 0 = 50 credits');
assert.equal(chainCalculation.boxBreakdowns.length, 4);
assert.equal(chainCalculation.boxBreakdowns[0].totalCost, 20);
assert.equal(chainCalculation.boxBreakdowns[1].totalCost, 20);
assert.equal(chainCalculation.boxBreakdowns[1].isCloned, true);
assert.equal(chainCalculation.boxBreakdowns[2].totalCost, 10);
assert.equal(chainCalculation.boxBreakdowns[3].totalCost, 0);

console.log('✓ Pure credit and chain breakdown assertions verified.');

// 2. Integration test with live backend server
const testEmail = `builder_${Date.now()}@example.com`;
const testPassword = `Pass_${Date.now()}_!`;

// Register test user
const regRes = await fetch(`${BASE_URL}/api/accounts/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: testEmail,
    displayName: 'Credit Chain Tester',
    password: testPassword,
  }),
});
const regData = await regRes.json();
assert.equal(regData.success, true, 'User registration must succeed');
const sessionId = regData.sessionId;
const initialCredits = regData.user.credits;
console.log(`Registered user ${testEmail} with initial balance: ${initialCredits} CR, sessionId: ${sessionId}`);

// Top-up credits for test
await fetch(`${BASE_URL}/api/accounts/credits/purchase`, {
  method: 'POST',
  headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
  body: JSON.stringify({ packageId: 'test_starter', amount: 100 }),
});

const profileRes = await fetch(`${BASE_URL}/api/accounts/me`, {
  headers: { 'X-Session-Id': sessionId },
});
const profile = await profileRes.json();
const fundedBalance = profile.user.credits;
console.log(`Funded balance: ${fundedBalance} CR`);
assert.ok(fundedBalance >= 100, 'Funded balance must be >= 100');

// 3. Generate Single 3-block Box (20 CR) via API
console.log('Testing Single 3-block Box generation (20 CR)...');
const createBoxRes = await fetch(`${BASE_URL}/api/bitty/create`, {
  method: 'POST',
  headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '<h1>3-Block Test Box</h1><p>Time and view limit protected.</p>',
    title: '3-Block Test Box',
    lockConfig: {
      timeWindow: { enabled: true, mode: 'expiry', expiryHours: 48 },
      openLimit: { enabled: true, maxOpens: 10 },
    },
  }),
});
const createBoxData = await createBoxRes.json();
assert.equal(createBoxData.success, true, 'Create box must succeed');

const afterSingleBoxRes = await fetch(`${BASE_URL}/api/accounts/me`, {
  headers: { 'X-Session-Id': sessionId },
});
const afterSingleBoxUser = (await afterSingleBoxRes.json()).user;
console.log(`Balance after 20 CR box: ${afterSingleBoxUser.credits} CR (deducted: ${fundedBalance - afterSingleBoxUser.credits} CR)`);
assert.equal(afterSingleBoxUser.credits, fundedBalance - 20, '20 credits must be deducted for 3-block box');

// 4. Generate 4-Box Chain (50 CR total: 20 + 20 clone + 10 timer + 0 pin)
console.log('Testing 4-Box Chain generation (50 CR)...');
const balanceBeforeChain = afterSingleBoxUser.credits;

const chainApiRes = await fetch(`${BASE_URL}/api/bitty/chain`, {
  method: 'POST',
  headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '4-Chamber Chain',
    pages: [
      {
        content: '<h1>Box 1: Genesis</h1>',
        title: 'Box 1: Genesis',
        lockConfig: {
          timeWindow: { enabled: true, mode: 'expiry', expiryHours: 24 },
          openLimit: { enabled: true, maxOpens: 3 },
        },
      },
      {
        content: '<h1>Box 2: Cloned Chamber</h1>',
        title: 'Box 2: Cloned Chamber',
        isCloned: true,
        lockConfig: {
          timeWindow: { enabled: true, mode: 'expiry', expiryHours: 24 },
          openLimit: { enabled: true, maxOpens: 3 },
        },
      },
      {
        content: '<h1>Box 3: Timed Chamber</h1>',
        title: 'Box 3: Timed Chamber',
        lockConfig: {
          timeWindow: { enabled: true, mode: 'delay', delayHours: 6 },
        },
      },
      {
        content: '<h1>Box 4: Free PIN Chamber</h1>',
        title: 'Box 4: Free PIN Chamber',
        password: 'pinOnlyNoLocks123',
      },
    ],
  }),
});
const chainApiData = await chainApiRes.json();
assert.equal(chainApiData.success, true, 'Create chain must succeed');
assert.equal(chainApiData.creditCost, 50, 'Returned chain creditCost must be exactly 50');
assert.equal(chainApiData.boxCreditBreakdowns.length, 4, 'Must return 4 box breakdowns');
assert.equal(chainApiData.boxCreditBreakdowns[0].totalCost, 20, 'Box 1 cost is 20');
assert.equal(chainApiData.boxCreditBreakdowns[1].totalCost, 20, 'Box 2 clone cost is 20');
assert.equal(chainApiData.boxCreditBreakdowns[1].isCloned, true, 'Box 2 isCloned must be true');
assert.equal(chainApiData.boxCreditBreakdowns[2].totalCost, 10, 'Box 3 timer cost is 10');
assert.equal(chainApiData.boxCreditBreakdowns[3].totalCost, 0, 'Box 4 PIN cost is 0');

const afterChainRes = await fetch(`${BASE_URL}/api/accounts/me`, {
  headers: { 'X-Session-Id': sessionId },
});
const afterChainUser = (await afterChainRes.json()).user;
console.log(`Balance after 50 CR chain: ${afterChainUser.credits} CR (deducted: ${balanceBeforeChain - afterChainUser.credits} CR)`);
assert.equal(afterChainUser.credits, balanceBeforeChain - 50, '50 credits must be deducted for the box chain');

// 5. Test Insufficient Credits Enforcement (402 error)
console.log('Testing Insufficient Credits Enforcement...');
// Exhaust remaining balance
const currentBalance = afterChainUser.credits;
if (currentBalance > 0) {
  // Deduct remaining
  await fetch(`${BASE_URL}/api/accounts/links`, {
    method: 'POST',
    headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Draining box',
      url: 'https://bittybox.org/#drain',
      cost: currentBalance,
    }),
  });
}

const emptyCheck = await (await fetch(`${BASE_URL}/api/accounts/me`, { headers: { 'X-Session-Id': sessionId } })).json();
assert.equal(emptyCheck.user.credits, 0, 'User credits must now be 0');

// Attempt to create a 20 CR box with 0 balance
const failedBoxRes = await fetch(`${BASE_URL}/api/bitty/create`, {
  method: 'POST',
  headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '<h1>Should Fail</h1>',
    title: 'Expensive Box',
    lockConfig: {
      timeWindow: { enabled: true },
      openLimit: { enabled: true, maxOpens: 1 },
    },
  }),
});

assert.equal(failedBoxRes.status, 402, 'Must return HTTP 402 Payment Required for insufficient credits');
const failedBoxData = await failedBoxRes.json();
assert.equal(failedBoxData.code, 'INSUFFICIENT_CREDITS', 'Must return INSUFFICIENT_CREDITS code');
assert.equal(failedBoxData.creditsRequired, 20);
assert.equal(failedBoxData.creditsAvailable, 0);

console.log('✓ Insufficient credits properly enforced with 402 Payment Required.');

// 6. Test Free Box creation (0 CR) still succeeds even with 0 credits
console.log('Testing 0-credit box creation with 0 balance...');
const freeBoxRes = await fetch(`${BASE_URL}/api/bitty/create`, {
  method: 'POST',
  headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '<h1>Free Content Forever</h1>',
    title: 'Free Box',
    password: 'freePasswordPIN123',
  }),
});
const freeBoxData = await freeBoxRes.json();
assert.equal(freeBoxRes.status, 200, 'Free box must succeed with 0 balance');
assert.equal(freeBoxData.success, true);

console.log('✓ All Credit & Chain Enforcement Tests Passed Successfully!');
