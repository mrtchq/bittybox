export const CREDIT_COSTS = Object.freeze({
  timeWindow: 10,
  openLimit: 10,
});

function hasEnabledLock(rule) {
  return Boolean(rule && rule.enabled !== false);
}

function normalizeBoxInput(input = {}) {
  const metadata = input?.metadata && typeof input.metadata === 'object'
    ? input.metadata
    : input;
  return {
    title: input?.title || metadata?.title || 'Bitty Box',
    password: input?.password ?? metadata?.password,
    lockConfig: input?.lockConfig || metadata?.lockConfig || {},
  };
}

function inferLockCostFromBooleans(locks = {}) {
  let cost = 0;
  if (locks.timeWindow) cost += CREDIT_COSTS.timeWindow;
  if (locks.accessLimit || locks.openLimit) cost += CREDIT_COSTS.openLimit;
  return cost;
}

export function getBoxCreditBreakdown(input = {}, index = 0, isCloned = false) {
  const box = normalizeBoxInput(input);
  const isPasscodeActive = Boolean(typeof box.password === 'string' && box.password.trim().length >= 8);
  const isTimeLockActive = hasEnabledLock(box.lockConfig?.timeWindow);
  const isOpenLimitActive = hasEnabledLock(box.lockConfig?.openLimit);

  const allBlocks = [
    { id: 'base', name: 'Base Content', cost: 0, active: true },
    { id: 'password', name: 'Secret PIN', cost: 0, active: isPasscodeActive },
    { id: 'timeWindow', name: 'Time Lock', cost: isTimeLockActive ? CREDIT_COSTS.timeWindow : 0, active: isTimeLockActive },
    { id: 'openLimit', name: 'View Limit', cost: isOpenLimitActive ? CREDIT_COSTS.openLimit : 0, active: isOpenLimitActive },
  ];

  const activeBlocks = allBlocks.filter((block) => block.active);
  const totalCost = activeBlocks.reduce((sum, block) => sum + block.cost, 0);

  return {
    index,
    title: box.title,
    isCloned: Boolean(isCloned),
    totalCost,
    blockCount: activeBlocks.length,
    activeBlocks,
    allBlocks,
  };
}

export function calculateBoxCreditCost(input = {}) {
  return getBoxCreditBreakdown(input).totalCost;
}

export function calculateChainCreditCost(pages = []) {
  const boxBreakdowns = [];
  let totalCost = 0;

  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i] || {};
    const metadata = page.metadata && typeof page.metadata === 'object' ? page.metadata : page;
    const costInput = {
      ...metadata,
      title: page.title || metadata.title || `Box ${i + 1}`,
      password: page.password ?? metadata.password,
      lockConfig: page.lockConfig || metadata.lockConfig,
    };
    const prevPage = i > 0 ? (pages[i - 1]?.metadata && typeof pages[i - 1].metadata === 'object' ? pages[i - 1].metadata : pages[i - 1]) : null;
    const prevLocks = prevPage?.lockConfig;
    const currentLocks = costInput.lockConfig;
    const hasLocks = Boolean(currentLocks && (hasEnabledLock(currentLocks.timeWindow) || hasEnabledLock(currentLocks.openLimit)));
    const isCloned = Boolean(
      page.isCloned || page.cloneOf || page.clonedFrom ||
      (i > 0 && hasLocks && JSON.stringify(currentLocks) === JSON.stringify(prevLocks))
    );
    const breakdown = getBoxCreditBreakdown(costInput, i, isCloned);
    boxBreakdowns.push(breakdown);
    totalCost += breakdown.totalCost;
  }

  return { totalCost, boxBreakdowns };
}

export function calculateRecordedLinkCreditCost(linkData = {}) {
  const parsedExplicitCost = Number(linkData.cost);
  const explicit = Number.isFinite(parsedExplicitCost) && parsedExplicitCost >= 0
    ? Math.floor(parsedExplicitCost)
    : 0;

  if (Array.isArray(linkData.pages)) {
    return Math.max(explicit, calculateChainCreditCost(linkData.pages).totalCost);
  }

  if (Array.isArray(linkData.boxBreakdowns)) {
    const breakdownCost = linkData.boxBreakdowns.reduce((sum, box) => {
      return sum + Math.max(0, parseInt(box?.totalCost, 10) || 0);
    }, 0);
    return Math.max(explicit, breakdownCost);
  }

  const inferredFromLocks = inferLockCostFromBooleans(linkData.locks);
  const inferredFromConfig = calculateBoxCreditCost({
    metadata: linkData.metadata,
    lockConfig: linkData.lockConfig,
    password: linkData.password,
    title: linkData.title,
  });

  return Math.max(explicit, inferredFromLocks, inferredFromConfig);
}
