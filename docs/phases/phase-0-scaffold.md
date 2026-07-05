# Phase 0 — Scaffold & Walking Skeleton

**Size:** S · **Depends on:** nothing · **Risk:** low

## Objective

A deployed, empty-but-real app: Next.js skeleton on Vercel, Supabase project wired, compliance pages
live, repo public. Done when a stranger can load the production URL and see a landing page with a legal
footer, and a follow-up session can start Phase 1 or 2 without any setup work.

## Context

- Stack and constraints: CLAUDE.md. This phase creates the structures every later phase assumes.
- Shane's environment has the Supabase MCP server (can create/inspect projects, run SQL) — prefer it or
  the `supabase` CLI over hand-written dashboard instructions, but anything requiring dashboard/browser
  auth (creating the Supabase project, linking Vercel to GitHub) should be reported to Shane as a short
  manual checklist at the end rather than blocking mid-session.

## In scope

- `git init` + first commit; sensible `.gitignore`; MIT or similar license file (public repo requirement).
- `pnpm create next-app` (App Router, TS, Tailwind, ESLint, `src/` dir, import alias `@/`).
- shadcn/ui init + a couple of base components (button, card) to prove the pipeline.
- Vitest + a trivial passing test; `pnpm lint` / `pnpm test` / `pnpm build` all green.
- Supabase: project creation (or confirm existing), `supabase/` dir with CLI config, empty initial
  migration, typed client helpers (`src/lib/supabase/server.ts`, `client.ts`), `.env.example` with
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL` (ingest, server-only).
- Pages: minimal landing (`/`) describing the project honestly ("under construction" is fine);
  `/legal/privacy` (real privacy policy: what we store now — nothing — and a note it will grow with
  accounts); shared footer with the Blizzard non-affiliation notice + wago.tools/Wowhead credits (exact
  wording in docs/PLAN.md compliance checklist).
- Basic dark-mode-first styling — this is a WoW tool; dark default, no design investment yet.
- GitHub repo (public) + Vercel project connected; production deploy verified.
- Fill in the Commands section of CLAUDE.md.

## Out of scope

Any data, any catalog UI, the viewer, auth. No CI beyond what Vercel gives (GH Actions arrives with
Phase 2's ingest workflow).

## Tasks

1. Scaffold repo + Next.js + tooling as above; commit in coherent chunks.
2. Wire Supabase (project + env + client helpers + empty migration to prove the migration path works).
3. Build landing, privacy, footer components.
4. Deploy to Vercel; set env vars; confirm production URL serves.
5. Update CLAUDE.md (Commands), tick Phase 0 in the tracker, log any decisions in docs/PLAN.md.

## Acceptance criteria

- [ ] `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test` all succeed from a clean clone + documented env.
- [ ] Production URL renders landing + privacy pages with the compliance footer.
- [ ] Supabase reachable from the app (a trivial server-side health query is fine).
- [ ] Repo is public on GitHub with license; no secrets in history.
- [ ] CLAUDE.md Commands section is accurate.

## Verification

Load the deployed URL and `/legal/privacy` in a real browser (Claude in Chrome or preview tools),
screenshot both. Run the full script suite from a clean state.

## Kickoff prompt

> Read CLAUDE.md and docs/PLAN.md, then implement docs/phases/phase-0-scaffold.md end to end. Stay
> inside its In scope list. Finish by running its Verification section, updating CLAUDE.md (tracker +
> Commands), and giving me a short manual checklist for anything that needed my dashboard access.
