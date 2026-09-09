import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

export interface TourConfig {
  onComplete?: () => void;
  onCancel?: () => void;
}

const title = (icon: string, label: string, color = 'text-cyan-300') =>
  `<div class="flex items-center gap-2 ${color} font-cyber"><span class="text-base">${icon}</span>${label}</div>`;

const body = (copy: string) => `<div class="space-y-2 text-xs font-mono text-purple-100 leading-relaxed">${copy}</div>`;

const navButtons = (tour: any) => [
  { text: '← BACK', classes: 'shepherd-btn-secondary', action: () => tour.back() },
  { text: 'NEXT →', classes: 'shepherd-btn-primary', action: () => tour.next() },
];

/** First-run tour for the current five-slide Studio workflow. */
export function createBittyTour(config?: TourConfig): any {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    keyboardNavigation: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      classes: 'bitty-shepherd-theme',
      scrollTo: { behavior: 'smooth', block: 'center' },
    },
  });

  tour.addStep({
    id: 'welcome',
    title: title('⚡', 'WELCOME TO THE BITTY BOX STUDIO'),
    text: body(`
      <p>Bitty Box turns text, HTML, CSS, JavaScript, and markdown into a shareable Box link. The editor keeps your draft in this browser; the generated URL carries the Box so it can open anywhere.</p>
      <div class="p-2 rounded bg-purple-950/60 border border-purple-500/30 text-[11px] text-cyan-200"><strong>Tour map:</strong> compose → protect (optional) → chain Boxes → generate → preview and share.</div>
      <p class="text-[11px] text-purple-300/80">You can replay this walkthrough from About whenever you need a refresher.</p>
    `),
    buttons: [{ text: 'START WALKTHROUGH →', classes: 'shepherd-btn-primary', action: () => tour.next() }],
  });

  tour.addStep({
    id: 'compose',
    attachTo: { element: 'textarea[aria-label="Content for your Bitty Box"]', on: 'top' },
    title: title('✍️', '1 · COMPOSE YOUR FIRST BOX'),
    text: body(`
      <p>Start with a note, a prompt, markdown, or a complete mini web page. The editor accepts plain text and HTML/CSS/JavaScript.</p>
      <p class="text-[11px] text-cyan-300/80">Use <strong>Starter Box</strong> or <strong>Note</strong> below the editor if you want a safe example. Your draft saves locally as you work.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'identity',
    attachTo: { element: 'input[aria-label="Page title for your Bitty Box"]', on: 'bottom' },
    title: title('🏷️', '2 · NAME AND DESCRIBE IT', 'text-fuchsia-300'),
    text: body(`
      <p>Give the Box a title people will recognize. Add a short description when the link needs context; both travel with the generated metadata.</p>
      <p class="text-[11px] text-fuchsia-200/80">Leave the description blank if the Box is self-explanatory. You can edit these fields later.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'protect',
    attachTo: { element: 'button[aria-label="Next slide"]', on: 'top' },
    title: title('🛡️', '3 · OPTIONAL ACCESS CONTROLS', 'text-amber-300'),
    text: body(`
      <p>Use the slide controls to move through optional protections: a numerical passcode, a timed reveal/decay window, and a view limit. Leave them off for a public Box.</p>
      <div class="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-100"><strong>Tip:</strong> protections are applied when you generate the link. Test the final link before sharing.</div>
      <p class="text-[11px] text-purple-300/80">Press the arrow at the bottom of each slide to continue to the chaining controls.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'chain-toggle',
    attachTo: { element: '#holo-toggle-slide-05-chaining', on: 'left' },
    title: title('🔗', '4 · TURN BOX CHAINING ON'),
    text: body(`
      <p><strong>Box chaining</strong> links up to five self-contained Boxes into one ordered sequence—ideal for a lesson, slide deck, multi-step tutorial, or staged workflow.</p>
      <p class="text-[11px] text-cyan-200/80">On the final slide, switch <strong>CHAINING (LINKED BOXES)</strong> on. The current Box becomes Box 1; each Box keeps its own content and metadata.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'chain-edit',
    attachTo: { element: '#holo-toggle-slide-05-chaining', on: 'left' },
    title: title('🧩', '5 · BUILD THE SEQUENCE', 'text-fuchsia-300'),
    text: body(`
      <p>After enabling chaining, choose <strong>Clone into Next</strong> to reuse the current content or <strong>Start Blank Next</strong> for a fresh Box.</p>
      <ul class="list-disc list-inside text-[11px] text-cyan-200/90 space-y-1"><li>Click a Box pill to edit it.</li><li>Drag pills to reorder the sequence.</li><li>Delete the final Box when you need to trim the chain.</li></ul>
      <p class="text-[11px] text-amber-200/80">The maximum is five Boxes; longer chains also create larger links.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'chain-next',
    attachTo: { element: '#edge-grip-chain-next', on: 'left' },
    title: title('➡️', '6 · MOVE THROUGH A CHAIN'),
    text: body(`
      <p>The glowing right-edge grip opens the next Box while you are editing. In a generated Box, the same control lets a recipient continue to the next page.</p>
      <p class="text-[11px] text-cyan-200/80">If the grip is hidden, finish the chain toggle step first; it only appears while chaining is enabled.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'generate',
    attachTo: { element: '#holo-generate-btn', on: 'top' },
    title: title('🚀', '7 · GENERATE THE SHARE LINK', 'text-emerald-300'),
    text: body(`
      <p>When the content and sequence are ready, press <strong>GENERATE &amp; COPY</strong>. Bitty Box compresses the payload, applies the selected metadata and locks, and copies the resulting URL.</p>
      <p class="text-[11px] text-emerald-200/80">For a chain, the copied primary link starts at Box 1 and carries navigation to the rest.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'preview-share',
    attachTo: { element: '#edge-grip-preview', on: 'bottom' },
    title: title('👁️', '8 · PREVIEW, THEN SHARE', 'text-teal-300'),
    text: body(`
      <p>Use the top <strong>PREVIEW</strong> grip to inspect the rendered Box before you send it. The preview panel offers desktop, tablet, mobile, refresh, and open-in-new-tab views.</p>
      <p class="text-[11px] text-teal-200/80">Use the tools panel for QR, share, ZIP export, history, and account features. The <strong>AGENTS</strong> view documents API and MCP creation for automated workflows.</p>
    `),
    buttons: navButtons(tour),
  });

  tour.addStep({
    id: 'finish',
    title: title('✨', 'YOU ARE READY TO BUILD'),
    text: body(`
      <p>That is the current Bitty Box loop: write once, optionally protect it, chain Boxes when the story needs steps, generate a portable link, and verify the result.</p>
      <div class="p-2 rounded bg-cyan-950/60 border border-cyan-500/30 text-[11px] text-cyan-100"><strong>Next idea:</strong> make a three-Box tutorial—intro, hands-on example, and recap—then drag the pills to set the order.</div>
      <p class="text-[11px] text-purple-300/80">Your work remains in this browser until you generate or save a link.</p>
    `),
    buttons: [{ text: 'FINISH & START BUILDING ✨', classes: 'shepherd-btn-primary', action: () => tour.complete() }],
  });

  if (config?.onComplete) tour.on('complete', config.onComplete);
  if (config?.onCancel) tour.on('cancel', config.onCancel);
  return tour;
}
