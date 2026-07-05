# WoW Transmog Planner — Master Plan

A free, non-commercial fan web app: browse every transmog appearance in the game, build outfits on a 3D
character preview, and get AI help ("dress me like a dark ranger"). Solo build (Shane) executed as a
series of Claude Code sessions — **one phase per session**, each driven by a self-contained brief in
[docs/phases/](phases/).

Differentiators over existing tools (Wowhead dressing room, Mog Companion, MogIt): fullest
combined-source coverage + in-app 3D viewer + AI planner in one free app.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
 wago.tools DB2 ───▶│  Ingest job (Node/TS, GitHub Actions cron)  │
 CSVs (catalog)     │  parse → join chain → COPY into Postgres    │
                    │  + color tags + theme tags + embeddings     │
 Blizzard API ─────▶│  (enrichment passes, Phases 6)              │
 (user collections  └──────────────────┬──────────────────────────┘
  only, via app)                       ▼
                    ┌─────────────────────────────────────────────┐
                    │  Supabase: Postgres + pgvector + Auth       │
                    │  catalog tables (public read, RLS)          │
                    │  user tables (owner RLS)                    │
                    └──────────────────┬──────────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────────┐
                    │  Next.js App Router (TS) on Vercel Hobby    │
                    │  /appearances /sets /planner /a/[id]        │
                    │  Route handlers: AI planner, Battle.net     │
                    │  OAuth, share links                         │
                    └───────┬─────────────────────┬───────────────┘
                            ▼                     ▼
                  Wowhead hosted viewer      Claude API
                  (wow.zamimg.com via        (theme parsing +
                   wow-model-viewer,          outfit curation,
                   behind ModelViewer         cached)
                   interface)
```

Hard rules baked into every phase:
- **Never call Blizzard or wago.tools in the request path.** The app serves only from our Postgres;
  external data arrives via the offline ingest job (exception: Battle.net OAuth collection import, which
  is a user-initiated background action).
- **The 3D viewer sits behind our own `ModelViewer` interface** so Wowhead's viewer can be swapped for a
  self-hosted renderer (Phase 8) without touching product code.
- **Compliance is a feature** (see checklist below), not an afterthought.

## Phase roadmap

Resequenced from the research (rationale in the Decision log): the viewer spike moves to the front
because it's the make-or-break product risk and needs no data; the outfit builder lands before accounts
because share-by-URL makes the app useful with zero login.

| # | Phase | Brief | Size | Depends on | Exit criterion |
|---|-------|-------|------|------------|----------------|
| 0 | Scaffold & walking skeleton | [phase-0-scaffold.md](phases/phase-0-scaffold.md) | S | — | Deployed skeleton on Vercel w/ legal pages; repo public |
| 1 | 3D viewer spike ⚠️ decision gate | [phase-1-viewer-spike.md](phases/phase-1-viewer-spike.md) | S | 0 | Transmogged character renders + item hot-swap works, or documented NO-GO + fallback decision |
| 2 | Ingestion pipeline | [phase-2-ingestion.md](phases/phase-2-ingestion.md) | L | 0 | Full catalog in Supabase, validation suite green, GH Actions cron runs it |
| 3 | Catalog browser (2D) | [phase-3-catalog.md](phases/phase-3-catalog.md) | M | 2 | Deployed, filterable, searchable catalog + appearance/set detail pages |
| 4 | Outfit builder + 3D preview | [phase-4-outfit-builder.md](phases/phase-4-outfit-builder.md) | M–L | 1, 3 | Build outfit → see it in 3D → share via URL |
| 5 | Accounts, saved sets, Battle.net import | [phase-5-accounts-collections.md](phases/phase-5-accounts-collections.md) | M–L | 4 | Login, save/load outfits, "collected" filter from Battle.net import |
| 6 | AI enrichment pipeline | [phase-6-ai-enrichment.md](phases/phase-6-ai-enrichment.md) | M | 2 (not 3–5) | Colors + theme tags + embeddings + co-occurrence for full catalog |
| 7 | AI planner UX | [phase-7-ai-planner.md](phases/phase-7-ai-planner.md) | M–L | 4, 6 | NL theme → outfit; per-slot suggestions; cached + budget-capped |
| 8 | Self-hosted renderer (contingency) | [phase-8-self-hosted-renderer.md](phases/phase-8-self-hosted-renderer.md) | XL | tripwire | Not scheduled — see tripwire in Risk register |

Sizes: S ≈ one short session, M ≈ one full session, L ≈ one long session or two sessions.
Parallelizable: 1 can run any time after 0; 6 can run any time after 2.

## How to run a phase (session workflow)

1. Start a fresh Claude Code session in this repo.
2. Kickoff prompt (each brief also carries its own tailored version):
   > Read CLAUDE.md, docs/PLAN.md, and docs/phases/phase-N-<name>.md, plus any docs the brief lists.
   > Implement the phase end to end: resolve its "Verify first" items before building on them, stay
   > inside its In scope list, and finish by running its Verification section and updating the phase
   > tracker in CLAUDE.md and the Decision log in docs/PLAN.md.
3. Review the diff yourself. Optionally run `/code-review` (and `/verify` for UI phases) in the same or
   a follow-up session.
4. Commit/push per your own workflow (no PRs unless you say so — per global rules).
5. If the session discovered something that changes later phases, it must note it in the Decision log
   and, if needed, edit the affected phase brief — briefs are living documents.

## Risk register

| Risk | Likelihood | Mitigation | Tripwire → action |
|---|---|---|---|
| Wowhead viewer breaks or CORS-blocks third-party embeds | Med | Phase 1 spike before any dependent work; `ModelViewer` abstraction; 2D paper-doll fallback rendering icons | Spike fails, or viewer breaks >2× in a quarter → activate Phase 8 |
| DB2 columns shift on patch and silently corrupt ingest | Med | Pinned `?build=`; header assertions that hard-fail; validation suite (counts + spot checks) after every run | Validation fails → keep old data live, fix parser, re-run |
| wago.tools outage/rate-limiting | Low | Cache raw CSVs as GH Actions artifacts; ingest is idempotent + resumable; be polite (serial downloads) | Outage during ingest → retry next day; site serves stale-but-valid data |
| Blizzard ToS issue (TTL, commercial use) | Low | Compliance checklist below; catalog is DB2-sourced so TTL scope is tiny; free forever | Any Blizzard outreach → comply immediately |
| Supabase/Vercel free-tier ceilings | Med (with traffic) | Catalog reads cacheable (ISR/CDN); icons hotlinked not proxied; watch Supabase egress dashboard | Egress >80% of free tier → add Cloudflare in front / Supabase Pro ($25/mo) |
| AI spend runaway | Low | All heavy AI at ingest time; runtime calls cached by normalized query + daily budget cap + rate limit | Cap hit → planner degrades to non-LLM retrieval (filters + vectors) |
| Battle.net OAuth complexity stalls Phase 5 | Med | It's isolated in its own phase; app is fully useful without it | Blocked >1 session → ship accounts w/o import, revisit |

## Compliance checklist (live from Phase 0 onward)

- [ ] Free forever; no ads gating features, no premium tiers, no paywalled features, no donation interstitials.
- [ ] Public GitHub repo (Blizzard requires visible, unobfuscated application code).
- [ ] Privacy policy page before any Blizzard API usage; updated when Battle.net login lands (Phase 5).
- [ ] Footer on every page: "World of Warcraft® and Blizzard Entertainment® are trademarks or registered
      trademarks of Blizzard Entertainment, Inc. This site is a fan project and is not affiliated with or
      endorsed by Blizzard Entertainment." + credits (wago.tools, Wowhead model viewer).
- [ ] 30-day TTL on all Blizzard-API-derived rows (`collected_appearances.fetched_at` + purge job).
- [ ] Blizzard API batch usage stays far under 36,000 req/hr; app never proxies Blizzard in request path.
- [ ] Vercel Hobby stays legitimate because the app is genuinely non-commercial.

## Budget & platform limits (from research, dated 2026-02; re-verify at deploy)

| Platform | Free allowance | First paid step |
|---|---|---|
| Vercel Hobby | 100 GB transfer, 1M function invocations, 4h active CPU/mo, 10s fn duration (300s w/ Fluid) | Pro $20/seat/mo |
| Supabase Free | 500 MB DB, 5 GB egress, 50k MAU auth | Pro $25/mo (8 GB DB, 250 GB egress) |
| GitHub Actions | 2,000 min/mo free (public repos: free) | — |
| Wowhead CDN (viewer+icons) | $0 to us | goodwill-dependent |
| Claude API | pay-as-you-go | enrichment ~one-time batch; runtime cached |

Watch item: full catalog with embeddings will likely approach/exceed Supabase's 500 MB free DB. Measure
at end of Phase 2 and 6; Supabase Pro is the expected first real cost.

## Decision log

- **2026-07-05 — Stack locked** per research: Next.js App Router + TS + Tailwind + shadcn/ui on Vercel
  Hobby; Supabase (Postgres/pgvector/Auth); GitHub Actions for ingest; Claude API for AI. pnpm as package
  manager.
- **2026-07-05 — DB2-first ingestion** (wago.tools CSVs) over Blizzard API enumeration; verified the CSV
  endpoint live (see RESEARCH.md verification notes). Item names come from ItemSparse, keeping the public
  catalog outside the 30-day API TTL.
- **2026-07-05 — Wowhead hosted viewer for v1** via `wow-model-viewer` (verified alive, v1.5.3
  2025-11-10), behind a swappable `ModelViewer` interface. Self-hosted renderer deferred to Phase 8
  behind a tripwire.
- **2026-07-05 — Resequenced phases vs. research**: viewer spike first (kills the biggest unknown while
  costing nothing), outfit builder before accounts (share-by-URL beats login for early usefulness),
  AI enrichment decoupled so it can run parallel to UI phases.
- **2026-07-05 — Embeddings**: start with local `gte-small` (384-dim) via `@xenova/transformers` inside
  the GH Actions job — $0, no extra API key. Swap to a hosted model (Voyage/OpenAI) only if retrieval
  quality disappoints; that swap = regenerate one table + reindex.
- **2026-07-05 — Icons hotlinked** (zamimg or Blizzard render CDN), not stored: keeps Supabase storage
  ~zero and avoids re-hosting Blizzard art. Abstracted behind `iconUrl()` so we can self-host to R2 later.

## Maintenance playbook (post-Phase 2, ongoing)

- **Patch day**: GH Actions cron ingests weekly; on WoW patch, manually dispatch with the new `?build=`.
  If header assertions fail → parser fix session ("Read docs/phases/phase-2-ingestion.md §Maintenance,
  fix the ingest for build X").
- **Monthly**: TTL purge of stale `collected_appearances` (SQL cron via pg_cron, set up in Phase 5);
  glance at Supabase/Vercel usage dashboards.
- **Viewer breakage**: check `wow-model-viewer` issues/releases first — it's the community's canary; bump
  package before debugging our embed.
