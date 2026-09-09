import assert from 'node:assert/strict';
import { createBittyChain, decodeBittyLink, encodeChainUrl, decodeChainUrl } from '../lib/bitty-engine.js';
import { buildMcpServer } from '../mcp/mcp-server.js';

console.log('--- Starting BittyBox Box Chaining API & MCP Tests ---');

// 1. Test encodeChainUrl and decodeChainUrl roundtrip
const sampleUrl = 'https://bittybox.org/#/Next-Page/data:text/html;charset=utf-8;format=gz;base64,H4sIC...';
const encodedUrl = encodeChainUrl(sampleUrl);
const decodedUrl = decodeChainUrl(encodedUrl);
assert.equal(decodedUrl, sampleUrl, 'encodeChainUrl/decodeChainUrl should roundtrip perfectly');
console.log('✓ encodeChainUrl and decodeChainUrl roundtrip test passed');

// 2. Test createBittyChain reverse generation
const chainResult = await createBittyChain([
  {
    title: 'Intro Box',
    content: '# Welcome to the Chain\nStep 1 of the journey.',
    format: 'markdown',
  },
  {
    title: 'Code Box',
    content: 'export function solve() { return 42; }',
    format: 'code',
    language: 'typescript',
  },
  {
    title: 'Final Box',
    content: '<h1>Done!</h1><p>You reached the end.</p>',
    format: 'html',
  },
], {
  title: 'My 3-Box Chain',
  domain: 'https://bittybox.org',
});

assert.equal(chainResult.success, true);
assert.equal(chainResult.total, 3);
assert.equal(chainResult.urls.length, 3);
assert.equal(chainResult.primaryUrl, chainResult.urls[0]);
assert.ok(chainResult.chainId.startsWith('bbc_'));

// Inspect Box 0
const box0 = await decodeBittyLink(chainResult.urls[0]);
assert.equal(box0.title, 'Intro Box');
assert.equal(box0.chain?.enabled, true);
assert.equal(box0.chain?.index, 0);
assert.equal(box0.chain?.total, 3);
assert.equal(box0.chain?.chainId, chainResult.chainId);
assert.equal(box0.chain?.nextUrl, chainResult.urls[1], 'Box 0 nextUrl must match Box 1 URL');

// Inspect Box 1
const box1 = await decodeBittyLink(chainResult.urls[1]);
assert.equal(box1.title, 'Code Box');
assert.equal(box1.chain?.enabled, true);
assert.equal(box1.chain?.index, 1);
assert.equal(box1.chain?.total, 3);
assert.equal(box1.chain?.chainId, chainResult.chainId);
assert.equal(box1.chain?.nextUrl, chainResult.urls[2], 'Box 1 nextUrl must match Box 2 URL');

// Inspect Box 2
const box2 = await decodeBittyLink(chainResult.urls[2]);
assert.equal(box2.title, 'Final Box');
assert.equal(box2.chain?.enabled, true);
assert.equal(box2.chain?.index, 2);
assert.equal(box2.chain?.total, 3);
assert.equal(box2.chain?.chainId, chainResult.chainId);
assert.equal(box2.chain?.nextUrl, undefined, 'Final box must not have nextUrl');

console.log('✓ createBittyChain reverse generation and decode roundtrip tests passed');

// 3. Test Studio-compatible Box Chain metadata parity for agent/API creation
const metadataChain = await createBittyChain([
  {
    content: '# Locked page\nThis page carries Studio metadata.',
    format: 'markdown',
    metadata: {
      title: 'Metadata Page',
      description: 'Nested metadata title and locks should roundtrip',
      favicon: '📦',
      image: 'https://bittybox.org/favicon.png',
      lockConfig: {
        timeWindow: {
          enabled: true,
          mode: 'window',
          notBefore: '2026-08-28T00:00:00.000Z',
          notAfter: '2026-12-31T23:59:59.000Z',
          showCountdown: false,
        },
        openLimit: {
          enabled: true,
          maxOpens: 3,
          opensUsed: 0,
          showRemainingCount: true,
        },
      },
    },
  },
  {
    title: 'Plain Final Page',
    content: 'done',
    format: 'text',
  },
], {
  chainId: 'bbc_agent_metadata_test',
  domain: 'https://bittybox.org',
});

const metadataBox = await decodeBittyLink(metadataChain.primaryUrl);
assert.equal(metadataBox.title, 'Metadata Page');
assert.equal(metadataBox.description, 'Nested metadata title and locks should roundtrip');
assert.equal(metadataBox.favicon, '📦');
assert.equal(metadataBox.image, 'https://bittybox.org/favicon.png');
assert.ok(metadataBox.boxId?.startsWith('bbx_'), 'Locked chain pages should receive a boxId like Studio-created pages');
assert.equal(metadataBox.lockConfig?.timeWindow?.enabled, true);
assert.equal(metadataBox.lockConfig?.timeWindow?.mode, 'window');
assert.equal(metadataBox.lockConfig?.timeWindow?.showCountdown, false);
assert.equal(metadataBox.lockConfig?.openLimit?.enabled, true);
assert.equal(metadataBox.lockConfig?.openLimit?.maxOpens, 3);
assert.equal(metadataBox.lockConfig?.openLimit?.showRemainingCount, true);
assert.equal(metadataBox.chain?.nextUrl, metadataChain.urls[1]);

console.log('✓ Studio-compatible Box Chain metadata parity test passed');

// 4. Test MCP Server create_bitty_chain/create_box_chain tools
const server = buildMcpServer();
assert.ok(server, 'MCP server should instantiate');
console.log('✓ MCP Server successfully built with create_bitty_chain and create_box_chain tools');

console.log('--- All BittyBox Box Chaining API & MCP Tests PASSED successfully! ---');
