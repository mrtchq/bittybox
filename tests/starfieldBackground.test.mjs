import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cssPath = new URL('../src/index.css', import.meta.url);
const componentPath = new URL('../src/components/HoloBackground.tsx', import.meta.url);
const attachmentPath = new URL('file:///root/.hermes/cache/documents/doc_475772ac083c_message.txt');

test('home background uses the supplied black three-layer starfield', async () => {
  const [css, component, attachment] = await Promise.all([
    readFile(cssPath, 'utf8'),
    readFile(componentPath, 'utf8'),
    readFile(attachmentPath, 'utf8'),
  ]);

  assert.match(component, /className="bitty-starfield fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"/);
  assert.doesNotMatch(component, /getThemeBackground|style=\{\{ background:/);
  assert.match(css, /\.bitty-starfield\s*\{[^}]*background:\s*radial-gradient\(ellipse at bottom, #000000 0%, #000000 100%\)/s);

  for (const marker of [
    '501px 811px #fff',
    '1954px 838px #fff',
    '1925px 1320px #fff',
    '314px 739px #fff',
    '200px 981px #fff',
    '287px 1272px #fff',
  ]) {
    assert.ok(attachment.includes(marker), `attachment is missing expected marker: ${marker}`);
    assert.ok(css.includes(marker), `deployed stylesheet source is missing supplied marker: ${marker}`);
  }

  assert.match(css, /#stars\s*\{[^}]*animation:\s*animStar 50s linear infinite/s);
  assert.match(css, /#stars2\s*\{[^}]*animation:\s*animStar 100s linear infinite/s);
  assert.match(css, /#stars3\s*\{[^}]*animation:\s*animStar 150s linear infinite/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*#stars[\s\S]*animation:\s*none/);
});
