/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, QrCode as QrIcon, ExternalLink } from 'lucide-react';
import { generate_qr } from '../protocol/functions';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, url, title = 'Bitty Box Artifact' }) => {
  const [dataUri, setDataUri] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'gold' | 'amber' | 'white'>('gold');

  useEffect(() => {
    if (!isOpen || !url) return;
    const darkColor = colorMode === 'gold' ? '#D4AF37' : colorMode === 'amber' ? '#F59E0B' : '#FFFFFF';
    generate_qr({
      url,
      colorDark: darkColor,
      colorLight: '#0A0A0B',
      width: 400,
    }).then((res) => {
      if (res.data?.dataUri) {
        setDataUri(res.data.dataUri);
      }
    });
  }, [isOpen, url, colorMode]);

  if (!isOpen) return null;

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyImageToClipboard = async () => {
    try {
      const res = await fetch(dataUri);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      copyUrlToClipboard();
    }
  };

  const downloadQr = () => {
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_bittybox_qr.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#141417] border border-[#27272F] rounded-2xl p-6 shadow-2xl glow-gold">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272F]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <QrIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">BITTY BOX QR CODE</h3>
              <p className="text-xs text-[#8E8E98] truncate max-w-[240px]">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E8E98] hover:text-white hover:bg-[#1E1E24] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette Switcher */}
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs font-mono text-[#8E8E98]">PALETTE</span>
          <div className="flex gap-2">
            <button
              onClick={() => setColorMode('gold')}
              className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                colorMode === 'gold' ? 'bg-[#D4AF37] text-black font-semibold' : 'bg-[#1E1E24] text-[#8E8E98]'
              }`}
            >
              Gold
            </button>
            <button
              onClick={() => setColorMode('amber')}
              className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                colorMode === 'amber' ? 'bg-[#F59E0B] text-black font-semibold' : 'bg-[#1E1E24] text-[#8E8E98]'
              }`}
            >
              Amber
            </button>
            <button
              onClick={() => setColorMode('white')}
              className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                colorMode === 'white' ? 'bg-white text-black font-semibold' : 'bg-[#1E1E24] text-[#8E8E98]'
              }`}
            >
              Mono
            </button>
          </div>
        </div>

        {/* QR Display */}
        <div className="mt-4 flex flex-col items-center justify-center p-6 bg-[#0A0A0B] border border-[#27272F] rounded-xl relative group">
          {dataUri ? (
            <img src={dataUri} alt="Bitty Box QR" className="w-56 h-56 rounded-lg object-contain shadow-md" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs font-mono text-[#8E8E98]">
              Encoding QR matrix...
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-[#8E8E98]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>URL-NATIVE · NO HOSTING REQUIRED</span>
          </div>
        </div>

        {/* URL details snippet */}
        <div className="mt-4 bg-[#0A0A0B] border border-[#27272F] rounded-lg p-2.5 flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-[#8E8E98] truncate flex-1">{url}</span>
          <button
            onClick={copyUrlToClipboard}
            className="px-2.5 py-1 text-xs rounded bg-[#1E1E24] hover:bg-[#27272F] text-[#D4AF37] font-medium flex items-center gap-1 transition-colors shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedUrl ? 'Copied' : 'Copy URL'}
          </button>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={copyImageToClipboard}
            className="py-2.5 px-4 rounded-xl border border-[#27272F] bg-[#1E1E24] hover:bg-[#27272F] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Image' : 'Copy Image'}
          </button>
          <button
            onClick={downloadQr}
            className="py-2.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E2C04D] text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#D4AF37]/20"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
};
