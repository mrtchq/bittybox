import { deflate, inflate } from 'pako';

export type PhaseOneTheme = 'obsidian-gold' | 'midnight-violet' | 'cinder-rose' | 'emerald-arcade';
export type PuzzleType = 'riddle' | 'cipher' | 'pattern' | 'tiles' | 'sequence';
export type BoxStatus = 'ready' | 'locked' | 'frozen' | 'burned';

export type IdentityTraits = {
  device: 'mobile' | 'tablet' | 'desktop';
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'other';
  timezone: string;
};

export type Payload = { id: string; type: 'text' | 'key' | 'token' | 'json'; value: string };
export type Mutation = {
  trigger: 'afterMinutes' | 'visits' | 'unlocks';
  value: number;
  action: 'replaceText' | 'shiftTheme' | 'appendText' | 'distort' | 'heal' | 'updatePayload' | 'removePayload';
  from?: string;
  to?: string;
  amount?: number;
  text?: string;
  payloadId?: string;
  payloadValue?: string;
};

type FreezeCondition = { kind: 'date' | 'visits' | 'puzzle' | 'magic'; value?: number | string; puzzleId?: string };
type MultiRequirement = { kind: 'pin'; pin: string } | { kind: 'magic'; word: string } | { kind: 'puzzle'; puzzleId?: string } | { kind: 'identity'; traits: Partial<IdentityTraits> };
export type PuzzleInput = { type: PuzzleType; prompt?: string; answer?: string; seed?: string };

type LockInput =
  | { type: 'magic'; words: string[] }
  | { type: 'puzzle'; puzzle: PuzzleInput }
  | { type: 'freeze'; condition: FreezeCondition }
  | { type: 'identity'; traits: Partial<IdentityTraits> }
  | { type: 'multi'; mode: 'all' | 'any'; requirements: MultiRequirement[] };

export type PhaseOneLock =
  | { id: string; type: 'magic'; ciphertext: string }
  | { id: string; type: 'puzzle'; puzzle: PuzzleInput }
  | { id: string; type: 'freeze'; condition: FreezeCondition }
  | { id: string; type: 'identity'; traits: Partial<IdentityTraits> }
  | { id: string; type: 'multi'; mode: 'all' | 'any'; requirements: MultiRequirement[] };

export type PhaseOneBox = {
  format: 'bittybox-phase1';
  version: 1;
  seed: string;
  title: string;
  content: string;
  theme: PhaseOneTheme;
  locks: PhaseOneLock[];
  mutations: Mutation[];
  payloads: Payload[];
  destruction?: { mode: 'burnAfterReading'; afterViews: number };
  randomizationIntensity: 0 | 1 | 2 | 3;
};

export type VisitorState = {
  firstSeenAt: number;
  visits: number;
  views: number;
  unlocks: number;
  magicWords: string[];
  puzzles: string[];
  pins: string[];
  burned: boolean;
};

export type BoxEvaluation = {
  status: BoxStatus;
  content: string;
  theme: { name: PhaseOneTheme; hueShift: number };
  payloads: Payload[];
  unmetLockIds: string[];
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_DECODED_BYTES = 250_000;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Phase 1 fragment is not valid base64url');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function seedNumber(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = seedNumber(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

/** Reversible obfuscation, not a security boundary: the key is URL-derived by design. */
function wordCipher(value: string, seed: string): string {
  const source = encoder.encode(value);
  const random = seededRandom(`magic:${seed}`);
  return base64Url(Uint8Array.from(source, byte => byte ^ Math.floor(random() * 256)));
}

function wordDecipher(ciphertext: string, seed: string): string {
  const source = fromBase64Url(ciphertext);
  const random = seededRandom(`magic:${seed}`);
  return decoder.decode(Uint8Array.from(source, byte => byte ^ Math.floor(random() * 256)));
}

function lockId(index: number): string { return `lock_${index + 1}`; }

export function initialVisitorState(now = Date.now()): VisitorState {
  return { firstSeenAt: now, visits: 0, views: 0, unlocks: 0, magicWords: [], puzzles: [], pins: [], burned: false };
}

export function createPhaseOneBox(input: {
  seed: string; title: string; content: string; theme?: PhaseOneTheme; locks?: LockInput[];
  mutations?: Mutation[]; payloads?: Payload[]; destruction?: PhaseOneBox['destruction']; randomizationIntensity?: 0 | 1 | 2 | 3;
}): PhaseOneBox {
  if (!input.seed.trim()) throw new Error('A deterministic seed is required');
  if (!input.title.trim()) throw new Error('A box title is required');
  if (encoder.encode(input.content).byteLength > 100_000) throw new Error('Phase 1 content is too large');
  const seed = input.seed.trim();
  const locks = (input.locks ?? []).map((lock, index): PhaseOneLock => {
    const id = lockId(index);
    if (lock.type === 'magic') {
      const words = lock.words.map(normalize).filter(Boolean);
      if (!words.length) throw new Error('A magic lock needs at least one word');
      return { id, type: 'magic', ciphertext: wordCipher(JSON.stringify(words), `${seed}:${id}`) };
    }
    if (lock.type === 'puzzle') return { id, type: 'puzzle', puzzle: { ...lock.puzzle, seed: lock.puzzle.seed ?? `${seed}:${id}` } };
    return { id, ...lock };
  });
  return {
    format: 'bittybox-phase1', version: 1, seed, title: input.title.trim().slice(0, 80), content: input.content,
    theme: input.theme ?? 'obsidian-gold', locks, mutations: structuredClone(input.mutations ?? []),
    // Payload values are stored as reversible ciphertext in the sealed fragment.
    // The key is seed-derived, so this is concealment (not a security boundary).
    payloads: (input.payloads ?? []).slice(0, 12).map(payload => ({ ...payload, value: wordCipher(payload.value, `${seed}:payload:${payload.id}`) })),
    destruction: input.destruction ? { ...input.destruction } : undefined,
    randomizationIntensity: input.randomizationIntensity ?? 1,
  };
}

export function encodePhaseOneUrl(box: PhaseOneBox, state: VisitorState, options: { origin: string; basePath: string }): string {
  const json = JSON.stringify({ b: box, s: state });
  const payload = base64Url(deflate(encoder.encode(json), { level: 9 }));
  return `${options.origin.replace(/\/$/, '')}${options.basePath}#/bbx1/${payload}`;
}

export function decodePhaseOneUrl(url: string): { box: PhaseOneBox; state: VisitorState } {
  const marker = '/bbx1/';
  const fragment = new URL(url, 'https://bittybox.invalid').hash;
  const index = fragment.indexOf(marker);
  if (index < 0) throw new Error('This is not a Phase 1 Bitty Box URL');
  const inflated = inflate(fromBase64Url(fragment.slice(index + marker.length)));
  if (inflated.byteLength > MAX_DECODED_BYTES) throw new Error('Phase 1 Box exceeds the safe decoded-size limit');
  const parsed = JSON.parse(decoder.decode(inflated)) as { b: PhaseOneBox; s: VisitorState };
  if (parsed.b?.format !== 'bittybox-phase1' || parsed.b.version !== 1 || !parsed.s) throw new Error('Invalid Phase 1 Box envelope');
  return { box: parsed.b, state: parsed.s };
}

function magicWords(lock: Extract<PhaseOneLock, { type: 'magic' }>, seed: string): string[] {
  try { return JSON.parse(wordDecipher(lock.ciphertext, `${seed}:${lock.id}`)) as string[]; } catch { return []; }
}

function puzzleSolved(lock: Extract<PhaseOneLock, { type: 'puzzle' }>, state: VisitorState): boolean {
  return state.puzzles.includes(lock.id);
}

function hasIdentity(expected: Partial<IdentityTraits>, actual: IdentityTraits): boolean {
  return Object.entries(expected).every(([key, value]) => actual[key as keyof IdentityTraits] === value);
}

function freezeThawed(condition: FreezeCondition, state: VisitorState, now: number): boolean {
  if (condition.kind === 'date') return now >= Date.parse(String(condition.value));
  if (condition.kind === 'visits') return state.visits >= Number(condition.value ?? 1);
  if (condition.kind === 'puzzle') return state.puzzles.includes(condition.puzzleId ?? String(condition.value ?? ''));
  return state.magicWords.includes(normalize(String(condition.value ?? '')));
}

function requirementMet(requirement: MultiRequirement, state: VisitorState, identity: IdentityTraits): boolean {
  if (requirement.kind === 'pin') return state.pins.includes(requirement.pin);
  if (requirement.kind === 'magic') return state.magicWords.includes(normalize(requirement.word));
  if (requirement.kind === 'puzzle') return requirement.puzzleId ? state.puzzles.includes(requirement.puzzleId) : state.puzzles.length > 0;
  return hasIdentity(requirement.traits, identity);
}

function lockMet(lock: PhaseOneLock, state: VisitorState, now: number, identity: IdentityTraits): boolean {
  if (lock.type === 'magic') return magicWords(lock, '').some(() => false) || state.magicWords.some(word => magicWords(lock, '').includes(word));
  if (lock.type === 'puzzle') return puzzleSolved(lock, state);
  if (lock.type === 'freeze') return freezeThawed(lock.condition, state, now);
  if (lock.type === 'identity') return hasIdentity(lock.traits, identity);
  const matches = lock.requirements.map(requirement => requirementMet(requirement, state, identity));
  return lock.mode === 'all' ? matches.every(Boolean) : matches.some(Boolean);
}

function isMagicLockMet(lock: Extract<PhaseOneLock, { type: 'magic' }>, state: VisitorState, seed: string): boolean {
  const expected = magicWords(lock, seed);
  return state.magicWords.some(word => expected.includes(word));
}

function applyMutations(box: PhaseOneBox, state: VisitorState, now: number) {
  let content = box.content;
  let hueShift = 0;
  let payloads = structuredClone(box.payloads);
  const elapsedMinutes = Math.max(0, (now - state.firstSeenAt) / 60_000);
  const active = (mutation: Mutation) => mutation.trigger === 'afterMinutes' ? elapsedMinutes >= mutation.value
    : mutation.trigger === 'visits' ? state.visits >= mutation.value : state.unlocks >= mutation.value;
  for (const mutation of box.mutations.filter(active)) {
    if (mutation.action === 'replaceText' && mutation.from) content = content.replaceAll(mutation.from, mutation.to ?? '');
    if (mutation.action === 'appendText') content += mutation.text ?? '';
    if (mutation.action === 'shiftTheme') hueShift = (hueShift + (mutation.amount ?? 30)) % 360;
    if (mutation.action === 'distort') content = content.split('').map((character, index) => index % 5 === 0 ? '✦' : character).join('');
    if (mutation.action === 'heal') content = box.content;
    if (mutation.action === 'updatePayload' && mutation.payloadId) payloads = payloads.map(payload => payload.id === mutation.payloadId ? { ...payload, value: mutation.payloadValue ?? payload.value } : payload);
    if (mutation.action === 'removePayload' && mutation.payloadId) payloads = payloads.filter(payload => payload.id !== mutation.payloadId);
  }
  return { content, hueShift, payloads };
}

export function evaluateBox(box: PhaseOneBox, state: VisitorState, now = Date.now(), identity: IdentityTraits = getIdentityTraits()): BoxEvaluation {
  const destroyed = state.burned || Boolean(box.destruction && state.views >= box.destruction.afterViews);
  if (destroyed) return { status: 'burned', content: 'This box has been burned to gold ash.', theme: { name: box.theme, hueShift: 0 }, payloads: [], unmetLockIds: [] };
  const mutation = applyMutations(box, state, now);
  const unmetLockIds = box.locks.filter(lock => {
    if (lock.type === 'magic') return !isMagicLockMet(lock, state, box.seed);
    return !lockMet(lock, state, now, identity);
  }).map(lock => lock.id);
  const frozen = box.locks.some(lock => lock.type === 'freeze' && !freezeThawed(lock.condition, state, now));
  return { status: frozen ? 'frozen' : unmetLockIds.length ? 'locked' : 'ready', content: mutation.content, theme: { name: box.theme, hueShift: mutation.hueShift }, payloads: mutation.payloads, unmetLockIds };
}

export function unlockWithMagicWord(box: PhaseOneBox, state: VisitorState, word: string): { unlocked: boolean; state: VisitorState } {
  const normalized = normalize(word);
  const matched = box.locks.some(lock => {
    if (lock.type === 'magic') return magicWords(lock, box.seed).includes(normalized);
    return lock.type === 'multi' && lock.requirements.some(requirement => requirement.kind === 'magic' && normalize(requirement.word) === normalized);
  });
  if (!matched) return { unlocked: false, state };
  const unlockedMagicWords = state.magicWords.includes(normalized) ? state.magicWords : [...state.magicWords, normalized];
  return { unlocked: true, state: { ...state, magicWords: unlockedMagicWords, unlocks: state.unlocks + 1 } };
}

export function submitPuzzle(box: PhaseOneBox, state: VisitorState, answer: string): { unlocked: boolean; state: VisitorState } {
  const normalized = normalize(answer).replace(/\s+/g, '');
  const solved = box.locks.filter((lock): lock is Extract<PhaseOneLock, { type: 'puzzle' }> => lock.type === 'puzzle').filter(lock => {
    const puzzle = lock.puzzle;
    if (puzzle.type === 'tiles') return normalized === '1,2,3,4,5,6,7,8,0';
    return normalized === normalize(puzzle.answer ?? '').replace(/\s+/g, '');
  });
  if (!solved.length) return { unlocked: false, state };
  const puzzles = [...new Set([...state.puzzles, ...solved.map(lock => lock.id)])];
  return { unlocked: true, state: { ...state, puzzles, unlocks: state.unlocks + 1 } };
}

export function getIdentityTraits(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): IdentityTraits {
  const ua = userAgent.toLowerCase();
  const device = /ipad|tablet/.test(ua) ? 'tablet' : /iphone|android.*mobile|mobile/.test(ua) ? 'mobile' : 'desktop';
  const browser = /edg\//.test(ua) ? 'edge' : /firefox\//.test(ua) ? 'firefox' : /chrome\//.test(ua) || /crios\//.test(ua) ? 'chrome' : /safari\//.test(ua) ? 'safari' : 'other';
  return { device, browser, timezone };
}

export function generateMysteryBox(seed: string): PhaseOneBox {
  const random = seededRandom(seed);
  const themes: PhaseOneTheme[] = ['obsidian-gold', 'midnight-violet', 'cinder-rose', 'emerald-arcade'];
  const prompts = ['A note from your future self.', 'A tiny heist in seven words.', 'A compliment that only appears after patience.', 'A pocket-sized oracle.'];
  const theme = themes[Math.floor(random() * themes.length)];
  const prompt = prompts[Math.floor(random() * prompts.length)];
  const usePuzzle = random() > 0.5;
  return createPhaseOneBox({
    seed, title: `Mystery: ${prompt}`, content: `${prompt}\n\nThe box is listening.`, theme,
    locks: usePuzzle ? [{ type: 'puzzle', puzzle: { type: 'riddle', prompt: 'What has keys but no locks?', answer: 'piano' } }] : [{ type: 'magic', words: ['little comet'] }],
    mutations: [{ trigger: 'visits', value: 2, action: 'appendText', text: '\n\nIt remembers your return.' }],
    payloads: [{ id: 'spark', type: 'text', value: 'A secret spark for later.' }], randomizationIntensity: 2,
  });
}
