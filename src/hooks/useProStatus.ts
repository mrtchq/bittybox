import { useState, useEffect, useCallback } from 'react';
import { WorkspaceMode } from '../types';

const STORAGE_PRO_UNLOCKED_KEY = 'bitty_pro_unlocked';
const STORAGE_MODE_PREF_KEY = 'bitty_workspace_mode_pref';

export interface ProStatusResult {
  isPro: boolean;
  isLifetimePro: boolean;
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  toggleMode: () => void;
  isPaywallOpen: boolean;
  paywallFeature: string | null;
  openPaywall: (featureName?: string) => void;
  closePaywall: () => void;
  unlockLifetimePro: (licenseKey?: string) => { success: boolean; message: string };
  unlockPro: (licenseKey?: string) => { success: boolean; message: string };
}

export function useProStatus(): ProStatusResult {
  // Pro Subscription / Unlock State
  const [isPro, setIsPro] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash || '';
        if (urlParams.get('subscribed') === 'true' || hash.includes('subscribed=true')) {
          localStorage.setItem(STORAGE_PRO_UNLOCKED_KEY, 'true');
          return true;
        }
      }
      return localStorage.getItem(STORAGE_PRO_UNLOCKED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // User Mode Preference: 'simple' | 'pro'
  const [modePref, setModePref] = useState<WorkspaceMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MODE_PREF_KEY);
      if (saved === 'simple' || saved === 'pro') return saved;
    } catch {}
    return isPro ? 'pro' : 'simple';
  });

  // Paywall Modal State
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null);

  // Actual Effective Mode
  const effectiveMode: WorkspaceMode = isPro ? modePref : 'simple';

  // Change Mode Handler
  const handleSetMode = useCallback((newMode: WorkspaceMode) => {
    if (newMode === 'pro' && !isPro) {
      setPaywallFeature('PRO Workspace');
      setIsPaywallOpen(true);
      return;
    }
    setModePref(newMode);
    try {
      localStorage.setItem(STORAGE_MODE_PREF_KEY, newMode);
    } catch {}
  }, [isPro]);

  // Toggle Mode Handler
  const handleToggleMode = useCallback(() => {
    if (effectiveMode === 'simple') {
      handleSetMode('pro');
    } else {
      handleSetMode('simple');
    }
  }, [effectiveMode, handleSetMode]);

  // Open Paywall Handler
  const openPaywall = useCallback((featureName?: string) => {
    setPaywallFeature(featureName || null);
    setIsPaywallOpen(true);
  }, []);

  // Close Paywall Handler
  const closePaywall = useCallback(() => {
    setIsPaywallOpen(false);
    setPaywallFeature(null);
  }, []);

  // Unlock Pro with License Key
  const unlockPro = useCallback((licenseKey?: string) => {
    const key = (licenseKey || '').trim().toUpperCase();
    
    // Official valid key patterns
    const validPatterns = ['BITTY-PRO', 'PRO-MEMBERSHIP', 'VIP-ACCESS', 'BITTYBOX-PRO', 'CREEM-PRO'];
    const isSpecialKey = validPatterns.some(pat => key.includes(pat));

    if (isSpecialKey && key.length >= 8) {
      setIsPro(true);
      setModePref('pro');
      try {
        localStorage.setItem(STORAGE_PRO_UNLOCKED_KEY, 'true');
        localStorage.setItem(STORAGE_MODE_PREF_KEY, 'pro');
      } catch {}
      return { success: true, message: 'Bitty Box PRO Subscription Activated Successfully!' };
    }

    return { success: false, message: 'Invalid license key format. Please enter a valid PRO key or upgrade your account.' };
  }, []);

  return {
    isPro,
    isLifetimePro: isPro,
    mode: effectiveMode,
    setMode: handleSetMode,
    toggleMode: handleToggleMode,
    isPaywallOpen,
    paywallFeature,
    openPaywall,
    closePaywall,
    unlockLifetimePro: unlockPro,
    unlockPro,
  };
}
