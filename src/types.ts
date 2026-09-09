import type { TimeWindowConfig } from './utils/timeWindow';

export interface BittyChainMetadata {
  enabled?: boolean;
  chainId?: string;
  index?: number;
  total?: number;
  nextUrl?: string;
}

export interface BittyMetadata {
  title: string;
  description?: string;
  favicon?: string;
  image?: string;
  password?: string;
  includeMetadata?: boolean;
  author?: string;
  canonicalUrl?: string;
  language?: string;
  boxId?: string;
  chain?: BittyChainMetadata;
  /**
   * Client-side & server-backed lock configuration surfaced on the recipient lock screen.
   */
  lockConfig?: {
    timeWindow?: TimeWindowConfig;
    openLimit?: {
      enabled?: boolean;
      maxOpens?: number;
      opensUsed?: number;
      showRemainingCount?: boolean;
    };
  };
}

export interface BittyChainDraftPage {
  id: string;
  content: string;
  metadata: BittyMetadata;
  createdAt: number;
  updatedAt: number;
  isCloned?: boolean;
}

export interface BittyChainDraft {
  version: 1;
  chainId: string;
  enabled: boolean;
  currentIndex: number;
  pages: BittyChainDraftPage[];
  updatedAt: number;
}

export interface BittyHistoryItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  image?: string;
  type?: string;
  byteSize: number;
  compressedSize: number;
  createdAt: number;
  encrypted?: boolean;
}

export type EditorMode = 'code' | 'rich';
export type AppView = 'account' | 'editor' | 'viewer' | 'history' | 'about' | 'agents';
export type WorkspaceTheme = 'synthwave' | 'monochrome' | 'matrix';
export type WorkspaceMode = 'simple' | 'pro';

export type SyntaxTheme = 'cyber' | 'matrix' | 'dracula' | 'monokai' | 'nord' | 'amber' | 'monochrome';

export interface SyntaxThemeOption {
  id: SyntaxTheme;
  name: string;
  cssClass: string;
  previewColor: string;
}

export const SYNTAX_THEMES: SyntaxThemeOption[] = [
  { id: 'cyber', name: 'Cyber Neon', cssClass: 'prism-cyber-theme', previewColor: '#00f2ff' },
  { id: 'matrix', name: 'Matrix Green', cssClass: 'prism-matrix-theme', previewColor: '#00ff66' },
  { id: 'dracula', name: 'Dracula Dark', cssClass: 'prism-dracula-theme', previewColor: '#ff79c6' },
  { id: 'monokai', name: 'Monokai Pro', cssClass: 'prism-monokai-theme', previewColor: '#ffd866' },
  { id: 'nord', name: 'Nord Frost', cssClass: 'prism-nord-theme', previewColor: '#88c0d0' },
  { id: 'amber', name: 'Amber CRT', cssClass: 'prism-amber-theme', previewColor: '#ffb000' },
  { id: 'monochrome', name: 'Monochrome', cssClass: 'prism-monochrome-theme', previewColor: '#ffffff' },
];

export interface ApiKeyMeta {
  id: string;
  label: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string | null;
  requestCount: number;
}

export interface TrackedBittyBox {
  id: string;
  title: string;
  url: string;
  format?: string;
  stats?: {
    rawLength?: number;
    compressedLength?: number;
    compressionRatio?: number;
    estimatedSavingsPercent?: number;
  };
  byteSize?: number;
  compressedSize?: number;
  encrypted?: boolean;
  locks?: {
    password?: boolean;
    timeWindow?: boolean;
    accessLimit?: boolean;
  };
  cost?: number;
  boxBreakdowns?: Array<{
    index: number;
    title: string;
    isCloned?: boolean;
    totalCost: number;
    blockCount?: number;
  }>;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  type: 'grant' | 'purchase' | 'usage';
  amount: number;
  costCents?: number;
  packageId?: string;
  description: string;
  createdAt: string;
}

export interface BittyUser {
  id: string;
  email: string;
  displayName: string;
  tier: string;
  avatar?: string;
  creemCustomerId?: string | null;
  creemCreditAccountId?: string | null;
  credits: number;
  creditsUsedTotal: number;
  creditsHumanUsed?: number;
  creditsApiUsed?: number;
  creditsMcpUsed?: number;
  joinedDate: string;
  lastSignedInAt: string;
  settings?: {
    autoSaveLinks?: boolean;
    trustThisDevice?: boolean;
    deviceTrustExpiresAt?: string;
  };
  apiKeys: ApiKeyMeta[];
  links: TrackedBittyBox[];
  transactions: CreditTransaction[];
}

export interface BittySession {
  id: string;
  title: string;
  favicon?: string;
  content: string;
  metadata: BittyMetadata;
  savedAt: number;
}

export interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  title: string;
  docDescription?: string;
  favicon?: string;
  content: string;
  type: 'html' | 'recipe' | 'canvas' | 'contact' | 'bookmarklet' | 'docs' | 'dashboard' | 'portfolio' | 'terminal';
  tags?: string[];
}
