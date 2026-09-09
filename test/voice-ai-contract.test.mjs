import test from 'node:test';
import assert from 'node:assert/strict';
import { getRealtimeAgentTools, buildRealtimeInstructions } from '../lib/voice-ai.js';

test('Realtime voice contract exposes the shared safe action registry and account context', () => {
  const tools = getRealtimeAgentTools();
  assert.ok(tools.length >= 8);
  assert.ok(tools.some((tool) => tool.name === 'bittybox.proposals.compare'));
  assert.ok(tools.some((tool) => tool.name === 'bittybox.box.create_from_proposal'));
  assert.ok(tools.every((tool) => tool.type === 'function'));
  assert.equal(tools.find((tool) => tool.name === 'bittybox.box.create_from_proposal').approval, 'explicit_user_confirmation');

  const instructions = buildRealtimeInstructions({
    id: 'user_1', displayName: 'Thierry', tier: 'PRO', credits: 12, links: [],
  }, 'conv_voice_1');
  assert.match(instructions, /conv_voice_1/);
  assert.match(instructions, /explicit confirmation/);
  assert.match(instructions, /creditsAvailable/);
  assert.doesNotMatch(instructions, /user_1/);
});
