# WoW Transmog Planner

A free, non-commercial fan web app for World of Warcraft transmog: browse every
appearance, build outfits on a 3D character preview, and get AI outfit help
("dress me like a dark ranger").

**Status: under construction.** This is a walking skeleton — no game data,
catalog, viewer, or AI yet. The roadmap lives in [docs/PLAN.md](docs/PLAN.md);
the build happens phase by phase via the briefs in [docs/phases/](docs/phases/).

## Stack

Next.js (App Router, TypeScript, Tailwind, shadcn/ui) on Vercel · Supabase
(Postgres + Auth) · game data ingested offline from [wago.tools](https://wago.tools)
DB2 exports · 3D preview via the Wowhead model viewer · AI via the Claude API.

## Development

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase values (see .env.example)
pnpm dev                     # http://localhost:3000
```

`pnpm lint`, `pnpm test`, and `pnpm build` must pass before committing.
Database migrations live in `supabase/migrations/` and are applied with the
Supabase CLI (`supabase db push`).

## Legal

Free forever, no ads, no paid tiers. Code is [MIT-licensed](LICENSE).

World of Warcraft® and Blizzard Entertainment® are trademarks or registered
trademarks of Blizzard Entertainment, Inc. This site is a fan project and is
not affiliated with or endorsed by Blizzard Entertainment. Game data and
artwork remain the property of Blizzard Entertainment, Inc. Game data courtesy
of [wago.tools](https://wago.tools); 3D models via the
[Wowhead](https://www.wowhead.com) model viewer.
