import './phase1.css';
import {
  createPhaseOneBox, decodePhaseOneUrl, encodePhaseOneUrl, evaluateBox, generateMysteryBox,
  getIdentityTraits, initialVisitorState, submitPuzzle, unlockWithMagicWord,
  type Mutation, type Payload, type PhaseOneBox, type VisitorState,
} from './phase1BoxEngine';

type DraftLock = Parameters<typeof createPhaseOneBox>[0]['locks'] extends (infer T)[] | undefined ? T : never;
const gallery = [
  ['🔮', 'Dynamic mutation', 'The message evolves with time, visits, unlocks, or your own rule.'],
  ['🧩', 'Puzzle lock', 'Riddles, ciphers, patterns, sequences, and tiny tiles.'],
  ['🪄', 'Magic word', 'A phrase makes the hidden layer bloom.'],
  ['🧊', 'Freeze mode', 'Not yet. Come back when the condition melts.'],
  ['🧳', 'Payload mode', 'Carry a tiny note, key, token, or JSON charm.'],
  ['🔥', 'Burn after reading', 'A short fuse turns a seen Box into ash.'],
  ['🎲', 'Mystery generator', 'One seed. Same weird little world every time.'],
  ['🎭', 'Identity bound', 'Device, browser, timezone: the Box knows the vibe.'],
  ['🗝', 'Multi-key', 'Make two ordinary clues become a ritual together.'],
];

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}
function reducedMotion(): boolean { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function uid(prefix: string): string { return `${prefix}_${crypto.randomUUID().slice(0, 8)}`; }
function clean(value: string): string { return value.trim(); }

const creator = byId<HTMLElement>('creator');
const visitor = byId<HTMLElement>('visitor');
const title = byId<HTMLInputElement>('box-title');
const content = byId<HTMLTextAreaElement>('box-content');
const theme = byId<HTMLSelectElement>('box-theme');
const lockKind = byId<HTMLSelectElement>('lock-kind');
const lockFields = byId<HTMLElement>('lock-fields');
const lockList = byId<HTMLElement>('lock-list');
const mutationList = byId<HTMLElement>('mutation-list');
const payloadList = byId<HTMLElement>('payload-list');
const status = byId<HTMLElement>('creator-status');
const result = byId<HTMLElement>('result');
const resultUrl = byId<HTMLTextAreaElement>('result-url');

let locks: DraftLock[] = [];
let mutations: Mutation[] = [];
let payloads: Payload[] = [];
let lastUrl = '';

function renderGallery(): void {
  const target = byId<HTMLElement>('gallery-cards');
  target.replaceChildren(...gallery.map(([icon, name, description]) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    card.innerHTML = `<span>${icon}</span><h3>${name}</h3><p>${description}</p>`;
    return card;
  }));
}

function renderLockFields(): void {
  const kind = lockKind.value;
  const templates: Record<string, string> = {
    magic: '<label>Magic words <input id="lock-words" value="little comet" placeholder="comma separated phrases" /></label>',
    puzzle: '<label>Puzzle type <select id="puzzle-type"><option value="riddle">Riddle</option><option value="cipher">Cipher</option><option value="pattern">Pattern</option><option value="sequence">Sequence</option><option value="tiles">Sliding tiles (3×3)</option></select></label><label>Prompt <input id="puzzle-prompt" value="What has keys but no locks?" /></label><label>Answer <input id="puzzle-answer" value="piano" /></label>',
    freeze: '<label>Thaw after visits <input id="freeze-visits" type="number" min="1" value="2" /></label><label class="micro-check"><input id="freeze-refreeze" type="checkbox" /> Re-freeze after viewing</label>',
    identity: '<label>Device<select id="identity-device"><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option></select></label><label>Timezone <input id="identity-timezone" value="' + getIdentityTraits().timezone + '" /></label>',
    multi: '<label>Magic word <input id="multi-word" value="north star" /></label><label>PIN <input id="multi-pin" inputmode="numeric" value="4242" /></label>',
  };
  lockFields.innerHTML = templates[kind];
}

function chip(label: string, onRemove: () => void): HTMLElement {
  const item = document.createElement('span');
  item.className = 'chip';
  item.append(document.createTextNode(label));
  const remove = document.createElement('button');
  remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${label}`); remove.onclick = onRemove;
  item.append(remove);
  return item;
}
function renderDrafts(): void {
  lockList.replaceChildren(...locks.map((lock, index) => chip(lock.type, () => { locks.splice(index, 1); renderDrafts(); })));
  mutationList.replaceChildren(...mutations.map((mutation, index) => chip(`${mutation.trigger} → ${mutation.action}`, () => { mutations.splice(index, 1); renderDrafts(); })));
  payloadList.replaceChildren(...payloads.map((payload, index) => chip(`${payload.type}: ${payload.value.slice(0, 18)}`, () => { payloads.splice(index, 1); renderDrafts(); })));
}

function addLock(): void {
  const kind = lockKind.value;
  if (kind === 'magic') {
    const words = clean(byId<HTMLInputElement>('lock-words').value).split(',').map(clean).filter(Boolean);
    if (!words.length) return void (status.textContent = 'Give the spell at least one word.');
    locks.push({ type: 'magic', words } as DraftLock);
  } else if (kind === 'puzzle') {
    const puzzleType = byId<HTMLSelectElement>('puzzle-type').value as 'riddle' | 'cipher' | 'pattern' | 'sequence' | 'tiles';
    locks.push({ type: 'puzzle', puzzle: { type: puzzleType, prompt: byId<HTMLInputElement>('puzzle-prompt').value, answer: byId<HTMLInputElement>('puzzle-answer').value } } as DraftLock);
  } else if (kind === 'freeze') {
    locks.push({ type: 'freeze', condition: { kind: 'visits', value: Number(byId<HTMLInputElement>('freeze-visits').value) || 1 } } as DraftLock);
  } else if (kind === 'identity') {
    locks.push({ type: 'identity', traits: { device: byId<HTMLSelectElement>('identity-device').value as 'desktop', timezone: clean(byId<HTMLInputElement>('identity-timezone').value) } } as DraftLock);
  } else {
    locks.push({ type: 'multi', mode: 'all', requirements: [{ kind: 'magic', word: clean(byId<HTMLInputElement>('multi-word').value) }, { kind: 'pin', pin: clean(byId<HTMLInputElement>('multi-pin').value) }] } as DraftLock);
  }
  status.textContent = 'Lock added. Stack another if you want a ritual.'; renderDrafts();
}

function addMutation(): void {
  const trigger = byId<HTMLSelectElement>('mutation-trigger').value as Mutation['trigger'];
  const action = byId<HTMLSelectElement>('mutation-action').value as Mutation['action'];
  const detail = clean(byId<HTMLInputElement>('mutation-detail').value);
  const mutation: Mutation = { trigger, value: Math.max(1, Number(byId<HTMLInputElement>('mutation-threshold').value) || 1), action };
  if (action === 'appendText') mutation.text = ` ${detail}`;
  if (action === 'replaceText') [mutation.from, mutation.to] = detail.split('->').map(clean);
  if (action === 'shiftTheme') mutation.amount = Number(detail) || 36;
  if (action === 'updatePayload') { mutation.payloadId = payloads[0]?.id; mutation.payloadValue = detail; }
  mutations.push(mutation); status.textContent = 'Mutation armed.'; renderDrafts();
}

function addPayload(): void {
  const value = clean(byId<HTMLInputElement>('payload-value').value);
  if (!value) return void (status.textContent = 'A payload needs a tiny object.');
  payloads.push({ id: uid('payload'), type: byId<HTMLSelectElement>('payload-kind').value as Payload['type'], value });
  status.textContent = 'Payload packed into the Box.'; renderDrafts();
}

function currentBox(): PhaseOneBox {
  return createPhaseOneBox({
    seed: `${title.value}:${content.value}`.slice(0, 180) || 'bitty-phase-one', title: title.value, content: content.value,
    theme: theme.value as PhaseOneBox['theme'], locks, mutations, payloads,
    destruction: byId<HTMLInputElement>('burn-after-reading').checked ? { mode: 'burnAfterReading', afterViews: 1 } : undefined,
    randomizationIntensity: 2,
  });
}
function seal(box = currentBox()): void {
  const url = encodePhaseOneUrl(box, initialVisitorState(), { origin: window.location.origin, basePath: '/lab/v2/phase1.html' });
  lastUrl = url; resultUrl.value = url; result.hidden = false; status.textContent = `Sealed ${new TextEncoder().encode(JSON.stringify(box)).byteLength.toLocaleString()} bytes into one URL.`;
  result.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
}

function persist(box: PhaseOneBox, state: VisitorState): void {
  const url = encodePhaseOneUrl(box, state, { origin: window.location.origin, basePath: '/lab/v2/phase1.html' });
  history.replaceState(null, '', url);
}
function form(label: string, button: string, handler: (value: string) => void): HTMLElement {
  const wrap = document.createElement('form'); wrap.className = 'unlock-form';
  const input = document.createElement('input'); input.placeholder = label; input.autocomplete = 'off';
  const submit = document.createElement('button'); submit.className = 'primary'; submit.textContent = button;
  wrap.append(input, submit); wrap.onsubmit = event => { event.preventDefault(); handler(input.value); };
  return wrap;
}

function renderVisitor(box: PhaseOneBox, state: VisitorState): void {
  const card = byId<HTMLElement>('visitor-card');
  const identity = getIdentityTraits();
  const evaluation = evaluateBox(box, state, Date.now(), identity);
  byId<HTMLElement>('visitor-status').textContent = evaluation.status.toUpperCase();
  card.replaceChildren();
  const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'A URL-NATIVE BITTY BOX';
  const heading = document.createElement('h1'); heading.textContent = box.title;
  card.append(eyebrow, heading);
  if (evaluation.status === 'burned') {
    const ashes = document.createElement('p'); ashes.className = 'ashes'; ashes.textContent = '✦ This Box has been burned to ash. The payload is gone.'; card.append(ashes); return;
  }
  if (evaluation.status === 'frozen') {
    const frozen = document.createElement('p'); frozen.textContent = '🧊 Still frozen. This Box thaws when its condition is met.'; card.append(frozen); return;
  }
  if (evaluation.status === 'locked') {
    const clue = document.createElement('p'); clue.textContent = `Locked by ${evaluation.unmetLockIds.length} little ${evaluation.unmetLockIds.length === 1 ? 'ritual' : 'rituals'}.`;
    card.append(clue);
    const magic = box.locks.some(lock => lock.type === 'magic' || (lock.type === 'multi' && lock.requirements.some(requirement => requirement.kind === 'magic')));
    const puzzle = box.locks.find(lock => lock.type === 'puzzle');
    const multi = box.locks.find(lock => lock.type === 'multi');
    if (magic) card.append(form('Magic word', 'SPEAK', value => { const next = unlockWithMagicWord(box, state, value); if (next.unlocked) { persist(box, next.state); renderVisitor(box, next.state); } else clue.textContent = 'That spell fizzled. Try another.'; }));
    if (puzzle?.type === 'puzzle') card.append(form(puzzle.puzzle.prompt || 'Solve the puzzle', 'UNLOCK', value => { const next = submitPuzzle(box, state, value); if (next.unlocked) { persist(box, next.state); renderVisitor(box, next.state); } else clue.textContent = 'Not quite. The Box is grinning.'; }));
    if (multi?.type === 'multi' && multi.requirements.some(requirement => requirement.kind === 'pin')) card.append(form('PIN', 'OFFER PIN', value => { const next = { ...state, pins: [...new Set([...state.pins, value.trim()])] }; persist(box, next); renderVisitor(box, next); }));
    return;
  }
  const message = document.createElement('pre'); message.className = 'revealed'; message.textContent = evaluation.content;
  card.append(message);
  if (evaluation.payloads.length) {
    const payloadHeading = document.createElement('p'); payloadHeading.className = 'eyebrow'; payloadHeading.textContent = 'PAYLOADS'; card.append(payloadHeading);
    evaluation.payloads.forEach(payload => { const item = document.createElement('pre'); item.className = 'payload'; item.textContent = `${payload.type.toUpperCase()} · ${payload.value}`; card.append(item); });
  }
  if (box.destruction) {
    const fuse = document.createElement('p'); fuse.className = 'status'; fuse.textContent = '🔥 This Box is burning itself in 12 seconds…'; card.append(fuse);
    window.setTimeout(() => { const next = { ...state, burned: true }; persist(box, next); renderVisitor(box, next); }, 12_000);
  }
}

function startVisitor(): void {
  creator.hidden = true; visitor.hidden = false;
  try {
    const { box, state: decoded } = decodePhaseOneUrl(window.location.href);
    const state = { ...decoded, visits: decoded.visits + 1 };
    persist(box, state); renderVisitor(box, state);
  } catch (error) { byId<HTMLElement>('visitor-card').textContent = error instanceof Error ? error.message : 'This Box could not be opened.'; }
}

byId<HTMLButtonElement>('add-lock').onclick = addLock;
byId<HTMLButtonElement>('add-mutation').onclick = addMutation;
byId<HTMLButtonElement>('add-payload').onclick = addPayload;
byId<HTMLButtonElement>('seal-box').onclick = () => { try { seal(); } catch (error) { status.textContent = error instanceof Error ? error.message : 'Could not seal this Box.'; } };
byId<HTMLButtonElement>('mystery-box').onclick = () => { const box = generateMysteryBox(`mystery-${Date.now()}`); title.value = box.title; content.value = box.content; theme.value = box.theme; locks = box.locks.map(lock => lock.type === 'puzzle' ? { type: 'puzzle', puzzle: lock.puzzle } : { type: 'magic', words: ['little comet'] }) as DraftLock[]; mutations = box.mutations; payloads = box.payloads; renderDrafts(); seal(box); };
byId<HTMLButtonElement>('copy-url').onclick = async () => { await navigator.clipboard.writeText(lastUrl); status.textContent = 'URL copied. Go cause a small amount of trouble.'; };
byId<HTMLButtonElement>('open-url').onclick = () => window.open(lastUrl, '_blank', 'noopener,noreferrer');
lockKind.onchange = renderLockFields;
renderLockFields(); renderDrafts(); renderGallery();
if (window.location.hash.includes('/bbx1/')) startVisitor();
