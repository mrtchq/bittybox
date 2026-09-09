import { useState, useRef, useCallback, useEffect } from 'react';

interface UseUndoRedoOptions {
  maxDepth?: number;
  debounceMs?: number;
}

export interface UseUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  undo: () => void;
  redo: () => void;
  recordChange: (newContent: string, immediate?: boolean) => void;
  resetHistory: (initialContent: string) => void;
}

export function useUndoRedo(
  content: string,
  onChangeContent: (content: string) => void,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn {
  const { maxDepth = 100, debounceMs = 400 } = options;

  const [history, setHistory] = useState<string[]>([content]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const historyRef = useRef<string[]>([content]);
  const currentIndexRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUndoRedoActionRef = useRef<boolean>(false);

  // Keep refs in sync with state
  historyRef.current = history;
  currentIndexRef.current = currentIndex;

  const commitToHistory = useCallback((val: string) => {
    const curHist = historyRef.current;
    const curIdx = currentIndexRef.current;

    // If current value is identical to the entry at current index, ignore
    if (curHist[curIdx] === val) return;

    const truncated = curHist.slice(0, curIdx + 1);
    const nextHistory = [...truncated, val];

    if (nextHistory.length > maxDepth) {
      nextHistory.shift();
    }

    const newIdx = nextHistory.length - 1;
    historyRef.current = nextHistory;
    currentIndexRef.current = newIdx;
    setHistory(nextHistory);
    setCurrentIndex(newIdx);
  }, [maxDepth]);

  // Record a new state into the history stack
  const recordChange = useCallback(
    (newContent: string, immediate: boolean = false) => {
      if (isUndoRedoActionRef.current) {
        isUndoRedoActionRef.current = false;
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (immediate) {
        commitToHistory(newContent);
      } else {
        debounceTimerRef.current = setTimeout(() => {
          commitToHistory(newContent);
        }, debounceMs);
      }
    },
    [commitToHistory, debounceMs]
  );

  // Undo step
  const undo = useCallback(() => {
    // Flush any pending debounce or cancel
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const curHist = historyRef.current;
    const curIdx = currentIndexRef.current;

    if (curIdx > 0) {
      const prevIndex = curIdx - 1;
      const targetContent = curHist[prevIndex];
      isUndoRedoActionRef.current = true;
      currentIndexRef.current = prevIndex;
      setCurrentIndex(prevIndex);
      onChangeContent(targetContent);
    }
  }, [onChangeContent]);

  // Redo step
  const redo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const curHist = historyRef.current;
    const curIdx = currentIndexRef.current;

    if (curIdx < curHist.length - 1) {
      const nextIndex = curIdx + 1;
      const targetContent = curHist[nextIndex];
      isUndoRedoActionRef.current = true;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      onChangeContent(targetContent);
    }
  }, [onChangeContent]);

  // Reset history
  const resetHistory = useCallback((initialContent: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    historyRef.current = [initialContent];
    currentIndexRef.current = 0;
    setHistory([initialContent]);
    setCurrentIndex(0);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    undoCount: currentIndex,
    redoCount: Math.max(0, history.length - 1 - currentIndex),
    undo,
    redo,
    recordChange,
    resetHistory,
  };
}
