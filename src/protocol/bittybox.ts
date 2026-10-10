/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitty Box - AI-First Micro-Web Protocol
 * URL-Native Micro-Sites, Scheduled Capsules, and Agentic Chains
 */

import { deflate, inflate } from 'pako';

export type BittyThemeId = 'obsidian-gold' | 'cyber-amber' | 'stealth-dark' | 'solarized-amber' | 'pure-obsidian';
export type BittyLayout = 'document' | 'card' | 'terminal' | 'interactive' | 'dashboard';

export interface BittyMetadata {
  title: string;
  authorAgent?: string;
  version?: string;
  created?: string;
  contentType?: string;
  tags?: string[];
  workflowId?: string;
  stepIndex?: number;
  [key: string]: any;
}

export interface MicroSiteData {
  id: string;
  title: string;
  content: string; // Markdown / HTML / Plain text
  theme: BittyThemeId;
  layout: BittyLayout;
  metadata?: BittyMetadata;
  widgets?: Array<{
    type: 'counter' | 'status-grid' | 'action-button' | 'event-emitter' | 'form-input';
    label: string;
    value?: string | number;
    action?: string;
  }>;
  customJs?: string;
  customCss?: string;
}

export interface CapsuleData {
  id: string;
  title: string;
  microSite: MicroSiteData;
  unlockTime?: string; // ISO 8601 string
  password?: string;
  eventTrigger?: string;
  preUnlockMessage?: string;
  unlockedPayloadNotice?: string;
  authorAgent?: string;
  created: string;
}

export interface ChainChoice {
  id: string;
  label: string;
  description?: string;
  targetNodeId: string;
  condition?: string;
  agentPayload?: Record<string, any>;
}

export interface ChainNode {
  id: string;
  title: string;
  content: string;
  theme: BittyThemeId;
  layout: BittyLayout;
  choices: ChainChoice[];
  metadata?: Record<string, any>;
}

export interface ChainData {
  id: string;
  title: string;
  authorAgent?: string;
  rootNodeId: string;
  nodes: Record<string, ChainNode>;
  created: string;
  workflowState?: Record<string, any>;
}

export const GZIP_MARKER = 'gz';
export const BASE64_MARKER = 'base64';

// Helper: safe Base64 URL conversion
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  // Normalize base64 URL safe characters if needed
  let normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4 !== 0) {
    normalized += '=';
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// AES-GCM encryption using Web Crypto
export async function encryptPayload(data: Uint8Array, passcode: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const pwUtf8 = enc.encode(passcode);
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', pwHash, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data as any);
  
  // Combine IV (12 bytes) + encrypted bytes
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return combined;
}

// AES-GCM decryption using Web Crypto
export async function decryptPayload(combined: Uint8Array, passcode: string): Promise<Uint8Array> {
  if (combined.byteLength < 12) throw new Error('Invalid encrypted payload length');
  const enc = new TextEncoder();
  const pwUtf8 = enc.encode(passcode);
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await crypto.subtle.importKey('raw', pwHash, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data as any);
  return new Uint8Array(decrypted);
}

// Deflate compression via pako
export function compressString(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  return deflate(bytes, { level: 9 });
}

// Deflate decompression via pako
export function decompressBytes(bytes: Uint8Array): string {
  const inflated = inflate(bytes);
  return new TextDecoder().decode(inflated);
}

// Pretty component encoder for title in URL fragment
export function encodePrettyTitle(title: string): string {
  if (!title) return '';
  return encodeURIComponent(title.trim().replace(/\s+/g, '_').replace(/[^\w\-_]/g, ''));
}

export function decodePrettyTitle(encoded: string): string {
  if (!encoded) return '';
  return decodeURIComponent(encoded).replace(/_/g, ' ');
}

/**
 * Encodes complete HTML content into a Bitty Box URL fragment
 */
export function encodeHtmlToBittyUrl(html: string, title: string = 'bitty_box', baseUrl: string = ''): string {
  const compressed = compressString(html);
  const base64 = uint8ArrayToBase64(compressed);
  const prettyTitle = encodePrettyTitle(title) || 'bitty_box';
  const prefix = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  // Bitty Box standard format: #{prettyTitle}/data:text/html;charset=utf-8;format=gz;base64,{data}
  return `${prefix}/#${prettyTitle}/data:text/html;charset=utf-8;format=gz;base64,${base64}`;
}

/**
 * Encodes structured JSON data into a Bitty Box URL fragment
 */
export function encodeDataToBittyUrl(payload: Record<string, any>, title: string = 'bitty_box', baseUrl: string = ''): string {
  const jsonStr = JSON.stringify(payload);
  const compressed = compressString(jsonStr);
  const base64 = uint8ArrayToBase64(compressed);
  const prettyTitle = encodePrettyTitle(title) || 'bitty_box';
  const prefix = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  return `${prefix}/#${prettyTitle}/data:application/json;charset=utf-8;format=gz;base64,${base64}`;
}

/**
 * Decodes any Bitty Box URL (or raw data URL) into its raw payload
 */
export async function decodeBittyUrl(rawUrl: string, passwordPrompt?: (title: string) => Promise<string | null>): Promise<{
  title: string;
  mimeType: string;
  format?: string;
  content: string;
  jsonData?: any;
  isEncrypted?: boolean;
}> {
  let fragment = '';
  if (rawUrl.includes('#')) {
    fragment = rawUrl.substring(rawUrl.indexOf('#') + 1);
  } else if (rawUrl.startsWith('data:')) {
    fragment = rawUrl;
  } else {
    fragment = rawUrl;
  }

  let title = 'Bitty Box';
  let dataUrlPart = fragment;

  if (fragment.includes('/data:')) {
    const slashIdx = fragment.indexOf('/');
    title = decodePrettyTitle(fragment.substring(0, slashIdx)) || 'Bitty Box';
    dataUrlPart = fragment.substring(slashIdx + 1);
  } else if (fragment.startsWith('/')) {
    dataUrlPart = fragment.substring(1);
  }

  // Parse data URL components
  // Format: data:[<mediatype>][;<param>=<val>]*;base64,<data>
  const match = dataUrlPart.match(/^data:(?:([^;,]+))?((?:;[^;,=]+=[^;,=]+)*)?(?:;([^,]+))?,(.*)$/);

  if (!match) {
    // If not standard data URL, try fallback raw base64 or direct decompression
    try {
      const rawBytes = base64ToUint8Array(dataUrlPart);
      const text = decompressBytes(rawBytes);
      return {
        title,
        mimeType: 'text/html',
        content: text,
      };
    } catch {
      return {
        title,
        mimeType: 'text/plain',
        content: dataUrlPart,
      };
    }
  }

  const mimeType = match[1] || 'text/html';
  const paramsStr = match[2] || '';
  const encoding = match[3] || 'base64';
  const rawData = match[4] || '';

  const params: Record<string, string> = {};
  if (paramsStr) {
    paramsStr.split(';').filter(Boolean).forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) params[k.trim()] = v ? v.trim() : '';
    });
  }

  const format = params.format || 'gz';
  const cipher = params.cipher;

  let bytes = encoding === 'base64' ? base64ToUint8Array(rawData) : new TextEncoder().encode(decodeURIComponent(rawData));

  if (cipher && passwordPrompt) {
    const password = await passwordPrompt(title);
    if (!password) {
      return {
        title,
        mimeType,
        format,
        content: '<!-- ENCRYPTED_BITTY_BOX_PAYLOAD -->',
        isEncrypted: true,
      };
    }
    bytes = await decryptPayload(bytes, password);
  }

  let content = '';
  if (format === 'gz' || format === 'deflate') {
    content = decompressBytes(bytes);
  } else {
    content = new TextDecoder().decode(bytes);
  }

  let jsonData: any = null;
  if (mimeType.includes('json') || content.trim().startsWith('{')) {
    try {
      jsonData = JSON.parse(content);
    } catch {
      // not JSON
    }
  }

  return {
    title,
    mimeType,
    format,
    content,
    jsonData,
  };
}

/**
 * Generate theme CSS styles embedded directly inside micro-sites
 */
export function getThemeStyles(theme: BittyThemeId): string {
  switch (theme) {
    case 'cyber-amber':
      return `
        :root {
          --bg-primary: #0A0D12;
          --bg-surface: #121820;
          --bg-surface-elevated: #1B232E;
          --text-primary: #F3F4F6;
          --text-secondary: #9CA3AF;
          --text-muted: #6B7280;
          --accent-primary: #F59E0B;
          --accent-glow: rgba(245, 158, 11, 0.25);
          --accent-border: #D97706;
          --border-color: #2D3748;
          --font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
      `;
    case 'stealth-dark':
      return `
        :root {
          --bg-primary: #050505;
          --bg-surface: #111111;
          --bg-surface-elevated: #1C1C1C;
          --text-primary: #EDEDED;
          --text-secondary: #A0A0A0;
          --text-muted: #555555;
          --accent-primary: #E5B869;
          --accent-glow: rgba(229, 184, 105, 0.2);
          --accent-border: #B38F46;
          --border-color: #262626;
          --font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
      `;
    case 'solarized-amber':
      return `
        :root {
          --bg-primary: #001B24;
          --bg-surface: #072A35;
          --bg-surface-elevated: #0C3846;
          --text-primary: #93A1A1;
          --text-secondary: #586E75;
          --text-muted: #073642;
          --accent-primary: #B58900;
          --accent-glow: rgba(181, 137, 0, 0.3);
          --accent-border: #856500;
          --border-color: #073642;
          --font-family: system-ui, sans-serif;
        }
      `;
    case 'pure-obsidian':
      return `
        :root {
          --bg-primary: #000000;
          --bg-surface: #0A0A0A;
          --bg-surface-elevated: #141414;
          --text-primary: #FFFFFF;
          --text-secondary: #888888;
          --text-muted: #444444;
          --accent-primary: #E6C200;
          --accent-glow: rgba(230, 194, 0, 0.2);
          --accent-border: #C4A400;
          --border-color: #1F1F1F;
          --font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
      `;
    case 'obsidian-gold':
    default:
      return `
        :root {
          --bg-primary: #0A0A0B;
          --bg-surface: #141417;
          --bg-surface-elevated: #1E1E24;
          --text-primary: #F8F8F8;
          --text-secondary: #A3A3A8;
          --text-muted: #64646E;
          --accent-primary: #D4AF37;
          --accent-glow: rgba(212, 175, 55, 0.25);
          --accent-border: #B89628;
          --border-color: #27272F;
          --font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
      `;
  }
}

/**
 * Compiles a self-contained MicroSite into pristine HTML
 */
export function compileMicroSiteHTML(site: MicroSiteData): string {
  const themeStyles = getThemeStyles(site.theme);
  const metadata = site.metadata || { title: site.title };
  const author = metadata.authorAgent || 'autonomous-agent';
  const version = metadata.version || 'v1.0';
  const createdDate = metadata.created || new Date().toISOString().split('T')[0];

  const widgetsHtml = (site.widgets || []).map((w, idx) => {
    if (w.type === 'counter') {
      return `
        <div class="bitty-widget" data-type="counter" id="widget-${idx}">
          <div class="bitty-widget-header">
            <span class="bitty-label">${escapeHtml(w.label)}</span>
            <span class="bitty-counter-val" id="counter-val-${idx}">${w.value ?? 0}</span>
          </div>
          <div class="bitty-widget-actions">
            <button class="bitty-btn bitty-btn-sm" onclick="incrementCounter(${idx}, -1)">-1</button>
            <button class="bitty-btn bitty-btn-sm" onclick="incrementCounter(${idx}, 1)">+1</button>
          </div>
        </div>
      `;
    }
    if (w.type === 'status-grid') {
      return `
        <div class="bitty-widget" data-type="status-grid">
          <div class="bitty-label">${escapeHtml(w.label)}</div>
          <div class="bitty-status-row">
            <span class="bitty-status-dot bitty-status-active"></span>
            <span class="bitty-status-text">${escapeHtml(String(w.value || 'ONLINE'))}</span>
          </div>
        </div>
      `;
    }
    if (w.type === 'action-button') {
      return `
        <div class="bitty-widget" data-type="action-button">
          <button class="bitty-btn bitty-btn-primary" onclick="triggerAction('${escapeHtml(w.action || '')}')">${escapeHtml(w.label)}</button>
        </div>
      `;
    }
    if (w.type === 'event-emitter') {
      return `
        <div class="bitty-widget" data-type="event-emitter">
          <button class="bitty-btn bitty-btn-accent" onclick="emitBittyEvent('${escapeHtml(w.action || 'agent_ping')}')">
            📡 Emit: ${escapeHtml(w.label)}
          </button>
        </div>
      `;
    }
    return ``;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(site.title)} · Bitty Box</title>
  <style>
    ${themeStyles}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-family);
      line-height: 1.6;
      padding: 24px 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    .bitty-container {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 28px 24px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }
    .bitty-header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .bitty-meta-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .bitty-meta-item { display: inline-flex; align-items: center; gap: 4px; }
    .bitty-dot { opacity: 0.6; }
    .bitty-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--accent-primary);
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .bitty-body {
      color: var(--text-primary);
      font-size: 15px;
      margin-bottom: 24px;
    }
    .bitty-body p { margin-bottom: 14px; }
    .bitty-body h2 { font-size: 18px; color: var(--accent-primary); margin: 20px 0 10px; font-weight: 600; }
    .bitty-body h3 { font-size: 16px; color: var(--text-primary); margin: 16px 0 8px; font-weight: 600; }
    .bitty-body pre {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-color);
      padding: 12px 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 13px;
      color: var(--accent-primary);
      margin: 14px 0;
    }
    .bitty-body code {
      font-family: monospace;
      font-size: 13px;
      background: var(--bg-surface-elevated);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--accent-primary);
    }
    .bitty-body ul, .bitty-body ol { margin-left: 20px; margin-bottom: 14px; }
    .bitty-body li { margin-bottom: 6px; }
    .bitty-widgets-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 20px;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
    }
    .bitty-widget {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px;
    }
    .bitty-widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .bitty-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .bitty-counter-val {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent-primary);
      font-family: monospace;
    }
    .bitty-widget-actions {
      display: flex;
      gap: 8px;
    }
    .bitty-status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .bitty-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }
    .bitty-status-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: 0.05em;
    }
    .bitty-btn {
      cursor: pointer;
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-primary);
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .bitty-btn:hover {
      border-color: var(--accent-primary);
      color: var(--accent-primary);
    }
    .bitty-btn-primary {
      background: var(--accent-primary);
      color: var(--bg-primary);
      border-color: var(--accent-primary);
      font-weight: 600;
      width: 100%;
    }
    .bitty-btn-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .bitty-btn-accent {
      background: transparent;
      border: 1px solid var(--accent-primary);
      color: var(--accent-primary);
      width: 100%;
    }
    .bitty-btn-sm {
      padding: 4px 10px;
      font-size: 12px;
      flex: 1;
    }
    .bitty-footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .bitty-protocol-tag {
      color: var(--accent-primary);
      text-decoration: none;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    #event-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--accent-primary);
      color: var(--accent-primary);
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      pointer-events: none;
    }
    #event-toast.visible {
      opacity: 1;
      transform: translateY(0);
    }
    ${site.customCss || ''}
  </style>
</head>
<body>
  <div class="bitty-container">
    <header class="bitty-header">
      <div class="bitty-meta-bar">
        <span class="bitty-meta-item">AGENT: ${escapeHtml(author)}</span>
        <span class="bitty-dot">·</span>
        <span class="bitty-meta-item">${escapeHtml(version)}</span>
        <span class="bitty-dot">·</span>
        <span class="bitty-meta-item">${escapeHtml(createdDate)}</span>
        <span class="bitty-dot">·</span>
        <span class="bitty-meta-item">BITTY BOX PROTOCOL</span>
      </div>
      <h1 class="bitty-title">${escapeHtml(site.title)}</h1>
    </header>

    <main class="bitty-body">
      ${site.content}
    </main>

    ${widgetsHtml ? `<div class="bitty-widgets-container">${widgetsHtml}</div>` : ''}

    <footer class="bitty-footer">
      <span>SELF-CONTAINED URL ARTIFACT</span>
      <a href="javascript:void(0)" onclick="inspectBittyPayload()" class="bitty-protocol-tag">
        ⬡ BITTY BOX RUNTIME
      </a>
    </footer>
  </div>

  <div id="event-toast"></div>

  <script>
    function showToast(msg) {
      const t = document.getElementById('event-toast');
      t.innerText = msg;
      t.classList.add('visible');
      setTimeout(() => t.classList.remove('visible'), 2800);
    }

    function incrementCounter(idx, delta) {
      const el = document.getElementById('counter-val-' + idx);
      if (el) {
        let val = parseInt(el.innerText || '0', 10) + delta;
        el.innerText = val;
        showToast('Agent State Updated: ' + val);
        window.postMessage({ type: 'BITTY_STATE_CHANGE', widgetIndex: idx, value: val }, '*');
      }
    }

    function triggerAction(action) {
      showToast('Executing Action: ' + action);
      window.postMessage({ type: 'BITTY_ACTION_TRIGGER', action }, '*');
    }

    function emitBittyEvent(name) {
      showToast('Emitted Agent Event: ' + name);
      window.postMessage({ type: 'BITTY_AGENT_EVENT', event: name, timestamp: Date.now() }, '*');
    }

    function inspectBittyPayload() {
      showToast('URL Length: ' + window.location.href.length + ' bytes');
    }

    ${site.customJs || ''}
  </script>
</body>
</html>`;
}

/**
 * Compiles a Bitty Capsule (Agent-Scheduled Unlockable) into self-contained HTML
 */
export function compileCapsuleHTML(capsule: CapsuleData): string {
  const themeStyles = getThemeStyles(capsule.microSite.theme);
  const targetTimeIso = capsule.unlockTime || '';
  const hasPassword = Boolean(capsule.password);
  const preUnlockMsg = capsule.preUnlockMessage || 'Temporal capsule locked by autonomous agent. Standby for unlock condition.';
  const title = capsule.title || 'Scheduled Bitty Capsule';
  const author = capsule.authorAgent || 'temporal-agent';

  // Inner site HTML
  const innerHtml = compileMicroSiteHTML(capsule.microSite);
  const encodedInnerBase64 = uint8ArrayToBase64(compressString(innerHtml));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Bitty Capsule</title>
  <style>
    ${themeStyles}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-family);
      line-height: 1.6;
      padding: 24px 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .capsule-box {
      width: 100%;
      max-width: 580px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 32px 28px;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
      position: relative;
      overflow: hidden;
    }
    .capsule-glow-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
    }
    .capsule-meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: monospace;
      margin-bottom: 12px;
    }
    .capsule-icon {
      font-size: 38px;
      margin-bottom: 16px;
      display: inline-block;
      filter: drop-shadow(0 0 10px var(--accent-glow));
    }
    .capsule-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--accent-primary);
      margin-bottom: 12px;
    }
    .capsule-desc {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }
    .countdown-grid {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin: 20px 0 28px;
    }
    .countdown-unit {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 14px;
      min-width: 68px;
    }
    .countdown-num {
      font-size: 24px;
      font-weight: 700;
      color: var(--accent-primary);
      font-family: monospace;
    }
    .countdown-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 4px;
    }
    .password-panel {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .capsule-input {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      width: 200px;
      font-family: monospace;
    }
    .capsule-input:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 10px var(--accent-glow);
    }
    .capsule-btn {
      background: var(--accent-primary);
      color: var(--bg-primary);
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .capsule-btn:hover {
      filter: brightness(1.1);
      box-shadow: 0 0 14px var(--accent-glow);
    }
    .error-msg {
      color: #EF4444;
      font-size: 12px;
      margin-top: 10px;
      display: none;
    }
    #unlocked-frame {
      display: none;
      width: 100%;
      height: 100vh;
      border: none;
      position: fixed;
      top: 0;
      left: 0;
    }
  </style>
</head>
<body>
  <div class="capsule-box" id="locked-panel">
    <div class="capsule-glow-bar"></div>
    <div class="capsule-meta">
      <span>AGENT: ${escapeHtml(author)}</span>
      <span>·</span>
      <span>BITTY CAPSULE</span>
      <span>·</span>
      <span>TEMPORAL LOCK</span>
    </div>
    <div class="capsule-icon">⏳</div>
    <h1 class="capsule-title">${escapeHtml(title)}</h1>
    <p class="capsule-desc">${escapeHtml(preUnlockMsg)}</p>

    ${targetTimeIso ? `
      <div class="countdown-grid" id="countdown-wrap">
        <div class="countdown-unit"><div class="countdown-num" id="cd-days">00</div><div class="countdown-label">Days</div></div>
        <div class="countdown-unit"><div class="countdown-num" id="cd-hours">00</div><div class="countdown-label">Hours</div></div>
        <div class="countdown-unit"><div class="countdown-num" id="cd-mins">00</div><div class="countdown-label">Mins</div></div>
        <div class="countdown-unit"><div class="countdown-num" id="cd-secs">00</div><div class="countdown-label">Secs</div></div>
      </div>
    ` : ''}

    ${hasPassword ? `
      <div class="password-panel">
        <input type="password" id="pw-input" class="capsule-input" placeholder="Passcode required..." />
        <button class="capsule-btn" onclick="checkUnlock()">Unlock</button>
      </div>
      <div id="pw-error" class="error-msg">Incorrect passcode. Access denied.</div>
    ` : `
      <button class="capsule-btn" id="manual-unlock-btn" onclick="checkUnlock()">Verify & Open</button>
    `}
  </div>

  <iframe id="unlocked-frame"></iframe>

  <script>
    const TARGET_TIME = "${targetTimeIso}";
    const HAS_PASSWORD = ${hasPassword};
    const REQUIRED_PW = "${escapeHtml(capsule.password || '')}";
    const ENCODED_PAYLOAD = "${encodedInnerBase64}";

    function updateCountdown() {
      if (!TARGET_TIME) return false;
      const target = new Date(TARGET_TIME).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        const wrap = document.getElementById('countdown-wrap');
        if (wrap) wrap.innerHTML = '<div style="color:var(--accent-primary);font-weight:700;font-size:16px;">TIME CONDITION SATISFIED</div>';
        return true;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const dEl = document.getElementById('cd-days');
      const hEl = document.getElementById('cd-hours');
      const mEl = document.getElementById('cd-mins');
      const sEl = document.getElementById('cd-secs');

      if (dEl) dEl.innerText = String(days).padStart(2, '0');
      if (hEl) hEl.innerText = String(hours).padStart(2, '0');
      if (mEl) mEl.innerText = String(mins).padStart(2, '0');
      if (sEl) sEl.innerText = String(secs).padStart(2, '0');
      return false;
    }

    if (TARGET_TIME) {
      updateCountdown();
      setInterval(updateCountdown, 1000);
    }

    function checkUnlock() {
      if (TARGET_TIME) {
        const target = new Date(TARGET_TIME).getTime();
        if (Date.now() < target) {
          alert('Temporal condition not yet met! Locked until: ' + new Date(TARGET_TIME).toLocaleString());
          return;
        }
      }

      if (HAS_PASSWORD) {
        const input = document.getElementById('pw-input');
        const err = document.getElementById('pw-error');
        if (!input || input.value !== REQUIRED_PW) {
          if (err) err.style.display = 'block';
          return;
        }
      }

      // Unlocked!
      revealCapsule();
    }

    function revealCapsule() {
      document.getElementById('locked-panel').style.display = 'none';
      const frame = document.getElementById('unlocked-frame');
      frame.style.display = 'block';

      // Inflate compressed payload
      try {
        const binary = atob(ENCODED_PAYLOAD);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        
        // Use DecompressionStream if available or direct
        const blob = new Blob([bytes]);
        const stream = blob.stream().pipeThrough(new DecompressionStream("deflate"));
        new Response(stream).text().then(html => {
          frame.srcdoc = html;
        }).catch(() => {
          // Fallback if browser doesn't support stream
          frame.srcdoc = decodeURIComponent(escape(binary));
        });
      } catch (e) {
        frame.srcdoc = '<div style="color:red;padding:20px;">Failed to inflate payload: ' + e.message + '</div>';
      }

      window.postMessage({ type: 'BITTY_CAPSULE_UNLOCKED', timestamp: Date.now() }, '*');
    }
  </script>
</body>
</html>`;
}

/**
 * Compiles a Bitty Chain (Agentic Branching Logic) into self-contained HTML
 */
export function compileChainHTML(chain: ChainData): string {
  const nodesJson = JSON.stringify(chain.nodes);
  const rootNodeId = chain.rootNodeId || Object.keys(chain.nodes)[0] || '';
  const author = chain.authorAgent || 'logic-agent';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(chain.title)} · Bitty Chain</title>
  <style>
    ${getThemeStyles('obsidian-gold')}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-family);
      line-height: 1.6;
      padding: 24px 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    .chain-container {
      width: 100%;
      max-width: 680px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 28px 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      transition: all 0.25s ease;
    }
    .chain-header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .chain-meta-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-family: monospace;
      margin-bottom: 8px;
    }
    .chain-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--accent-primary);
      margin-bottom: 10px;
      font-family: monospace;
    }
    .node-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--accent-primary);
    }
    .node-body {
      font-size: 15px;
      color: var(--text-primary);
      margin-bottom: 26px;
    }
    .choices-heading {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
      font-family: monospace;
    }
    .choices-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .choice-card {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    .choice-card:hover {
      border-color: var(--accent-primary);
      box-shadow: 0 0 14px var(--accent-glow);
      transform: translateY(-1px);
    }
    .choice-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--accent-primary);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .choice-desc {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .chain-footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
      font-family: monospace;
    }
    .btn-restart {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }
    .btn-restart:hover {
      color: var(--accent-primary);
      border-color: var(--accent-primary);
    }
  </style>
</head>
<body>
  <div class="chain-container" id="chain-card">
    <div class="chain-header">
      <div class="chain-meta-bar">
        <span>AGENT: ${escapeHtml(author)}</span>
        <span>·</span>
        <span>BITTY CHAIN</span>
        <span>·</span>
        <span id="step-counter">STEP 1</span>
      </div>
      <div class="chain-breadcrumbs" id="breadcrumbs">ROOT</div>
      <h1 class="node-title" id="node-title">Loading node...</h1>
    </div>

    <div class="node-body" id="node-body"></div>

    <div id="choices-container">
      <div class="choices-heading">AGENT DECISION PATHWAY</div>
      <div class="choices-list" id="choices-list"></div>
    </div>

    <div class="chain-footer">
      <span id="state-readout">WORKFLOW ACTIVE</span>
      <button class="btn-restart" onclick="restartChain()">Restart Flow</button>
    </div>
  </div>

  <script>
    const NODES = ${nodesJson};
    const ROOT_ID = "${escapeHtml(rootNodeId)}";
    let currentNodeId = ROOT_ID;
    let historyStack = [ROOT_ID];

    function renderNode(nodeId) {
      const node = NODES[nodeId];
      if (!node) {
        document.getElementById('node-title').innerText = "End of Chain";
        document.getElementById('node-body').innerHTML = "<p>This branch has reached completion.</p>";
        document.getElementById('choices-container').style.display = 'none';
        return;
      }

      currentNodeId = nodeId;
      document.getElementById('node-title').innerText = node.title;
      document.getElementById('node-body').innerHTML = node.content;
      document.getElementById('step-counter').innerText = 'STEP ' + historyStack.length;

      // Breadcrumbs
      document.getElementById('breadcrumbs').innerText = historyStack.map(id => (NODES[id] ? NODES[id].title : id)).join(' → ');

      // Choices
      const list = document.getElementById('choices-list');
      list.innerHTML = '';
      if (!node.choices || node.choices.length === 0) {
        document.getElementById('choices-container').style.display = 'none';
        document.getElementById('state-readout').innerText = 'BRANCH TERMINUS REACHED';
      } else {
        document.getElementById('choices-container').style.display = 'block';
        node.choices.forEach(ch => {
          const div = document.createElement('div');
          div.className = 'choice-card';
          div.innerHTML = '<div class="choice-label"><span>' + escapeHtml(ch.label) + '</span><span>→</span></div>' +
                          (ch.description ? '<div class="choice-desc">' + escapeHtml(ch.description) + '</div>' : '');
          div.onclick = () => selectChoice(ch);
          list.appendChild(div);
        });
      }

      window.postMessage({ type: 'BITTY_CHAIN_NODE_ENTERED', nodeId, history: historyStack }, '*');
    }

    function selectChoice(choice) {
      historyStack.push(choice.targetNodeId);
      renderNode(choice.targetNodeId);
      window.postMessage({ type: 'BITTY_CHAIN_CHOICE_SELECTED', choice, nodeId: currentNodeId }, '*');
    }

    function restartChain() {
      historyStack = [ROOT_ID];
      renderNode(ROOT_ID);
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Initialize root node
    renderNode(ROOT_ID);
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
