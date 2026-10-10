/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, Code, Cpu, Server, Send } from 'lucide-react';

export const McpAndApiConsole: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<string>('create_micro_site');
  const [requestJson, setRequestJson] = useState<string>(
    JSON.stringify(
      {
        title: "Autonomous Agent Report",
        content: "<h2>Agent Status</h2><p>All micro-services reporting green.</p>",
        theme: "obsidian-gold",
        layout: "document",
        authorAgent: "console-agent-01"
      },
      null,
      2
    )
  );
  const [responseJson, setResponseJson] = useState<string>('// Response will appear here upon execution');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [mode, setMode] = useState<'rpc' | 'mcp'>('rpc');

  const METHOD_PRESETS: Record<string, any> = {
    create_micro_site: {
      title: "Autonomous Agent Report",
      content: "<h2>Agent Status</h2><p>All micro-services reporting green.</p>",
      theme: "obsidian-gold",
      layout: "document",
      authorAgent: "console-agent-01"
    },
    encode_site_to_url: {
      site: {
        id: "site_test_01",
        title: "Test Micro-Site",
        content: "<p>Hello from Bitty Box function call API!</p>",
        theme: "obsidian-gold",
        layout: "document"
      }
    },
    update_micro_site: {
      url: window?.location ? `${window.location.origin}/#test/data:...` : "/#test/data:...",
      new_content: "<p>Updated content dynamically injected by agent.</p>",
      title: "Updated Site"
    },
    create_capsule: {
      title: "Scheduled Release",
      unlock_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      password: "passcode-gold",
      preUnlockMessage: "Confidential payload locked until authorized time.",
      authorAgent: "temporal-worker"
    },
    create_chain: {
      title: "Decision Logic Tree",
      rootNodeId: "step_1",
      nodes: {
        step_1: {
          id: "step_1",
          title: "Step 1: Initiation",
          content: "<p>Choose execution path:</p>",
          choices: [
            { id: "c1", label: "Path A (Speed)", targetNodeId: "step_2" },
            { id: "c2", label: "Path B (Security)", targetNodeId: "step_3" }
          ]
        },
        step_2: {
          id: "step_2",
          title: "Fast Execution Complete",
          content: "<p>High-speed branch concluded.</p>",
          choices: []
        },
        step_3: {
          id: "step_3",
          title: "Deep Security Audit Complete",
          content: "<p>Zero vulnerabilities found.</p>",
          choices: []
        }
      }
    },
    generate_qr: {
      url: window?.location ? `${window.location.origin}/#demo` : "http://localhost:3000/#demo",
      colorDark: "#D4AF37",
      colorLight: "#0A0A0B"
    },
    get_site_metadata: {
      url: window?.location ? `${window.location.origin}/#demo` : "http://localhost:3000/#demo"
    },
    publish_site: {
      url: window?.location ? `${window.location.origin}/#demo` : "http://localhost:3000/#demo"
    },
    notify_agent: {
      senderAgent: "mcp-test-runner",
      eventType: "workflow_trigger",
      payload: { trigger: "console_execution", timestamp: Date.now() }
    }
  };

  const handleSelectMethod = (m: string) => {
    setSelectedMethod(m);
    if (METHOD_PRESETS[m]) {
      setRequestJson(JSON.stringify(METHOD_PRESETS[m], null, 2));
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(requestJson);
      } catch (e: any) {
        setResponseJson(`// JSON Parse Error: ${e.message}`);
        setIsExecuting(false);
        return;
      }

      let res: Response;
      if (mode === 'rpc') {
        res = await fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Agent-Key': 'agent_console_dev' },
          body: JSON.stringify({ method: selectedMethod, params: parsedParams }),
        });
      } else {
        // Standard MCP JSON-RPC 2.0 format
        res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'req_' + Date.now(),
            method: 'tools/call',
            params: {
              name: selectedMethod,
              arguments: parsedParams,
            },
          }),
        });
      }

      const json = await res.json();
      setResponseJson(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setResponseJson(`// Network / Execution Error:\n${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(responseJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const curlCommand = `curl -X POST ${currentOrigin}/api/rpc \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Key: agent_prime_auth" \\
  -d '${JSON.stringify({ method: selectedMethod, params: JSON.parse(requestJson || '{}') })}'`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141417] border border-[#27272F] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#27272F]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider">PROTOCOL PLAYGROUND</span>
              <span className="text-xs text-[#8E8E98]">·</span>
              <span className="text-xs text-[#8E8E98]">ATOMIC FUNCTION CALLS & MCP</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">Function API & MCP Console</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('rpc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                mode === 'rpc'
                  ? 'bg-[#D4AF37] text-black font-semibold shadow-sm'
                  : 'bg-[#0A0A0B] text-[#8E8E98] hover:text-white'
              }`}
            >
              /api/rpc (REST/RPC)
            </button>
            <button
              onClick={() => setMode('mcp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                mode === 'mcp'
                  ? 'bg-[#D4AF37] text-black font-semibold shadow-sm'
                  : 'bg-[#0A0A0B] text-[#8E8E98] hover:text-white'
              }`}
            >
              /api/mcp (JSON-RPC 2.0)
            </button>
          </div>
        </div>

        {/* Function method buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(METHOD_PRESETS).map((m) => (
            <button
              key={m}
              onClick={() => handleSelectMethod(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                selectedMethod === m
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold shadow-sm'
                  : 'bg-[#0A0A0B] text-[#A3A3A8] border-[#27272F] hover:text-white'
              }`}
            >
              {m}()
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Response Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Request Payload */}
        <div className="bg-[#141417] border border-[#27272F] rounded-2xl p-5 shadow-xl flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#27272F] mb-3">
            <span className="text-xs font-mono text-[#D4AF37]">
              REQUEST PAYLOAD: {selectedMethod}
            </span>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E2C04D] disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-[#D4AF37]/20"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{isExecuting ? 'Calling...' : 'Run Function'}</span>
            </button>
          </div>

          <textarea
            value={requestJson}
            onChange={(e) => setRequestJson(e.target.value)}
            className="flex-1 w-full bg-[#0A0A0B] border border-[#27272F] rounded-xl p-4 text-xs font-mono text-[#EDEDED] outline-none focus:border-[#D4AF37] resize-none"
            spellCheck={false}
          />
        </div>

        {/* Right: Response Output */}
        <div className="bg-[#141417] border border-[#27272F] rounded-2xl p-5 shadow-xl flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#27272F] mb-3">
            <span className="text-xs font-mono text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              EXECUTION RESPONSE
            </span>
            <button
              onClick={copyResponse}
              className="px-2.5 py-1 rounded bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] text-xs font-mono flex items-center gap-1 transition-colors border border-[#27272F]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <pre className="flex-1 w-full bg-[#0A0A0B] border border-[#27272F] rounded-xl p-4 text-xs font-mono text-[#D4AF37] overflow-auto whitespace-pre-wrap break-all">
            {responseJson}
          </pre>
        </div>
      </div>

      {/* cURL command snippet for CLI / External Agents */}
      <div className="bg-[#141417] border border-[#27272F] rounded-2xl p-4 shadow-xl">
        <span className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1.5">CLI / AGENT cURL SNIPPET</span>
        <pre className="p-3 bg-[#0A0A0B] border border-[#27272F] rounded-lg text-xs font-mono text-[#A3A3A8] overflow-x-auto select-all">
          {curlCommand}
        </pre>
      </div>
    </div>
  );
};
