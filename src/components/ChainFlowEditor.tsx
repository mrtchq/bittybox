/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Copy,
  Check,
  QrCode,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  ChainData,
  ChainNode,
  compileChainHTML,
  encodeHtmlToBittyUrl,
} from '../protocol/bittybox';
import { QrModal } from './QrModal';
import { playHarmonicChime, spawnStardustBurst } from './CosmicAtmosphere';

interface ChainFlowEditorProps {
  initialArtifact?: any;
}

export const ChainFlowEditor: React.FC<ChainFlowEditorProps> = ({ initialArtifact }) => {
  const [chainTitle, setChainTitle] = useState<string>('Autonomous Diagnostic Flow');
  const [authorAgent, setAuthorAgent] = useState<string>('logic-tree-agent');

  // Multi-node flow state
  const [nodes, setNodes] = useState<Record<string, ChainNode>>({
    root: {
      id: 'root',
      title: 'Phase 1: Initial System Triage',
      content: `<p>Autonomous monitor detected latency spike on worker node 04.</p><p>Select an operational branch to execute the workflow.</p>`,
      theme: 'obsidian-gold',
      layout: 'document',
      choices: [
        {
          id: 'c1',
          label: 'Option A: Soft Cycle Restart',
          description: 'Gracefully drain active sockets and reboot worker container.',
          targetNodeId: 'node_soft',
        },
        {
          id: 'c2',
          label: 'Option B: Deep Kernel Memory Dump',
          description: 'Isolate process, snapshot registers, and trigger heap dump analysis.',
          targetNodeId: 'node_dump',
        },
      ],
    },
    node_soft: {
      id: 'node_soft',
      title: 'Phase 2A: Soft Cycle Completed',
      content: `<p>Worker node 04 rebooted in 840ms. Sockets re-attached without dropped packets.</p><pre>Status: 200 OK · Cluster: NOMINAL</pre>`,
      theme: 'obsidian-gold',
      layout: 'document',
      choices: [
        {
          id: 'c3',
          label: 'Finalize Diagnostic Run',
          description: 'Commit state to agent memory and conclude flow.',
          targetNodeId: 'node_final',
        },
      ],
    },
    node_dump: {
      id: 'node_dump',
      title: 'Phase 2B: Kernel Analysis Complete',
      content: `<p>Heap dump analyzed. Identified uncollected buffer of 180MB from legacy websocket connection.</p><pre>Remediation: Memory reclaimed · Status: HEALTHY</pre>`,
      theme: 'obsidian-gold',
      layout: 'document',
      choices: [
        {
          id: 'c4',
          label: 'Finalize Diagnostic Run',
          description: 'Commit state to agent memory and conclude flow.',
          targetNodeId: 'node_final',
        },
      ],
    },
    node_final: {
      id: 'node_final',
      title: 'Workflow Concluded',
      content: `<p>All branches resolved. The complete reasoning trail has been safely persisted inside this single self-contained Bitty Box URL.</p>`,
      theme: 'obsidian-gold',
      layout: 'document',
      choices: [],
    },
  });

  const [activeNodeId, setActiveNodeId] = useState<string>('root');
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  useEffect(() => {
    if (!initialArtifact || initialArtifact.primitiveType !== 'chain') return;
    if (initialArtifact.title) setChainTitle(initialArtifact.title);
    if (initialArtifact.chainConfig?.nodes) {
      setNodes(initialArtifact.chainConfig.nodes);
      const rootKey = initialArtifact.chainConfig.rootNodeId || Object.keys(initialArtifact.chainConfig.nodes)[0];
      if (rootKey) setActiveNodeId(rootKey);
    }
  }, [initialArtifact]);

  useEffect(() => {
    const chain: ChainData = {
      id: 'chain_' + Math.random().toString(36).substring(2, 7),
      title: chainTitle,
      authorAgent,
      rootNodeId: 'root',
      nodes,
      created: new Date().toISOString(),
    };

    const html = compileChainHTML(chain);
    setCompiledHtml(html);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = encodeHtmlToBittyUrl(html, `chain_${chainTitle}`, origin);
    setGeneratedUrl(url);
  }, [chainTitle, authorAgent, nodes]);

  const copyUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addNode = () => {
    const newId = 'node_' + Math.random().toString(36).substring(2, 6);
    const newNode: ChainNode = {
      id: newId,
      title: `Branch Node #${Object.keys(nodes).length + 1}`,
      content: `<p>New branching reasoning node created by agent.</p>`,
      theme: 'obsidian-gold',
      layout: 'document',
      choices: [],
    };
    setNodes({ ...nodes, [newId]: newNode });
    setActiveNodeId(newId);
  };

  const deleteNode = (id: string) => {
    if (id === 'root') {
      alert('Cannot delete the root node.');
      return;
    }
    const next = { ...nodes };
    delete next[id];
    setNodes(next);
    setActiveNodeId('root');
  };

  const addChoice = (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return;
    const choiceId = 'c_' + Math.random().toString(36).substring(2, 6);
    const otherNodeIds = Object.keys(nodes).filter((k) => k !== nodeId);
    const target = otherNodeIds[0] || 'root';

    const newChoice = {
      id: choiceId,
      label: `Path: Continue to ${nodes[target]?.title || target}`,
      description: 'Agentic transition condition',
      targetNodeId: target,
    };

    setNodes({
      ...nodes,
      [nodeId]: {
        ...node,
        choices: [...node.choices, newChoice],
      },
    });
  };

  const removeChoice = (nodeId: string, choiceIndex: number) => {
    const node = nodes[nodeId];
    if (!node) return;
    const nextChoices = [...node.choices];
    nextChoices.splice(choiceIndex, 1);
    setNodes({
      ...nodes,
      [nodeId]: {
        ...node,
        choices: nextChoices,
      },
    });
  };

  const currentNode = nodes[activeNodeId] || nodes['root'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Node graph & Node Editor (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <div className="glass-hud rounded-3xl p-6 shadow-2xl border border-[#ffd159]/25">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#ffd159]/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani text-[#ffd159] uppercase tracking-wider font-bold">PRIMITIVE 03</span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-rajdhani text-slate-400">LOGIC FLOW PRIMITIVE</span>
              </div>
              <h2 className="text-xl font-orbitron font-extrabold text-white tracking-tight mt-0.5">Bitty Chain Flow Editor</h2>
            </div>
            <button
              onClick={(e) => {
                spawnStardustBurst(e.clientX, e.clientY, 15);
                playHarmonicChime(750, 0.12);
                addNode();
              }}
              className="btn-glow-pulse px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd159] to-[#f5b82e] hover:from-[#ffe082] text-[#040407] font-bold text-xs font-orbitron flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Node</span>
            </button>
          </div>

          {/* Node selector strip */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#27272F]">
            <span className="text-[10px] font-mono text-[#8E8E98] uppercase shrink-0">NODES ({Object.keys(nodes).length}):</span>
            {Object.entries(nodes).map(([id, n]) => (
              <button
                key={id}
                onClick={() => setActiveNodeId(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 border ${
                  activeNodeId === id
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold shadow-sm'
                    : 'bg-[#0A0A0B] text-[#A3A3A8] border-[#27272F] hover:text-white'
                }`}
              >
                <span>{id === 'root' ? 'ROOT: ' : ''}{n.title}</span>
                {id !== 'root' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(id);
                    }}
                    className="hover:text-red-600 ml-1 p-0.5"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Node Editing Fields */}
          {currentNode && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">
                  Node Title ({activeNodeId})
                </label>
                <input
                  type="text"
                  value={currentNode.title}
                  onChange={(e) => {
                    setNodes({
                      ...nodes,
                      [activeNodeId]: { ...currentNode, title: e.target.value },
                    });
                  }}
                  className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">
                  Node Body Content (HTML/Markdown)
                </label>
                <textarea
                  value={currentNode.content}
                  onChange={(e) => {
                    setNodes({
                      ...nodes,
                      [activeNodeId]: { ...currentNode, content: e.target.value },
                    });
                  }}
                  rows={4}
                  className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-lg p-3 text-xs font-mono text-[#EDEDED] outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Branching choices from this node */}
              <div className="pt-2 border-t border-[#27272F]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#D4AF37] uppercase flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    Outgoing Decision Branches ({currentNode.choices.length})
                  </span>
                  <button
                    onClick={() => addChoice(activeNodeId)}
                    className="px-2.5 py-1 text-[11px] font-mono bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] rounded border border-[#27272F] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Choice
                  </button>
                </div>

                {currentNode.choices.length === 0 ? (
                  <div className="bg-[#0A0A0B] border border-[#27272F] rounded-lg p-3 text-center text-xs text-[#8E8E98] font-mono">
                    This is a terminal node (no outgoing branches).
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentNode.choices.map((ch, idx) => (
                      <div
                        key={ch.id || idx}
                        className="bg-[#0A0A0B] border border-[#27272F] rounded-lg p-3 flex flex-col md:flex-row items-center gap-2"
                      >
                        <div className="flex-1 w-full space-y-1">
                          <input
                            type="text"
                            value={ch.label}
                            onChange={(e) => {
                              const next = [...currentNode.choices];
                              next[idx].label = e.target.value;
                              setNodes({
                                ...nodes,
                                [activeNodeId]: { ...currentNode, choices: next },
                              });
                            }}
                            placeholder="Choice Label"
                            className="w-full bg-[#141417] border border-[#27272F] rounded px-2.5 py-1 text-xs text-white font-mono outline-none"
                          />
                          <input
                            type="text"
                            value={ch.description || ''}
                            onChange={(e) => {
                              const next = [...currentNode.choices];
                              next[idx].description = e.target.value;
                              setNodes({
                                ...nodes,
                                [activeNodeId]: { ...currentNode, choices: next },
                              });
                            }}
                            placeholder="Choice description / rationale..."
                            className="w-full bg-[#141417] border border-[#27272F] rounded px-2.5 py-1 text-[11px] text-[#8E8E98] font-mono outline-none"
                          />
                        </div>

                        {/* Target Node selector */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <select
                            value={ch.targetNodeId}
                            onChange={(e) => {
                              const next = [...currentNode.choices];
                              next[idx].targetNodeId = e.target.value;
                              setNodes({
                                ...nodes,
                                [activeNodeId]: { ...currentNode, choices: next },
                              });
                            }}
                            className="bg-[#141417] border border-[#27272F] rounded px-2 py-1 text-xs text-[#D4AF37] font-mono outline-none"
                          >
                            {Object.keys(nodes).map((nid) => (
                              <option key={nid} value={nid}>
                                → {nodes[nid]?.title || nid}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeChoice(activeNodeId, idx)}
                            className="p-1 text-[#8E8E98] hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chain URL Output */}
        <div className="glass-hud rounded-3xl p-5 shadow-2xl flex flex-col gap-2 border border-[#ffd159]/25 font-rajdhani">
          <div className="flex items-center justify-between text-xs tracking-wider">
            <span className="text-white font-bold font-orbitron">CHAIN ARTIFACT: {generatedUrl.length} B</span>
            <span className="text-[#10b981] font-bold">MULTIPLE DECISION NODES IN SINGLE URL</span>
          </div>
          <div className="bg-[#040407]/90 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 truncate flex-1">{generatedUrl}</span>
            <button
              onClick={(e) => {
                spawnStardustBurst(e.clientX, e.clientY, 16);
                playHarmonicChime(760, 0.15);
                copyUrl();
              }}
              className="btn-glow-pulse px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd159] to-[#f5b82e] hover:from-[#ffe082] text-[#040407] font-bold text-xs font-orbitron flex items-center gap-1.5 transition-all shrink-0 shadow-md hover:scale-105 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Chain'}
            </button>
            <button
              onClick={() => {
                playHarmonicChime(800, 0.1);
                setShowQrModal(true);
              }}
              className="p-2 rounded-xl bg-[#141428] hover:bg-[#1e1c36] text-[#ffd159] border border-slate-700 hover:border-[#ffd159] transition-all shrink-0 hover:scale-105"
            >
              <QrCode className="w-4 h-4 text-[#ffd159]" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Sandbox (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        <div className="glass-hud rounded-3xl p-5 shadow-2xl flex flex-col h-full min-h-[580px] border border-[#ec4899]/25">
          <div className="flex items-center justify-between pb-3 border-b border-[#ec4899]/20 mb-3 font-rajdhani">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899] animate-pulse"></span>
              <span className="text-xs font-orbitron font-bold text-white">INTERACTIVE CHAIN RUNTIME</span>
            </div>
            <span className="text-[11px] font-bold text-[#ffd159]">CLICK CHOICES TO NAVIGATE</span>
          </div>

          <div className="flex-1 bg-[#040407] border border-slate-800 rounded-2xl overflow-hidden">
            <iframe
              srcDoc={compiledHtml}
              title="Chain Runtime Preview"
              className="w-full h-full min-h-[500px] border-none"
              sandbox="allow-scripts allow-same-origin allow-modals"
            />
          </div>
        </div>
      </div>

      <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} url={generatedUrl} title={chainTitle} />
    </div>
  );
};
