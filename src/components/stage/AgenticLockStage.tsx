import React from 'react';
import { Bot, ArrowLeft, Check, Trash2, Cpu, Terminal, ShieldCheck } from 'lucide-react';
import { useStage, useDraft } from '../../stores/stageStore';

export const AgenticLockStage: React.FC = () => {
  const { discardDraft, commitDraft, dispatch } = useStage();
  const draft = useDraft();

  if (!draft) return null;

  const handleApply = () => {
    draft.setAgenticEnabled(true);
    commitDraft();
  };

  const handleCancel = () => {
    discardDraft();
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_AGENTIC_LOCK' });
    dispatch({ type: 'EXIT_MODE' });
  };

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/50 transition-all cursor-pointer"
            title="Cancel and return to editor"
            aria-label="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <Bot className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-indigo-200 tracking-wide font-cyber">AGENTIC LOCK</h2>
            <p className="text-[10px] text-indigo-400/70">WebMCP & AI agent verification guard</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] hover:bg-rose-900/50 hover:text-white transition-all cursor-pointer"
          title="Disable agentic lock"
        >
          <Trash2 className="w-3 h-3" /> Remove Lock
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
        <Cpu className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-200/85 leading-relaxed">
          Enforce automated execution constraints. Require an authentic WebMCP protocol session or verified autonomous agent caller before content is decrypted or evaluated.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="space-y-3 bg-[#050314]/70 border border-indigo-500/30 rounded-xl p-4">
        {/* Toggle WebMCP requirement */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#02010a] border border-indigo-500/30 cursor-pointer hover:border-indigo-400/60 transition-colors">
          <input
            type="checkbox"
            checked={draft.agenticRequireMcp}
            onChange={e => {
              draft.setAgenticRequireMcp(e.target.checked);
              draft.setAgenticEnabled(true);
            }}
            className="accent-indigo-500 mt-0.5 cursor-pointer"
          />
          <div>
            <span className="text-xs font-bold text-indigo-200 block">Require WebMCP Protocol Session</span>
            <span className="text-[10px] text-indigo-300/70 block mt-0.5">
              Only autonomous agents delivering a valid <code className="text-indigo-200 font-mono">Mcp-Session-Id</code> header or WebMCP transport handshake may unpack this capsule.
            </span>
          </div>
        </label>

        {/* Role constraint */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] text-indigo-300/80 font-bold uppercase flex items-center gap-1">
            <Terminal className="w-3 h-3 text-indigo-400" />
            AGENT CAPABILITY / ROLE TAG (OPTIONAL)
          </label>
          <input
            type="text"
            value={draft.agenticRoleFilter}
            onChange={e => {
              draft.setAgenticRoleFilter(e.target.value);
              draft.setAgenticEnabled(true);
            }}
            placeholder="e.g. coder, researcher, orchestrator, auditor"
            className="w-full rounded-xl border border-indigo-400/30 bg-[#02010a] px-3 py-2 text-xs text-indigo-100 placeholder:text-indigo-400/30 outline-none focus:border-indigo-300"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-indigo-500/20">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 py-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs hover:bg-cyan-950/40 hover:border-cyan-400 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:from-indigo-500 hover:to-indigo-400 hover:scale-[1.01] transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" /> Apply Lock
        </button>
      </div>
    </div>
  );
};
