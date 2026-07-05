# Phase 3 — Catalog Browser (2D)

**Size:** M · **Depends on:** Phase 2 (live catalog data) · **Risk:** low

## Objective

The browsable heart of the site: every appearance in the game, filterable and searchable, with detail
pages for appearances and transmog sets. Done when finding "that one red plate helmet" takes seconds on
the deployed site.

## Context

- Data shapes: docs/DATA_MODEL.md §3 (`appearances`, `items`, `item_modified_appearances`,
  `transmog_sets`, `transmog_set_items`). Icons: §5 `iconUrl(slug, size)` decision from Phase 2.
- Server Components + supabase server client; anon key with RLS read policies. Filter state in the URL
  (CLAUDE.md convention) so every view is shareable/linkable.
- Scale reality: ~150–250k appearances. Pagination (or cursor infinite scroll) is mandatory; check
  `EXPLAIN` on the hot filter combos and add the composite indexes the queries actually need.

## In scope

- `/appearances` — grid of icon cards (name, quality color border, slot badge). Filters: slot, armor
  type, quality, expansion, source type; text search on `display_name` (Postgres `ILIKE` prefix +
  trigram index, or `tsvector` — pick simplest that feels instant). Sort: ui_order / name / expansion.
- `/appearance/[id]` — icon, display name, slot/armor type, all items sharing the appearance (with
  modifier labels like "Mythic"), sets containing it, source type, link out to Wowhead item page
  (`https://www.wowhead.com/item={itemId}`).
- `/sets` — transmog set browser (filter: expansion, class via ClassMask); `/set/[id]` with member
  pieces laid out by slot.
- Shared UI kit pieces this creates for later phases: `AppearanceCard`, `AppearanceGrid`,
  `FilterBar`, `QualityBorder`, `iconUrl` helper with `next/image` remotePatterns configured.
- SEO basics: metadata + OpenGraph on detail pages; sitemap for sets (cap appearance sitemap or skip —
  note the choice).
- Empty/loading/error states; keyboard-accessible filters.

## Out of scope

Outfit building, 3D anything, auth, "collected" state, AI. No visual redesign ambitions — clean, dark,
fast; polish comes with usage.

## Acceptance criteria

- [ ] Search "judgement" → the classic paladin set pieces appear near the top; filter Plate+Head+Classic
      narrows correctly.
- [ ] Set detail for a known tier set shows all pieces with correct icons.
- [ ] Any filtered view's URL, pasted into a fresh tab, reproduces the view.
- [ ] P95 server render of the grid under ~500ms locally (indexes proven with `EXPLAIN ANALYZE` in the
      session notes); icons lazy-load.
- [ ] Deployed to production and spot-checked there.

## Verification

Browser-verify (Claude in Chrome / preview tools) the acceptance flows with screenshots, including one
truly obscure appearance found via filters and cross-checked against its Wowhead page for name/icon
correctness.

## Kickoff prompt

> Read CLAUDE.md, docs/PLAN.md, docs/DATA_MODEL.md, and docs/phases/phase-3-catalog.md. Build the
> catalog browser per the In scope list against the live Supabase catalog. Prove query performance with
> EXPLAIN ANALYZE for the hot paths, verify the acceptance flows in a real browser with screenshots,
> deploy, and update the tracker + Decision log.
