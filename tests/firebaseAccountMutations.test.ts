import assert from 'node:assert/strict';
import {
  deleteFirebaseTrackedBox,
  recordFirebaseTrackedBox,
} from '../src/utils/firebaseAccountMutations';

console.log('Testing server-authoritative Firebase account mutations...');

const tokenProvider = {
  async getIdToken() {
    return 'verified-firebase-id-token';
  },
};

{
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    return new Response(JSON.stringify({
      success: true,
      box: { id: 'box_server_1', title: 'Server Box', cost: 0 },
      user: { id: 'firebase-user', credits: 100, links: [{ id: 'box_server_1' }] },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await recordFirebaseTrackedBox(tokenProvider, {
    title: 'Server Box',
    url: 'https://bittybox.org/#payload',
    format: 'html',
    locks: { password: false, timeWindow: true, accessLimit: false },
    lockConfig: { timeWindow: { enabled: true, notAfter: '2026-09-01T00:00:00.000Z' } },
  }, fetchImpl);

  assert.equal(result.success, true);
  assert.equal(result.user?.id, 'firebase-user');
  assert.equal(result.box?.id, 'box_server_1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, '/api/accounts/links');
  assert.equal(calls[0].init?.method, 'POST');
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer verified-firebase-id-token');
  assert.equal(headers['Content-Type'], 'application/json');
  assert.equal('X-Session-Id' in headers, false);
  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.id, undefined, 'the server must own tracked-box identifiers');
  assert.equal(body.cost, undefined, 'the server must calculate authoritative cost');
  assert.equal(body.lockConfig.timeWindow.enabled, true);
}

{
  const fetchImpl: typeof fetch = async () => new Response(
    JSON.stringify({ success: false, error: 'Insufficient credits' }),
    { status: 402, headers: { 'Content-Type': 'application/json' } },
  );
  const result = await recordFirebaseTrackedBox(tokenProvider, {
    title: 'Rejected Box',
    url: 'https://bittybox.org/#payload',
  }, fetchImpl);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Insufficient credits');
  assert.equal(result.user, undefined);
}

{
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    return new Response(JSON.stringify({
      success: true,
      user: { id: 'firebase-user', links: [] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const result = await deleteFirebaseTrackedBox(tokenProvider, 'box /unsafe?', fetchImpl);
  assert.equal(result.success, true);
  assert.equal(result.user?.id, 'firebase-user');
  assert.equal(calls[0].input, '/api/accounts/links/box%20%2Funsafe%3F');
  assert.equal(calls[0].init?.method, 'DELETE');
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer verified-firebase-id-token');
  assert.equal('X-Session-Id' in headers, false);
}

{
  const fetchImpl: typeof fetch = async () => new Response(
    JSON.stringify({ success: false, error: 'Box not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  );
  const result = await deleteFirebaseTrackedBox(tokenProvider, 'missing', fetchImpl);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Box not found');
  assert.equal(result.user, undefined);
}

console.log('✓ Server-authoritative Firebase account mutation tests passed');
