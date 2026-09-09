# Bitty Box — Launch MVP Scope Agreement (v1, LOCKED)

**Status:** Locked scope agreement for v1 launch.
**Owner:** T.C. (product owner) — drafted autonomously by Quill (Bitty Box watchdog).
**Date locked:** 2026-08-18
**Product:** Bitty Box — compress HTML, rich documents, recipes, and interactive apps into self-contained, shareable URL fragments in a retro-futuristic synthwave workspace.

This document is the single source of truth for what ships in **v1**. Any feature not listed under "In Scope (v1)" is explicitly deferred to the v2 backlog and must NOT be started until v1 is launched and stable. Scope changes require an explicit owner sign-off edit to this file.

---

## In Scope (v1) — the launch MVP

| # | Capability | Notes |
|---|------------|-------|
| 1 | **Password gate** | Protected links require a viewer-supplied password before payload delivery. |
| 2 | **TOTP** | Time-based one-time-password (authenticator app) as a second factor on gated links. |
| 3 | **Passkey / WebAuthn** | Phishing-resistant device-bound credential for link access (and ideally creator login). |
| 4 | **Not-before / expires-at** | Link is inert before `not_before` and auto-revokes at `expires_at`. |
| 5 | **Session TTL** | Authenticated access sessions expire after a bounded idle/lifetime window. |
| 6 | **Max opens / one-time** | Link enforces a maximum open count; "one-time" burns the link after first successful view. |
| 7 | **Telegram approval** | Out-of-band approval/notify step via Telegram for sensitive gated opens (owner confirmation). |
| 8 | **Audit logs** | `access_log` records link_id, timestamp, IP, result (allow/deny), and reason for every policy evaluation. |
| 9 | **REST API** | Documented HTTP API for link create/get/update/revoke and policy control (see `/api/health`, `/docs`). |
| 10 | **MCP server** | Model Context Protocol server exposing link operations over `/mcp` and `/api/mcp`. |
| 11 | **Basic creator dashboard** | Minimal UI to create, inspect, and revoke links and read recent access logs. |

### v1 architecture anchors (current build)
- **Server:** Express (`server.js`, default port `3012`), static `dist/` + `/docs` rendering.
- **Core engine:** `lib/bitty-engine.js` (`createBittyLink`, `decodeBittyLink`).
- **Auth:** `lib/auth-middleware.js` + `lib/account-store.js` (API keys `bb_live_`, sessions `bb_sess_`).
- **Transport:** `mcp/http-transport.js`; `bin/bitty-cli.js`, `bin/bitty-mcp.js` for CLI/headless use.
- **Payload storage:** server-side; gated payloads must never be readable from the public URL without passing policy.

---

## Deferred to v2 backlog (explicitly OUT of v1)

- **Geo** restrictions (country/region allow/deny).
- **IP lists** (allow/deny ranges).
- **mTLS** client-certificate gating.
- **Marketplace** for publishing/discovering shared bits.
- **Payment gate** (monetized / metered links).

These remain ideas to validate after the v1 launch proves the core gating + delivery loop.

---

## Locked scope rules

1. **No silent scope creep.** If a v1 task needs a v2 feature to function, cut the v1 task down — do not pull the v2 feature forward.
2. **Revocation is hard.** `revokeLink` must make delivery fail immediately with no cached copy served post-revoke.
3. **Gated payloads stay server-side.** The public URL alone must never yield protected content.
4. **Audit everything.** Every policy decision (allow/deny + reason) is logged. No exceptions in v1.
5. **Ship the loop, not the castle.** v1 proves: create link → enforce policy → deliver payload → log → revoke.

---

## Sign-off

- **Locked by:** T.C. (owner) — _agreed via Bitty Box project task "Define launch MVP feature set and cut scope to v1"_.
- **Drafted by:** Quill (autonomous Bitty Box watchdog), 2026-08-18.
- To reopen scope, edit this file with a dated owner note and move the affected item between the v1/v2 tables.
