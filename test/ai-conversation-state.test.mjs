import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bittybox-ai-state-'));
process.env.BITTYBOX_DATA_DIR = dataDir;
const store = await import('../lib/ai-proposal-store.js');

 test('assessment state persists answers, proposal selection, and resumes by owner', () => {
  const ownerId = 'user_state_1';
  const conversationId = 'conv_state_1';

  const saved = store.saveAssessmentAnswer({
    ownerId,
    conversationId,
    questionId: 'purpose',
    answer: 'Share a launch brief',
  });

  assert.equal(saved.answers.purpose, 'Share a launch brief');
  assert.equal(saved.selectedProposalId, null);
  assert.deepEqual(store.getConversationState({ ownerId, conversationId }), saved);

  const [proposal] = store.createProposals({
    ownerId,
    conversationId,
    proposals: [{
      title: 'Launch Brief',
      purpose: 'Share a launch brief',
      archetype: 'share',
      content: '# launch',
      format: 'markdown',
      editable: false,
      locks: { passwordRequired: false, expiresAt: null, maxOpens: null },
      pages: [],
    }],
  });

  const selected = store.selectProposal({ ownerId, proposalId: proposal.proposalId });
  const resumed = store.getConversationState({ ownerId, conversationId });
  assert.deepEqual(resumed.answers, { purpose: 'Share a launch brief' });
  assert.deepEqual(resumed.proposalIds, [proposal.proposalId]);
  assert.equal(resumed.selectedProposalId, selected.proposalId);
  assert.equal(resumed.status, 'active');

  assert.throws(() => store.getConversationState({ ownerId: 'other_user', conversationId }), /Conversation not found/);
});
