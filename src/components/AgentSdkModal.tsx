/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Code2, Cpu, FileJson } from 'lucide-react';
import {
  getPythonSdkCode,
  getTypeScriptSdkCode,
  getGoSdkCode,
  getMcpConfigJson,
} from '../protocol/sdk-generators';

interface AgentSdkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentSdkModal: React.FC<AgentSdkModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'python' | 'ts' | 'go' | 'mcp'>('python');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const getCode = () => {
    switch (activeTab) {
      case 'python':
        return getPythonSdkCode(currentOrigin);
      case 'ts':
        return getTypeScriptSdkCode(currentOrigin);
      case 'go':
        return getGoSdkCode(currentOrigin);
      case 'mcp':
        return getMcpConfigJson(currentOrigin);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#141417] border border-[#27272F] rounded-2xl shadow-2xl glow-gold flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#27272F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">BITTY BOX AGENT SDK & MCP SPEC</h3>
              <p className="text-xs text-[#8E8E98]">Drop-in libraries for autonomous agents & agentic workers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E8E98] hover:text-white hover:bg-[#1E1E24] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272F] bg-[#0E0E11]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                activeTab === 'python'
                  ? 'bg-[#D4AF37] text-black font-semibold shadow-sm'
                  : 'text-[#8E8E98] hover:text-white bg-[#141417]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Python (bittybox_sdk.py)
            </button>
            <button
              onClick={() => setActiveTab('ts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                activeTab === 'ts'
                  ? 'bg-[#D4AF37] text-black font-semibold shadow-sm'
                  : 'text-[#8E8E98] hover:text-white bg-[#141417]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              TypeScript / Node
            </button>
            <button
              onClick={() => setActiveTab('go')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                activeTab === 'go'
                  ? 'bg-[#D4AF37] text-black font-semibold shadow-sm'
                  : 'text-[#8E8E98] hover:text-white bg-[#141417]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Go (bittybox.go)
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                activeTab === 'mcp'
                  ? 'bg-[#D4AF37] text-black font-semibold shadow-sm'
                  : 'text-[#8E8E98] hover:text-white bg-[#141417]'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              MCP Server Config
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] flex items-center gap-1.5 transition-colors border border-[#27272F]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied to Clipboard' : 'Copy Code'}
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-5 bg-[#0A0A0B]">
          <pre className="text-xs font-mono text-[#D4AF37] leading-relaxed select-all whitespace-pre-wrap break-all">
            {getCode()}
          </pre>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#27272F] bg-[#141417] flex items-center justify-between text-xs text-[#8E8E98]">
          <span className="font-mono">URL-NATIVE PROTOCOL · 0 DEPENDENCIES FOR END-USERS</span>
          <span className="font-mono text-[#D4AF37]">BITTY BOX v2.4</span>
        </div>
      </div>
    </div>
  );
};
