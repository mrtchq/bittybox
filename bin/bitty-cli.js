#!/usr/bin/env node
import fs from 'fs';
import { createBittyLink, createBittyChain, decodeBittyLink } from '../lib/bitty-engine.js';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Bitty Box CLI - Create and decode self-contained Bitty Links

Usage:
  bitty create <content-or-file> [options]
  bitty chain <file1> <file2> ... [options]
  bitty decode <url-or-hash> [options]

Options:
  --title, -t <title>       Document title
  --format, -f <format>     Format (auto, markdown, code, html, json, svg, canvas, recipe)
  --lang, -l <language>     Programming language (for code format)
  --theme <theme>           Theme (auto, dark, light)
  --pass, -p <password>     Password to encrypt with AES-256-GCM
  --editable, -e            Generate editable link
  --json                    Output full JSON response
  --help, -h                Show this help message

Examples:
  bitty create "Hello World"
  bitty create README.md --format markdown --title "My Project"
  bitty create server.js --format code --lang javascript
  bitty chain slide1.md slide2.md slide3.md --title "Pitch Deck"
  bitty decode "https://bittybox.org/#My-Title/..."
`);
}

async function run() {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];
  const rest = args.slice(1);

  let title = '';
  let format = 'auto';
  let language = '';
  let theme = 'auto';
  let password = '';
  let editable = false;
  let outputJson = false;
  const positionalFiles = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--title' || arg === '-t') {
      title = rest[++i];
    } else if (arg === '--format' || arg === '-f') {
      format = rest[++i];
    } else if (arg === '--lang' || arg === '-l') {
      language = rest[++i];
    } else if (arg === '--theme') {
      theme = rest[++i];
    } else if (arg === '--pass' || arg === '-p') {
      password = rest[++i];
    } else if (arg === '--editable' || arg === '-e') {
      editable = true;
    } else if (arg === '--json') {
      outputJson = true;
    } else if (!arg.startsWith('-')) {
      positionalFiles.push(arg);
    }
  }

  if (command === 'create') {
    let target = positionalFiles[0];
    if (!target) {
      // Check stdin if piped
      if (!process.stdin.isTTY) {
        target = fs.readFileSync(0, 'utf-8');
      } else {
        console.error('Error: Please provide content or file to encode.');
        process.exit(1);
      }
    }

    let content = target;
    if (fs.existsSync(target)) {
      content = fs.readFileSync(target, 'utf-8');
      if (!title) title = target;
    }

    const res = await createBittyLink({
      content,
      title,
      format,
      language,
      theme,
      password,
      editable
    });

    if (outputJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`\n🔗 Bitty Link Created!`);
      console.log(`URL:    ${res.url}`);
      console.log(`Title:  ${res.title}`);
      console.log(`Format: ${res.format} (compression: ${res.stats.compressionRatio})\n`);
    }
  } else if (command === 'chain') {
    if (positionalFiles.length === 0) {
      console.error('Error: Please provide at least one file or content string for chain.');
      process.exit(1);
    }

    const pages = positionalFiles.map((fileOrContent, idx) => {
      let content = fileOrContent;
      let pageTitle = `Page ${idx + 1}`;
      if (fs.existsSync(fileOrContent)) {
        content = fs.readFileSync(fileOrContent, 'utf-8');
        pageTitle = fileOrContent;
      }
      return {
        content,
        title: pageTitle,
        format,
        language: language || undefined,
        theme
      };
    });

    const res = await createBittyChain(pages, { title: title || undefined });

    if (outputJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`\n🔗 Sequential Box Chain Created (${res.total} boxes)!`);
      console.log(`Entrypoint URL: ${res.primaryUrl}`);
      console.log(`Chain ID:       ${res.chainId}`);
      console.log('\nChained Steps:');
      res.pages.forEach((p) => {
        console.log(`  [${p.index + 1}/${res.total}] ${p.title} -> ${p.url}`);
      });
      console.log('');
    }
  } else if (command === 'decode') {
    const target = positionalFiles[0];
    if (!target) {
      console.error('Error: Please provide a Bitty URL to decode.');
      process.exit(1);
    }
    const res = await decodeBittyLink(target, { password });
    if (outputJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`\nTitle: ${res.title}`);
      if (res.chain?.enabled) {
        console.log(`Chain: Box ${(res.chain.index ?? 0) + 1} of ${res.chain.total} (Chain ID: ${res.chain.chainId})`);
        if (res.chain.nextUrl) {
          console.log(`Next URL: ${res.chain.nextUrl}`);
        }
      }
      console.log(`Format: ${res.mediatype}`);
      console.log(`Content:\n`);
      console.log(res.content);
    }
  } else {
    printUsage();
  }
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
