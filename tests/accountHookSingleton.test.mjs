import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const carousel = fs.readFileSync(new URL('../src/components/HomeSlideCarousel.tsx', import.meta.url), 'utf8');
const firebase = fs.readFileSync(new URL('../src/lib/firebase.ts', import.meta.url), 'utf8');
const source = `${app}\n${carousel}`;
const hookInstances = source.match(/\buseAccount\(\)/g) || [];

assert.equal(
  hookInstances.length,
  1,
  'App must own the only account hook so redirect completion and auth side effects run once',
);
assert.doesNotMatch(
  carousel,
  /import\s*\{\s*useAccount\s*\}/,
  'HomeSlideCarousel must consume the App-owned account rather than create another auth listener',
);
assert.match(carousel, /account:\s*UseAccountResult/);
assert.match(app, /<HomeSlideCarousel[\s\S]*?account=\{account\}/);

const redirectStart = firebase.indexOf('export async function completeGoogleRedirectSignIn');
const redirectEnd = firebase.indexOf('/**', redirectStart + 1);
const redirectImplementation = firebase.slice(redirectStart, redirectEnd);
assert.ok(redirectStart >= 0, 'redirect completion helper must exist');
assert.doesNotMatch(
  redirectImplementation,
  /getOrCreateFirestoreUser/,
  'redirect completion must leave profile synchronization to the single auth-state listener',
);

console.log('✓ Account auth hook and redirect completion have single owners');
