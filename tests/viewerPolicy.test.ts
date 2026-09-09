import assert from 'node:assert/strict';
import test from 'node:test';
import { buildViewerCsp, buildViewerDocument } from '../v2/src/viewerPolicy.ts';

test('viewer CSP denies ambient capabilities by default', () => {
  const csp = buildViewerCsp({ javascript: true, network: [] });

  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'unsafe-inline'/);
  assert.match(csp, /style-src 'unsafe-inline'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.match(csp, /base-uri 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-src 'none'/);
  assert.match(csp, /navigate-to 'none'/);
});

test('viewer CSP only permits explicitly declared network origins', () => {
  const csp = buildViewerCsp({
    javascript: false,
    network: ['https://api.example.com', 'https://cdn.example.com/path'],
  });

  assert.match(csp, /script-src 'none'/);
  assert.match(csp, /connect-src https:\/\/api\.example\.com https:\/\/cdn\.example\.com/);
  assert.doesNotMatch(csp, /connect-src[^;]*\/path/);
  assert.throws(() => buildViewerCsp({ javascript: false, network: ['javascript:alert(1)'] }));
});

test('viewer document injects policy before capsule markup', () => {
  const document = buildViewerDocument(
    '<!doctype html><html><head><title>Hostile</title></head><body><script>top.location="https://evil.example"</script></body></html>',
    'Hostile',
    { javascript: true, network: [] },
  );

  const policyIndex = document.indexOf('Content-Security-Policy');
  const scriptIndex = document.indexOf('<script>');
  assert.ok(policyIndex >= 0);
  assert.ok(policyIndex < scriptIndex);
  assert.match(document, /form-action%20%27none%27|form-action 'none'/);
});
