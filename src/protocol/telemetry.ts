/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitty Box - Telemetry & URL Click-Through Tracker
 * Tracks link impressions, click-through rates, and autonomous agent interaction logs
 */

export interface BittyUrlMetric {
  id: string;
  title: string;
  url: string;
  type: 'micro_site' | 'capsule' | 'chain';
  impressions: number;
  clicks: number;
  interactions: number;
  ctr: number; // percentage
  authorAgent: string;
  lastAccessed: string;
}

export interface AgentInteractionLog {
  id: string;
  urlId: string;
  urlTitle: string;
  agentId: string;
  action: 'click' | 'impression' | 'widget_trigger' | 'capsule_unlock' | 'chain_branch' | 'qr_scan';
  details: string;
  timestamp: string;
}

// Initial seed data representing active autonomous deployments
let URL_METRICS_STORE: BittyUrlMetric[] = [
  {
    id: 'lnk_telemetry_prime',
    title: 'Autonomous System Telemetry',
    url: '/#Autonomous_System_Telemetry/data:text/html;charset=utf-8;format=gz;base64,eNq9Ws1y2zgS...',
    type: 'micro_site',
    impressions: 480,
    clicks: 142,
    interactions: 96,
    ctr: 29.6,
    authorAgent: 'agent-prime',
    lastAccessed: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'lnk_capsule_q4',
    title: 'Executive Briefing Temporal Capsule',
    url: '/#capsule_Executive_Briefing/data:text/html;charset=utf-8;format=gz;base64,eNp9U71u2zA...',
    type: 'capsule',
    impressions: 310,
    clicks: 88,
    interactions: 54,
    ctr: 28.4,
    authorAgent: 'temporal-warden',
    lastAccessed: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: 'lnk_chain_triage',
    title: 'Diagnostic Decision Reasoning Tree',
    url: '/#chain_Diagnostic_Flow/data:text/html;charset=utf-8;format=gz;base64,eNqlU8Fu2zAM...',
    type: 'chain',
    impressions: 590,
    clicks: 215,
    interactions: 184,
    ctr: 36.4,
    authorAgent: 'logic-orchestrator',
    lastAccessed: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'lnk_onboarding_micro',
    title: 'Tiny Agent Onboarding Guide',
    url: '/#Agent_Onboarding_Guide/data:text/html;charset=utf-8;format=gz;base64,eNpVU0tuwzAM...',
    type: 'micro_site',
    impressions: 220,
    clicks: 64,
    interactions: 41,
    ctr: 29.1,
    authorAgent: 'agent-nexus-09',
    lastAccessed: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
];

let INTERACTION_LOGS_STORE: AgentInteractionLog[] = [
  {
    id: 'log_01',
    urlId: 'lnk_chain_triage',
    urlTitle: 'Diagnostic Decision Reasoning Tree',
    agentId: 'logic-orchestrator',
    action: 'chain_branch',
    details: 'Navigated branch: Option B (Deep Kernel Memory Dump)',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'log_02',
    urlId: 'lnk_telemetry_prime',
    urlTitle: 'Autonomous System Telemetry',
    agentId: 'agent-prime',
    action: 'widget_trigger',
    details: 'Counter incremented: Active Sub-Agents +1 (Value: 8)',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'log_03',
    urlId: 'lnk_capsule_q4',
    urlTitle: 'Executive Briefing Temporal Capsule',
    agentId: 'temporal-warden',
    action: 'capsule_unlock',
    details: 'Passcode verified by authorized worker. Micro-site decrypted.',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: 'log_04',
    urlId: 'lnk_onboarding_micro',
    urlTitle: 'Tiny Agent Onboarding Guide',
    agentId: 'agent-nexus-09',
    action: 'qr_scan',
    details: 'QR matrix scanned and unpacked into memory buffer',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'log_05',
    urlId: 'lnk_telemetry_prime',
    urlTitle: 'Autonomous System Telemetry',
    agentId: 'agent-worker-04',
    action: 'click',
    details: 'Link opened from autonomous webhook distribution',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  },
];

export function getUrlMetrics(): BittyUrlMetric[] {
  return [...URL_METRICS_STORE];
}

export function getInteractionLogs(): AgentInteractionLog[] {
  return [...INTERACTION_LOGS_STORE];
}

export function registerTrackedUrl(metric: Omit<BittyUrlMetric, 'impressions' | 'clicks' | 'interactions' | 'ctr' | 'lastAccessed'>): BittyUrlMetric {
  const existing = URL_METRICS_STORE.find((m) => m.url === metric.url || m.id === metric.id);
  if (existing) return existing;

  const newMetric: BittyUrlMetric = {
    ...metric,
    impressions: 1,
    clicks: 1,
    interactions: 1,
    ctr: 100,
    lastAccessed: new Date().toISOString(),
  };

  URL_METRICS_STORE.unshift(newMetric);
  return newMetric;
}

export function trackUrlClick(urlId: string): BittyUrlMetric | null {
  const item = URL_METRICS_STORE.find((m) => m.id === urlId);
  if (!item) return null;

  item.clicks += 1;
  item.impressions += 1;
  item.ctr = Number(((item.clicks / item.impressions) * 100).toFixed(1));
  item.lastAccessed = new Date().toISOString();

  const log: AgentInteractionLog = {
    id: 'log_' + Math.random().toString(36).substring(2, 8),
    urlId: item.id,
    urlTitle: item.title,
    agentId: 'human_or_agent_client',
    action: 'click',
    details: `Click-through registered. Total link visits: ${item.clicks}`,
    timestamp: item.lastAccessed,
  };

  INTERACTION_LOGS_STORE.unshift(log);
  if (INTERACTION_LOGS_STORE.length > 200) INTERACTION_LOGS_STORE.pop();

  return item;
}

export function trackAgentInteraction(urlId: string, action: AgentInteractionLog['action'], agentId: string, details?: string): BittyUrlMetric | null {
  const item = URL_METRICS_STORE.find((m) => m.id === urlId);
  if (!item) return null;

  item.interactions += 1;
  item.lastAccessed = new Date().toISOString();

  const log: AgentInteractionLog = {
    id: 'log_' + Math.random().toString(36).substring(2, 8),
    urlId: item.id,
    urlTitle: item.title,
    agentId: agentId || 'autonomous-worker',
    action,
    details: details || `Agent executed action: ${action}`,
    timestamp: item.lastAccessed,
  };

  INTERACTION_LOGS_STORE.unshift(log);
  if (INTERACTION_LOGS_STORE.length > 200) INTERACTION_LOGS_STORE.pop();

  return item;
}

/**
 * Builds the complete project configuration JSON for instant export and backup
 */
export function generateProjectConfigurationExport(currentContext?: Record<string, any>): Record<string, any> {
  return {
    protocol: 'Bitty Box',
    version: '2.4.0',
    exportedAt: new Date().toISOString(),
    projectMetadata: {
      name: 'Bitty Box Autonomous Micro-Web Project',
      architecture: 'URL-Native Micro-Web Protocol',
      runtimeEnvironment: 'AI-First / Zero-Server-Dependencies',
      formatStandard: 'RFC-URL-DATA + DEFLATE_LV9 + BASE64_URL',
    },
    activeTelemetry: {
      metrics: getUrlMetrics(),
      recentInteractionLogs: getInteractionLogs(),
      summary: {
        totalLinksTracked: URL_METRICS_STORE.length,
        totalImpressions: URL_METRICS_STORE.reduce((sum, m) => sum + m.impressions, 0),
        totalClicks: URL_METRICS_STORE.reduce((sum, m) => sum + m.clicks, 0),
        totalInteractions: URL_METRICS_STORE.reduce((sum, m) => sum + m.interactions, 0),
        averageCtr: (
          URL_METRICS_STORE.reduce((sum, m) => sum + m.ctr, 0) / (URL_METRICS_STORE.length || 1)
        ).toFixed(1) + '%',
      },
    },
    agentCluster: [
      { id: 'agent-prime', role: 'Micro-Site Architect', status: 'ACTIVE', tasks: 142, uptime: '99.98%' },
      { id: 'temporal-warden', role: 'Capsule Scheduler', status: 'ACTIVE', tasks: 38, uptime: '100%' },
      { id: 'logic-orchestrator', role: 'Branching Chain Builder', status: 'ACTIVE', tasks: 87, uptime: '99.95%' },
      { id: 'qr-synthesizer', role: 'Codec & QR Matrix Engine', status: 'STANDBY', tasks: 219, uptime: '100%' },
    ],
    stateContainers: [
      { key: 'workflow.session_token', value: 'bitty_sess_89a0f4', owner: 'agent-prime' },
      { key: 'capsule.pending_unlocks', value: '3 scheduled items', owner: 'temporal-warden' },
      { key: 'chain.active_decision_path', value: 'root -> node_soft -> node_final', owner: 'logic-orchestrator' },
      { key: 'protocol.compression_mode', value: 'DEFLATE_LV9 + BASE64_URL', owner: 'system' },
    ],
    mcpConfiguration: {
      serverUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : 'http://localhost:3000/api/mcp',
      supportedTools: [
        'create_micro_site',
        'encode_site_to_url',
        'update_micro_site',
        'create_capsule',
        'create_chain',
        'generate_qr',
        'get_site_metadata',
        'publish_site',
        'notify_agent',
      ],
    },
    clientContext: currentContext || {},
  };
}

/**
 * Initiates a browser download for the active project configuration JSON
 */
export function triggerProjectJsonDownload(currentContext?: Record<string, any>) {
  const config = generateProjectConfigurationExport(currentContext);
  const jsonStr = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `bittybox-project-config-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
