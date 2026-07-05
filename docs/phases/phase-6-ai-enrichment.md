# Phase 6 — AI Enrichment Pipeline

**Size:** M · **Depends on:** Phase 2 only (can run parallel to 3–5) · **Risk:** low-medium (quality of
derived signals is unproven until Phase 7 consumes them)

## Objective

Extend the ingest pipeline with the offline intelligence layer: per-appearance color data, theme tags,
text embeddings, and set co-occurrence — everything Phase 7 retrieves against. Done when every
appearance has colors + embedding + (for a large subset) theme tags, and vector/color/co-occurrence
queries return sane results in SQL.

## Context

- Research: docs/RESEARCH.md §4. Target tables: docs/DATA_MODEL.md §3 enrichment block
  (`appearance_tags`, `appearance_embeddings`, `appearance_pairs`) — migration in this phase, including
  the pgvector extension and HNSW index (build the index AFTER bulk load).
- Decisions already logged (PLAN.md): embeddings via local `gte-small` (384-dim) using
  `@xenova/transformers` inside the GH Actions job — $0, swappable later; icons are the color source
  for v1 (model-render thumbnails are a Phase 8+ refinement).
- All of this runs as additional ingest stages (`scripts/ingest/enrich/*`), incremental by design:
  process only appearances missing/outdated rows (keyed by icon slug + tag vocab version), so reruns
  are cheap and patch-day deltas are small.

## In scope

- **Colors**: download each distinct icon once (cache dir / artifact; ~a few GB max, throttled), run
  `node-vibrant` → store dominant hex + swatch palette + mapped `color_buckets` via HSL rules
  (vocabulary: red, orange, yellow/gold, green, teal, blue, purple, pink, brown, black, white/silver,
  grey). Unit-test the HSL bucket mapping with known hexes.
- **Theme tags via Claude vision** (budgeted, optional-per-run flag): batch icons (grid-composite
  multiple icons per request to cut cost), controlled vocabulary (~40 tags: gothic, holy, fel, arcane,
  nature, tribal, pirate, mechanical, draconic, spiky, ornate, plain, skulls, glowing, …) + material
  descriptors; structured JSON output; cache by icon hash so a rerun costs $0. Run the full catalog only
  after a ~200-icon sample pass is eyeballed for quality; record measured cost-per-1k icons and total
  spend in the Decision log. Use the Batch API if it meaningfully cuts cost.
- **Embeddings**: synthetic doc per appearance — `display_name, slot word, armor type word, expansion
  name, color buckets, theme tags` — embed with gte-small, bulk-insert, then create the HNSW cosine
  index. Include the doc-building function in unit tests (it's the retrieval quality lever).
- **Co-occurrence**: SQL over `transmog_set_items` joined to IMAs → `appearance_pairs` with `b_slot`
  and `sets_count` (pairs within the same TransmogSet, both directions).
- **Retrieval RPC**: `match_appearances(query_embedding vector, filter_slot int default null,
  filter_armor_type int default null, filter_colors text[] default null, match_count int default 40)`
  — SQL function using `<=>` with the WHERE filters, `security definer` not needed (read-only, anon
  SELECT policies). Plus a `suggest_for_slot(appearance_id, target_slot)` SQL that blends co-occurrence
  and color overlap (embedding blend can wait for Phase 7 tuning).
- Wire stages into the GH Actions workflow (separate job after catalog load; vision stage gated behind
  a manual input + `ANTHROPIC_API_KEY` secret).

## Out of scope

Any UI or API routes (Phase 7). Model-render thumbnails. Re-ranking logic tuning (Phase 7 owns quality
iteration; this phase owns data existence + plumbing).

## Acceptance criteria

- [ ] >99% of appearances have color buckets + embeddings; theme-tag coverage % recorded (whatever the
      budget allowed).
- [ ] Sanity queries pass and are pasted into the session summary: embedding search for "dark death
      knight plate" (embed the phrase with the same model) returns visibly gothic/dark plate in top 20;
      `color_buckets @> '{red}'` + slot=head returns red-ish helmets; `suggest_for_slot` for a Judgement
      piece surfaces other Judgement pieces first.
- [ ] HNSW index exists; `match_appearances` P95 < ~100ms warm.
- [ ] Rerun of enrichment on unchanged data processes ~0 items and costs ~$0.
- [ ] DB size re-measured and noted in PLAN.md (free-tier watch item; embeddings are the big adder).

## Verification

SQL-driven: run the sanity queries above and eyeball the icon results (quick throwaway HTML grid or the
Phase 3 catalog filtered by ids is fine). Record vision-tagging sample quality observations honestly —
if icon-based tags are weak, say so in the Decision log; Phase 7 weights signals accordingly.

## Kickoff prompt

> Read CLAUDE.md, docs/PLAN.md, docs/DATA_MODEL.md, docs/RESEARCH.md §4, and
> docs/phases/phase-6-ai-enrichment.md. Extend the ingest pipeline with colors, theme tags (sample pass
> first — show me ~20 tagged examples and the projected full-catalog cost before running everything),
> embeddings, co-occurrence, and the retrieval RPCs. Run enrichment for real, paste the sanity-query
> results with icons I can eyeball, and update tracker + Decision log (coverage %, spend, DB size).
