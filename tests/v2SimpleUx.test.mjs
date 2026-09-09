import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../v2/index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../v2/src/main.ts', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../v2/src/styles.css', import.meta.url), 'utf8');

test('v2 keeps one primary creation surface and moves secondary work into modals', () => {
  assert.match(html, /id="box-content"/);
  assert.match(html, /id="box-title"/);
  assert.match(html, /id="protect-modal"[^>]*role="dialog"/);
  assert.match(html, /id="chain-modal"[^>]*role="dialog"/);
  assert.match(html, /id="result-modal"[^>]*role="dialog"/);
  assert.doesNotMatch(html, /feature-grid|dashboard-grid|sidebar-nav/);
});

test('chained Boxes use native horizontal snap scrolling', () => {
  assert.match(html, /id="chain-track"/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /scroll-snap-align:\s*center/);
  assert.match(source, /scrollIntoView\(\{\s*behavior:\s*reducedMotion\(\)\s*\?\s*'auto'\s*:\s*'smooth'/s);
});

test('generation is owned by the final Box and opens without replacing the builder', () => {
  assert.match(html, /data-generate-owner="final-box"/);
  assert.match(source, /activeIndex !== boxes\.length - 1/);
  assert.match(source, /window\.open\('about:blank', '_blank'/);
  assert.doesNotMatch(source, /window\.location\s*=/);
});

test('the UI has explicit reduced-motion and keyboard modal behavior', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(html, /aria-live="polite"/);
});
