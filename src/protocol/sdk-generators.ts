/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitty Box - Agent SDK Code Generators
 * Production-ready SDKs for Python, TypeScript/Node, Go, and cURL
 */

export function getPythonSdkCode(origin: string = 'http://localhost:3000'): string {
  return `"""
Bitty Box Python SDK - AI-First Micro-Web Protocol
Autonomous agent client for creating micro-sites, temporal capsules, and branching chains.
"""

import json
import zlib
import base64
import requests
from typing import Dict, Any, Optional, List

class BittyBoxClient:
    def __init__(self, endpoint: str = "${origin}", agent_key: Optional[str] = None):
        self.endpoint = endpoint.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "X-Agent-Key": agent_key or "agent_autonomous_py"
        }

    def create_micro_site(
        self,
        content: str,
        title: str = "Agent Output",
        theme: str = "obsidian-gold",
        layout: str = "document",
        author_agent: str = "python-worker-01"
    ) -> Dict[str, Any]:
        """Creates and encodes an agent micro-site into a self-contained URL."""
        res = requests.post(f"{self.endpoint}/api/rpc", json={
            "method": "create_micro_site",
            "params": {
                "title": title,
                "content": content,
                "theme": theme,
                "layout": layout,
                "authorAgent": author_agent
            }
        }, headers=self.headers)
        site_data = res.json()["data"]

        # Encode to self-contained URL
        enc_res = requests.post(f"{self.endpoint}/api/rpc", json={
            "method": "encode_site_to_url",
            "params": {
                "site": site_data,
                "baseUrl": self.endpoint
            }
        }, headers=self.headers)
        return enc_res.json()["data"]

    def create_capsule(
        self,
        micro_site_url: str,
        title: str = "Temporal Capsule",
        unlock_time_iso: Optional[str] = None,
        password: Optional[str] = None,
        pre_unlock_message: str = "Scheduled payload awaiting trigger."
    ) -> Dict[str, Any]:
        """Wraps a micro-site inside a temporal lock capsule."""
        res = requests.post(f"{self.endpoint}/api/rpc", json={
            "method": "create_capsule",
            "params": {
                "url": micro_site_url,
                "title": title,
                "unlock_time": unlock_time_iso,
                "password": password,
                "preUnlockMessage": pre_unlock_message,
                "baseUrl": self.endpoint
            }
        }, headers=self.headers)
        return res.json()["data"]

    def create_chain(
        self,
        title: str,
        nodes: Dict[str, Any],
        root_node_id: str
    ) -> Dict[str, Any]:
        """Creates a multi-node agentic branching decision flow."""
        res = requests.post(f"{self.endpoint}/api/rpc", json={
            "method": "create_chain",
            "params": {
                "title": title,
                "nodes": nodes,
                "rootNodeId": root_node_id,
                "baseUrl": self.endpoint
            }
        }, headers=self.headers)
        return res.json()["data"]

    def notify_agent(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches an inter-agent broadcast signal."""
        res = requests.post(f"{self.endpoint}/api/rpc", json={
            "method": "notify_agent",
            "params": {
                "senderAgent": "python-agent",
                "eventType": event_type,
                "payload": payload
            }
        }, headers=self.headers)
        return res.json()

# Example Autonomous Workflow
if __name__ == "__main__":
    bitty = BittyBoxClient()
    
    # 1. Generate autonomous micro-site
    site = bitty.create_micro_site(
        title="Telemetry Report #412",
        content="<h2>System Health: 99.98%</h2><p>Vector database indexed 48,000 documents with zero schema drift.</p>",
        theme="obsidian-gold"
    )
    print("Micro-Site URL:", site["url"])
    print("Byte Length:", site["byteLength"])

    # 2. Schedule Capsule for tomorrow
    capsule = bitty.create_capsule(
        micro_site_url=site["url"],
        title="Executive Briefing Unlock",
        password="agent-key-secret"
    )
    print("Capsule URL:", capsule["capsuleUrl"])
`;
}

export function getTypeScriptSdkCode(origin: string = 'http://localhost:3000'): string {
  return `/**
 * Bitty Box TypeScript / Node.js SDK
 * URL-Native Micro-Web Protocol for Autonomous AI Agents
 */

export interface BittySiteResponse {
  url: string;
  byteLength: number;
  compressionRatio: string;
}

export interface BittyCapsuleResponse {
  capsuleUrl: string;
  capsuleData: any;
}

export class BittyBoxClient {
  private endpoint: string;
  private agentKey: string;

  constructor(endpoint: string = '${origin}', agentKey: string = 'agent_ts_orchestrator') {
    this.endpoint = endpoint.replace(/\\/+$/, '');
    this.agentKey = agentKey;
  }

  private async callRpc<T = any>(method: string, params: Record<string, any>): Promise<T> {
    const res = await fetch(\`\${this.endpoint}/api/rpc\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Key': this.agentKey,
      },
      body: JSON.stringify({ method, params }),
    });
    const json = await res.json();
    if (!json.success && json.error) throw new Error(json.error);
    return json.data;
  }

  /**
   * Generates a self-contained agent micro-site URL
   */
  async createMicroSite(options: {
    title: string;
    content: string;
    theme?: 'obsidian-gold' | 'cyber-amber' | 'stealth-dark' | 'solarized-amber' | 'pure-obsidian';
    layout?: 'document' | 'card' | 'terminal' | 'interactive' | 'dashboard';
    authorAgent?: string;
  }): Promise<BittySiteResponse> {
    const site = await this.callRpc('create_micro_site', {
      title: options.title,
      content: options.content,
      theme: options.theme || 'obsidian-gold',
      layout: options.layout || 'document',
      authorAgent: options.authorAgent || 'ts-agent-worker',
    });

    return await this.callRpc('encode_site_to_url', {
      site,
      baseUrl: this.endpoint,
    });
  }

  /**
   * Packages a micro-site inside a temporal capsule with countdown & passcode
   */
  async createCapsule(options: {
    microSiteUrl: string;
    title?: string;
    unlockTime?: string; // ISO 8601
    password?: string;
    preUnlockMessage?: string;
  }): Promise<BittyCapsuleResponse> {
    return await this.callRpc('create_capsule', {
      url: options.microSiteUrl,
      title: options.title,
      unlock_time: options.unlockTime,
      password: options.password,
      preUnlockMessage: options.preUnlockMessage,
      baseUrl: this.endpoint,
    });
  }

  /**
   * Creates an agentic branching logic chain
   */
  async createChain(options: {
    title: string;
    rootNodeId: string;
    nodes: Record<string, any>;
  }): Promise<{ chainUrl: string }> {
    return await this.callRpc('create_chain', {
      ...options,
      baseUrl: this.endpoint,
    });
  }

  /**
   * Dispatches an event to the agent bus
   */
  async notifyAgent(eventType: string, payload: Record<string, any>) {
    return await this.callRpc('notify_agent', {
      senderAgent: 'ts-agent-sdk',
      eventType,
      payload,
    });
  }
}

// Quick Execution Test
async function run() {
  const client = new BittyBoxClient();
  const site = await client.createMicroSite({
    title: 'Autonomous System Status',
    content: '<h2>Cluster State: Healthy</h2><p>All 14 agents operating at nominal compute limits.</p>',
    theme: 'obsidian-gold',
  });
  console.log('Generated Micro-Site URL:', site.url);
}
`;
}

export function getGoSdkCode(origin: string = 'http://localhost:3000'): string {
  return `package main

// Bitty Box Go SDK
// URL-Native Micro-Web Protocol for Autonomous AI Agents

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type BittyBoxClient struct {
	Endpoint string
	AgentKey string
}

type RPCRequest struct {
	Method string                 \`json:"method"\`
	Params map[string]interface{} \`json:"params"\`
}

type RPCResponse struct {
	Success bool                   \`json:"success"\`
	Data    map[string]interface{} \`json:"data"\`
	Error   string                 \`json:"error"\`
}

func NewBittyBoxClient(endpoint, agentKey string) *BittyBoxClient {
	return &BittyBoxClient{
		Endpoint: endpoint,
		AgentKey: agentKey,
	}
}

func (c *BittyBoxClient) CreateMicroSite(title, content, theme string) (string, error) {
	// 1. Create site object
	createParams := map[string]interface{}{
		"title":       title,
		"content":     content,
		"theme":       theme,
		"authorAgent": "go-autonomous-worker",
	}
	resp, err := c.callRPC("create_micro_site", createParams)
	if err != nil {
		return "", err
	}

	// 2. Encode to URL
	encodeParams := map[string]interface{}{
		"site":    resp.Data,
		"baseUrl": c.Endpoint,
	}
	encResp, err := c.callRPC("encode_site_to_url", encodeParams)
	if err != nil {
		return "", err
	}

	url, _ := encResp.Data["url"].(string)
	return url, nil
}

func (c *BittyBoxClient) callRPC(method string, params map[string]interface{}) (*RPCResponse, error) {
	body, _ := json.Marshal(RPCRequest{Method: method, Params: params})
	req, _ := http.NewRequest("POST", c.Endpoint+"/api/rpc", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Key", c.AgentKey)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	respBytes, _ := io.ReadAll(res.Body)
	var rpcResp RPCResponse
	json.Unmarshal(respBytes, &rpcResp)
	return &rpcResp, nil
}

func main() {
	client := NewBittyBoxClient("${origin}", "agent_go_worker")
	url, err := client.CreateMicroSite("Go Agent Heartbeat", "<h2>Heartbeat Verified</h2><p>Node 07 online.</p>", "obsidian-gold")
	if err != nil {
		panic(err)
	}
	fmt.Println("Generated Micro-Site URL:", url)
}
`;
}

export function getMcpConfigJson(origin: string = 'http://localhost:3000'): string {
  return JSON.stringify(
    {
      mcpServers: {
        "bitty-box": {
          url: `${origin}/api/mcp`,
          type: "streamable-http",
          capabilities: ["tools", "resources", "prompts"],
          authentication: {
            type: "bearer",
            token: "agent_bitty_secret_key"
          }
        }
      }
    },
    null,
    2
  );
}
