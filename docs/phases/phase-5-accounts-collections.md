# Phase 5 — Accounts, Saved Sets & Battle.net Collection Import

**Size:** M–L · **Depends on:** Phase 4 · **Risk:** medium (OAuth integration; first user PII)

## Objective

Users can sign in, save/manage outfits, and import which appearances they've actually collected from
Battle.net — unlocking the "show only what I own" filter. Done when a user can log in, save the outfit
they built, and see collected-vs-uncollected badges across catalog and builder.

## Context

- Schema: docs/DATA_MODEL.md §3 user tables (`profiles`, `saved_sets`, `saved_set_items`,
  `collected_appearances`) — migration created in this phase, owner-scoped RLS.
- Battle.net OAuth (research §1): authorize `https://oauth.battle.net/authorize`, token
  `https://oauth.battle.net/token`, scopes `openid wow.profile`; API base
  `https://{region}.api.blizzard.com`; user-token call to
  `/profile/user/wow/collections/transmogs?namespace=profile-{region}`. Requires a (free) client at
  develop.battle.net — Shane creates it; give him the redirect-URI values to paste.
- **Compliance is load-bearing here** (CLAUDE.md): collection rows are Blizzard-API-derived → store
  `fetched_at`, refresh on demand, purge >30 days (pg_cron job in this phase). Privacy policy must be
  updated to describe what's stored (battletag, collection snapshot) before this deploys.

## Verify first

1. **The ID space of the transmog collection response.** Fetch a real response for Shane's account
   (or any test account) and determine whether `appearances[].id` values are ItemModifiedAppearanceIDs
   or ItemAppearanceIDs — join a sample against our tables both ways; the interpretation with ~100%
   match rate wins. Record the answer in docs/DATA_MODEL.md (edit §3 comment) and the Decision log.
   Everything else in this phase depends on getting this right.
2. Auth architecture choice: Supabase Auth as the account system with Battle.net as a *linked
   credential* via our own OAuth routes (default assumption), vs. Battle.net as a Supabase third-party
   OIDC provider if it cleanly supports it. Spend ≤30 minutes deciding; prefer the boring option.

## In scope

- Supabase Auth: email magic-link sign-in (no passwords to manage), session handling in App Router
  (`@supabase/ssr`), profile row creation on first login, minimal account page (username, delete
  account — deletion cascades all user data).
- Battle.net link + import flow: connect button → OAuth → store battletag + region → fetch transmog
  collection → upsert `collected_appearances` (with `fetched_at`) → "Refresh" button (rate-limited,
  e.g. once/hour). Handle multi-region accounts by letting the user pick region at connect time.
  Store no Battle.net tokens long-term: import in the callback/one-shot job, keep only results.
- Saved outfits: save current builder outfit (name it), list/rename/delete under `/me/outfits`; load
  back into builder; public share slug (`/o/[slug]`) rendering a read-only view with "open in planner".
- Collected integration: "collected" badge on `AppearanceCard`, "only collected / only uncollected"
  filter in catalog and slot picker (uncollected = farm list!).
- TTL purge: pg_cron (or scheduled edge function) deleting `collected_appearances` older than 30 days;
  UI prompts re-import when data is stale/absent.
- Privacy policy update + "not affiliated" reconfirmation on the account/connect screens.

## Out of scope

Character-level browsing, guild features, public profiles, social anything. Multiple Battle.net accounts
per user. Wishlist/farm-planner features (candidate for a later phase — note if tempted).

## Acceptance criteria

- [ ] Sign up → save outfit → sign out → sign in → load outfit round-trips.
- [ ] RLS proven: user A cannot read/write user B's saved sets or collection rows (test with two users
      via SQL, not just the UI).
- [ ] Battle.net import populates `collected_appearances` for a real account and the collected filter
      visibly works in catalog + builder.
- [ ] ID-space answer documented with match-rate evidence.
- [ ] Purge job exists and is tested (insert a backdated row → job removes it).
- [ ] Privacy policy updated; account deletion works.

## Verification

Full user journey in a real browser with screenshots, including the Battle.net consent screen and a
before/after of the collected filter. SQL evidence for RLS and the purge test.

## Kickoff prompt

> Read CLAUDE.md, docs/PLAN.md, docs/DATA_MODEL.md, and docs/phases/phase-5-accounts-collections.md.
> Implement accounts, saved outfits, and Battle.net collection import. Resolve the two "Verify first"
> items before building on them — especially the collection ID-space question, with join evidence. Ask
> me only for the develop.battle.net client setup (give me exact values to enter). Verify the
> acceptance criteria including the two-user RLS test, deploy, and update tracker + Decision log +
> DATA_MODEL.
