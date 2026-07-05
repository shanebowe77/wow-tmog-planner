# Phase 7 — AI Planner UX

**Size:** M–L · **Depends on:** Phase 4 (builder), Phase 6 (enrichment) · **Risk:** medium (quality
iteration is open-ended; budget discipline required)

## Objective

The headline feature: describe a theme in plain language and get a wearable outfit; select any piece
and get complementary suggestions per slot. Done when "dark ranger — black and green leather" yields an
outfit a WoW player would call on-theme, suggestions feel coherent, and the whole thing runs cached,
rate-limited, and budget-capped.

## Context

- Research: docs/RESEARCH.md §4 retrieval architecture. Building blocks that already exist after
  Phase 6: `match_appearances` RPC (vector + filters), `appearance_pairs`, color buckets, theme tags.
- Claude API — **read the repo's claude-api skill/docs at implementation time for current model ids and
  structured-output patterns; don't hardcode from memory.** Default to the current Sonnet-tier model
  for parsing/curation (cost), with temperature low and strict JSON schema outputs.
- Embedding the user's query at runtime must use the SAME model as Phase 6 (gte-small via
  @xenova/transformers). Verify it loads within route-handler limits (cold start!); if too heavy for
  Vercel, fall back to embedding via a Supabase Edge Function (gte-small is natively supported there) —
  decide with a measurement, log the decision.
- Vercel Hobby: 10s default route duration (Fluid up to 300s) — design for one Claude call per plan,
  streaming optional.

## In scope

- **Theme → outfit flow** (`/planner` panel + `POST /api/plan`):
  1. Claude parses the freeform prompt → strict JSON: `{armor_type?, colors[], theme_query, slots[],
     mood_words[]}` (schema-validated; on validation failure retry once then degrade to using the raw
     prompt as `theme_query`).
  2. Per requested slot: `match_appearances` with filters → top-N candidates.
  3. Curation call: ONE Claude request with all slots' candidates (names + tags + colors, no images) →
     picks a coherent outfit + 2 alternates per slot + one-line rationale.
  4. Apply to builder (fills slots; user tweaks from there). Show alternates as chips per slot.
- **Complementary suggestions** ("suggest for this slot"): no LLM call — weighted blend of
  co-occurrence, color-palette overlap, and embedding similarity vs. the currently equipped pieces.
  Expose weights as constants; tune by hand against ~10 test cases this phase defines (e.g. "given
  Judgement chest, shoulder suggestions must include Judgement shoulders top-3").
- **Cost/abuse controls** (all in this phase, none deferred): normalize prompt → hash → `ai_query_cache`
  table (result jsonb, hit counter, ~30-day expiry); per-IP + per-user rate limit (simple Postgres
  counter is fine); daily global spend cap via env var — when exceeded, planner returns the
  retrieval-only result (filters + vectors, no curation) with an honest notice. Log
  tokens/cost per call to a table for visibility.
- Prompt-injection hygiene: user text goes into clearly delimited data blocks; the parse step's output
  is schema-constrained; catalog data (names) is treated as data, not instructions.
- Empty/failure UX: no candidates → say so with the parsed filters shown ("no green leather shoulders
  from Classic — loosen?"); Claude down → retrieval-only mode.

## Out of scope

Image-based input ("match this screenshot" — great future phase), multi-outfit "lookbooks", user
feedback/learning loops. In-viewer AI chat. Fine-tuning anything.

## Acceptance criteria

- [ ] 10-case eval sheet (committed as `docs/eval/planner-cases.md`) with themed prompts and
      pass/fail judgments — ≥7 subjectively on-theme; "dark ranger" case passes.
- [ ] Complementary suggestions pass the defined test cases (co-occurrence dominance proven).
- [ ] Repeat of a cached prompt: 0 Claude calls (proven via the cost log), <500ms response.
- [ ] Budget cap + rate limit demonstrably trigger (test with env set low) and degrade gracefully.
- [ ] End-to-end: prompt → outfit → applied in builder → shared via URL, verified in a real browser.
- [ ] Cost note in Decision log: measured $/plan and cache hit expectations.

## Verification

Run the eval sheet for real against production (or preview) with screenshots of 3 best and the worst
result — honest reporting; a weak spot here shapes the next iteration, and quality iteration is
expected to continue beyond this session.

## Kickoff prompt

> Read CLAUDE.md, docs/PLAN.md, docs/DATA_MODEL.md, docs/RESEARCH.md §4, and
> docs/phases/phase-7-ai-planner.md. Build the AI planner: parse→retrieve→curate flow, non-LLM
> complementary suggestions, and ALL the cost/abuse controls. Check current Claude model ids/patterns
> via the claude-api skill first. Write the 10-case eval sheet early and drive quality against it; end
> by running it with screenshots and updating tracker + Decision log with measured costs.
