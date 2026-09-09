import test from 'node:test';
import assert from 'node:assert/strict';
import { executeApprovedProposal } from '../lib/ai-live-executor.js';

test('rejects live creation without explicit approval and idempotency key', async () => {
  await assert.rejects(
    executeApprovedProposal({
      ownerId: 'user_1',
      proposal: { proposalId: 'draft_1', status: 'draft' },
      idempotencyKey: '',
      deps: {},
    }),
    (error) => error.code === 'APPROVAL_REQUIRED'
  );
});

test('creates once, recalculates authoritative cost, and replays idempotently', async () => {
  const calls = { render: 0, debit: 0, record: 0 };
  const replayJournal = new Map();
  const deps = {
    replayStore: {
      get: async (key) => replayJournal.get(key) || null,
      set: async (key, value) => replayJournal.set(key, value),
    },
    calculateCost: (input) => {
      assert.equal(input.title, 'Launch Brief');
      return 20;
    },
    requireCredits: async (_ownerId, amount) => assert.equal(amount, 20),
    render: async (input) => {
      calls.render += 1;
      assert.equal(input.content, '# launch');
      return { url: 'https://bittybox.org/#live', title: input.title, format: 'markdown' };
    },
    debit: async (_ownerId, amount, category, reference) => {
      calls.debit += 1;
      assert.deepEqual([amount, category], [20, 'ai']);
      assert.match(reference, /Launch Brief/);
      return { success: true };
    },
    record: (_ownerId, result) => {
      calls.record += 1;
      return { id: 'bb_link_1', ...result };
    },
  };
  const proposal = {
    proposalId: 'draft_1',
    status: 'approved',
    title: 'Launch Brief',
    purpose: 'Share the brief',
    archetype: 'share',
    content: '# launch',
    format: 'markdown',
    editable: false,
    locks: { passwordRequired: false, expiresAt: null, maxOpens: null },
    pages: [],
  };

  const first = await executeApprovedProposal({ ownerId: 'user_1', proposal, idempotencyKey: 'idem_001', deps });
  const replay = await executeApprovedProposal({ ownerId: 'user_1', proposal, idempotencyKey: 'idem_001', deps });

  assert.deepEqual(replay, first);
  assert.equal(calls.render, 1);
  assert.equal(calls.debit, 1);
  assert.equal(calls.record, 1);
  assert.equal(first.cost, 20);
});
