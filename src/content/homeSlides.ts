// Home slide copy — single source of truth for the bittybox.org hero slides.
// Authored copy lives here, decoupled from layout/animation.

export interface HomeSlideCopy {
  id: string;
  kicker: string;
  headline: string;
  body: string;
  bullets: string[];
  cta: string;
  metaDescription: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5-Step Hero Flow:
//   Slide 1 — Insert Content (Input Field Composer)
//   Slide 2 — Password Lock (Optional AES-256 GCM)
//   Slide 3 — Time-Based Lock (Optional Expiration Window / Reveal + Decay)
//   Slide 4 — Access Limit Lock (Optional Burn-on-Read / Visitor Quota)
//   Slide 5 — Review & Credit Cost (Free with no locks / PRO / Credits)
// ─────────────────────────────────────────────────────────────────────────────
const slideStubs: HomeSlideCopy[] = [
  {
    id: "create-box",
    kicker: "STEP 01 // ADD YOUR CONTENT",
    headline: "Type or paste what you want to share",
    body:
      "Write or paste HTML, CSS, JavaScript, markdown, or plain text. Built for autonomous AI agent workflows and developer toolchains, but crafted so humans can easily create and share too. Bitty Box packs everything into a single web link that runs anywhere without hosting or database dependencies.",
    bullets: [
      "Built for AI agent workflows — easy for humans too",
      "Paste web code, markdown, or plain text notes",
      "Zips and shrinks instantly right inside your browser",
      "Free forever — no website hosting or database needed",
      "Click Next to add an optional password or timer",
    ],
    cta: "Next: Passcode Lock →",
    metaDescription:
      "Create a self-contained Bitty Box. Built for AI agents and humans alike, encoded completely in the URL.",
  },
  {
    id: "password-lock",
    kicker: "STEP 02 // PASSCODE LOCK",
    headline: "Add a Secret PIN Code (Optional)",
    body:
      "Want to keep your page private? Lock it with an 8 to 12 digit PIN. Bitty Box encrypts your content right in your browser before creating the link, so only people who know your PIN can unlock and view it.",
    bullets: [
      "Easy 8 to 12 digit PIN to lock your page",
      "Bank-grade encryption keeps your content secret",
      "100% Free & Unlimited (0 credits needed)",
    ],
    cta: "Next: Time-Based Lock →",
    metaDescription:
      "Lock your Bitty Box with a secret numerical PIN code and browser-based encryption.",
  },
  {
    id: "time-based-lock",
    kicker: "STEP 03 // TIME-BASED LOCK",
    headline: "Set an Expiration Timer (Optional)",
    body:
      "Choose when your link should open or disappear. You can set it to expire after a few hours, stay hidden until a future date, or show up for a limited time window before self-destructing.",
    bullets: [
      "Set countdown timers, delayed reveals, or date ranges",
      "Automatically locks when time is up — nothing left behind",
      "Free with PRO ($4/mo) or 10 credits",
    ],
    cta: "Next: View Limits →",
    metaDescription:
      "Set an expiration timer so your Bitty Box automatically opens or locks on schedule.",
  },
  {
    id: "access-limit-lock",
    kicker: "STEP 04 // VIEW LIMITS",
    headline: "Limit How Many Times It Can Be Opened (Optional)",
    body:
      "Control how many times your link can be viewed. Set it to self-destruct after 1 view (burn after reading), 3 views, 5 views, or a custom number. Once the views are used up, the link locks forever.",
    bullets: [
      "Set 1 view (burn after reading), 3, 5, or custom views",
      "Shows a live badge counting down remaining views",
      "Free with PRO ($4/mo) or 10 credits",
    ],
    cta: "Next: Review & Generate →",
    metaDescription:
      "Limit how many times your Bitty Box can be opened before it permanently locks.",
  },
  {
    id: "preview-launch",
    kicker: "STEP 05 // REVIEW & GENERATE",
    headline: "READY TO GENERATE",
    body: "",
    bullets: [],
    cta: "GENERATE BOX",
    metaDescription:
      "Calculate credit cost and generate your self-contained Bitty Box URL.",
  },
];

// Ordered hero deck: 5 sequential configuration steps; the public wizard ends
// with review/generate instead of a dormant future-feature panel.
export const homeSlides: HomeSlideCopy[] = [
  slideStubs[0], // Step 1: Insert Content
  slideStubs[1], // Step 2: Password Lock
  slideStubs[2], // Step 3: Time-Based Lock
  slideStubs[3], // Step 4: Access Limit Lock
  slideStubs[4], // Step 5: Summary & Generate Box
];
