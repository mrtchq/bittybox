import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPhaseOneBox,
  decodePhaseOneUrl,
  encodePhaseOneUrl,
  evaluateBox,
  generateMysteryBox,
  getIdentityTraits,
  initialVisitorState,
  submitPuzzle,
  unlockWithMagicWord,
} from '../v2/src/phase1BoxEngine.ts';

const baseInput = {
  seed: 'moon-gold-7',
  title: 'The tiny impossible box',
  content: 'The first sentence is only temporary.',
  theme: 'obsidian-gold' as const,
  payloads: [{ id: 'note', type: 'text' as const, value: 'the key is under the moon' }],
};

test('Phase 1 box and visitor state round-trip entirely through a URL fragment', () => {
  const box = createPhaseOneBox({
    ...baseInput,
    locks: [{ type: 'magic', words: ['open sesame', 'moon milk'] }],
  });
  const state = { ...initialVisitorState(), visits: 2, unlocks: 1, magicWords: ['open sesame'] };
  const url = encodePhaseOneUrl(box, state, { origin: 'https://bittybox.org', basePath: '/lab/v2/phase1.html' });

  assert.match(url, /^https:\/\/bittybox\.org\/lab\/v2\/phase1\.html#\/bbx1\//);
  assert.doesNotMatch(url, /open sesame/);
  const decoded = decodePhaseOneUrl(url);
  assert.equal(decoded.box.title, baseInput.title);
  assert.equal(decoded.state.visits, 2);
  assert.equal(decoded.state.magicWords[0], 'open sesame');
  assert.equal(decoded.box.payloads[0].value, baseInput.payloads[0].value);
});

test('mutation rules are deterministic and react to elapsed time, visits, unlocks, and creator rules', () => {
  const box = createPhaseOneBox({
    ...baseInput,
    mutations: [
      { trigger: 'afterMinutes', value: 10, action: 'replaceText', from: 'first', to: 'second' },
      { trigger: 'visits', value: 2, action: 'shiftTheme', amount: 45 },
      { trigger: 'unlocks', value: 1, action: 'appendText', text: ' It noticed you.' },
      { trigger: 'visits', value: 3, action: 'updatePayload', payloadId: 'note', payloadValue: 'the key moved' },
    ],
  });
  const state = { ...initialVisitorState(), firstSeenAt: 1_000, visits: 3, unlocks: 1 };
  const a = evaluateBox(box, state, 1_000 + 11 * 60_000);
  const b = evaluateBox(box, state, 1_000 + 11 * 60_000);

  assert.equal(a.content, 'The second sentence is only temporary. It noticed you.');
  assert.equal(a.theme.hueShift, 45);
  assert.equal(a.payloads[0].value, 'the key moved');
  assert.deepEqual(a, b);
});

test('riddle, cipher, pattern, sequence, and seeded sliding-tile puzzles validate client-side', () => {
  const kinds = [
    { puzzle: { type: 'riddle' as const, prompt: 'What gets wetter as it dries?', answer: 'towel' }, answer: 'TOWEL' },
    { puzzle: { type: 'cipher' as const, prompt: 'KHOOR', answer: 'hello' }, answer: 'hello' },
    { puzzle: { type: 'pattern' as const, prompt: '2, 4, 8, ?', answer: '16' }, answer: '16' },
    { puzzle: { type: 'sequence' as const, prompt: 'red, blue, red, ?', answer: 'blue' }, answer: 'blue' },
  ];
  for (const { puzzle, answer } of kinds) {
    const box = createPhaseOneBox({ ...baseInput, locks: [{ type: 'puzzle', puzzle }] });
    const result = submitPuzzle(box, initialVisitorState(), answer);
    assert.equal(result.unlocked, true, puzzle.type);
  }

  const tiles = createPhaseOneBox({ ...baseInput, locks: [{ type: 'puzzle', puzzle: { type: 'tiles', seed: 'nine-gold' } }] });
  const solved = submitPuzzle(tiles, initialVisitorState(), '1,2,3,4,5,6,7,8,0');
  assert.equal(solved.unlocked, true);
  assert.equal(tiles.locks[0].type, 'puzzle');
});

test('magic words are stored as an opaque cipher and update URL-native unlock state', () => {
  const box = createPhaseOneBox({ ...baseInput, locks: [{ type: 'magic', words: ['candle fox'] }] });
  const lock = box.locks[0];
  assert.equal(lock.type, 'magic');
  if (lock.type !== 'magic') throw new Error('magic lock missing');
  assert.doesNotMatch(lock.ciphertext, /candle fox/i);

  const failed = unlockWithMagicWord(box, initialVisitorState(), 'wrong');
  assert.equal(failed.unlocked, false);
  const opened = unlockWithMagicWord(box, initialVisitorState(), 'CANDLE FOX');
  assert.equal(opened.unlocked, true);
  assert.deepEqual(opened.state.magicWords, ['candle fox']);
});

test('freeze, identity, and multi-key locks only reveal when every required condition is satisfied', () => {
  const box = createPhaseOneBox({
    ...baseInput,
    locks: [
      { type: 'freeze', condition: { kind: 'visits', value: 2 } },
      { type: 'identity', traits: { device: 'desktop', timezone: 'America/New_York' } },
      { type: 'multi', mode: 'all', requirements: [{ kind: 'magic', word: 'north star' }, { kind: 'pin', pin: '4242' }] },
    ],
  });
  const before = evaluateBox(box, initialVisitorState(), Date.now(), { device: 'desktop', browser: 'chrome', timezone: 'America/New_York' });
  assert.equal(before.status, 'frozen');

  let state = { ...initialVisitorState(), visits: 2 };
  state = unlockWithMagicWord(box, state, 'north star').state;
  state.pins = ['4242'];
  const after = evaluateBox(box, state, Date.now(), { device: 'desktop', browser: 'chrome', timezone: 'America/New_York' });
  assert.equal(after.status, 'ready');
  assert.deepEqual(getIdentityTraits('Mozilla/5.0 (iPhone) Version/17.0 Safari/604.1', 'Europe/Paris'), {
    device: 'mobile', browser: 'safari', timezone: 'Europe/Paris',
  });
});

test('payloads mutate and burn mode turns the current URL state into an ash-only terminal state', () => {
  const box = createPhaseOneBox({
    ...baseInput,
    destruction: { mode: 'burnAfterReading', afterViews: 1 },
  });
  const unburned = evaluateBox(box, initialVisitorState(), Date.now());
  assert.equal(unburned.status, 'ready');
  const burned = evaluateBox(box, { ...initialVisitorState(), views: 1, burned: true }, Date.now());
  assert.equal(burned.status, 'burned');
  assert.match(burned.content, /burned|ashes/i);
  assert.equal(burned.payloads.length, 0);
});

test('mystery generation is deterministic from its seed while producing a playable configuration', () => {
  const first = generateMysteryBox('velvet-comet');
  const second = generateMysteryBox('velvet-comet');
  const other = generateMysteryBox('different-comet');

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, other);
  assert.ok(first.locks.length >= 1);
  assert.ok(first.mutations.length >= 1);
  assert.ok(first.payloads.length >= 1);
});
