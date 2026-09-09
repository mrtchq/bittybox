import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../v2/phase1.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../v2/src/phase1App.ts', import.meta.url), 'utf8');

test('Phase 1 creator has one lightweight surface for content, theme, locks, mutation, payload, burn, and mystery controls', () => {
  for (const id of ['box-title', 'box-content', 'box-theme', 'lock-kind', 'mutation-action', 'payload-value', 'burn-after-reading', 'mystery-box', 'seal-box']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="phase1-gallery"/);
  assert.match(source, /createPhaseOneBox/);
  assert.match(source, /encodePhaseOneUrl/);
  assert.match(source, /generateMysteryBox/);
});

test('Phase 1 visitor updates URL-native visitor state, renders locked and burned feedback, and respects reduced motion', () => {
  assert.match(source, /history\.replaceState/);
  assert.match(source, /unlockWithMagicWord/);
  assert.match(source, /submitPuzzle/);
  assert.match(source, /status === 'burned'/);
  assert.match(source, /prefers-reduced-motion/);
});
