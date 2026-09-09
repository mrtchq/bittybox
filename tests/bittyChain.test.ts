import assert from 'node:assert';
import {
  createChainDraftFromCurrent,
  createNextChainDraftPage,
  deleteChainDraftPage,
  reorderChainDraftPages,
} from '../src/utils/bittyChain';

console.log('Testing bittyChain delete & reorder functionality...');

// 1. Setup initial 3-page chain
const baseDraft = createChainDraftFromCurrent('Page 1 Content', { title: 'Box 1', description: '' });
const draft2 = createNextChainDraftPage(baseDraft, 'scratch', 'Page 1 Content', { title: 'Box 1', description: '' });
const draft3 = createNextChainDraftPage(draft2, 'scratch', 'Page 2 Content', { title: 'Box 2', description: '' });
draft3.pages[2].content = 'Page 3 Content';
draft3.pages[2].metadata.title = 'Box 3';

assert.strictEqual(draft3.pages.length, 3, 'Should have 3 pages initially');
assert.strictEqual(draft3.pages[0].metadata.title, 'Box 1');
assert.strictEqual(draft3.pages[1].metadata.title, 'Box 2');
assert.strictEqual(draft3.pages[2].metadata.title, 'Box 3');

// 2. Test deleting last page
const afterDeleteLast = deleteChainDraftPage(draft3);
assert.strictEqual(afterDeleteLast.pages.length, 2, 'Should have 2 pages after deleting last');
assert.strictEqual(afterDeleteLast.pages[0].metadata.title, 'Box 1');
assert.strictEqual(afterDeleteLast.pages[1].metadata.title, 'Box 2');
assert.strictEqual(afterDeleteLast.currentIndex, 1, 'Current index should be clamped to last available index (1)');

// 3. Test deleting page 0
const afterDeleteFirst = deleteChainDraftPage(draft3, 0);
assert.strictEqual(afterDeleteFirst.pages.length, 2, 'Should have 2 pages after deleting first');
assert.strictEqual(afterDeleteFirst.pages[0].metadata.title, 'Box 2');
assert.strictEqual(afterDeleteFirst.pages[1].metadata.title, 'Box 3');

// 4. Test delete safeguard when only 1 page remains
const singlePageDraft = deleteChainDraftPage(afterDeleteLast);
assert.strictEqual(singlePageDraft.pages.length, 1);
const tryDeleteFinal = deleteChainDraftPage(singlePageDraft);
assert.strictEqual(tryDeleteFinal.pages.length, 1, 'Cannot delete below 1 page');

// 5. Test Reordering: Move Box 1 (index 0) to index 2
const reordered1 = reorderChainDraftPages(draft3, 0, 2);
assert.strictEqual(reordered1.pages.length, 3);
assert.strictEqual(reordered1.pages[0].metadata.title, 'Box 2');
assert.strictEqual(reordered1.pages[1].metadata.title, 'Box 3');
assert.strictEqual(reordered1.pages[2].metadata.title, 'Box 1');

// 6. Test Reordering: Move Box 3 (index 2) to index 0
const reordered2 = reorderChainDraftPages(draft3, 2, 0);
assert.strictEqual(reordered2.pages.length, 3);
assert.strictEqual(reordered2.pages[0].metadata.title, 'Box 3');
assert.strictEqual(reordered2.pages[1].metadata.title, 'Box 1');
assert.strictEqual(reordered2.pages[2].metadata.title, 'Box 2');

// 7. Active index tracking when moving selected item
const activeDraft = { ...draft3, currentIndex: 0 };
const reorderedActive = reorderChainDraftPages(activeDraft, 0, 2);
assert.strictEqual(reorderedActive.currentIndex, 2, 'Active index must follow moved item');

// 8. Test Credit Calculations: Box with 3 blocks requiring 20 credits
import {
  getBoxBlockBreakdown,
  calculateBoxCreditCost,
  calculateTotalChainCreditCost,
} from '../src/utils/bittyChain';

console.log('Testing block credit cost calculations and chain/cloning operations...');

// Box 1 has 3 blocks: Base Content (0 CR) + Time Lock (+10 CR) + View Limit (+10 CR) = 20 CR
const box1Meta = {
  title: 'Genesis Chamber',
  description: 'First box with time and view limits',
  includeMetadata: true,
  lockConfig: {
    timeWindow: { enabled: true, mode: 'expiry' as const, expiryHours: 24, showCountdown: true },
    openLimit: { enabled: true, maxOpens: 5, opensUsed: 0, showRemainingCount: true },
  },
};

const box1Breakdown = getBoxBlockBreakdown(box1Meta, 0, false);
assert.strictEqual(box1Breakdown.blockCount, 3, 'Box 1 should have 3 active blocks (Base, Time Lock, View Limits)');
assert.strictEqual(box1Breakdown.totalCost, 20, 'Box 1 with 3 blocks should cost 20 credits');

// 9. Test Chaining: Clone Box 1 into Box 2
const chainWithBox1 = createChainDraftFromCurrent('Genesis Content', box1Meta);
const chainWithBox2Cloned = createNextChainDraftPage(chainWithBox1, 'clone', 'Genesis Content', box1Meta);

assert.strictEqual(chainWithBox2Cloned.pages.length, 2, 'Should have 2 chained pages');
assert.strictEqual(chainWithBox2Cloned.pages[1].isCloned, true, 'Box 2 must be marked as cloned');

const chain2Cost = calculateTotalChainCreditCost(chainWithBox2Cloned.pages);
assert.strictEqual(chain2Cost.totalCost, 40, 'Chain of 2 cloned 20-CR boxes must total 40 credits (20 + 20)');
assert.strictEqual(chain2Cost.boxBreakdowns[0].totalCost, 20, 'Box 1 cost is 20 CR');
assert.strictEqual(chain2Cost.boxBreakdowns[1].totalCost, 20, 'Box 2 cost is 20 CR');
assert.strictEqual(chain2Cost.boxBreakdowns[1].isCloned, true, 'Box 2 breakdown must record isCloned = true');

// 10. Add Box 3 with single credit-requiring block mechanism (Time Lock only = 10 CR)
const chainWithBox3 = createNextChainDraftPage(chainWithBox2Cloned, 'scratch', 'Box 2 Content', chainWithBox2Cloned.pages[1].metadata);
chainWithBox3.pages[2].metadata = {
  title: 'Box 3 with Timer',
  description: '',
  includeMetadata: true,
  lockConfig: {
    timeWindow: { enabled: true, mode: 'delay' as const, delayHours: 12, showCountdown: true },
  },
};

const chain3Cost = calculateTotalChainCreditCost(chainWithBox3.pages);
assert.strictEqual(chain3Cost.totalCost, 50, 'Chain with 20 CR + 20 CR + 10 CR must total 50 credits');
assert.strictEqual(chain3Cost.boxBreakdowns[2].totalCost, 10, 'Box 3 cost is 10 CR');
assert.strictEqual(chain3Cost.boxBreakdowns[2].blockCount, 2, 'Box 3 has 2 blocks (Base + Time Lock)');

// 11. Add Box 4 with zero-credit blocks (Base + Free Secret PIN = 0 CR)
const chainWithBox4 = createNextChainDraftPage(chainWithBox3, 'scratch', 'Box 3 Content', chainWithBox3.pages[2].metadata);
chainWithBox4.pages[3].metadata = {
  title: 'Box 4 with PIN',
  description: '',
  includeMetadata: true,
  password: 'mySecretPasscode123',
};

const chain4Cost = calculateTotalChainCreditCost(chainWithBox4.pages);
assert.strictEqual(chain4Cost.totalCost, 50, 'Chain with 20 CR + 20 CR + 10 CR + 0 CR must remain 50 credits');
assert.strictEqual(chain4Cost.boxBreakdowns[3].totalCost, 0, 'Box 4 cost is 0 CR (PIN is free)');
assert.strictEqual(chain4Cost.boxBreakdowns[3].blockCount, 2, 'Box 4 has 2 blocks (Base + Secret PIN)');

console.log('✓ All bittyChain delete, reorder, block breakdown, and credit cost tests passed successfully!');

