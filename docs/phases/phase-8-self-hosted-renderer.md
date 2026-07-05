# Phase 8 — Self-Hosted Renderer (Contingency — NOT SCHEDULED)

**Size:** XL (multiple sessions) · **Trigger:** the tripwire in docs/PLAN.md's Risk register — the
Phase 1 spike fails, or the Wowhead viewer breaks repeatedly (>2×/quarter), or a wanted feature is
impossible through it.

## Purpose of this stub

Don't build this. Keep the escape route documented so a future session can scope it quickly if the
tripwire fires.

## What it would involve (from docs/RESEARCH.md §2 Option B)

1. **Ingest the geometry tables** deferred from Phase 2: `ItemDisplayInfo`, `ModelFileData`,
   `ComponentModelFileData`, `TextureFileData` (the `ModelResourcesID` indirection — see
   DATA_MODEL §1 chain).
2. **Asset pipeline**: pull `.m2`/`.blp` by FileDataID (wago.tools raw-file endpoint — verify the
   `/api/casc/{fdid}` path first, per research caveat; or extract locally with wow.export), convert to
   glTF + web textures, upload to Cloudflare R2 (no-egress-fee CDN).
3. **Renderer**: evaluate `@wowserhq/scene` (Three.js, MIT — existed at v0.32.0 as of 2026-07) and
   `three-m2loader` before writing anything custom. The hard part is character assembly: geoset
   enable/disable, component texture layering onto the body skin, attachment points. wow.export's
   WebGL2 character renderer is the open-source blueprint to study.
4. **Swap-in**: implement the existing `ModelViewer` interface (from Phase 1) — product code shouldn't
   change at all. Ship behind a flag, A/B against the Wowhead backend, then flip.

## Why it's deferred

Months of solo work vs. days for the embed; Wowhead's CDN carries the bandwidth and the IP-risk surface;
every earlier phase was designed so this swap stays possible (interface boundary, display_info_id
already stored, geometry tables cheap to add to ingest).

## If the tripwire fires

Run a fresh research/scoping session first: re-check the state of `@wowserhq/scene`, wow.export's
renderer code, and any new community web viewers (the ecosystem moves). Write a real phase brief before
any implementation session.
