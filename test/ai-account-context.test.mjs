import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAccountContext } from '../lib/ai-action-registry.js';

test('buildAccountContext requires verified identity and exposes minimized account data', () => {
  assert.throws(() => buildAccountContext({ credits: 4 }), /verified authenticated user/);

  const context = buildAccountContext({
    id: 'user_1',
    displayName: '  Thierry  ',
    tier: 'PRO',
    credits: -4,
    links: Array.from({ length: 12 }, (_, index) => ({
      id: `box_${index}`,
      title: `Box ${index}`,
      content: 'private payload must not leak',
      secret: 'must not leak',
    })),
  }, {
    recentBoxes: Array.from({ length: 12 }, (_, index) => ({
      id: `box_${index}`,
      title: `Box ${index}`,
      content: 'private payload must not leak',
      metadata: { format: 'markdown', secret: 'must not leak' },
    })),
    templates: [{ id: 'share', label: 'Share Box', description: 'A safe template' }],
  });

  assert.deepEqual(context.account, {
    displayName: 'Thierry',
    tier: 'PRO',
    creditsAvailable: 0,
    recentBoxCount: 12,
  });
  assert.equal(context.recentBoxes.length, 10);
  assert.deepEqual(context.recentBoxes[0], {
    id: 'box_0', title: 'Box 0', format: 'markdown', createdAt: '',
  });
  assert.equal(JSON.stringify(context).includes('private payload'), false);
  assert.equal(JSON.stringify(context).includes('must not leak'), false);
  assert.equal(context.templates[0].id, 'share');
});
