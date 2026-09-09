import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HardDrive, Check, RefreshCw, Database, Sparkles } from 'lucide-react';

export interface SessionSaveIndicatorProps {
  lastSavedAt?: number | null;
  isSaving?: boolean;
  activeSessionTitle?: string;
  onManualSave?: () => void;
  className?: string;
}

function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Saved to browser';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  
  if (diffSec < 5) return 'Saved just now';
  if (diffSec < 60) return `Saved ${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Saved ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Saved ${diffHr}h ago`;
  
  const d = new Date(timestamp);
  return `Saved ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export const SessionSaveIndicator: React.FC<SessionSaveIndicatorProps> = ({
  lastSavedAt,
  isSaving = false,
  activeSessionTitle = 'Bitty Box Session',
  onManualSave,
  className = '',
}) => {
  const [timeText, setTimeText] = useState<string>(() => formatRelativeTime(lastSavedAt));
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [flashSaved, setFlashSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update relative time string every 3 seconds
  useEffect(() => {
    setTimeText(formatRelativeTime(lastSavedAt));
    const interval = setInterval(() => {
      setTimeText(formatRelativeTime(lastSavedAt));
    }, 3000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  // Flash checkmark animation when lastSavedAt updates
  useEffect(() => {
    if (lastSavedAt) {
      setFlashSaved(true);
      const timer = setTimeout(() => setFlashSaved(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [lastSavedAt]);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const formattedExactTime = useMemo(() => {
    if (!lastSavedAt) return 'Session stored in browser';
    const dateObj = new Date(lastSavedAt);
    return dateObj.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' ' + dateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastSavedAt]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onManualSave) {
      onManualSave();
      setFlashSaved(true);
      setTimeout(() => setFlashSaved(false), 1500);
    }
    setIsOpen(prev => !prev);
  };

  const showDetails = isHovered || isOpen;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${showDetails ? 'z-[100]' : 'z-20'} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        id="session-save-status-btn"
        onClick={handleClick}
        title="Session automatically saved to browser storage. Click to force save or toggle details."
        className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg bg-[#06182a]/90 hover:bg-[#09223c] border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-100 transition-all duration-200 shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer active:scale-95 relative z-10"
      >
        {/* Pulsing Status Dot or Spinner */}
        {isSaving ? (
          <RefreshCw className="w-3 h-3 text-cyan-300 animate-spin shrink-0" />
        ) : flashSaved ? (
          <Check className="w-3 h-3 text-emerald-400 shrink-0 animate-in zoom-in-50 duration-200" />
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
          </span>
        )}

        {/* Small HardDrive / Disk Icon */}
        <HardDrive className="w-3 h-3 text-emerald-400/80 group-hover:text-emerald-300 hidden xs:inline shrink-0" />

        {/* Text Status */}
        <span className="font-mono text-[10px] sm:text-[11px] tracking-tight text-emerald-300/90 group-hover:text-emerald-100 whitespace-nowrap">
          {isSaving ? (
            <span className="text-cyan-300">Saving...</span>
          ) : flashSaved ? (
            <span className="text-emerald-200 font-semibold">Saved just now</span>
          ) : (
            timeText
          )}
        </span>
      </button>

      {/* Futuristic Hover / Click Details Window Card */}
      {showDetails && (
        <div className="absolute top-full right-0 sm:left-1/2 sm:-translate-x-1/2 mt-2 w-64 p-3 rounded-xl bg-[#070b1a]/98 backdrop-blur-xl border border-emerald-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(16,185,129,0.3)] text-left font-mono z-[100] animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold tracking-wider">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>BROWSER PERSISTENCE</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              ACTIVE
            </span>
          </div>

          <div className="space-y-1.5 text-[10px] text-emerald-100/80">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Session:</span>
              <span className="text-emerald-200 font-bold truncate max-w-[130px]" title={activeSessionTitle}>
                {activeSessionTitle}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target:</span>
              <span className="text-cyan-300">localStorage (client)</span>
            </div>
            <div className="flex items-start justify-between gap-1">
              <span className="text-slate-400 shrink-0">Last Saved:</span>
              <span className="text-emerald-300 text-right leading-tight font-medium">
                {formattedExactTime}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center gap-1 text-[9px] text-emerald-400/80">
            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Continuous autosave on edit • Click to force save</span>
          </div>
        </div>
      )}
    </div>
  );
};
