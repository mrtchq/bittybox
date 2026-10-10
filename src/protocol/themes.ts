/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitty Box - Themes Engine
 * Luxurious black-and-gold aesthetic, cyber amber, and stealth palettes
 */

export interface BittyThemeConfig {
  id: string;
  name: string;
  tagline: string;
  colors: {
    bg: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    accent: string;
    accentSecondary: string;
    text: string;
    textMuted: string;
    glow: string;
  };
  fontFamily: string;
}

export const BITTY_THEMES: Record<string, BittyThemeConfig> = {
  'obsidian-gold': {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    tagline: 'Flagship Luxury Agent Palette',
    colors: {
      bg: '#0A0A0B',
      surface: '#141417',
      surfaceElevated: '#1E1E24',
      border: '#27272F',
      accent: '#D4AF37',
      accentSecondary: '#F3E5AB',
      text: '#F8F8F8',
      textMuted: '#64646E',
      glow: 'rgba(212, 175, 55, 0.25)',
    },
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  'cyber-amber': {
    id: 'cyber-amber',
    name: 'Cyber Amber',
    tagline: 'Monospace HUD Terminal',
    colors: {
      bg: '#0A0D12',
      surface: '#121820',
      surfaceElevated: '#1B232E',
      border: '#2D3748',
      accent: '#F59E0B',
      accentSecondary: '#FDE68A',
      text: '#F3F4F6',
      textMuted: '#6B7280',
      glow: 'rgba(245, 158, 11, 0.25)',
    },
    fontFamily: "'Fira Code', monospace",
  },
  'stealth-dark': {
    id: 'stealth-dark',
    name: 'Stealth Dark',
    tagline: 'Brushed Platinum & Minimal Obsidian',
    colors: {
      bg: '#050505',
      surface: '#111111',
      surfaceElevated: '#1C1C1C',
      border: '#262626',
      accent: '#E5B869',
      accentSecondary: '#FFFFFF',
      text: '#EDEDED',
      textMuted: '#555555',
      glow: 'rgba(229, 184, 105, 0.2)',
    },
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  'solarized-amber': {
    id: 'solarized-amber',
    name: 'Solarized Amber',
    tagline: 'Deep Cosmic Dark & Warm Gold',
    colors: {
      bg: '#001B24',
      surface: '#072A35',
      surfaceElevated: '#0C3846',
      border: '#0F4455',
      accent: '#B58900',
      accentSecondary: '#E8BF38',
      text: '#93A1A1',
      textMuted: '#586E75',
      glow: 'rgba(181, 137, 0, 0.3)',
    },
    fontFamily: "system-ui, sans-serif",
  },
  'pure-obsidian': {
    id: 'pure-obsidian',
    name: 'Pure Obsidian',
    tagline: 'High-Contrast Pitch Black & Pure Gold',
    colors: {
      bg: '#000000',
      surface: '#0B0B0C',
      surfaceElevated: '#151518',
      border: '#222226',
      accent: '#E6C200',
      accentSecondary: '#FFF07A',
      text: '#FFFFFF',
      textMuted: '#55555F',
      glow: 'rgba(230, 194, 0, 0.2)',
    },
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
};
