# WoW Transmog Planner

Free, non-commercial fan web app: browse every WoW transmog appearance, build outfits on a 3D character
preview, get AI outfit help. Built solo by Shane as a series of Claude Code sessions — one phase per
session.

**Start here every session:** [docs/PLAN.md](docs/PLAN.md) (roadmap, risks, decision log) → the phase
brief you were asked to implement in [docs/phases/](docs/phases/). Data work also requires
[docs/DATA_MODEL.md](docs/DATA_MODEL.md). Background: [docs/RESEARCH.md](docs/RESEARCH.md).

## Phase tracker

- [ ] Phase 0 — Scaffold & walking skeleton (`docs/phases/phase-0-scaffold.md`)
- [ ] Phase 1 — 3D viewer spike, DECISION GATE (`docs/phases/phase-1-viewer-spike.md`)
- [ ] Phase 2 — Ingestion pipeline (`docs/phases/phase-2-ingestion.md`)
- [ ] Phase 3 — Catalog browser (`docs/phases/phase-3-catalog.md`)
- [ ] Phase 4 — Outfit builder + 3D preview (`docs/phases/phase-4-outfit-builder.md`)
- [ ] Phase 5 — Accounts, saved sets, Battle.net import (`docs/phases/phase-5-accounts-collections.md`)
- [ ] Phase 6 — AI enrichment pipeline (`docs/phases/phase-6-ai-enrichment.md`)
- [ ] Phase 7 — AI planner UX (`docs/phases/phase-7-ai-planner.md`)
- Phase 8 — Self-hosted renderer: contingency only, not scheduled

When you complete a phase: tick it here, add a dated entry to the Decision log in docs/PLAN.md, and edit
any later phase brief your findings invalidate. Do not start the next phase without Shane's go.

## Stack

Next.js App Router + TypeScript + Tailwind + shadcn/ui on Vercel (Hobby) · Supabase (Postgres, pgvector,
Auth; migrations in `supabase/migrations/`) · ingestion: Node/TS scripts in `scripts/ingest/` run by
GitHub Actions cron · 3D: Wowhead hosted viewer via `wow-model-viewer` behind our `ModelViewer`
interface · AI: Claude API. Package manager: pnpm.

Shane's environment has the Supabase MCP server connected (migrations/SQL/logs) and Claude in Chrome for
browser verification — use them.

## Hard constraints (never violate)

- **Free forever, non-commercial**: no ads gating features, no premium tiers, no charging. Required by
  Blizzard's API ToS and Vercel Hobby terms.
- **Public, unobfuscated repo** (Blizzard ToS). Never commit secrets — env vars only; `.env.example`
  documents them.
- **Never call Blizzard or wago.tools in the request path.** The app serves from our Postgres only.
  External fetches happen in the offline ingest job (exception: user-initiated Battle.net collection
  import).
- **30-day TTL** on any data that came through the Blizzard API (today: only `collected_appearances`).
- Every page footer: Blizzard trademark / non-affiliation notice + wago.tools & Wowhead credits.
- The 3D viewer is only touched through `ModelViewer` (our interface) so the backend renderer is
  swappable.

## Conventions

- Server Components by default; client components only where interactivity demands (viewer, builder).
- Filter/search state lives in the URL (shareable links are a core feature).
- Ingest scripts: idempotent, stream-parse big CSVs, assert expected CSV headers and fail loudly,
  bulk-load via direct Postgres connection (not supabase-js), log dangling-reference counts.
- ID discipline: variable/column names always say which ID space (`itemId`, `imaId`, `appearanceId`,
  `displayInfoId`, `fdid`) — see the glossary in docs/DATA_MODEL.md.
- RLS on every table: catalog = public SELECT, user tables = owner-scoped.
- Bug fixes start with a failing test that encodes the bug (Shane's global rule).
- Verify UI work with real browser evidence (Claude in Chrome / preview tools), not assumptions.

## Commands

Filled in by Phase 0 (create-next-app etc.). Until then: this repo is docs-only.
