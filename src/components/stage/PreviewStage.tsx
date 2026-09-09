import React, { useState } from 'react';
import { Eye, ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';
import { useStage } from '../../stores/stageStore';
import { BittyRenderer } from '../BittyRenderer';
import { buildBittyUrl } from '../../utils/bittyEngine';

export const PreviewStage: React.FC = () => {
  const { state, exitMode } = useStage();
  const [copied, setCopied] = useState(false);

  const url = buildBittyUrl(state.content, {
    title: state.title,
    description: state.description,
    favicon: state.favicon,
    password: state.password,
    includeMetadata: true,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exitMode}
            className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 transition-all cursor-pointer"
            title="Return to editor"
            aria-label="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,242,255,0.3)]">
            <Eye className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-cyan-200 tracking-wide font-cyber">LIVE PREVIEW</h2>
            <p className="text-[10px] text-cyan-400/70">Experience your Bitty Box as recipients see it</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs hover:bg-cyan-900/50 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.open(url, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs hover:bg-cyan-900/50 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in Tab</span>
          </button>
        </div>
      </div>

      {/* Embedded Live Renderer Frame */}
      <div className="w-full min-h-[420px] rounded-xl border border-cyan-500/30 bg-[#02010a]/90 overflow-hidden shadow-inner flex flex-col">
        <BittyRenderer
          hashFragment={state.content}
          activeContent={state.content}
          metadata={{
            title: state.title,
            description: state.description,
            favicon: state.favicon,
            includeMetadata: true,
          }}
          onEdit={() => exitMode()}
          onHome={() => exitMode()}
        />
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={exitMode}
          className="flex-1 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-cyan-200 text-xs font-bold hover:bg-cyan-900/50 hover:border-cyan-300 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Editor
        </button>
      </div>
    </div>
  );
};
