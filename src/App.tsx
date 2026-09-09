import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BittyNavbar } from './components/BittyNavbar';
import { HoloBackground } from './components/HoloBackground';
import { BittyStageView } from './components/stage/BittyStageView';
import { BittyRenderer } from './components/BittyRenderer';
import { HistoryModal } from './components/HistoryModal';
import { AboutModal } from './components/AboutModal';
import { AgentsPage } from './components/AgentsPage';
import { OpenMoltConsole } from './components/OpenMoltConsole';
import { QrModal } from './components/QrModal';
import { LegalModal, LegalTab } from './components/LegalModal';
import { BittyMetadata, BittyHistoryItem, AppView, TemplatePreset, WorkspaceTheme, BittySession, BittyChainDraft } from './types';
import { 
  compressContent, 
  compressContentSync,
  decompressBittyData,
  buildBittyUrl, 
  parseBittyHash, 
  hashString 
} from './utils/bittyEngine';
import { exportBittyToZip } from './utils/zipExport';
import { TEMPLATE_PRESETS } from './data/templates';
import { createBittyTour } from './components/OnboardingTour';
import { ConfirmCloseSessionModal } from './components/ConfirmCloseSessionModal';
import { AnimatedSplash } from './components/AnimatedSplash';
import { CyberScrambleText } from './components/CyberScrambleText';
import { Zap, RefreshCw } from 'lucide-react';
import { useProStatus } from './hooks/useProStatus';
import { useAccount } from './hooks/useAccount';
import { AccountDashboard } from './components/AccountDashboard';
import { ProPaywallModal } from './components/ProPaywallModal';
import { EdgeGripHandles } from './components/EdgeGripHandles';
import { ChainNextModal } from './components/ChainNextModal';
import { PreviewDropdownPanel } from './components/PreviewDropdownPanel';
import { TemplatesSidePanel } from './components/TemplatesSidePanel';
import { StudioToolsSidePanel } from './components/StudioToolsSidePanel';
import { useEdgeSwipe } from './hooks/useEdgeSwipe';
import { motion, AnimatePresence } from 'motion/react';
import {
  BITTY_CHAIN_MAX_PAGES,
  createChainDraftFromCurrent,
  createNextChainDraftPage,
  deleteChainDraftPage,
  generateChainedBittyUrls,
  loadChainDraft,
  reorderChainDraftPages,
  saveChainDraft,
  updateChainDraftPage,
  calculateTotalChainCreditCost,
} from './utils/bittyChain';

const DEFAULT_STARTER_HTML = '';

function getInitialUrlState() {
  if (typeof window === 'undefined') return { hash: '', payload: '', metadata: null, isViewer: false, isAuth: false, isAccount: false, isTerms: false, isPrivacy: false, isAgents: false };
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  if (hash.includes('#/auth/verify') || hash.includes('token=') || search.includes('token=')) {
    return { hash, payload: '', metadata: null, isViewer: false, isAuth: true, isAccount: false, isTerms: false, isPrivacy: false, isAgents: false };
  }
  if (hash === '#/account') {
    return { hash, payload: '', metadata: null, isViewer: false, isAuth: false, isAccount: true, isTerms: false, isPrivacy: false, isAgents: false };
  }
  if (hash === '#/agents' || hash === '#agents' || hash === '#/agent' || hash === '#agent') {
    return { hash, payload: '', metadata: null, isViewer: false, isAuth: false, isAccount: false, isTerms: false, isPrivacy: false, isAgents: true };
  }
  if (hash === '#/terms' || hash === '#terms') {
    return { hash, payload: '', metadata: null, isViewer: false, isAuth: false, isAccount: false, isTerms: true, isPrivacy: false, isAgents: false };
  }
  if (hash === '#/privacy' || hash === '#privacy') {
    return { hash, payload: '', metadata: null, isViewer: false, isAuth: false, isAccount: false, isTerms: false, isPrivacy: true, isAgents: false };
  }
  if (hash && hash.length > 2 && hash !== '#/edit' && hash !== '#edit' && hash !== '#/studio' && hash !== '#/account' && hash !== '#/' && hash !== '#' && hash !== '#/terms' && hash !== '#terms' && hash !== '#/privacy' && hash !== '#privacy' && hash !== '#/agents' && hash !== '#agents' && hash !== '#/agent' && hash !== '#agent') {
    const { payload, metadata } = parseBittyHash(hash);
    return { hash, payload, metadata, isViewer: Boolean(payload), isAuth: false, isAccount: false, isTerms: false, isPrivacy: false, isAgents: false };
  }
  return { hash: '', payload: '', metadata: null, isViewer: false, isAuth: false, isAccount: false, isTerms: false, isPrivacy: false, isAgents: false };
}

export default function App() {
  const proStatus = useProStatus();
  const initialUrl = useMemo(() => getInitialUrlState(), []);
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (initialUrl.isAuth || initialUrl.isAccount) return 'account';
    if (initialUrl.isAgents) return 'agents';
    return initialUrl.isViewer ? 'viewer' : 'editor';
  });
  const [inlinePreviewActive, setInlinePreviewActive] = useState<boolean>(false);
  const [content, setContent] = useState<string>(() => (initialUrl.isViewer ? '' : DEFAULT_STARTER_HTML));
  const [metadata, setMetadata] = useState<BittyMetadata>(() => {
    return {
      title: initialUrl.metadata?.title || 'My Box',
      description: initialUrl.metadata?.description || '',
      favicon: initialUrl.metadata?.favicon || '📦',
      image: initialUrl.metadata?.image,
      boxId: initialUrl.metadata?.boxId,
      lockConfig: initialUrl.metadata?.lockConfig,
      chain: initialUrl.metadata?.chain,
      includeMetadata: true,
    };
  });

  // Multi-session state
  const [sessions, setSessions] = useState<BittySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('sess-starter');

  // Session save state (tracks when session was last persisted to browser storage)
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number>(() => Date.now());
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);

  // Persistent Workspace Theme state ('synthwave' | 'monochrome' | 'matrix')
  const account = useAccount();
  const [workspaceTheme, setWorkspaceTheme] = useState<WorkspaceTheme>(() => {
    try {
      const saved = localStorage.getItem('bitty_workspace_theme');
      if (saved === 'synthwave' || saved === 'monochrome' || saved === 'matrix') {
        return saved;
      }
    } catch {}
    return 'monochrome';
  });

  const [bittyUrl, setBittyUrl] = useState<string>(() => (initialUrl.hash ? window.location.href : ''));
  const [hashFragment, setHashFragment] = useState<string>(() => initialUrl.payload);
  const [originalBytes, setOriginalBytes] = useState<number>(0);
  const [compressedBytes, setCompressedBytes] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [isLeftTemplatesPanelOpen, setIsLeftTemplatesPanelOpen] = useState<boolean>(false);
  const [isRightToolsPanelOpen, setIsRightToolsPanelOpen] = useState<boolean>(false);
  const [isPreviewDropdownOpen, setIsPreviewDropdownOpen] = useState<boolean>(false);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(() => Boolean(initialUrl.isTerms || initialUrl.isPrivacy));
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>(() => (initialUrl.isPrivacy ? 'privacy' : 'terms'));
  const [history, setHistory] = useState<BittyHistoryItem[]>([]);
  const [chainDraft, setChainDraft] = useState<BittyChainDraft | null>(() => loadChainDraft());
  const [isChainModalOpen, setIsChainModalOpen] = useState<boolean>(false);
  const [isLastEditorSlide, setIsLastEditorSlide] = useState<boolean>(false);

  const chainEnabled = Boolean(chainDraft?.enabled);
  const chainCurrentIndex = chainDraft?.currentIndex ?? 0;
  const chainTotal = chainDraft?.pages.length ?? 1;
  const isLastChainBox = !chainEnabled || chainCurrentIndex >= chainTotal - 1;

  const calculatedCreditCost = useMemo(() => {
    if (chainEnabled && chainDraft?.pages) {
      return calculateTotalChainCreditCost(chainDraft.pages).totalCost;
    }
    let cost = 0;
    if (metadata.lockConfig?.timeWindow?.enabled || metadata.lockConfig?.timeWindow?.mode) cost += 10;
    if (metadata.lockConfig?.openLimit?.enabled) cost += 10;
    return cost;
  }, [chainEnabled, chainDraft, metadata.lockConfig]);

  // Edge Swiping Gesture Hook
  useEdgeSwipe({
    onSwipeFromLeft: () => setIsLeftTemplatesPanelOpen(true),
    onSwipeFromRight: () => setIsRightToolsPanelOpen(true),
    onSwipeLeftToClose: () => setIsLeftTemplatesPanelOpen(false),
    onSwipeRightToClose: () => setIsRightToolsPanelOpen(false),
    isLeftOpen: isLeftTemplatesPanelOpen,
    isRightOpen: isRightToolsPanelOpen,
  });

  // Global Keyboard Shortcuts (Ctrl/Cmd + [ for Templates, Ctrl/Cmd + ] for Tools)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (isCtrlOrCmd && e.key === '[') {
        e.preventDefault();
        setIsLeftTemplatesPanelOpen(prev => !prev);
      } else if (isCtrlOrCmd && e.key === ']') {
        e.preventDefault();
        setIsRightToolsPanelOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [isVerifyingMagic, setIsVerifyingMagic] = useState<boolean>(() => Boolean(initialUrl.isAuth));

  // Apply workspace theme to document root & sync with localStorage
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', workspaceTheme);
      localStorage.setItem('bitty_workspace_theme', workspaceTheme);
    } catch {}
  }, [workspaceTheme]);

  useEffect(() => {
    saveChainDraft(chainDraft);
  }, [chainDraft]);

  // Magic Link verification handler on URL mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    let token: string | null = null;

    if (hash.includes('token=')) {
      const match = hash.match(/token=([a-zA-Z0-9_\-]+)/);
      if (match) token = match[1];
    } else if (search.includes('token=')) {
      const params = new URLSearchParams(search);
      token = params.get('token');
    }

    if (token) {
      setIsVerifyingMagic(true);
      setShowSplash(false);
      account.verifyMagicLink(token).then(success => {
        setIsVerifyingMagic(false);
        if (success) {
          setShowSplash(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }).catch(() => {
        setIsVerifyingMagic(false);
      });
    }
  }, []);

  // Load history & initialize sessions on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('bitty_box_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch {}

    // Check if there is an active hash in the URL for viewer mode
    const hash = window.location.hash;
    const isSpecialRoute = !hash || hash === '#/edit' || hash === '#edit' || hash === '#/studio' || hash === '#/terms' || hash === '#terms' || hash === '#/privacy' || hash === '#privacy';

    // Load multi-sessions from localStorage
    let loadedSessions: BittySession[] = [];
    try {
      const raw = localStorage.getItem('bitty_multi_sessions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedSessions = parsed;
        }
      }
    } catch {}

    if (loadedSessions.length > 0) {
      setSessions(loadedSessions);
      if (isSpecialRoute) {
        const activeSess = loadedSessions[0];
        setCurrentSessionId(activeSess.id);
        setContent(activeSess.content);
        setMetadata(activeSess.metadata);
        if (activeSess.savedAt) {
          setLastSavedTimestamp(activeSess.savedAt);
        }
      }
    } else {
      // Check autosaved session draft fallback
      let initialContent = DEFAULT_STARTER_HTML;
      let initialMeta: BittyMetadata = {
        title: 'My Box',
        description: '',
        favicon: '📦',
        includeMetadata: true,
      };

      if (isSpecialRoute) {
        try {
          const savedDraft = sessionStorage.getItem('bitty_box_autosave');
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed.content) initialContent = parsed.content;
            if (parsed.metadata) initialMeta = { ...initialMeta, ...parsed.metadata };
          }
        } catch {}
      }

      const initialSess: BittySession = {
        id: 'sess-default',
        title: initialMeta.title || 'My Box',
        favicon: initialMeta.favicon || '📦',
        content: initialContent,
        metadata: initialMeta,
        savedAt: Date.now(),
      };

      setSessions([initialSess]);
      setCurrentSessionId(initialSess.id);
      setContent(initialContent);
      setMetadata(initialMeta);
      try {
        localStorage.setItem('bitty_multi_sessions', JSON.stringify([initialSess]));
      } catch {}
    }

    if (isSpecialRoute) {
      // Auto-launch guided walkthrough for first-time visitors if no active hash payload
      try {
        const tourSeen = localStorage.getItem('bitty_walkthrough_seen');
        if (!tourSeen) {
          const timer = setTimeout(() => {
            const tour = createBittyTour({
              onComplete: () => {
                try { localStorage.setItem('bitty_walkthrough_seen', 'true'); } catch {}
              },
              onCancel: () => {
                try { localStorage.setItem('bitty_walkthrough_seen', 'true'); } catch {}
              },
            });
            tour.start();
          }, 800);
          return () => clearTimeout(timer);
        }
      } catch {}
    }
  }, []);

  // Sync content updates with active session
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setChainDraft(prev => prev?.enabled ? updateChainDraftPage(prev, prev.currentIndex, newContent, metadata) : prev);
    const now = Date.now();
    setIsSavingSession(true);
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === currentSessionId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          content: newContent,
          savedAt: now,
        };
        try {
          localStorage.setItem('bitty_multi_sessions', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });
    setLastSavedTimestamp(now);
    const saveTimer = setTimeout(() => setIsSavingSession(false), 250);
    return () => clearTimeout(saveTimer);
  }, [currentSessionId, metadata]);

  // Sync metadata updates with active session
  const handleMetadataChange = useCallback((newMetadata: BittyMetadata) => {
    setMetadata(newMetadata);
    setChainDraft(prev => prev?.enabled ? updateChainDraftPage(prev, prev.currentIndex, content, newMetadata) : prev);
    const now = Date.now();
    setIsSavingSession(true);
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === currentSessionId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          title: newMetadata.title || 'Untitled',
          favicon: newMetadata.favicon || '📦',
          metadata: newMetadata,
          savedAt: now,
        };
        try {
          localStorage.setItem('bitty_multi_sessions', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });
    setLastSavedTimestamp(now);
    const saveTimer = setTimeout(() => setIsSavingSession(false), 250);
    return () => clearTimeout(saveTimer);
  }, [currentSessionId, content]);

  // Manual Force Save Handler
  const handleManualSaveSession = useCallback(() => {
    setIsSavingSession(true);
    const now = Date.now();
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === currentSessionId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          content,
          metadata,
          savedAt: now,
        };
        try {
          localStorage.setItem('bitty_multi_sessions', JSON.stringify(updated));
          sessionStorage.setItem('bitty_box_autosave', JSON.stringify({
            id: currentSessionId,
            content,
            metadata,
            savedAt: now,
          }));
        } catch {}
        return updated;
      }
      return prev;
    });
    setLastSavedTimestamp(now);
    setTimeout(() => setIsSavingSession(false), 300);
  }, [content, metadata, currentSessionId]);

  // Switch to another session
  const handleSwitchSession = useCallback((sessionId: string) => {
    const target = sessions.find(s => s.id === sessionId);
    if (target) {
      setCurrentSessionId(target.id);
      setContent(target.content);
      setMetadata(target.metadata);
      if (target.savedAt) {
        setLastSavedTimestamp(target.savedAt);
      }
      try {
        sessionStorage.setItem('bitty_box_autosave', JSON.stringify({
          id: target.id,
          content: target.content,
          metadata: target.metadata,
          savedAt: Date.now(),
        }));
      } catch {}
    }
  }, [sessions]);

  // Close session by ID
  const handleCloseSessionById = useCallback((sessionId: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId);
      try {
        localStorage.setItem('bitty_multi_sessions', JSON.stringify(remaining));
      } catch {}

      if (sessionId === currentSessionId) {
        if (remaining.length > 0) {
          const nextSession = remaining[0];
          setCurrentSessionId(nextSession.id);
          setContent(nextSession.content);
          setMetadata(nextSession.metadata);
          try {
            sessionStorage.setItem('bitty_box_autosave', JSON.stringify({
              id: nextSession.id,
              content: nextSession.content,
              metadata: nextSession.metadata,
              savedAt: Date.now(),
            }));
          } catch {}
        } else {
          // If no sessions remain, reset completely to a single fresh clean starter
          const freshId = 'sess-' + Date.now();
          const freshSession: BittySession = {
            id: freshId,
            title: 'My Box',
            favicon: '📦',
            content: DEFAULT_STARTER_HTML,
            metadata: {
              title: 'My Box',
              description: '',
              favicon: '📦',
              includeMetadata: true,
            },
            savedAt: Date.now(),
          };
          setCurrentSessionId(freshId);
          setContent(freshSession.content);
          setMetadata(freshSession.metadata);
          try {
            sessionStorage.removeItem('bitty_box_autosave');
            localStorage.setItem('bitty_multi_sessions', JSON.stringify([freshSession]));
          } catch {}
          return [freshSession];
        }
      }
      return remaining;
    });
  }, [currentSessionId]);

  // Guided Walkthrough trigger handler
  const handleStartTour = useCallback(() => {
    if (currentView !== 'editor') {
      setCurrentView('editor');
    }
    setTimeout(() => {
      const tour = createBittyTour({
        onComplete: () => {
          try { localStorage.setItem('bitty_walkthrough_seen', 'true'); } catch {}
        },
        onCancel: () => {
          try { localStorage.setItem('bitty_walkthrough_seen', 'true'); } catch {}
        },
      });
      tour.start();
    }, 150);
  }, [currentView]);

  // Save history to localStorage whenever it changes
  const saveToHistory = useCallback((item: BittyHistoryItem) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== item.id);
      const updated = [item, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('bitty_box_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleSetChainEnabled = useCallback((enabled: boolean) => {
    if (!enabled) {
      setChainDraft(null);
      setIsChainModalOpen(false);
      return;
    }
    setChainDraft(prev => prev?.enabled ? updateChainDraftPage(prev, prev.currentIndex, content, metadata) : createChainDraftFromCurrent(content, metadata));
  }, [content, metadata]);

  const goToChainPage = useCallback((targetIndex: number) => {
    if (!chainDraft?.enabled) return;
    const persisted = updateChainDraftPage(chainDraft, chainDraft.currentIndex, content, metadata);
    const safeIndex = Math.min(Math.max(0, targetIndex), persisted.pages.length - 1);
    const target = persisted.pages[safeIndex];
    setChainDraft({ ...persisted, currentIndex: safeIndex, updatedAt: Date.now() });
    setContent(target.content);
    setMetadata(target.metadata);
  }, [chainDraft, content, metadata]);

  const handleOpenChainNext = useCallback(() => {
    const baseDraft = chainDraft?.enabled
      ? updateChainDraftPage(chainDraft, chainDraft.currentIndex, content, metadata)
      : createChainDraftFromCurrent(content, metadata);

    if (baseDraft.currentIndex < baseDraft.pages.length - 1) {
      const nextIndex = baseDraft.currentIndex + 1;
      const target = baseDraft.pages[nextIndex];
      setChainDraft({ ...baseDraft, currentIndex: nextIndex, updatedAt: Date.now() });
      setContent(target.content);
      setMetadata(target.metadata);
      return;
    }

    setChainDraft(baseDraft);
    if (baseDraft.pages.length < BITTY_CHAIN_MAX_PAGES) {
      setIsChainModalOpen(true);
    }
  }, [chainDraft, content, metadata]);

  const handleCreateNextChainPage = useCallback((mode: 'clone' | 'scratch') => {
    const baseDraft = chainDraft?.enabled
      ? updateChainDraftPage(chainDraft, chainDraft.currentIndex, content, metadata)
      : createChainDraftFromCurrent(content, metadata);
    const nextDraft = createNextChainDraftPage(baseDraft, mode, content, metadata);
    const target = nextDraft.pages[nextDraft.currentIndex];
    setChainDraft(nextDraft);
    setContent(target.content);
    setMetadata(target.metadata);
    setIsChainModalOpen(false);
  }, [chainDraft, content, metadata]);

  const handleGoToLastChainBox = useCallback(() => {
    if (!chainDraft?.enabled) return;
    goToChainPage(chainDraft.pages.length - 1);
  }, [chainDraft, goToChainPage]);

  const handleDeleteLastChainBox = useCallback(() => {
    if (!chainDraft?.enabled || chainDraft.pages.length <= 1) return;
    const persisted = updateChainDraftPage(chainDraft, chainDraft.currentIndex, content, metadata);
    const updatedDraft = deleteChainDraftPage(persisted, persisted.pages.length - 1);
    const target = updatedDraft.pages[updatedDraft.currentIndex];
    setChainDraft(updatedDraft);
    if (target) {
      setContent(target.content);
      setMetadata(target.metadata);
    }
  }, [chainDraft, content, metadata]);

  const handleDeleteChainPage = useCallback((indexToDelete: number) => {
    if (!chainDraft?.enabled || chainDraft.pages.length <= 1) return;
    const persisted = updateChainDraftPage(chainDraft, chainDraft.currentIndex, content, metadata);
    const updatedDraft = deleteChainDraftPage(persisted, indexToDelete);
    const target = updatedDraft.pages[updatedDraft.currentIndex];
    setChainDraft(updatedDraft);
    if (target) {
      setContent(target.content);
      setMetadata(target.metadata);
    }
  }, [chainDraft, content, metadata]);

  const handleReorderChainPages = useCallback((fromIndex: number, toIndex: number) => {
    if (!chainDraft?.enabled || chainDraft.pages.length <= 1 || fromIndex === toIndex) return;
    const persisted = updateChainDraftPage(chainDraft, chainDraft.currentIndex, content, metadata);
    const updatedDraft = reorderChainDraftPages(persisted, fromIndex, toIndex);
    const target = updatedDraft.pages[updatedDraft.currentIndex];
    setChainDraft(updatedDraft);
    if (target) {
      setContent(target.content);
      setMetadata(target.metadata);
    }
  }, [chainDraft, content, metadata]);

  const handleGenerateChain = useCallback(async (currentContent: string, currentMetadata: BittyMetadata) => {
    const baseDraft = chainDraft?.enabled
      ? updateChainDraftPage(chainDraft, chainDraft.currentIndex, currentContent, currentMetadata)
      : createChainDraftFromCurrent(currentContent, currentMetadata);
    const urls = await generateChainedBittyUrls(baseDraft.pages, {
      origin: window.location.origin,
      chainId: baseDraft.chainId,
    });
    const entryUrl = urls[0] || '';
    if (!entryUrl) return { entryUrl: '', urls };

    const parsedEntry = parseBittyHash(new URL(entryUrl).hash);
    setBittyUrl(entryUrl);
    setHashFragment(parsedEntry.payload);
    setChainDraft({ ...baseDraft, updatedAt: Date.now() });

    const id = await hashString(entryUrl);
    const totalByteSize = baseDraft.pages.reduce((sum, page) => sum + (page.content?.length || 0), 0);
    const chainCreditCalculation = calculateTotalChainCreditCost(baseDraft.pages);
    const chainCost = chainCreditCalculation.totalCost;

    saveToHistory({
      id,
      url: entryUrl,
      title: baseDraft.pages[0]?.metadata.title || currentMetadata.title || 'Chained Bitty Box',
      description: baseDraft.pages[0]?.metadata.description || currentMetadata.description,
      favicon: baseDraft.pages[0]?.metadata.favicon || currentMetadata.favicon || '📦',
      image: baseDraft.pages[0]?.metadata.image || currentMetadata.image,
      byteSize: totalByteSize,
      compressedSize: entryUrl.length,
      createdAt: Date.now(),
      encrypted: baseDraft.pages.some(p => Boolean(p.metadata.password)),
    });

    if (account.isAuthenticated || account.user) {
      await account.recordCreatedBox({
        title: baseDraft.pages[0]?.metadata.title || currentMetadata.title || 'Chained Bitty Box',
        url: entryUrl,
        format: 'chain',
        boxBreakdowns: chainCreditCalculation.boxBreakdowns,
        byteSize: totalByteSize,
        compressedSize: entryUrl.length,
        encrypted: baseDraft.pages.some(p => Boolean(p.metadata.password)),
        locks: {
          password: baseDraft.pages.some(p => Boolean(p.metadata.password)),
          timeWindow: baseDraft.pages.some(p => Boolean(p.metadata.lockConfig?.timeWindow?.enabled)),
          accessLimit: baseDraft.pages.some(p => Boolean(p.metadata.lockConfig?.openLimit?.enabled)),
        },
      });
    }

    try {
      window.history.replaceState(null, '', '/#/edit');
    } catch {}

    return {
      entryUrl,
      urls,
      creditCost: chainCost,
      boxCreditBreakdowns: chainCreditCalculation.boxBreakdowns,
    };
  }, [chainDraft, saveToHistory, account]);

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      try {
        localStorage.setItem('bitty_box_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('bitty_box_history');
    } catch {}
  };

  // Re-calculate compression on content or metadata changes (ONLY when in Studio Editor)
  const updateCompression = useCallback(async () => {
    if (currentView === 'viewer') return;
    if (!content.trim()) {
      setOriginalBytes(0);
      setCompressedBytes(0);
      setBittyUrl('');
      setHashFragment('');
      return;
    }

    const { compressedUrl, originalBytes: orig, compressedBytes: comp } = await compressContent(content, {
      password: metadata.password,
    });

    setOriginalBytes(orig);
    setCompressedBytes(comp);

    const fullUrl = buildBittyUrl(compressedUrl, metadata);
    setBittyUrl(fullUrl);
    setHashFragment(compressedUrl);
  }, [content, metadata, currentView]);

  useEffect(() => {
    if (currentView === 'viewer') return;
    const timer = setTimeout(() => {
      updateCompression();
    }, 200);
    return () => clearTimeout(timer);
  }, [content, metadata, currentView, updateCompression]);

  // Read URL on mount or hashchange
  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      if (hash.includes('auth/verify') || hash.includes('token=') || search.includes('token=')) {
        setShowSplash(false);
        setCurrentView('account');
        return;
      }

      if (hash === '#/account') {
        setShowSplash(false);
        setCurrentView('account');
        return;
      }

      if (hash === '#/agents' || hash === '#agents' || hash === '#/agent' || hash === '#agent') {
        setShowSplash(false);
        setCurrentView('agents');
        return;
      }

      if (hash === '#/studio') {
        setShowSplash(true);
        return;
      }

      if (hash === '#/edit' || hash === '#edit') {
        setCurrentView('editor');
        return;
      }

      if (hash && hash.length > 2) {
        // Check if there is a valid data payload to view
        const { payload, metadata: parsedMeta } = parseBittyHash(hash);

        if (payload) {
          setShowSplash(false);
          setHashFragment(payload);
          if (parsedMeta) {
            setMetadata({
              title: parsedMeta.title || 'My Box',
              description: parsedMeta.description || '',
              favicon: parsedMeta.favicon || '📦',
              image: parsedMeta.image,
              boxId: parsedMeta.boxId,
              lockConfig: parsedMeta.lockConfig,
              chain: parsedMeta.chain,
              includeMetadata: true,
            });
          }
          decompressBittyData(payload).then(res => {
            if (!res.error && !res.needsPassword && res.content) {
              setContent(res.content);
            }
          });
          setCurrentView('viewer');
        }
      }
    };

    handleUrlChange();
    window.addEventListener('hashchange', handleUrlChange);
    return () => window.removeEventListener('hashchange', handleUrlChange);
  }, []);

  // Generate & Copy action (opens generated URL in a new tab like OPEN TAB)
  const handleGenerate = async () => {
    const hasPasscode = Boolean(metadata.password && metadata.password.trim().length > 0);
    const hasTimeWindow = Boolean(metadata.lockConfig?.timeWindow?.enabled);
    const hasAccessLimit = Boolean(metadata.lockConfig?.openLimit?.enabled);
    let requiredCost = 0;
    // Passcode is free (0 CR)
    if (hasTimeWindow) requiredCost += 10;
    if (hasAccessLimit) requiredCost += 10;

    if (requiredCost > 0) {
      const userIsPro = Boolean(proStatus.isPro || account.user?.tier === 'pro');
      const curCredits = account.user?.credits ?? 0;
      const canProceed = userIsPro || (account.isAuthenticated && curCredits >= requiredCost);
      if (!canProceed) {
        proStatus.openPaywall('Time & View Limit Locks (10 CR)');
        return;
      }
    }

    // 1. Determine target URL synchronously so window.open executes within the user click gesture
    let targetUrl = bittyUrl;
    if (!metadata.password) {
      try {
        const syncRes = compressContentSync(content, { mimeType: 'text/html' });
        if (syncRes) {
          targetUrl = buildBittyUrl(syncRes.compressedUrl, metadata);
        }
      } catch {}
    }

    // 2. Open new tab directly in direct user gesture context if targetUrl is known
    let newTab: Window | null = null;
    if (targetUrl) {
      try {
        newTab = window.open(targetUrl, '_blank');
      } catch {}
      if (!newTab) {
        try {
          const a = document.createElement('a');
          a.href = targetUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch {}
      }
    }

    // 3. Complete async compression, state update, address bar update, history record & clipboard
    const { compressedUrl, originalBytes: orig, compressedBytes: comp } = await compressContent(content, {
      password: metadata.password,
    });

    let updatedMetadata = { ...metadata };
    if (metadata.lockConfig?.openLimit?.enabled && !metadata.boxId) {
      const generatedBoxId = `bbx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      updatedMetadata.boxId = generatedBoxId;
      setMetadata(updatedMetadata);
      try {
        await fetch('/api/boxes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: generatedBoxId,
            boxId: generatedBoxId,
            title: metadata.title || 'Bitty Box',
            bittyUrl: compressedUrl,
            lockConfig: metadata.lockConfig,
          }),
        });
      } catch {}
    }

    const fullUrl = buildBittyUrl(compressedUrl, updatedMetadata);
    setBittyUrl(fullUrl);
    setHashFragment(compressedUrl);

    // Save to browser address bar without reload
    window.history.replaceState(null, '', fullUrl);

    // If newTab was opened without targetUrl or URL updated, redirect it to fullUrl
    if (newTab && (!targetUrl || targetUrl !== fullUrl)) {
      try {
        newTab.location.href = fullUrl;
      } catch {}
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}

    // Record to Vault history
    const id = await hashString(fullUrl);
    saveToHistory({
      id,
      url: fullUrl,
      title: metadata.title || 'Untitled Bitty Box',
      description: metadata.description,
      favicon: metadata.favicon,
      image: metadata.image,
      byteSize: orig,
      compressedSize: comp,
      createdAt: Date.now(),
      encrypted: !!metadata.password,
    });

    // Auto-record to authenticated User Account Log & Deduct Credits per Slide 05
    if (account.isAuthenticated || account.user) {
      const hasPasscode = Boolean(metadata.password && metadata.password.trim().length > 0);
      const hasTimeWindow = Boolean(metadata.lockConfig?.timeWindow?.enabled);
      const hasAccessLimit = Boolean(metadata.lockConfig?.openLimit?.enabled);

      account.recordCreatedBox({
        title: metadata.title || 'Untitled Bitty Box',
        url: fullUrl,
        format: 'html',
        byteSize: orig,
        compressedSize: comp,
        encrypted: hasPasscode,
        locks: {
          password: hasPasscode,
          timeWindow: hasTimeWindow,
          accessLimit: hasAccessLimit,
        },
      });
    }
  };

  // Switch to preset template and create a new session
  const handleSelectTemplate = (tpl: TemplatePreset) => {
    const tplSessionId = 'tpl-' + tpl.id + '-' + Date.now();
    const tplMeta: BittyMetadata = {
      title: tpl.title,
      description: tpl.docDescription || tpl.description,
      favicon: tpl.favicon || '🚀',
      includeMetadata: true,
      password: '',
    };
    const tplSession: BittySession = {
      id: tplSessionId,
      title: tpl.title,
      favicon: tpl.favicon || '🚀',
      content: tpl.content,
      metadata: tplMeta,
      savedAt: Date.now(),
    };

    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== tplSessionId);
      const updated = [tplSession, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('bitty_multi_sessions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setCurrentSessionId(tplSessionId);
    setContent(tpl.content);
    setMetadata(tplMeta);
    window.history.replaceState(null, '', '/#/edit');
    setCurrentView('editor');
  };

  // Launch in new tab
  const handlePreviewInTab = () => {
    let targetUrl = bittyUrl;
    if (!metadata.password) {
      try {
        const syncRes = compressContentSync(content, { mimeType: 'text/html' });
        if (syncRes) {
          targetUrl = buildBittyUrl(syncRes.compressedUrl, metadata);
        }
      } catch {}
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank');
    } else {
      window.open(window.location.href, '_blank');
    }
  };

  // System Share trigger
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: metadata.title || 'Bitty Box',
          text: metadata.description || 'Check out this Bitty Box micro-webpage!',
          url: bittyUrl || window.location.href,
        });
      } catch {}
    } else {
      handleGenerate();
    }
  };

  // Close Opened Session Request Handler (shows warning modal)
  const handleRequestCloseSession = () => {
    setIsCloseSessionModalOpen(true);
  };

  // Confirmed Session Close Handler (removes current session from sessions and switches or resets)
  const handleConfirmCloseSession = () => {
    handleCloseSessionById(currentSessionId);
    setIsCloseSessionModalOpen(false);
  };

  // New Bitty Box / Open New Session
  const handleNewBox = () => {
    const newId = 'sess-' + Date.now();
    const newSession: BittySession = {
      id: newId,
      title: 'My Box',
      favicon: '📦',
      content: DEFAULT_STARTER_HTML,
      metadata: {
        title: 'My Box',
        description: '',
        favicon: '📦',
        includeMetadata: true,
      },
      savedAt: Date.now(),
    };

    setSessions(prev => {
      const updated = [newSession, ...prev].slice(0, 10);
      try {
        localStorage.setItem('bitty_multi_sessions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setCurrentSessionId(newId);
    setContent(newSession.content);
    setMetadata(newSession.metadata);
    window.history.replaceState(null, '', '/#/edit');
    setCurrentView('editor');
  };

  // Toggle the in-page live preview (Viewer nav button) without leaving the editor
  const onToggleInlinePreview = useCallback(() => {
    setInlinePreviewActive(prev => !prev);
  }, []);
  const onExitInlinePreview = useCallback(() => {
    setInlinePreviewActive(false);
  }, []);

  // Switch from viewer back to studio editor with content
  const handleEditFromViewer = (newContent: string, newMeta: Partial<BittyMetadata>) => {
    if (newContent) setContent(newContent);
    if (newMeta.title) {
      setMetadata(prev => ({ ...prev, ...newMeta }));
    }
    window.history.replaceState(null, '', '/#/edit');
    setCurrentView('editor');
  };

  // Return from viewer to the home splash
  const handleGoToHomePage = () => {
    window.history.replaceState(null, '', '/');
    setCurrentView('editor');
  };

  if (isVerifyingMagic) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#050515] flex items-center justify-center p-4 z-50 font-sans">
        <div className="text-center p-8 flex flex-col items-center max-w-sm bento-card border-cyan-500/40 rounded-2xl relative shadow-[0_0_50px_rgba(0,242,255,0.25)]">
          <div className="bento-corner-accent top-l" />
          <div className="bento-corner-accent top-r" />
          <div className="bento-corner-accent bot-l" />
          <div className="bento-corner-accent bot-r" />
          <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(0,242,255,0.4)]">
            <Zap className="w-7 h-7 text-cyan-400 animate-pulse" />
          </div>
          <h4 className="font-cyber text-sm text-cyan-300 tracking-wider">
            <CyberScrambleText text="AUTHENTICATING MAGIC LINK..." speed={20} />
          </h4>
          <p className="text-xs font-mono text-cyan-300/70 mt-2">
            Validating cryptographic token & establishing secure session
          </p>
        </div>
      </div>
    );
  }

  // If in viewer mode (generated site / capsule URL), render only the pure preview iframe with zero Bittybox UI
  if (currentView === 'viewer') {
    return (
      <BittyRenderer
        hashFragment={hashFragment}
        activeContent={hashFragment ? undefined : content}
        metadata={metadata}
        onNextChainBox={metadata.chain?.nextUrl ? () => { window.location.href = metadata.chain!.nextUrl!; } : undefined}
        onEdit={handleEditFromViewer}
        onHome={handleGoToHomePage}
        onOpenQr={() => setIsQrOpen(true)}
        onShare={handleShare}
        onCloseSession={handleRequestCloseSession}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-cyan-100 relative overflow-x-hidden font-sans">
      {/* Background Animated Hologram FX */}
      <HoloBackground theme={workspaceTheme} />

      {/* Edge Grip Handle on Center Top (PREVIEW) */}
      <EdgeGripHandles
        onOpenPreview={() => setIsPreviewDropdownOpen(true)}
        isPreviewOpen={isPreviewDropdownOpen}
        onOpenChainNext={handleOpenChainNext}
        isChainNextVisible={currentView === 'editor' && chainEnabled && isLastEditorSlide}
        chainNextLabel={isLastChainBox ? (chainTotal >= BITTY_CHAIN_MAX_PAGES ? 'MAX CHAIN' : 'ADD NEXT') : 'NEXT BOX'}
        chainNextDisabled={chainEnabled && isLastChainBox && chainTotal >= BITTY_CHAIN_MAX_PAGES}
        topClassName="top-[calc(6.75rem+env(safe-area-inset-top))] lg:top-[calc(4rem+env(safe-area-inset-top))]"
      />

      {/* Top Cyber Navigation Bar */}
      <BittyNavbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenQr={() => setIsQrOpen(true)}
        onShare={handleShare}
        onNewBox={handleNewBox}
        onCloseSession={handleRequestCloseSession}
        onPreviewInTab={handlePreviewInTab}
        onExportZip={() => exportBittyToZip(content, metadata, bittyUrl)}
        onOpenTemplates={() => setIsLeftTemplatesPanelOpen(true)}
        onOpenTools={() => setIsRightToolsPanelOpen(true)}
        onStartTour={handleStartTour}
        onReplaySplash={() => setShowSplash(true)}
        isEncrypted={!!metadata.password}
        hasContent={content.trim().length > 0}
        theme={workspaceTheme}
        onThemeChange={setWorkspaceTheme}
        mode={proStatus.mode}
        onModeChange={proStatus.setMode}
        isPro={proStatus.isPro}
        onOpenPaywall={proStatus.openPaywall}
        user={account.user}
        isAuthenticated={account.isAuthenticated}
      />

      {/* Main Content Body with Motion View Transitions */}
      <main className="flex-1 relative z-10 pt-[calc(6.75rem+env(safe-area-inset-top))] lg:pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-16">
        <AnimatePresence mode="wait">
          {currentView === 'editor' && (
            <motion.div
              key="view-editor"
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.995 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <BittyStageView
                account={account}
                content={content}
                onChangeContent={handleContentChange}
                metadata={metadata}
                onChangeMetadata={handleMetadataChange}
                bittyUrl={bittyUrl}
                onGenerate={chainEnabled ? () => handleGenerateChain(content, metadata) : handleGenerate}
                calculatedCreditCost={calculatedCreditCost}
                chainEnabled={chainEnabled}
                chainIndex={chainCurrentIndex}
                chainTotal={chainTotal}
                chainMax={BITTY_CHAIN_MAX_PAGES}
                chainDraft={chainDraft}
                isLastChainBox={isLastChainBox}
                onToggleChain={handleSetChainEnabled}
                onCreateNextChainPage={handleCreateNextChainPage}
                onGoToChainPage={goToChainPage}
                onDeleteLastChainBox={handleDeleteLastChainBox}
                isPro={proStatus.isPro}
                onOpenPaywall={proStatus.openPaywall}
              />
            </motion.div>
          )}

          {currentView === 'account' && (
            <motion.div
              key="view-account"
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.995 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <AccountDashboard
                account={account}
                onNavigateToSlide01={() => setShowSplash(true)}
                onOpenQr={(url) => {
                  setBittyUrl(url);
                  setIsQrOpen(true);
                }}
                lastSavedAt={lastSavedTimestamp}
                isSaving={isSavingSession}
                activeSessionTitle={metadata.title || 'My Box'}
                onManualSave={handleManualSaveSession}
              />
            </motion.div>
          )}

          {currentView === 'viewer' && (
            <motion.div
              key="view-viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <BittyRenderer
                hashFragment={hashFragment}
                activeContent={hashFragment ? undefined : content}
                metadata={metadata}
                onNextChainBox={metadata.chain?.nextUrl ? () => { window.location.href = metadata.chain!.nextUrl!; } : undefined}
                onEdit={handleEditFromViewer}
                onHome={handleGoToHomePage}
                onOpenQr={() => setIsQrOpen(true)}
                onShare={handleShare}
                onCloseSession={handleRequestCloseSession}
              />
            </motion.div>
          )}

          {currentView === 'history' && (
            <motion.div
              key="view-history"
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <HistoryModal
                history={history}
                onSelect={item => {
                  window.location.href = item.url;
                  const { payload, metadata: parsedMeta } = parseBittyHash(item.url);
                  if (payload) setHashFragment(payload);
                  if (parsedMeta.title) {
                    setMetadata(prev => ({ ...prev, ...parsedMeta }));
                  }
                  setCurrentView('viewer');
                }}
                onDelete={deleteHistoryItem}
                onClearAll={clearAllHistory}
                onClose={() => setCurrentView('editor')}
              />
            </motion.div>
          )}

          {currentView === 'about' && (
            <motion.div
              key="view-about"
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <AboutModal
                onOpenEditor={() => setCurrentView('editor')}
                onStartTour={handleStartTour}
                onReplaySplash={() => setShowSplash(true)}
              />
            </motion.div>
          )}

          {currentView === 'agents' && (
            <motion.div
              key="view-agents"
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <AgentsPage
                onOpenEditor={() => setCurrentView('editor')}
                onOpenAccount={() => setCurrentView('account')}
                onOpenQr={(url) => {
                  setBittyUrl(url);
                  setIsQrOpen(true);
                }}
              />
              <OpenMoltConsole />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Live Preview Dropdown Panel (Sliding down from Top) */}
      <PreviewDropdownPanel
        isOpen={isPreviewDropdownOpen}
        onClose={() => setIsPreviewDropdownOpen(false)}
        content={content}
        metadata={metadata}
        title={metadata.title}
        bittyUrl={bittyUrl}
        onPreviewInTab={handlePreviewInTab}
      />

      {/* Full-Screen Templates Side Panel (Sliding from Left) */}
      <TemplatesSidePanel
        isOpen={isLeftTemplatesPanelOpen}
        onClose={() => setIsLeftTemplatesPanelOpen(false)}
        onSelectTemplate={tpl => {
          handleSelectTemplate(tpl);
        }}
        currentContentLength={content.trim().length}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSwitchSession={handleSwitchSession}
        onNewSession={handleNewBox}
        mode={proStatus.mode}
        isPro={proStatus.isPro}
        onOpenPaywall={proStatus.openPaywall}
      />

      {/* Full-Screen Studio Tools Side Panel (Sliding from Right) */}
      <StudioToolsSidePanel
        isOpen={isRightToolsPanelOpen}
        onClose={() => setIsRightToolsPanelOpen(false)}
        account={account}
        onGenerate={handleGenerate}
        bittyUrl={bittyUrl}
        originalBytes={originalBytes}
        compressedBytes={compressedBytes}
        isCopied={isCopied}
        onOpenQr={() => setIsQrOpen(true)}
        onShare={handleShare}
        onPreviewInTab={handlePreviewInTab}
        onExportZip={() => exportBittyToZip(content, metadata, bittyUrl)}
        onNewBox={handleNewBox}
        onCloseSession={handleRequestCloseSession}
        onStartTour={handleStartTour}
        onReplaySplash={() => setShowSplash(true)}
        metadata={metadata}
        theme={workspaceTheme}
        onThemeChange={setWorkspaceTheme}
        mode={proStatus.mode}
        onModeChange={proStatus.setMode}
        isPro={proStatus.isPro}
        onOpenPaywall={proStatus.openPaywall}
        onOpenHistory={() => setCurrentView('history')}
        onOpenSpecs={() => setCurrentView('about')}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSwitchSession={handleSwitchSession}
        onCloseSessionById={handleCloseSessionById}
      />

      {/* QR Transmitter Modal */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        url={bittyUrl || window.location.href}
        title={metadata.title || 'Bitty Box'}
      />

      {/* Confirmation Warning Modal for Closing Opened Sessions */}
      <ConfirmCloseSessionModal
        isOpen={isCloseSessionModalOpen}
        onClose={() => setIsCloseSessionModalOpen(false)}
        onConfirmClose={handleConfirmCloseSession}
        sessionTitle={metadata.title || 'Untitled Bitty Box'}
        metadata={metadata}
        contentLength={content.length}
        isEncrypted={!!metadata.password}
        sessionType={currentView === 'viewer' ? 'viewer' : 'editor'}
      />

      <ChainNextModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        onCloneCurrent={() => handleCreateNextChainPage('clone')}
        onStartBlank={() => handleCreateNextChainPage('scratch')}
        currentTitle={metadata.title}
        currentIndex={chainCurrentIndex}
        maxPages={BITTY_CHAIN_MAX_PAGES}
      />

      {/* Bitty Box PRO Paywall & License Modal */}
      <ProPaywallModal
        isOpen={proStatus.isPaywallOpen}
        onClose={proStatus.closePaywall}
        isPro={proStatus.isPro}
        paywallFeature={proStatus.paywallFeature}
        onUnlockLifetime={proStatus.unlockLifetimePro}
        onSwitchToPro={() => proStatus.setMode('pro')}
      />

      {/* Legal Modal (Terms of Service & Privacy Policy) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setIsLegalModalOpen(false)}
      />

      {/* Intro / Demo Splash — demand-only overlay (opens via About "SEE DEMO" / REPLAY INTRO) */}
      <AnimatePresence>
        {showSplash && (
          <AnimatedSplash onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
