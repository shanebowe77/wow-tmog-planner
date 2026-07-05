# Phase 1 — 3D Viewer Spike ⚠️ DECISION GATE

**Size:** S (time-boxed to one session) · **Depends on:** Phase 0 · **Risk:** HIGH — this is the
make-or-break product risk, which is exactly why it runs first.

## Objective

Prove (or disprove) that the Wowhead hosted model viewer, embedded via the `wow-model-viewer` npm
package, can render a transmogged character inside our Next.js app with runtime item swapping. Output is
a working `/dev/viewer-spike` page **and a written GO/NO-GO decision** in docs/PLAN.md's Decision log.
This is a spike: ugly code is acceptable; unanswered questions are not.

## Context

- Research: docs/RESEARCH.md §2 Option A. Package verified alive 2026-07-05 (v1.5.3, updated 2025-11).
- `wow-model-viewer` wraps Wowhead's minified ZamModelViewer served from `wow.zamimg.com/modelviewer/`;
  it requires jQuery as a global and a viewer script tag. Character descriptor shape (from the package
  README — re-read the current README first, the API has shifted before):
  `{ race, gender, skin, face, hairStyle, hairColor, facialStyle, items: [[slotId, displayId], ...] }`
  passed to `generateModels(aspect, '#selector', character)`.
- Known friction points from research: jQuery global injection in Next.js, possible CORS on the viewer's
  metadata JSON fetches from non-Wowhead origins (community workaround: setting `window.CONTENT_PATH`;
  worst case a same-origin proxy route — note bandwidth tradeoff before adopting), and periodic breakage
  when Wowhead updates the minified viewer.
- **The displayId question (this phase's most valuable output):** our database will store
  `ItemDisplayInfoID` per appearance (see docs/DATA_MODEL.md §1). The package's
  `findItemsInEquipments` helper resolves itemId → displayId by querying Wowhead. This phase must
  determine whether that displayId equals `ItemDisplayInfoID` — pick 3 well-known items, resolve their
  displayIds via the helper, and compare against `ItemAppearance`/`ItemDisplayInfo` rows fetched from
  `https://wago.tools/db2/ItemAppearance/csv` (grep the rows; no full ingest needed). If they match, the
  viewer costs us zero runtime Wowhead calls later. Document the answer either way.

## In scope

- `/dev/viewer-spike` client-component route (excluded from prod nav; a `robots` noindex is fine).
- Script/jQuery loading strategy that works with App Router (e.g. `next/script` + dynamic import of the
  package, `ssr: false`).
- Render a character; equip a full recognizable set (e.g. Judgement) via hardcoded `[slot, displayId]`
  pairs; document the slot-enum mapping you confirm (viewer slot ids vs InventoryType).
- Runtime swap of at least one piece without full reload (`updateItemViewer` or re-generate — measure
  which is acceptable).
- Try ≥3 race/gender combos; note load time (network tab) and failure modes with console/network
  evidence.
- Resolve the displayId question above.
- Write findings + GO/NO-GO into docs/PLAN.md Decision log; sketch the `ModelViewer` interface
  (TypeScript) that Phase 4 will implement against, based on what the spike shows is actually possible:
  roughly `mount(el, character)`, `setItem(slot, displayInfoId)`, `clearItem(slot)`, `setCharacter(...)`,
  `destroy()`, plus an availability/error signal for the 2D fallback.

## Out of scope

Production polish, our own data, outfit state, any non-dev route. Do not start Phase 4 integration.

## Acceptance criteria

- [ ] Spike page renders an interactive 3D character with ≥5 equipped transmog pieces on desktop
      Chrome + one other engine (Safari or Firefox).
- [ ] Item hot-swap works and its latency/UX cost is documented.
- [ ] displayId ↔ ItemDisplayInfoID relationship is answered with evidence.
- [ ] CORS/proxy requirements documented (what requests the viewer makes, what needed workarounds).
- [ ] Decision log entry: GO (commit to Option A for v1) or NO-GO (activate fallback: 2D-first product,
      pull Phase 8 evaluation forward) — with reasons.
- [ ] `ModelViewer` interface sketch committed (types only is fine).

## Verification

Browser evidence required: screenshots of the rendered character (Claude in Chrome / preview tools),
console + network logs for the load sequence, and the wago.tools row data used for the displayId
comparison. A claim without a screenshot/log doesn't count for this phase.

## Kickoff prompt

> Read CLAUDE.md, docs/PLAN.md, docs/RESEARCH.md §2, and docs/phases/phase-1-viewer-spike.md, then run
> the spike. Start by re-reading the current wow-model-viewer README/source on GitHub — verify its API
> before coding against my summary. Capture browser evidence for everything, answer the displayId
> question with data, and end with a GO/NO-GO entry in the PLAN.md Decision log plus the ModelViewer
> interface sketch.
