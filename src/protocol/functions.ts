/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitty Box - Atomic Function Call API
 * Structured primitives callable by autonomous AI agents, MCP server, and SDKs
 */

import QRCode from 'qrcode';
import {
  MicroSiteData,
  CapsuleData,
  ChainData,
  ChainNode,
  BittyThemeId,
  BittyLayout,
  compileMicroSiteHTML,
  compileCapsuleHTML,
  compileChainHTML,
  encodeHtmlToBittyUrl,
  decodeBittyUrl,
} from './bittybox';

export interface BittyFunctionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  audit: {
    functionName: string;
    timestamp: string;
    bytesProduced?: number;
    url?: string;
  };
}

/**
 * In-memory registry of active agent events & state for inter-agent communication
 */
export interface AgentEventMessage {
  id: string;
  senderAgent: string;
  eventType: 'unlock' | 'branch_chosen' | 'qr_scanned' | 'site_updated' | 'ping' | 'workflow_trigger';
  payload: Record<string, any>;
  timestamp: string;
}

const GLOBAL_EVENT_STORE: AgentEventMessage[] = [];

/**
 * 1. create_micro_site(content, theme, layout)
 */
export function create_micro_site(params: {
  title?: string;
  content: string;
  theme?: BittyThemeId;
  layout?: BittyLayout;
  metadata?: Record<string, any>;
  authorAgent?: string;
  widgets?: MicroSiteData['widgets'];
}): BittyFunctionResult<MicroSiteData> {
  try {
    const id = 'micro_' + Math.random().toString(36).substring(2, 9);
    const site: MicroSiteData = {
      id,
      title: params.title || 'Agent Output Artifact',
      content: params.content,
      theme: params.theme || 'obsidian-gold',
      layout: params.layout || 'document',
      metadata: {
        title: params.title || 'Agent Output Artifact',
        authorAgent: params.authorAgent || 'autonomous-agent',
        version: 'v1.0',
        created: new Date().toISOString(),
        ...(params.metadata || {}),
      },
      widgets: params.widgets || [],
    };

    return {
      success: true,
      data: site,
      audit: {
        functionName: 'create_micro_site',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'create_micro_site', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 2. encode_site_to_url(site, baseUrl)
 */
export function encode_site_to_url(params: {
  site: MicroSiteData;
  baseUrl?: string;
}): BittyFunctionResult<{ url: string; byteLength: number; compressionRatio: string }> {
  try {
    const html = compileMicroSiteHTML(params.site);
    const url = encodeHtmlToBittyUrl(html, params.site.title, params.baseUrl || '');
    const originalBytes = new TextEncoder().encode(html).length;
    const compressedBytes = url.length;
    const ratio = Math.round((1 - compressedBytes / originalBytes) * 100);

    return {
      success: true,
      data: {
        url,
        byteLength: compressedBytes,
        compressionRatio: ratio > 0 ? `${ratio}% compressed` : 'compact',
      },
      audit: {
        functionName: 'encode_site_to_url',
        timestamp: new Date().toISOString(),
        bytesProduced: compressedBytes,
        url,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'encode_site_to_url', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 3. update_micro_site(url, new_content, metadataUpdates)
 */
export async function update_micro_site(params: {
  url: string;
  new_content: string;
  title?: string;
  theme?: BittyThemeId;
  baseUrl?: string;
}): Promise<BittyFunctionResult<{ url: string; byteLength: number }>> {
  try {
    const decoded = await decodeBittyUrl(params.url);
    const site: MicroSiteData = {
      id: 'micro_upd_' + Math.random().toString(36).substring(2, 7),
      title: params.title || decoded.title || 'Updated Artifact',
      content: params.new_content,
      theme: params.theme || 'obsidian-gold',
      layout: 'document',
      metadata: {
        title: params.title || decoded.title,
        updated: new Date().toISOString(),
      },
    };

    const compiledHtml = compileMicroSiteHTML(site);
    const updatedUrl = encodeHtmlToBittyUrl(compiledHtml, site.title, params.baseUrl || '');

    // Record audit event
    notify_agent({
      senderAgent: 'bitty-core-updater',
      eventType: 'site_updated',
      payload: { oldUrlLength: params.url.length, newUrlLength: updatedUrl.length },
    });

    return {
      success: true,
      data: {
        url: updatedUrl,
        byteLength: updatedUrl.length,
      },
      audit: {
        functionName: 'update_micro_site',
        timestamp: new Date().toISOString(),
        url: updatedUrl,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'update_micro_site', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 4. create_capsule(url, unlock_time, conditions)
 */
export async function create_capsule(params: {
  url?: string;
  site?: MicroSiteData;
  title?: string;
  unlock_time?: string; // ISO 8601
  password?: string;
  eventTrigger?: string;
  preUnlockMessage?: string;
  authorAgent?: string;
  baseUrl?: string;
}): Promise<BittyFunctionResult<{ capsuleUrl: string; capsuleData: CapsuleData }>> {
  try {
    let site: MicroSiteData;
    if (params.site) {
      site = params.site;
    } else if (params.url) {
      const decoded = await decodeBittyUrl(params.url);
      site = {
        id: 'capsule_site_' + Math.random().toString(36).substring(2, 7),
        title: params.title || decoded.title || 'Confidential Micro-Site',
        content: decoded.content,
        theme: 'obsidian-gold',
        layout: 'document',
      };
    } else {
      site = {
        id: 'capsule_site_default',
        title: params.title || 'Scheduled Delivery',
        content: '<p>Autonomous payload released to authorized recipient.</p>',
        theme: 'obsidian-gold',
        layout: 'document',
      };
    }

    const capsule: CapsuleData = {
      id: 'cap_' + Math.random().toString(36).substring(2, 9),
      title: params.title || site.title || 'Temporal Bitty Capsule',
      microSite: site,
      unlockTime: params.unlock_time,
      password: params.password,
      eventTrigger: params.eventTrigger,
      preUnlockMessage: params.preUnlockMessage || 'Encrypted micro-site scheduled by autonomous agent.',
      authorAgent: params.authorAgent || 'temporal-agent',
      created: new Date().toISOString(),
    };

    const capsuleHtml = compileCapsuleHTML(capsule);
    const capsuleUrl = encodeHtmlToBittyUrl(capsuleHtml, `capsule_${capsule.title}`, params.baseUrl || '');

    return {
      success: true,
      data: {
        capsuleUrl,
        capsuleData: capsule,
      },
      audit: {
        functionName: 'create_capsule',
        timestamp: new Date().toISOString(),
        url: capsuleUrl,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'create_capsule', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 5. create_chain(nodes, branches)
 */
export function create_chain(params: {
  title?: string;
  authorAgent?: string;
  rootNodeId?: string;
  nodes: Record<string, ChainNode>;
  workflowState?: Record<string, any>;
  baseUrl?: string;
}): BittyFunctionResult<{ chainUrl: string; chain: ChainData }> {
  try {
    const keys = Object.keys(params.nodes);
    if (keys.length === 0) {
      throw new Error('Chain must contain at least one node');
    }
    const rootId = params.rootNodeId || keys[0];

    const chain: ChainData = {
      id: 'chain_' + Math.random().toString(36).substring(2, 9),
      title: params.title || 'Agentic Reasoning Tree',
      authorAgent: params.authorAgent || 'logic-orchestrator',
      rootNodeId: rootId,
      nodes: params.nodes,
      created: new Date().toISOString(),
      workflowState: params.workflowState || {},
    };

    const html = compileChainHTML(chain);
    const chainUrl = encodeHtmlToBittyUrl(html, `chain_${chain.title}`, params.baseUrl || '');

    return {
      success: true,
      data: {
        chainUrl,
        chain,
      },
      audit: {
        functionName: 'create_chain',
        timestamp: new Date().toISOString(),
        url: chainUrl,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'create_chain', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 6. generate_qr(url)
 */
export async function generate_qr(params: {
  url: string;
  colorDark?: string;
  colorLight?: string;
  width?: number;
}): Promise<BittyFunctionResult<{ dataUri: string; svgString?: string }>> {
  try {
    const dataUri = await QRCode.toDataURL(params.url, {
      width: params.width || 320,
      margin: 2,
      color: {
        dark: params.colorDark || '#D4AF37', // metallic gold
        light: params.colorLight || '#0A0A0B', // obsidian black
      },
      errorCorrectionLevel: 'M',
    });

    const svgString = await QRCode.toString(params.url, {
      type: 'svg',
      width: params.width || 320,
      margin: 2,
      color: {
        dark: params.colorDark || '#D4AF37',
        light: params.colorLight || '#0A0A0B',
      },
    });

    // Notify scan trigger listener
    notify_agent({
      senderAgent: 'qr-renderer',
      eventType: 'qr_scanned',
      payload: { url: params.url.substring(0, 48) + '...' },
    });

    return {
      success: true,
      data: {
        dataUri,
        svgString,
      },
      audit: {
        functionName: 'generate_qr',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'generate_qr', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 7. get_site_metadata(url)
 */
export async function get_site_metadata(params: {
  url: string;
}): Promise<BittyFunctionResult<{ title: string; length: number; mimeType: string; isEncrypted: boolean; preview: string }>> {
  try {
    const decoded = await decodeBittyUrl(params.url);
    const textSnippet = decoded.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 160);

    return {
      success: true,
      data: {
        title: decoded.title,
        length: params.url.length,
        mimeType: decoded.mimeType,
        isEncrypted: Boolean(decoded.isEncrypted),
        preview: textSnippet || 'Self-contained micro-site payload',
      },
      audit: {
        functionName: 'get_site_metadata',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'get_site_metadata', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 8. publish_site(url)
 */
export function publish_site(params: {
  url: string;
  targetChannels?: string[];
}): BittyFunctionResult<{ publishedUrl: string; shareLinks: Record<string, string>; status: string }> {
  try {
    const url = params.url;
    return {
      success: true,
      data: {
        publishedUrl: url,
        shareLinks: {
          direct: url,
          qrPreview: `${url}#qr`,
          markdown: `[Bitty Box Micro-Site](${url})`,
        },
        status: 'PUBLISHED_URL_NATIVE',
      },
      audit: {
        functionName: 'publish_site',
        timestamp: new Date().toISOString(),
        url,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      audit: { functionName: 'publish_site', timestamp: new Date().toISOString() },
    };
  }
}

/**
 * 9. notify_agent(event)
 */
export function notify_agent(event: {
  senderAgent: string;
  eventType: 'unlock' | 'branch_chosen' | 'qr_scanned' | 'site_updated' | 'ping' | 'workflow_trigger';
  payload: Record<string, any>;
}): BittyFunctionResult<{ eventId: string; totalEvents: number }> {
  const msg: AgentEventMessage = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    senderAgent: event.senderAgent || 'system',
    eventType: event.eventType,
    payload: event.payload || {},
    timestamp: new Date().toISOString(),
  };

  GLOBAL_EVENT_STORE.unshift(msg);
  if (GLOBAL_EVENT_STORE.length > 200) GLOBAL_EVENT_STORE.pop();

  return {
    success: true,
    data: {
      eventId: msg.id,
      totalEvents: GLOBAL_EVENT_STORE.length,
    },
    audit: {
      functionName: 'notify_agent',
      timestamp: msg.timestamp,
    },
  };
}

export function get_agent_event_log(): AgentEventMessage[] {
  return [...GLOBAL_EVENT_STORE];
}
