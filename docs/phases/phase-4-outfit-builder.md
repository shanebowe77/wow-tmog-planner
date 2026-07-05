# Phase 4 — Outfit Builder + 3D Preview

**Size:** M–L · **Depends on:** Phase 1 (GO decision + ModelViewer interface), Phase 3 (catalog
components) · **Risk:** medium — first production use of the viewer.

## Objective

The product's core loop: pick pieces per slot, see them on a 3D character, share the outfit with a URL —
no account needed. Done when a full outfit can be assembled, previewed on a chosen race/gender, and
reproduced from its share link in a fresh browser.

## Context

- **Phase 1's Decision-log entry and interface sketch are binding inputs.** Implement its `ModelViewer`
  interface for the Wowhead backend; all product code talks to the interface, never to
  `wow-model-viewer` directly (swap-readiness is a hard constraint in CLAUDE.md).
- Slot model + IDs: docs/DATA_MODEL.md §1–2 (transmoggable InventoryTypes; viewer slot mapping as
  documented by the spike). `appearances.display_info_id` feeds the viewer per the spike's displayId
  finding.
- Reuse Phase 3's picker building blocks (`AppearanceGrid`, `FilterBar`) inside the slot picker.

## In scope

- `/planner` — layout: paper-doll slot list (head, shoulder, back, chest, shirt, tabard, wrist, hands,
  waist, legs, feet, main hand, off hand) + 3D preview panel + race/gender selector (hardcoded playable
  race/gender list with the viewer's race ids from the spike).
- Slot interaction: click slot → picker dialog (catalog grid pre-filtered to that slot, searchable) →
  equip updates 3D via `setItem` without full reload; clear-slot; "random fill" is out.
- **Outfit state in the URL**: compact serialization of `{race, gender, slot→appearanceId}` (e.g.
  base64url of a versioned compact encoding — version byte first so the format can evolve). Copy-link
  button. This is the sharing mechanism until Phase 5 adds saved sets.
- **2D fallback mode**: if the viewer errors/doesn't load (per the interface's availability signal),
  the paper doll renders equipped icons and the page stays fully functional — the app must never be
  broken by a Wowhead outage.
- Client state management kept simple (URL as source of truth + local state; no store library unless it
  hurts).
- Mobile: usable degradation (viewer behind a tap-to-load on small screens to save bandwidth) — not
  pixel-perfect.

## Out of scope

Saving to DB, accounts, collected-filtering (Phase 5); AI suggestions (Phase 7); weapon enchant visuals
and non-playable customization (note as future ideas if encountered).

## Acceptance criteria

- [ ] Build a complete 13-slot outfit; every equip reflects in the 3D preview.
- [ ] Race/gender switch preserves the outfit.
- [ ] Share URL reproduces outfit + character in an incognito window.
- [ ] Kill the viewer (block zamimg via devtools) → page still works in 2D fallback with a friendly
      notice.
- [ ] No direct imports of `wow-model-viewer` outside the ModelViewer implementation module (enforce
      with an ESLint no-restricted-imports rule).
- [ ] Deployed and verified in production.

## Verification

Browser evidence for each acceptance criterion (screenshots; network tab for the fallback test). Test
Chrome + Safari. Include one absurd outfit screenshot for fun — it's a transmog tool.

## Kickoff prompt

> Read CLAUDE.md, docs/PLAN.md, docs/DATA_MODEL.md, docs/phases/phase-4-outfit-builder.md, and the
> Phase 1 Decision-log entry + ModelViewer interface. Build the outfit builder per In scope: interface
> implementation first, then the planner UI, URL sharing, and the 2D fallback. Verify every acceptance
> criterion in a real browser with screenshots, deploy, and update the tracker + Decision log.
