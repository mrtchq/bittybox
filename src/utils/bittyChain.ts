import { BittyChainDraft, BittyChainDraftPage, BittyMetadata } from '../types';
import { buildBittyUrl, compressContent, compressContentSync, getRenderedHtml } from './bittyEngine';

export const BITTY_CHAIN_DRAFT_KEY = 'bitty_chain_draft_v1';
export const BITTY_CHAIN_MAX_PAGES = 5;

const now = () => Date.now();

export function createChainId(): string {
  return `bbc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function createChainPageId(): string {
  return `bcp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function sanitizeChainDraftMetadata(metadata: BittyMetadata): BittyMetadata {
  const sanitized: BittyMetadata = {
    ...metadata,
    title: metadata.title || 'My Box',
    description: metadata.description || '',
    favicon: metadata.favicon || '📦',
    includeMetadata: metadata.includeMetadata ?? true,
    boxId: undefined,
    chain: undefined,
  };

  if (sanitized.lockConfig?.openLimit) {
    sanitized.lockConfig = {
      ...sanitized.lockConfig,
      openLimit: {
        ...sanitized.lockConfig.openLimit,
        opensUsed: 0,
      },
    };
  }

  return sanitized;
}

export function createChainDraftFromCurrent(content: string, metadata: BittyMetadata): BittyChainDraft {
  const timestamp = now();
  const chainId = createChainId();
  return {
    version: 1,
    chainId,
    enabled: true,
    currentIndex: 0,
    updatedAt: timestamp,
    pages: [
      {
        id: createChainPageId(),
        content,
        metadata: sanitizeChainDraftMetadata(metadata),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

export function normalizeChainDraft(draft: BittyChainDraft): BittyChainDraft {
  const pages = Array.isArray(draft.pages) && draft.pages.length > 0
    ? draft.pages.slice(0, BITTY_CHAIN_MAX_PAGES)
    : [];
  const safePages = pages.map((page) => ({
    ...page,
    isCloned: Boolean(page.isCloned),
    metadata: sanitizeChainDraftMetadata(page.metadata),
  }));
  return {
    version: 1,
    chainId: draft.chainId || createChainId(),
    enabled: Boolean(draft.enabled),
    currentIndex: Math.min(Math.max(0, draft.currentIndex || 0), Math.max(0, safePages.length - 1)),
    pages: safePages,
    updatedAt: draft.updatedAt || now(),
  };
}

export function loadChainDraft(): BittyChainDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BITTY_CHAIN_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BittyChainDraft;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return null;
    }
    return normalizeChainDraft(parsed);
  } catch {
    return null;
  }
}

export function saveChainDraft(draft: BittyChainDraft | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!draft) {
      window.localStorage.removeItem(BITTY_CHAIN_DRAFT_KEY);
      return;
    }
    window.localStorage.setItem(BITTY_CHAIN_DRAFT_KEY, JSON.stringify(normalizeChainDraft(draft)));
  } catch {}
}

export function clearChainDraft(): void {
  saveChainDraft(null);
}

export function updateChainDraftPage(
  draft: BittyChainDraft,
  index: number,
  content: string,
  metadata: BittyMetadata
): BittyChainDraft {
  const timestamp = now();
  const pages = [...draft.pages];
  if (!pages[index]) return draft;
  pages[index] = {
    ...pages[index],
    content,
    metadata: sanitizeChainDraftMetadata(metadata),
    updatedAt: timestamp,
  };
  return normalizeChainDraft({
    ...draft,
    pages,
    updatedAt: timestamp,
  });
}

export function createNextChainDraftPage(
  draft: BittyChainDraft,
  mode: 'clone' | 'scratch',
  currentContent: string,
  currentMetadata: BittyMetadata
): BittyChainDraft {
  if (draft.pages.length >= BITTY_CHAIN_MAX_PAGES) {
    return updateChainDraftPage(draft, draft.currentIndex, currentContent, currentMetadata);
  }

  const timestamp = now();
  const persisted = updateChainDraftPage(draft, draft.currentIndex, currentContent, currentMetadata);
  const isCloned = mode === 'clone';
  const baseMetadata = isCloned
    ? sanitizeChainDraftMetadata(currentMetadata)
    : { title: 'My Box', description: '', favicon: '📦', includeMetadata: true } satisfies BittyMetadata;
  const page: BittyChainDraftPage = {
    id: createChainPageId(),
    content: isCloned ? currentContent : '',
    metadata: baseMetadata,
    isCloned,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return normalizeChainDraft({
    ...persisted,
    enabled: true,
    currentIndex: persisted.pages.length,
    pages: [...persisted.pages, page],
    updatedAt: timestamp,
  });
}

export function deleteChainDraftPage(
  draft: BittyChainDraft,
  indexToDelete?: number
): BittyChainDraft {
  if (!draft.pages || draft.pages.length <= 1) {
    return draft;
  }
  const timestamp = now();
  const targetIdx = indexToDelete !== undefined
    ? Math.min(Math.max(0, indexToDelete), draft.pages.length - 1)
    : draft.pages.length - 1;

  const pages = draft.pages.filter((_, idx) => idx !== targetIdx);

  let newCurrentIndex = draft.currentIndex;
  if (draft.currentIndex === targetIdx) {
    newCurrentIndex = Math.min(targetIdx, pages.length - 1);
  } else if (draft.currentIndex > targetIdx) {
    newCurrentIndex = draft.currentIndex - 1;
  }
  newCurrentIndex = Math.min(Math.max(0, newCurrentIndex), pages.length - 1);

  return normalizeChainDraft({
    ...draft,
    currentIndex: newCurrentIndex,
    pages,
    updatedAt: timestamp,
  });
}

export function reorderChainDraftPages(
  draft: BittyChainDraft,
  fromIndex: number,
  toIndex: number
): BittyChainDraft {
  if (
    !draft.pages ||
    draft.pages.length <= 1 ||
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= draft.pages.length ||
    toIndex >= draft.pages.length
  ) {
    return draft;
  }

  const timestamp = now();
  const pages = [...draft.pages];
  const [movedPage] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, movedPage);

  let newCurrentIndex = draft.currentIndex;
  if (draft.currentIndex === fromIndex) {
    newCurrentIndex = toIndex;
  } else if (fromIndex < draft.currentIndex && toIndex >= draft.currentIndex) {
    newCurrentIndex = draft.currentIndex - 1;
  } else if (fromIndex > draft.currentIndex && toIndex <= draft.currentIndex) {
    newCurrentIndex = draft.currentIndex + 1;
  }
  newCurrentIndex = Math.min(Math.max(0, newCurrentIndex), pages.length - 1);

  return normalizeChainDraft({
    ...draft,
    currentIndex: newCurrentIndex,
    pages,
    updatedAt: timestamp,
  });
}

export function getChainPageLabel(draft: BittyChainDraft | null): string {
  if (!draft?.enabled || !draft.pages.length) return 'CHAIN OFF';
  return `BOX ${draft.currentIndex + 1} OF ${draft.pages.length}`;
}

export async function generateChainedBittyUrls(
  pages: BittyChainDraftPage[],
  options?: {
    origin?: string;
    chainId?: string;
  }
): Promise<string[]> {
  if (!pages.length) return [];
  const chainId = options?.chainId || createChainId();
  const urls = new Array<string>(pages.length);
  let nextUrl: string | undefined;

  for (let i = pages.length - 1; i >= 0; i -= 1) {
    const page = pages[i];
    const metadata: BittyMetadata = {
      ...sanitizeChainDraftMetadata(page.metadata),
      chain: {
        enabled: true,
        chainId,
        index: i,
        total: pages.length,
        nextUrl,
      },
    };
    if (metadata.lockConfig?.openLimit?.enabled || metadata.lockConfig?.timeWindow?.enabled) {
      metadata.boxId = `bbx_${Date.now().toString(36)}_${i}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const source = page.content?.trim() ? page.content : '';
    const html = getRenderedHtml(source, {
      title: metadata.title || 'Bitty Box',
      description: metadata.description || '',
      language: metadata.language || 'en',
    });

    let compressedFragment = '';
    const validPassword = metadata.password && metadata.password.trim().length >= 8 ? metadata.password.trim() : undefined;
    if (!validPassword) {
      try {
        const syncRes = compressContentSync(html, { mimeType: 'text/html', isRawHtml: true });
        if (syncRes) compressedFragment = syncRes.compressedUrl;
      } catch {}
    }
    if (!compressedFragment) {
      const encoded = await compressContent(html, {
        password: validPassword,
        mimeType: 'text/html',
        isRawHtml: true,
      });
      compressedFragment = encoded.compressedUrl;
    }

    urls[i] = buildBittyUrl(compressedFragment, metadata, options?.origin);
    nextUrl = urls[i];
  }

  return urls;
}

export interface BlockMechanismCost {
  id: 'base' | 'password' | 'timeWindow' | 'openLimit';
  name: string;
  cost: number;
  active: boolean;
  details?: string;
}

export interface BoxCreditBreakdown {
  index: number;
  title: string;
  isCloned?: boolean;
  totalCost: number;
  blockCount: number;
  activeBlocks: BlockMechanismCost[];
  allBlocks: BlockMechanismCost[];
}

/**
 * Calculate the credit cost and active block breakdown for an individual box.
 * Blocks / Mechanisms:
 *  1. Base Content (0 CR)
 *  2. Secret PIN / Passcode (0 CR)
 *  3. Time-Based Lock (+10 CR)
 *  4. View Limits (+10 CR)
 */
export function getBoxBlockBreakdown(
  metadata: BittyMetadata | undefined,
  index: number = 0,
  isCloned: boolean = false
): BoxCreditBreakdown {
  const isPasscodeActive = Boolean(metadata?.password && metadata.password.trim().length >= 8);
  const isTimeLockActive = Boolean(metadata?.lockConfig?.timeWindow?.enabled);
  const isAccessLimitActive = Boolean(metadata?.lockConfig?.openLimit?.enabled);

  const tw = metadata?.lockConfig?.timeWindow;
  let timeDetails = 'Timer Lock (+10 CR)';
  if (tw?.mode === 'hybrid') timeDetails = 'Reveal+Decay (+10 CR)';
  else if (tw?.mode === 'delay') timeDetails = 'Delayed Reveal (+10 CR)';
  else if (tw?.mode === 'expiry') timeDetails = `Expires ${tw.expiryHours || 24}h (+10 CR)`;

  const ol = metadata?.lockConfig?.openLimit;
  const openDetails = `Max ${ol?.maxOpens || 1} Views (+10 CR)`;

  const allBlocks: BlockMechanismCost[] = [
    {
      id: 'base',
      name: 'Base Content',
      cost: 0,
      active: true,
      details: 'Base Link (Free 0 CR)',
    },
    {
      id: 'password',
      name: 'Secret PIN',
      cost: 0,
      active: isPasscodeActive,
      details: isPasscodeActive ? 'PIN Protected (Free 0 CR)' : 'Disabled (0 CR)',
    },
    {
      id: 'timeWindow',
      name: 'Time Lock',
      cost: isTimeLockActive ? 10 : 0,
      active: isTimeLockActive,
      details: isTimeLockActive ? timeDetails : 'Disabled (0 CR)',
    },
    {
      id: 'openLimit',
      name: 'View Limits',
      cost: isAccessLimitActive ? 10 : 0,
      active: isAccessLimitActive,
      details: isAccessLimitActive ? openDetails : 'Disabled (0 CR)',
    },
  ];

  const activeBlocks = allBlocks.filter(b => b.active);
  const totalCost = (isTimeLockActive ? 10 : 0) + (isAccessLimitActive ? 10 : 0);

  return {
    index,
    title: metadata?.title || `Box ${index + 1}`,
    isCloned,
    totalCost,
    blockCount: activeBlocks.length,
    activeBlocks,
    allBlocks,
  };
}

export function calculateBoxCreditCost(metadata: BittyMetadata | undefined): number {
  return getBoxBlockBreakdown(metadata).totalCost;
}

export function calculateTotalChainCreditCost(
  pages: BittyChainDraftPage[]
): {
  totalCost: number;
  boxBreakdowns: BoxCreditBreakdown[];
} {
  let totalCost = 0;
  const boxBreakdowns: BoxCreditBreakdown[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const isCloned = Boolean(page.isCloned || (i > 0 && JSON.stringify(page.metadata.lockConfig) === JSON.stringify(pages[i - 1]?.metadata.lockConfig) && page.metadata.lockConfig && (page.metadata.lockConfig.timeWindow?.enabled || page.metadata.lockConfig.openLimit?.enabled)));
    const breakdown = getBoxBlockBreakdown(page.metadata, i, isCloned);
    boxBreakdowns.push(breakdown);
    totalCost += breakdown.totalCost;
  }

  return {
    totalCost,
    boxBreakdowns,
  };
}

