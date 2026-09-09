import React from 'react';
import { Key, Clock, Eye, ShieldCheck, Bot, Sparkles, AlertCircle, X } from 'lucide-react';
import { useStage, useActiveLocksList, StageMode, ActiveLockInfo } from '../../stores/stageStore';

interface ActiveLockChipsProps {
  className?: string;
  onOpenMode?: (mode: StageMode) => void;
}

export const ActiveLockChips: React.FC<ActiveLockChipsProps> = ({ className = '', onOpenMode }) => {
  const { enterMode, dispatch } = useStage();
  const locks = useActiveLocksList();

  const handleChipClick = (mode: StageMode) => {
    if (onOpenMode) {
      onOpenMode(mode);
    } else {
      enterMode(mode);
    }
  };

  const handleRemoveLock = (e: React.MouseEvent, id: StageMode) => {
    e.stopPropagation();
    switch (id) {
      case 'passwordLock':
        dispatch({ type: 'REMOVE_PASSWORD' });
        break;
      case 'timeLock':
        dispatch({ type: 'REMOVE_TIME_LOCK' });
        break;
      case 'accessLimitLock':
        dispatch({ type: 'REMOVE_ACCESS_LIMIT' });
        break;
      case 'encryption':
        dispatch({ type: 'REMOVE_ENCRYPTION' });
        break;
      case 'agenticLock':
        dispatch({ type: 'REMOVE_AGENTIC_LOCK' });
        break;
      default:
        break;
    }
  };

  const getIcon = (type: ActiveLockInfo['iconType']) => {
    switch (type) {
      case 'password':
        return <Key className="w-3 h-3 shrink-0" />;
      case 'time':
        return <Clock className="w-3 h-3 shrink-0" />;
      case 'views':
        return <Eye className="w-3 h-3 shrink-0" />;
      case 'encryption':
        return <ShieldCheck className="w-3 h-3 shrink-0" />;
      case 'agentic':
        return <Bot className="w-3 h-3 shrink-0" />;
      default:
        return <Sparkles className="w-3 h-3 shrink-0" />;
    }
  };

  const getColorClasses = (type: ActiveLockInfo['iconType'], status: ActiveLockInfo['status']) => {
    if (status === 'incomplete') {
      return 'bg-amber-950/70 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] hover:bg-amber-900/60';
    }

    switch (type) {
      case 'password':
        return 'bg-fuchsia-950/70 border-fuchsia-500/50 text-fuchsia-200 shadow-[0_0_10px_rgba(217,70,239,0.3)] hover:bg-fuchsia-900/60 hover:border-fuchsia-400';
      case 'time':
        return 'bg-amber-950/70 border-amber-500/50 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)] hover:bg-amber-900/60 hover:border-amber-400';
      case 'views':
        return 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:bg-emerald-900/60 hover:border-emerald-400';
      case 'encryption':
        return 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200 shadow-[0_0_10px_rgba(0,242,255,0.3)] hover:bg-cyan-900/60 hover:border-cyan-400';
      case 'agentic':
        return 'bg-indigo-950/70 border-indigo-500/50 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:bg-indigo-900/60 hover:border-indigo-400';
      default:
        return 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50';
    }
  };

  if (locks.length === 0) {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] font-mono text-cyan-400/50 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
        <span>No locks configured (Open link)</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`} role="region" aria-label="Active Protection Locks">
      <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400/60 uppercase mr-1">
        PROTECTED BY:
      </span>
      {locks.map(lock => {
        const colorClasses = getColorClasses(lock.iconType, lock.status);
        return (
          <div
            key={lock.id}
            className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium transition-all duration-200 ${colorClasses}`}
            role="group"
            aria-label={`${lock.label} lock: ${lock.detail}`}
          >
            <button
              type="button"
              onClick={() => handleChipClick(lock.id)}
              className="inline-flex items-center gap-1.5 hover:underline cursor-pointer"
              title={`Configured: ${lock.detail} — click to edit`}
            >
              {getIcon(lock.iconType)}
              <span>{lock.label}</span>
              {lock.status === 'incomplete' ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-300 font-bold ml-0.5">
                  <AlertCircle className="w-2.5 h-2.5" /> Incomplete
                </span>
              ) : (
                <span className="text-[9px] opacity-75 font-normal ml-0.5">
                  ({lock.detail})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={e => handleRemoveLock(e, lock.id)}
              className="p-0.5 rounded-full hover:bg-white/20 text-current transition-colors opacity-70 hover:opacity-100 cursor-pointer ml-0.5"
              title={`Remove ${lock.label} lock`}
              aria-label={`Remove ${lock.label} lock`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
