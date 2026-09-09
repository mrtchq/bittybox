import assert from 'node:assert/strict';
import test from 'node:test';
import { deflate } from 'pako';
import {
  CapsuleIntegrityError,
  CapsulePasswordRequiredError,
  CapsuleSizeLimitError,
  buildCapsuleChain,
  createCapsule,
  decodeCapsuleUrl,
  encodeCapsuleUrl,
  verifyCapsule,
} from '../v2/src/capsuleCore.ts';

const fixture = {
  title: '  Tiny Unicode Box  ',
  summary: 'A portable note',
  content: '<h1>Hello, 世界 👋</h1>',
  createdAt: '2026-08-29T20:00:00.000Z',
  creatorType: 'human' as const,
};

test('v2 capsule has a deterministic integrity hash and detects tampering', async () => {
  const capsuleA = await createCapsule(fixture);
  const capsuleB = await createCapsule({ ...fixture });

  assert.equal(capsuleA.schema, 'https://bittybox.org/schemas/capsule-v2.json');
  assert.equal(capsuleA.version, 2);
  assert.equal(capsuleA.title, 'Tiny Unicode Box');
  assert.equal(capsuleA.integrity.contentHash, capsuleB.integrity.contentHash);
  assert.equal(await verifyCapsule(capsuleA), true);

  const tampered = structuredClone(capsuleA);
  tampered.content.payload = '<h1>Changed</h1>';
  assert.equal(await verifyCapsule(tampered), false);
});

test('v2 capsule round-trips Unicode through a URL fragment', async () => {
  const capsule = await createCapsule(fixture);
  const url = await encodeCapsuleUrl(capsule, {
    origin: 'https://bittybox.org',
    basePath: '/lab/v2/',
  });

  assert.match(url, /^https:\/\/bittybox\.org\/lab\/v2\/#\/bbx2\//);
  const decoded = await decodeCapsuleUrl(url);
  assert.equal(decoded.content.payload, fixture.content);
  assert.equal(decoded.integrity.contentHash, capsule.integrity.contentHash);
});

test('encrypted v2 capsule requires the correct password', async () => {
  const capsule = await createCapsule(fixture);
  const url = await encodeCapsuleUrl(capsule, {
    origin: 'https://bittybox.org',
    basePath: '/lab/v2/',
    password: 'horse-battery-staple',
  });

  assert.match(url, /#\/bbx2e\//);
  await assert.rejects(() => decodeCapsuleUrl(url), CapsulePasswordRequiredError);
  await assert.rejects(() => decodeCapsuleUrl(url, { password: 'wrong-password' }));
  const decoded = await decodeCapsuleUrl(url, { password: 'horse-battery-staple' });
  assert.equal(decoded.content.payload, fixture.content);
});

test('tampered encoded payload fails closed', async () => {
  const capsule = await createCapsule(fixture);
  const url = await encodeCapsuleUrl(capsule, {
    origin: 'https://bittybox.org',
    basePath: '/lab/v2/',
  });
  const tamperedUrl = `${url.slice(0, -2)}AA`;
  await assert.rejects(() => decodeCapsuleUrl(tamperedUrl));

  const internallyTampered = structuredClone(capsule);
  internallyTampered.content.payload = 'not what was sealed';
  await assert.rejects(
    async () => {
      const dirty = await encodeCapsuleUrl(internallyTampered, {
        origin: 'https://bittybox.org',
        basePath: '/lab/v2/',
        allowInvalidIntegrityForTest: true,
      });
      await decodeCapsuleUrl(dirty);
    },
    CapsuleIntegrityError,
  );
});

test('pathological compression is stopped by the decoded-size guard', async () => {
  const bomb = deflate(new TextEncoder().encode('x'.repeat(2_000_001)), { level: 9 });
  const payload = Buffer.from(bomb).toString('base64url');
  const url = `https://bittybox.org/lab/v2/#/bbx2/${payload}`;
  await assert.rejects(() => decodeCapsuleUrl(url), CapsuleSizeLimitError);
});

test('chain URLs are generated tail-first and only point forward', async () => {
  const result = await buildCapsuleChain(
    [
      { title: 'First', content: '<h1>One</h1>' },
      { title: 'Second', content: '<h1>Two</h1>' },
      { title: 'Final', content: '<h1>Three</h1>' },
    ],
    {
      origin: 'https://bittybox.org',
      basePath: '/lab/v2/',
      createdAt: '2026-08-29T20:00:00.000Z',
      chainId: 'bbc_test_chain',
    },
  );

  assert.equal(result.urls.length, 3);
  assert.equal(result.entryUrl, result.urls[0]);

  const first = await decodeCapsuleUrl(result.urls[0]);
  const second = await decodeCapsuleUrl(result.urls[1]);
  const final = await decodeCapsuleUrl(result.urls[2]);

  assert.equal(first.chain?.index, 0);
  assert.equal(first.chain?.nextUrl, result.urls[1]);
  assert.equal(second.chain?.nextUrl, result.urls[2]);
  assert.equal(final.chain?.index, 2);
  assert.equal(final.chain?.nextUrl, null);
});

test('unknown capabilities and oversized content are rejected', async () => {
  await assert.rejects(() => createCapsule({
    ...fixture,
    capabilities: { teleport: true } as never,
  }), /Unknown capability/);

  await assert.rejects(() => createCapsule({
    ...fixture,
    content: 'x'.repeat(1_000_001),
  }), /too large/i);
});
