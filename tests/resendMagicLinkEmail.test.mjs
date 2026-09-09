import assert from 'node:assert/strict';
import test from 'node:test';

const originalFetch = globalThis.fetch;
const originalFrom = process.env.RESEND_DEFAULT_FROM;
delete process.env.RESEND_DEFAULT_FROM;
const { sendMagicLinkEmail } = await import(`../lib/resend-client.js?trust-email-test=${Date.now()}`);

if (originalFrom === undefined) delete process.env.RESEND_DEFAULT_FROM;
else process.env.RESEND_DEFAULT_FROM = originalFrom;

test('magic-link email uses the fixed support identity and clearance trust cues', async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let captured;
  globalThis.fetch = async (_url, options) => {
    captured = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: 'email_test_clearance' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await sendMagicLinkEmail({
    to: 'builder@example.com',
    displayName: 'Builder',
    magicLink: 'https://bittybox.org/#/auth/verify?token=bb_magic_test',
    apiKey: 're_test_only',
  });

  assert.equal(result.success, true);
  assert.equal(captured.from, 'Bitty Box Support <support@bittybox.org>');
  assert.deepEqual(captured.reply_to, ['support@bittybox.org']);
  assert.equal(captured.subject, 'Bitty Box access clearance');
  assert.match(captured.html, /ACCESS CLEARANCE/);
  assert.match(captured.html, /EXPIRES IN 15 MINUTES/);
  assert.match(captured.html, /support@bittybox\.org/);
  assert.match(captured.html, /OPEN MY BITTY BOX/);
  assert.match(captured.text, /Expires in 15 minutes/);
  assert.match(captured.text, /Only trust sign-in links delivered from support@bittybox\.org/);
  assert.match(captured.text, /https:\/\/bittybox\.org\/#\/auth\/verify\?token=bb_magic_test/);
});

test('magic-link callers cannot override the verified support identity', async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let captured;
  globalThis.fetch = async (_url, options) => {
    captured = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: 'email_test_sender_lock' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await sendMagicLinkEmail({
    to: 'builder@example.com',
    magicLink: 'https://bittybox.org/#/auth/verify?token=bb_magic_test',
    from: 'Attacker <evil@example.com>',
    apiKey: 're_test_only',
  });

  assert.equal(result.success, true);
  assert.equal(captured.from, 'Bitty Box Support <support@bittybox.org>');
});
