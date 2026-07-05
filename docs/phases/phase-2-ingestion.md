# Phase 2 — Ingestion Pipeline

**Size:** L · **Depends on:** Phase 0 · **Risk:** medium (data correctness) — the foundation everything
else stands on.

## Objective

A repeatable, validated pipeline: wago.tools DB2 CSVs → resolution-chain joins → Supabase Postgres.
Done when the full transmog catalog (appearances, items, sets, icons slugs, source types) lives in
Supabase, a validation suite proves it, and a GitHub Actions workflow can rerun the whole thing weekly
and on demand.

## Context — read first

- **docs/DATA_MODEL.md is the spec for this phase**: ID glossary, table list with URLs, target Postgres
  schema, provenance/TTL rules, gotchas (streaming, header assertions, bulk load, dangling refs, count
  anchors). This brief doesn't repeat it.
- Verified 2026-07-05: `https://wago.tools/db2/ItemModifiedAppearance/csv` works, includes named headers
  incl. `TransmogSourceTypeEnum`.
- Use the Supabase MCP or CLI for migrations; use a direct `SUPABASE_DB_URL` connection for bulk loads.

## Verify first (before building on them)

1. `?build=` parameter behavior and how to list available builds (check wago.tools UI/API); choose and
   pin the current retail build in `scripts/ingest/config.ts`.
2. `ManifestInterfaceData` table name + columns for FDID→icon path; fallback is the wowdev listfile
   (docs/DATA_MODEL.md §5).
3. Actual header rows of all seven v1 tables — paste them into the parser's expected-header constants.
4. Spot-check `iconUrl(slug)` against both CDNs (zamimg + Blizzard render) for 5 slugs; pick the primary.

## In scope

- `scripts/ingest/` (TS, runnable via `pnpm ingest` locally and in CI):
  1. **download** — fetch the 7 v1 CSVs (docs/DATA_MODEL.md §2) serially and politely; cache to
     `scratch/` locally, upload as workflow artifacts in CI; record build + checksums.
  2. **parse/transform** — stream-parse; filter to transmoggable rows early; assert headers; build the
     join chain; derive `appearances.slot`, `armor_type`, `display_name`, `quality`, `expansion`,
     `icon_slug` per the heuristics in docs/DATA_MODEL.md.
  3. **load** — staging tables + atomic swap (or upsert), single transaction per table family; write an
     `ingest_runs` row with counts; idempotent (rerun-safe).
  4. **validate** — hard gates that fail the run: row counts within expected magnitude (anchors in
     DATA_MODEL §6), FK integrity above threshold (e.g. >99% of IMA rows resolve to items+appearances),
     and a fixture file of ~10 famous appearances (Judgement pieces, Warglaives, a recent tier set)
     asserting name/slot/set membership — build these fixtures by checking Wowhead manually once.
- Migration(s) implementing the catalog + ops tables from docs/DATA_MODEL.md §3 (not user/enrichment
  tables), with RLS: anon SELECT on catalog, no anon writes.
- Unit tests for the join/derivation logic against small fixture CSVs (this is where bugs will live).
- `.github/workflows/ingest.yml`: weekly cron + `workflow_dispatch` (input: build override); secrets
  `SUPABASE_DB_URL`; job summary prints `ingest_runs` counts diff vs previous run.
- Document the runbook in `scripts/ingest/README.md` (how to bump build, what validation failures mean).

## Out of scope

Any UI. Blizzard API calls (not needed — catalog is fully DB2-sourced). Enrichment (colors/embeddings =
Phase 6). Model-geometry tables (Phase 8). Classic-era products.

## Acceptance criteria

- [ ] One command ingests from zero to a fully populated catalog on a clean database.
- [ ] Validation suite green, including the 10-appearance fixture spot check.
- [ ] Rerunning is idempotent and the site (once it exists) would never observe a half-loaded state.
- [ ] GH Actions run succeeds end-to-end from a fresh runner.
- [ ] Header-assertion failure path proven by test (mutated fixture header → loud, clear error).
- [ ] `ingest_runs` records build, counts, timings; DB size measured and noted in PLAN.md (Supabase
      free-tier watch item).

## Verification

Run the pipeline for real against the pinned build. Then answer from SQL, with output pasted into the
session summary: total appearances by slot; the Judgement set's 8 pieces with correct names; one item
with multiple difficulty modifiers showing distinct appearances; count of dangling TransmogSetItem refs
(logged, nonzero is OK).

## Maintenance (future sessions reference this)

On a new WoW build: bump `config.ts` build (or dispatch with override) → headers assert → fix parser
constants if renamed → validation gates catch semantic drift. Old data stays live until a run fully
succeeds.

## Kickoff prompt

> Read CLAUDE.md, docs/PLAN.md, docs/DATA_MODEL.md, and docs/phases/phase-2-ingestion.md. Implement the
> ingestion pipeline: resolve the four "Verify first" items with live checks before coding against them,
> build download/parse/load/validate + migrations + tests + the GH Actions workflow, then run the full
> pipeline for real and paste the verification SQL results. Update the tracker and Decision log
> (including the pinned build and measured DB size).
