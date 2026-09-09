#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildMcpServer } from '../mcp/mcp-server.js';

async function main() {
  const server = buildMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we don't pollute stdio protocol messages
  console.error('[bitty-mcp] Bitty Box Model Context Protocol (MCP) server running via stdio');
}

main().catch((err) => {
  console.error('[bitty-mcp] Fatal error:', err);
  process.exit(1);
});
