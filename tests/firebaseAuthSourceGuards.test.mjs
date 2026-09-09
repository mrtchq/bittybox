import assert from 'node:assert/strict';
import fs from 'node:fs';

const firebase = fs.readFileSync(new URL('../src/lib/firebase.ts', import.meta.url), 'utf8');
const account = fs.readFileSync(new URL('../src/hooks/useAccount.ts', import.meta.url), 'utf8');

const signOutStart = firebase.indexOf('export async function signOutFirebase');
const signOutEnd = firebase.indexOf('/**', signOutStart + 1);
const signOutBody = firebase.slice(signOutStart, signOutEnd);
assert.ok(signOutStart >= 0);
assert.doesNotMatch(
  signOutBody,
  /catch\s*\([^)]*\)\s*\{[\s\S]*?console\.error[\s\S]*?\}/,
  'Firebase sign-out must reject instead of logging and pretending success',
);

const logoutStart = account.indexOf('const logout = async');
const logoutEnd = account.indexOf('const refreshUser', logoutStart);
const logoutBody = account.slice(logoutStart, logoutEnd);
assert.ok(logoutStart >= 0);
assert.doesNotMatch(
  logoutBody,
  /await signOutFirebase\(\);\s*\n\s*\}\s*catch\s*\{\}/,
  'account logout must not suppress Firebase sign-out failure',
);

assert.match(account, /authGeneration/);
assert.match(account, /unsubscribeFirestore\?\.\(\)|if \(unsubscribeFirestore\)/);
assert.match(account, /shouldLoadLegacyProfile/);

console.log('✓ Logout, redirect, and auth-generation source guards passed');
