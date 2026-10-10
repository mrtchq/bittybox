/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Binary,
  Layers,
  Search,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  FileCode,
  Lock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { decodeBittyUrl, encodeHtmlToBittyUrl } from '../protocol/bittybox';
import { QrModal } from './QrModal';

export const UrlCodecInspector: React.FC = () => {
  const [inputUrl, setInputUrl] = useState<string>('');
  const [decodedInfo, setDecodedInfo] = useState<{
    title: string;
    mimeType: string;
    format?: string;
    content: string;
    isEncrypted?: boolean;
  } | null>(null);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Initialize with a sample Bitty Box URL
  useEffect(() => {
    const sampleHtml = `<h2>Bitty Box Self-Contained Micro-Site</h2><p>This payload exists 100% inside the URL fragment.</p>`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const sampleUrl = encodeHtmlToBittyUrl(sampleHtml, 'Inspection_Sample', origin);
    setInputUrl(sampleUrl);
    handleInspect(sampleUrl);
  }, []);

  const handleInspect = async (urlToInspect: string) => {
    if (!urlToInspect) return;
    setIsDecoding(true);
    try {
      const res = await decodeBittyUrl(urlToInspect);
      setDecodedInfo(res);
    } catch (e: any) {
      setDecodedInfo({
        title: 'Error',
        mimeType: 'text/plain',
        content: `Failed to decode URL: ${e.message}`,
      });
    } finally {
      setIsDecoding(false);
    }
  };

  const copyPayload = () => {
    if (!decodedInfo) return;
    navigator.clipboard.writeText(decodedInfo.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const urlLength = inputUrl.length;
  const contentBytes = decodedInfo?.content?.length || 0;
  const ratio = contentBytes > 0 ? Math.round((1 - urlLength / contentBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Input URL Bar */}
      <div className="bg-[#141417] border border-[#27272F] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272F]">
          <div>
            <span className="text-xs font-mono text-[#D4AF37] uppercase">URL PROTOCOL CODEC</span>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">Deep Payload & Byte Inspector</h2>
          </div>
          <button
            onClick={() => handleInspect(inputUrl)}
            className="px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E2C04D] text-black font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Dissect URL</span>
          </button>
        </div>

        <div>
          <label className="text-[11px] font-mono text-[#8E8E98] uppercase block mb-1">
            Bitty Box URL or Data URI to Inspect
          </label>
          <textarea
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              handleInspect(e.target.value);
            }}
            rows={3}
            className="w-full bg-[#0A0A0B] border border-[#27272F] rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-[#D4AF37]"
            placeholder="Paste any Bitty Box URL here (/#Title/data:...)"
          />
        </div>

        {/* Compression Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#0A0A0B] border border-[#27272F] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-[#8E8E98] uppercase block">Encoded URL Length</span>
            <span className="text-base font-bold text-white font-mono">{urlLength} bytes</span>
          </div>
          <div className="bg-[#0A0A0B] border border-[#27272F] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-[#8E8E98] uppercase block">Uncompressed Size</span>
            <span className="text-base font-bold text-[#D4AF37] font-mono">{contentBytes} bytes</span>
          </div>
          <div className="bg-[#0A0A0B] border border-[#27272F] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-[#8E8E98] uppercase block">Compression Ratio</span>
            <span className="text-base font-bold text-[#10B981] font-mono">{ratio > 0 ? `${ratio}% smaller` : 'Compact'}</span>
          </div>
          <div className="bg-[#0A0A0B] border border-[#27272F] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-[#8E8E98] uppercase block">MIME Payload</span>
            <span className="text-base font-bold text-white font-mono truncate block">{decodedInfo?.mimeType || 'text/html'}</span>
          </div>
        </div>
      </div>

      {/* Dissected Payload & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Decompressed Code */}
        <div className="bg-[#141417] border border-[#27272F] rounded-2xl p-5 shadow-xl flex flex-col min-h-[440px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#27272F] mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-mono text-white">DECOMPRESSED SOURCE</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyPayload}
                className="px-2.5 py-1 rounded bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] text-xs font-mono flex items-center gap-1 transition-colors border border-[#27272F]"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setShowQrModal(true)}
                className="p-1 rounded bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] border border-[#27272F]"
                title="View QR Code"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <pre className="flex-1 w-full bg-[#0A0A0B] border border-[#27272F] rounded-xl p-4 text-xs font-mono text-[#EDEDED] overflow-auto whitespace-pre-wrap break-all leading-relaxed">
            {decodedInfo?.content || '// No content decoded'}
          </pre>
        </div>

        {/* Right: Rendered Execution */}
        <div className="bg-[#141417] border border-[#27272F] rounded-2xl p-5 shadow-xl flex flex-col min-h-[440px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#27272F] mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#10B981]" />
              <span className="text-xs font-mono text-white">SANDBOXED RENDER</span>
            </div>
            <span className="text-[11px] font-mono text-[#8E8E98]">
              TITLE: {decodedInfo?.title || 'Unknown'}
            </span>
          </div>

          <div className="flex-1 bg-[#0A0A0B] border border-[#27272F] rounded-xl overflow-hidden">
            <iframe
              srcDoc={decodedInfo?.content || '<p style="color:#666;padding:20px;">No preview</p>'}
              title="Decompressed preview"
              className="w-full h-full min-h-[360px] border-none"
              sandbox="allow-scripts allow-same-origin allow-modals"
            />
          </div>
        </div>
      </div>

      <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} url={inputUrl} title={decodedInfo?.title || 'Bitty Box'} />
    </div>
  );
};
