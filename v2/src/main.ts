import './styles.css';
import {
  CapsulePasswordRequiredError,
  buildCapsuleChain,
  decodeCapsuleUrl,
} from './capsuleCore';
import { buildViewerDocument } from './viewerPolicy';

type BoxDraft = {
  id: string;
  title: string;
  content: string;
  password: string;
};

const STORAGE_KEY = 'bittybox_v2_lab_draft';
const MAX_BOXES = 5;
const textEncoder = new TextEncoder();

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}`);
  return element as T;
}

const builder = byId<HTMLElement>('builder');
const viewer = byId<HTMLElement>('viewer');
const chainTrack = byId<HTMLElement>('chain-track');
const chainCount = byId<HTMLElement>('chain-count');
const activeBoxLabel = byId<HTMLElement>('active-box-label');
const titleInput = byId<HTMLInputElement>('box-title');
const contentInput = byId<HTMLTextAreaElement>('box-content');
const passwordInput = byId<HTMLInputElement>('box-password');
const byteCount = byId<HTMLElement>('byte-count');
const protectionState = byId<HTMLElement>('protection-state');
const status = byId<HTMLElement>('status');
const generateButton = byId<HTMLButtonElement>('generate-box');
const deleteButton = byId<HTMLButtonElement>('delete-box');
const resultUrlInput = byId<HTMLTextAreaElement>('result-url');
const resultSummary = byId<HTMLElement>('result-summary');
const capsuleFrame = byId<HTMLIFrameElement>('capsule-frame');
const passwordGate = byId<HTMLElement>('password-gate');
const viewerPassword = byId<HTMLInputElement>('viewer-password');
const passwordError = byId<HTMLElement>('password-error');
const viewerNext = byId<HTMLButtonElement>('viewer-next');
const viewerPosition = byId<HTMLElement>('viewer-position');

let activeIndex = 0;
let lastResultUrl = '';
let lastFocusedElement: HTMLElement | null = null;

function newId(): string {
  return `box_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function defaultBox(): BoxDraft {
  return { id: newId(), title: 'My Box', content: '', password: '' };
}

function loadBoxes(): BoxDraft[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as unknown;
    if (!Array.isArray(value) || value.length < 1 || value.length > MAX_BOXES) return [defaultBox()];
    const valid = value.every(item => item && typeof item === 'object'
      && typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.content === 'string'
      && typeof item.password === 'string');
    return valid ? value as BoxDraft[] : [defaultBox()];
  } catch {
    return [defaultBox()];
  }
}

let boxes: BoxDraft[] = loadBoxes();

function saveBoxes(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
  } catch {
    status.textContent = 'Draft could not be saved locally.';
  }
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function currentBox(): BoxDraft {
  return boxes[activeIndex];
}

function updateStatusLine(): void {
  const box = currentBox();
  byteCount.textContent = `${textEncoder.encode(box.content).byteLength.toLocaleString()} BYTES`;
  protectionState.textContent = box.password ? 'PASSWORD SEALED' : 'PUBLIC LINK';
  generateButton.textContent = activeIndex === boxes.length - 1 ? 'MAKE BOX' : 'GO TO FINAL BOX';
  deleteButton.hidden = boxes.length === 1;
}

function renderChain(): void {
  chainTrack.replaceChildren();
  boxes.forEach((box, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chain-pill';
    button.dataset.index = String(index);
    button.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
    button.setAttribute('aria-label', `Edit Box ${index + 1}: ${box.title || 'Untitled'}`);

    const copy = document.createElement('span');
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    title.textContent = box.title || 'Untitled Box';
    meta.textContent = index === boxes.length - 1 ? `BOX ${index + 1} • FINAL` : `BOX ${index + 1}`;
    copy.append(title, meta);

    const arrow = document.createElement('span');
    arrow.textContent = index === activeIndex ? 'EDITING' : 'OPEN';
    button.append(copy, arrow);
    button.addEventListener('click', () => selectBox(index));
    chainTrack.append(button);
  });

  if (boxes.length < MAX_BOXES) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'chain-pill add';
    add.textContent = '+ ADD NEXT BOX';
    add.setAttribute('aria-label', 'Add the next Box');
    add.addEventListener('click', () => openModal('chain-modal'));
    chainTrack.append(add);
  }
  chainCount.textContent = `${boxes.length} ${boxes.length === 1 ? 'BOX' : 'BOXES'}`;
}

function renderActiveBox(): void {
  const box = currentBox();
  titleInput.value = box.title;
  contentInput.value = box.content;
  activeBoxLabel.textContent = `BOX ${activeIndex + 1}${activeIndex === boxes.length - 1 ? ' • FINAL' : ''}`;
  updateStatusLine();
}

function render(): void {
  renderChain();
  renderActiveBox();
}

function scrollActivePill(): void {
  requestAnimationFrame(() => {
    const pill = chainTrack.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    pill?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  });
}

function selectBox(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= boxes.length) return;
  activeIndex = index;
  status.textContent = '';
  render();
  scrollActivePill();
  titleInput.focus();
}

function openModal(id: string): void {
  const modal = byId<HTMLElement>(id);
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const focusTarget = modal.querySelector<HTMLElement>('input, button, textarea');
  focusTarget?.focus();
}

function closeModal(modal: HTMLElement): void {
  modal.hidden = true;
  document.body.style.overflow = '';
  lastFocusedElement?.focus();
}

function closeOpenModal(): void {
  const modal = document.querySelector<HTMLElement>('.modal:not([hidden])');
  if (modal) closeModal(modal);
}

function addBox(mode: 'clone' | 'blank'): void {
  if (boxes.length >= MAX_BOXES) {
    status.textContent = 'A chain can hold up to five Boxes.';
    closeOpenModal();
    return;
  }
  const source = currentBox();
  boxes.push(mode === 'clone'
    ? { ...structuredClone(source), id: newId(), title: `${source.title || 'My Box'} Copy` }
    : defaultBox());
  activeIndex = boxes.length - 1;
  saveBoxes();
  render();
  closeOpenModal();
  scrollActivePill();
  contentInput.focus();
  status.textContent = mode === 'clone' ? 'Cloned into the next Box.' : 'Blank next Box added.';
}

function deleteCurrentBox(): void {
  if (boxes.length === 1) return;
  boxes.splice(activeIndex, 1);
  activeIndex = Math.min(activeIndex, boxes.length - 1);
  saveBoxes();
  render();
  closeOpenModal();
  scrollActivePill();
  status.textContent = 'Box removed from the chain.';
}

function basePath(): string {
  const path = window.location.pathname;
  return path.endsWith('/') ? path : `${path}/`;
}

function preOpenWindow(): Window | null {
  try {
    const pending = window.open('about:blank', '_blank');
    if (pending) {
      pending.document.title = 'Sealing Bitty Box…';
      pending.document.body.textContent = 'Sealing your Bitty Box…';
    }
    return pending;
  } catch {
    return null;
  }
}

async function makeUrls(drafts: BoxDraft[]): Promise<{ entryUrl: string; urls: string[] }> {
  return buildCapsuleChain(
    drafts.map(box => ({
      title: box.title || 'My Box',
      summary: 'Portable Bitty Box Capsule',
      content: box.content,
      mediaType: 'text/html',
      password: box.password || undefined,
    })),
    { origin: window.location.origin, basePath: basePath() },
  );
}

function sendPopup(pending: Window | null, url: string): void {
  if (pending && !pending.closed) {
    try {
      pending.opener = null;
      pending.location.href = url;
      return;
    } catch {
      pending.close();
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function generateChain(): Promise<void> {
  if (activeIndex !== boxes.length - 1) {
    activeIndex = boxes.length - 1;
    render();
    scrollActivePill();
    status.textContent = 'Generation lives on the final Box. You are there now.';
    return;
  }
  if (!currentBox().content.trim()) {
    status.textContent = 'Put something in the final Box first.';
    contentInput.focus();
    return;
  }

  const pending = preOpenWindow();
  generateButton.disabled = true;
  generateButton.textContent = 'SEALING…';
  status.textContent = `Sealing ${boxes.length} ${boxes.length === 1 ? 'Box' : 'Boxes'} entirely in your browser…`;
  try {
    const result = await makeUrls(boxes);
    lastResultUrl = result.entryUrl;
    resultUrlInput.value = result.entryUrl;
    resultSummary.textContent = boxes.length === 1
      ? 'It opened in a new tab. Your builder is still here.'
      : `${boxes.length} Boxes were sealed tail-first into one entry URL. Your builder is still here.`;
    sendPopup(pending, result.entryUrl);
    openModal('result-modal');
    status.textContent = 'Box sealed. Nothing was uploaded.';
  } catch (error) {
    pending?.close();
    status.textContent = error instanceof Error ? error.message : 'The Box could not be sealed.';
  } finally {
    generateButton.disabled = false;
    updateStatusLine();
  }
}

async function previewCurrent(): Promise<void> {
  if (!currentBox().content.trim()) {
    status.textContent = 'Put something in this Box first.';
    contentInput.focus();
    return;
  }
  const pending = preOpenWindow();
  status.textContent = 'Preparing preview…';
  try {
    const result = await makeUrls([currentBox()]);
    sendPopup(pending, result.entryUrl);
    status.textContent = 'Preview opened. Your draft stayed put.';
  } catch (error) {
    pending?.close();
    status.textContent = error instanceof Error ? error.message : 'Preview failed.';
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

function showPasswordGate(): void {
  capsuleFrame.hidden = true;
  passwordGate.hidden = false;
  viewerPassword.focus();
}

async function renderCapsule(password?: string): Promise<void> {
  try {
    const capsule = await decodeCapsuleUrl(window.location.href, { password });
    passwordGate.hidden = true;
    passwordError.textContent = '';
    capsuleFrame.hidden = false;
    document.title = `${capsule.title} — Bitty Box`;
    viewerPosition.textContent = capsule.chain
      ? `BOX ${capsule.chain.index + 1} OF ${capsule.chain.total}`
      : 'STATELESS CAPSULE';
    viewerNext.hidden = !capsule.chain?.nextUrl;
    viewerNext.dataset.nextUrl = capsule.chain?.nextUrl || '';

    if (capsule.content.mediaType === 'text/html') {
      capsuleFrame.srcdoc = buildViewerDocument(capsule.content.payload, capsule.title, capsule.capabilities);
    } else {
      capsuleFrame.srcdoc = buildViewerDocument(
        `<!doctype html><meta charset="utf-8"><style>body{font:16px/1.6 system-ui;margin:0;padding:2rem;white-space:pre-wrap}</style><main>${escapeHtml(capsule.content.payload)}</main>`,
        capsule.title,
        capsule.capabilities,
      );
    }
  } catch (error) {
    if (error instanceof CapsulePasswordRequiredError) {
      showPasswordGate();
      return;
    }
    if (password) {
      showPasswordGate();
      passwordError.textContent = 'That password did not open this Box.';
      return;
    }
    capsuleFrame.hidden = true;
    passwordGate.hidden = false;
    passwordError.textContent = error instanceof Error ? error.message : 'This Box could not be opened.';
  }
}

function route(): void {
  const isCapsule = /#\/bbx2e?\//.test(window.location.hash);
  builder.hidden = isCapsule;
  viewer.hidden = !isCapsule;
  if (isCapsule) void renderCapsule();
  else {
    document.title = 'Bitty Box v2 Lab';
    render();
  }
}

titleInput.addEventListener('input', () => {
  currentBox().title = titleInput.value;
  saveBoxes();
  renderChain();
});

contentInput.addEventListener('input', () => {
  currentBox().content = contentInput.value;
  saveBoxes();
  updateStatusLine();
});

byId<HTMLButtonElement>('open-protect').addEventListener('click', () => {
  passwordInput.value = currentBox().password;
  openModal('protect-modal');
});
byId<HTMLButtonElement>('open-chain').addEventListener('click', () => openModal('chain-modal'));
byId<HTMLButtonElement>('clone-box').addEventListener('click', () => addBox('clone'));
byId<HTMLButtonElement>('blank-box').addEventListener('click', () => addBox('blank'));
deleteButton.addEventListener('click', deleteCurrentBox);
byId<HTMLButtonElement>('save-password').addEventListener('click', () => {
  const password = passwordInput.value.trim();
  if (password && password.length < 8) {
    passwordInput.setCustomValidity('Use at least 8 characters.');
    passwordInput.reportValidity();
    return;
  }
  passwordInput.setCustomValidity('');
  currentBox().password = password;
  saveBoxes();
  updateStatusLine();
  closeOpenModal();
  status.textContent = password ? 'Password protection added to this Box.' : 'This Box uses a public link.';
});
byId<HTMLButtonElement>('remove-password').addEventListener('click', () => {
  currentBox().password = '';
  passwordInput.value = '';
  saveBoxes();
  updateStatusLine();
  closeOpenModal();
  status.textContent = 'Password removed.';
});
byId<HTMLButtonElement>('preview-box').addEventListener('click', () => void previewCurrent());
generateButton.addEventListener('click', () => void generateChain());

byId<HTMLButtonElement>('copy-result').addEventListener('click', async () => {
  if (!lastResultUrl) return;
  try {
    await navigator.clipboard.writeText(lastResultUrl);
    status.textContent = 'Capsule URL copied.';
  } catch {
    resultUrlInput.select();
    document.execCommand('copy');
  }
});
byId<HTMLButtonElement>('open-result').addEventListener('click', () => {
  if (lastResultUrl) window.open(lastResultUrl, '_blank', 'noopener,noreferrer');
});

for (const modal of document.querySelectorAll<HTMLElement>('.modal')) {
  modal.addEventListener('pointerdown', event => {
    if (event.target === modal) closeModal(modal);
  });
  modal.querySelectorAll<HTMLElement>('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => closeModal(modal));
  });
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeOpenModal();
});

byId<HTMLFormElement>('password-form').addEventListener('submit', event => {
  event.preventDefault();
  void renderCapsule(viewerPassword.value);
});
viewerNext.addEventListener('click', () => {
  const nextUrl = viewerNext.dataset.nextUrl;
  if (nextUrl) window.location.href = nextUrl;
});
byId<HTMLButtonElement>('viewer-home').addEventListener('click', () => {
  history.replaceState(null, '', basePath());
  route();
});
window.addEventListener('hashchange', route);

route();
