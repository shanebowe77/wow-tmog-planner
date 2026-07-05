# Research: WoW Transmog Viewer & Planner — Data, 3D Rendering, Stack & AI

> Source: Opus 4.8 deep-research session, 2026-07-05. Preserved verbatim so phase sessions
> can reference it without the original conversation. Verification notes added at the bottom.

## TL;DR
- **It is achievable for a solo dev, but the 3D viewer is the make-or-break risk.** The pragmatic path is: ingest the full item/appearance catalog yourself from **wago.tools DB2 CSV exports** (fullest coverage, ~all appearances) enriched with the **Blizzard Game Data API** (`/data/wow/item-appearance/{id}`, item media), store it in **Supabase Postgres + pgvector**, and for v1 **embed Wowhead's hosted model viewer via the `wow-model-viewer` npm package** rather than building a WebGL renderer from scratch.
- **Recommended stack: Next.js (App Router) + TypeScript on Vercel Hobby, Supabase (Postgres/Auth/Storage/pgvector), Battle.net OAuth (`wow.profile` scope) for importing users' collections, GitHub Actions cron for nightly ingestion, and the Claude API for the AI layer.** Keep it free at small scale; the first real costs are large model-asset bandwidth (offload to Cloudflare R2) and LLM calls (cache aggressively).
- **The AI feature works best as hybrid retrieval:** precompute text embeddings + dominant-color tags (via `colorthief`/`node-vibrant` on item icons) for the whole catalog, store vectors in pgvector, and let Claude translate a natural-language theme into structured filters + a vector query. "Select helmet → suggest shoulders" is driven by set co-occurrence (TransmogSetItem) + color/embedding similarity within complementary slots.

## Key Findings

1. **Fullest transmog coverage comes from client DB2 data, not the official API alone.** wago.tools exposes every client database table as CSV by appending `/csv` to a table URL (e.g. `https://wago.tools/db2/ItemModifiedAppearance/csv`, with an optional `?build=` parameter). This gives you the *complete* set of appearances including unobtainable/removed ones. The Blizzard API's `item-appearance` endpoints are cleaner and legal-to-cache but incomplete for browsing the whole game.
2. **The appearance→model resolution chain is well-documented.** `Item/ItemSparse.ID` → `ItemModifiedAppearance.ItemID` (row `ID` = the ItemModifiedAppearanceID; read `ItemAppearanceID`) → `ItemAppearance.ID` (gives `DefaultIconFileDataID` for the icon and `ItemDisplayInfoID`) → `ItemDisplayInfo.ID` (gives `ModelResourcesID[0/1]` + `ModelMaterialResourcesID`) → `ModelFileData.ModelResourcesID` (weapons/held) or `ComponentModelFileData.ModelResourcesID` filtered by race/gender/class (worn armor) → the actual `.m2` model FileDataID.
3. **A true from-scratch WebGL character renderer is a large project;** the realistic solo options are (a) embed Wowhead's minified ZamModelViewer via `wow-model-viewer`, or (b) build on `@wowserhq/scene` (Three.js + `@wowserhq/format`) or `three-m2loader`. Option (a) is by far the fastest route to a working v1.
4. **Vercel Hobby is fine for the app but not for hosting large 3D assets or long jobs.** Per Vercel's official limits docs (updated February 27, 2026), the Hobby plan includes 100 GB Fast Data Transfer/month, 1,000,000 function invocations/month, 4 hours of Active CPU/month, and a 10-second max function duration; commercial use is prohibited (this app must stay free/non-commercial anyway, which also aligns with Blizzard's API terms).
5. **Legal constraints are real but navigable for a free fan tool:** Blizzard's API Terms of Use require a 30-day TTL on cached API data ("You must implement a maximum 30-day TTL (time-to-live) policy for all Data obtained through our APIs"), ban charging/premiums ("'Premium' versions of Applications offering additional for-pay features are not permitted, nor can players be charged money to download an Application"), ban ad-gating, require a privacy policy and open/visible code, and cap you at 36,000 requests/hour at a rate of 100 requests/second.

## Details

### 1. Data sources for WoW transmog & item data

**Blizzard Battle.net / Game Data API (developer.blizzard.com).** In August 2024 Blizzard shipped dedicated appearance endpoints, announced in its API forum post "Item Appearance and Transmog APIs" and covered by Wowhead News: "After many years, Blizzard has finally added support to item appearances in the character API, allowing players to track their collection on third-party websites without extra tools or addons required." Relevant endpoints:
- Game Data (namespace `static-{region}`): `/data/wow/item-appearance/{appearanceId}`, `/data/wow/search/item-appearance`, `/data/wow/item-appearance/set/index`, `/data/wow/item-appearance/set/{appearanceSetId}`, `/data/wow/item-appearance/slot/index`, `/data/wow/item-appearance/slot/{slotType}`. The `Item` document also gained an `item.appearances` property linking to relevant appearances.
- Item + media: `/data/wow/item/{id}` and `/data/wow/media/item/{id}` (the media doc returns an `assets` array with the icon URL, e.g. `render-us.worldofwarcraft.com/icons/...`). Note the media endpoint returns **icons only — no 3D model geometry or model FileDataIDs are exposed**.
- Profile (namespace `profile-{region}`, requires user OAuth): `/profile/user/wow/collections/transmogs`, `/profile/wow/character/{realmSlug}/{characterName}/collections/transmogs`. This lets a logged-in user import the appearances they've actually unlocked.
- **Auth:** OAuth 2.0. Client-credentials flow (`POST https://oauth.battle.net/token`, `grant_type=client_credentials`, HTTP Basic with client_id:secret) for game data; authorization-code flow with scope `wow.profile` (and `openid`) for user collections. Tokens last 24 hours.
- **Rate limit:** 36,000 requests/hour at a rate of 100 requests/second per client; exceeding the hourly quota results in throttled (slower) service.
- **What's missing:** no visual/color tags, no model files, and the `search/item-appearance` endpoint is oriented around collected appearances and is awkward for enumerating the entire game. This is why you supplement with DB2.

**Community data sources.**
- **wago.tools** (by Marlamin) — the primary datamining resource. Every DB2 table is browsable and CSV-exportable (`/db2/{Table}/csv`, optional `?build=`; the `/csv` suffix is the documented community export mechanism, listed on Marlamin's wow.tools alternatives page). It also serves raw client files by FileDataID (functionality confirmed via the `wago-api` PyPI wrapper's `get_file_by_fdid(fdid, version)` and Marlamin's `wow.tools.local`, which downloads uncached files from wago.tools using TACTSharp). This is the single best source for *fullest* coverage.
- **Wowhead** — no official public data API; it is scraping-only and its ToS discourage bulk scraping. However, its **hosted 3D model viewer** (ZamModelViewer on `wow.zamimg.com/modelviewer/`) is what the `wow-model-viewer` npm package drives. Wowhead's own note (via the package docs) warns the data "belongs to Wowhead… recommended for personal purposes or small-scale projects, and definitely not for large commercial endeavors."
- **WoWDBDefs** (`github.com/wowdev/WoWDBDefs`) — the community `.dbd` column definitions needed to interpret DB2 layouts per build. **DBCD** (C#), **Erorus' db2** (PHP), and **DBC2CSV** are readers.
- **wowdev.wiki** — authoritative documentation of table structures and file formats.
- **TrinityCore / CMaNGOS / AzerothCore** — server DB dumps; useful mainly for older/Classic builds and cross-referencing (e.g. azerothcore-armory ships `ItemAppearance` / `ItemModifiedAppearance` CSVs for 9.2 and older 3.3.5 data).
- **Raidbots / WowSims** — sim-focused; Raidbots hosts DBCache hotfix dumps but is not an appearance source.

**CASC / client extraction tooling.**
- **wow.export** (Kruithne; also Marlamin's fork) — the leading toolkit. Exports M2/WMO models as OBJ/glTF, converts BLP textures, browses DB2s, and (crucially) since a 2024–2025 rewrite renders **equipped items on character models in WebGL2** and can save/load characters. This is your reference implementation and asset-extraction tool.
- **CascLib / TACTSharp** (retrieve files from CASC storage), **BLPSharp / BLPConverter** (BLP→PNG), **StormLib** (legacy MPQ for old Classic builds), **WDBXEditor** (edit DB2/DBC).
- **File formats:** `.m2` (models), `.skin` (LOD/submesh), `.wmo` (world objects), `.blp` (textures), `.db2`/`.dbc` (client databases).

**The mapping chain (from the DB2 join research):**
`Item/ItemSparse.ID` → `ItemModifiedAppearance` (columns `ItemID`, `ID`=ItemModifiedAppearanceID, `ItemAppearanceModifierID`, `ItemAppearanceID`) → `ItemAppearance` (`ID`, `ItemDisplayInfoID`, `DefaultIconFileDataID`) → `ItemDisplayInfo` (`ModelResourcesID[2]`, `ModelMaterialResourcesID[2]`, `GeosetGroup[4]`, `HelmetGeosetVis[2]`) → `ModelFileData` (`ModelResourcesID`→`FileDataID` of the `.m2`) **or** `ComponentModelFileData` (worn armor; row `ID` is the component `.m2` FileDataID, filtered by `GenderIndex`/`RaceID`/`ClassID`). Themed sets come from **TransmogSet** + **TransmogSetItem** (links `TransmogSetID`→`ItemModifiedAppearanceID`). Note `ItemDisplayInfo.ModelResourcesID` is an *indirection* into ModelFileData/ComponentModelFileData, not itself a FileDataID.

**Retail vs Classic.** Classic uses separate namespaces (`static-classic-{region}`) in the API and separate builds/products on wago.tools. Older data lives in `.dbc` (pre-Legion) vs `.db2`; the transmog system itself only exists retail-side and in later Classic re-releases. Build your schema retail-first.

**Licensing / legal.** Blizzard's **Developer API Terms of Use**: a maximum 30-day TTL on API-derived data ("You must implement a maximum 30-day TTL (time-to-live) policy for all Data obtained through our APIs"); no data-mining via non-API means; 36k/hr cap; must publish a privacy policy; application code must be visible/unobfuscated; no charging, no premium tiers, no donation interstitials, no ads gating features; no implying Blizzard endorsement. Extracted **models/textures are Blizzard IP** — fan use is widely tolerated for non-commercial tools (Wowhead, wow.export, wowser all operate this way) but is not formally licensed; keep it free, non-commercial, and attributed. This is a key reason to lean on Wowhead's viewer (they already carry that risk) for v1.

### 2. 3D model rendering in the browser

**Option A — Embed Wowhead's hosted viewer (recommended for v1).** The `wow-model-viewer` npm package (Miorey) wraps Wowhead's minified `viewer.min.js` (ZamModelViewer) + jQuery 3.x. You pass a character descriptor (`race`, `gender`, customization, and an `items` array of `[slot, displayId]`) and it renders an interactive 3D character with equipped/transmogged gear, served from Wowhead's CDN (`wow.zamimg.com`). It supports retail and WotLK, and has helpers (`findItemsInEquipments`, `updateItemViewer(slot, displayId, enchant)`) to swap pieces without a full reload. **Caveats:** it's a thin wrapper over a minified third-party viewer (fragile across Wowhead updates; the package notes functions like `getListAnimations` periodically break), depends on jQuery, has low download counts, and relies on Wowhead's CDN plus sometimes a CORS-bypass proxy. But it gets you a real 3D transmog preview in days, not months.

**Option B — Build/adopt a Three.js renderer.** `@wowserhq/scene` provides Three.js rendering classes for WoW model formats (uses `@wowserhq/format`, WebGL2, MIT, pure JS/TS — though note it is a small, low-activity project). `three-m2loader` (Mugen87) is a Three.js M2 loader. `wowserhq/blizzardry` parses M2/ADT/WMO/BLP/DBC in JS. The older `jsWoWModelViewer` (vjeux) and the `wowser` project are references. This path gives full control and no Wowhead dependency, but you must implement character assembly yourself: base race/gender M2, **geoset enable/disable** (via `ChrCustomizationGeoset` + `ItemDisplayInfo.GeosetGroup`/`HelmetGeosetVis`), **component texture layering** (per `CharComponentTextureLayout`), attachment points for weapons, and BLP decoding. wow.export's WebGL2 character renderer proves it's feasible and is the best open-source blueprint, but it's a Blender/desktop-export tool, not a drop-in web library.

**Character assembly reality.** Worn armor isn't a separate mesh glued on — it toggles geosets on the base body and overlays textures baked into the character's skin layers, while helmets/shoulders/weapons are attached component models. This is the hard part and exactly what the Wowhead viewer already solves.

**Performance & hosting.** M2 + textures are large; a full character pulls many files. With Option A, Wowhead's CDN serves everything (your bandwidth cost ≈ zero). With Option B you must host extracted, converted assets (glTF + compressed textures) on object storage/CDN — Vercel is the wrong place for this (bandwidth caps). Use **Cloudflare R2** (no egress fees) or Supabase Storage, precompute glTF, and lazy-load per slot.

### 3. Recommended tech stack (Vercel-hosted, free, solo build)

- **Frontend:** **Next.js App Router + TypeScript** — confirmed as the right choice given your React/TS background, Claude Code workflow, and Vercel target. Server Components for catalog pages (SEO + fast first load), Server Actions/Route Handlers for AI and mutations. Styling: **Tailwind CSS + shadcn/ui** for speed. The Wowhead viewer needs client components + `<script>` injection of jQuery and `viewer.min.js`.
- **Database/backend:** **Supabase (Postgres)**. **Pre-ingest the full catalog into Supabase — do not query Blizzard live per request** (respects the 36k/hr cap, gives you full coverage and full-text/vector search). Schema sketch:
  - `items` (id, name, item_class, subclass, inventory_type, quality, expansion, icon_fdid)
  - `appearances` (id = ItemAppearanceID, display_info_id, default_icon_fdid, slot)
  - `item_modified_appearances` (id, item_id, appearance_id, modifier_id, source_type)
  - `display_info` (id, model_resources_ids, material_resources_ids, geoset_groups)
  - `model_files` (model_resources_id, file_data_id, kind) — resolved to serve to the viewer
  - `transmog_sets`, `transmog_set_items` (set_id, item_modified_appearance_id)
  - `appearance_tags` (appearance_id, dominant_color_hex, palette jsonb, theme_tags text[])
  - `appearance_embeddings` (appearance_id, embedding vector(1536))
  - User tables: `profiles`, `saved_sets`, `saved_set_items`, `collected_appearances` (from Battle.net import).
- **Ingestion pipeline:** a Node/TS script that (1) downloads the needed DB2 CSVs from wago.tools (`/db2/{Table}/csv?build=`), (2) joins them into the resolution chain above, (3) upserts into Supabase, (4) enriches with Blizzard API names/media where useful, (5) computes color tags + embeddings. Run it as a **GitHub Actions cron** (e.g. weekly / on new build) — *not* on Vercel, because ingestion exceeds Hobby function limits. Store only Blizzard-API-derived fields under the 30-day TTL rule; DB2/extracted data isn't API data so isn't TTL-bound (but is Blizzard IP).
- **Auth:** **Supabase Auth** for basic accounts, plus **Battle.net OAuth** (via NextAuth/Auth.js `battlenet` provider or Arctic, scope `openid wow.profile`) so users can import their collected transmogs from the profile API. You can wire Battle.net as a Supabase third-party/OIDC-style login or handle it in a Next.js route and link to the Supabase user.
- **Asset hosting:** Option A → none needed (Wowhead CDN). Option B → **Cloudflare R2** for glTF/textures. Keep icons either hot-linked from Blizzard's render CDN or cached to R2/Supabase Storage.
- **Vercel constraints:** Hobby (per Vercel's Feb 2026 limits docs) = 100 GB Fast Data Transfer/month, 1,000,000 function invocations/month, 4 hours Active CPU/month, and a 10-second max function duration (extendable to 300s with Fluid compute), plus non-commercial-use restriction and source-file upload limits. Background/long jobs must live off-Vercel (GitHub Actions, Supabase Edge Functions/pg_cron, or Inngest/Trigger.dev). Put **Cloudflare's free CDN in front** to protect bandwidth if a page goes viral.
- **Cost curve:** effectively $0 at small scale (Supabase free tier, Vercel Hobby, GitHub Actions free minutes, Wowhead CDN). First costs as you grow: **Supabase Pro at $25/organization/month** (includes $10/mo compute credits, 8 GB database, 100 GB storage, 250 GB egress) when you exceed free-tier limits; R2 storage if self-hosting assets; Claude API usage; and Vercel Pro ($20/seat/mo) if you exceed Hobby limits (but Pro is required the moment it's "commercial," so staying free keeps you on Hobby legitimately).

### 4. AI transmog recommendation feature

**Getting visual attributes (the core data problem).** Appearance data is textual (name, slot, armor type, expansion) plus an icon; there are no official color/theme tags. Derive them:
- **Dominant color + palette** from item icons using `colorthief` or `node-vibrant` (both use MMCQ quantization; `node-vibrant` additionally gives semantic swatches like Vibrant/Muted/DarkVibrant/LightMuted). Run in the ingestion job over every icon; store hex + palette. Icons are a rough proxy; for higher fidelity, render thumbnails of the actual model (via wow.export/Option B) and sample those.
- **Vision-model tagging (optional, higher quality):** feed rendered thumbnails to a vision model (Claude) to produce theme tags ("gothic", "holy/golden", "tribal", "spiky", "regal") and material descriptors. Do this offline, once, and cache.

**Retrieval architecture (hybrid).**
- Precompute a text embedding per appearance from a synthetic document (name + slot + armor type + expansion + color words + theme tags) using an embedding model (e.g. OpenAI `text-embedding-3-small`, 1536-dim, or an open model via Supabase Edge Functions' native `gte-small`, 384-dim). Store in **pgvector** with an HNSW index (`CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`); query via a Postgres RPC using cosine distance (`<=>`), since PostgREST/supabase-js can't call vector operators directly.
- **Natural-language theme request:** Claude parses "dark ranger, green and black leather" into structured filters (armor_type=leather, colors=[green, black]) + a semantic query string; you run vector search **filtered** by slot/armor type/expansion (hybrid vector + SQL WHERE). Return candidates; optionally let Claude re-rank/curate the final outfit.
- **"Select helmet → suggest shoulders":** model item-to-item compatibility from three signals — (1) **co-occurrence in real TransmogSetItem sets** (strongest signal: pieces Blizzard shipped together), (2) **color-palette matching** between the selected piece and candidates in the target slot, (3) **embedding similarity** within complementary slots. Combine into a weighted score; precompute a co-occurrence table for speed.

**Cost & latency on a free app.** Do all heavy AI work at **ingestion time** (embeddings, color tags, theme tags) so runtime is just one embedding call + a fast pgvector query. Reserve live Claude calls for the interactive natural-language planner, and **cache** results by normalized query. Keep serverless AI routes under Hobby duration limits (or use Fluid compute up to 300s). Batch and rate-limit to control spend.

### 5. Putting it together — architecture & phased plan

**Recommended architecture:** Next.js (App Router, TS) on Vercel Hobby → Supabase (Postgres + pgvector + Auth + Storage) → GitHub Actions cron running the wago.tools+Blizzard ingestion/enrichment job → Wowhead hosted viewer (v1) then optional `@wowserhq/scene` renderer (later) → Claude API for the AI planner → optional Cloudflare R2 for self-hosted assets.

**Phased build (as researched; the repo's PLAN.md re-sequences these):**
- **Phase 0 — Ingestion & catalog:** build the DB2→Supabase pipeline (fullest coverage), resolve the appearance chain, pull icons/names. Ship a browsable, filterable, searchable 2D catalog. Lowest risk, immediately useful.
- **Phase 1 — Save lists/sets + accounts:** Supabase Auth, saved outfits, shareable links. Add Battle.net OAuth import of collected appearances.
- **Phase 2 — 3D viewer:** integrate `wow-model-viewer` (Wowhead-hosted) to preview a built outfit on a chosen race/gender. This is the highest-risk phase; de-risk by prototyping the embed early.
- **Phase 3 — AI:** color/theme tagging + embeddings in the pipeline; the "describe a theme" planner and "complementary piece" suggestions.
- **Phase 4 (optional) — Self-hosted renderer:** move off Wowhead to `@wowserhq/scene`/`three-m2loader` with R2-hosted glTF if you need independence or custom features.

**Hardest risks:** (1) the 3D character renderer (mitigate via Wowhead embed); (2) keeping DB2 ingestion correct across patches (mitigate via WoWDBDefs + build pinning); (3) legal/ToS (mitigate by staying free, code-visible, privacy-policy'd, attributed).

**Comparable tools to learn from / avoid reinventing:** Wowhead Dressing Room & Outfits (the gold standard viewer + set DB), the **MogIt** and **Better Wardrobe and Transmog** addons (import/export formats, set organization, color sorting), Draynee's Mog Companion / WoW Mog Companion (color-categorized galleries — which already offer a "Transmog by Color" page, validating demand for color search), Data for Azeroth (Battle.net collection tracking), and Icy Veins transmog guides. Your differentiators are **fullest combined-source coverage**, a **real in-app 3D viewer**, and the **AI planner** — none of the existing free tools combine all three.

## Recommendations
1. **Start with the ingestion pipeline + 2D catalog.** Prove you can resolve the full `Item→ItemModifiedAppearance→ItemAppearance→ItemDisplayInfo→ModelFileData` chain from wago.tools CSVs into Supabase. Benchmark: a browsable catalog of essentially all appearances with slot/armor-type/expansion filters.
2. **Prototype the Wowhead `wow-model-viewer` embed early, in isolation.** If it renders a transmogged character reliably, commit to it for v1. **Threshold to switch to a custom renderer:** if the Wowhead viewer breaks repeatedly on updates, or you need features it can't do — then invest in `@wowserhq/scene` + R2 assets.
3. **Put all AI/color/embedding computation in the offline ingestion job**, keep runtime cheap, and cache LLM planner responses. **Threshold to add paid infra:** exceeding Supabase free-tier storage/egress or Vercel Hobby's 100 GB transfer / 4-hour Active CPU → add Cloudflare in front and/or upgrade Supabase before Vercel Pro.
4. **Lock in compliance from day one:** free forever, no ads gating features, visible source, a published privacy policy, 30-day TTL on Blizzard-API fields, and a clear "not affiliated with Blizzard" notice. This keeps you on Vercel Hobby legitimately and inside Blizzard's terms.
5. **Pin the DB2 build** you ingest and diff against new builds via WoWDBDefs so patches don't silently break your joins.

## Caveats
- The exact wago.tools raw-file-by-FileDataID download path (inferred as `/api/casc/{fdid}`) is confirmed in behavior via wrapper libraries and Marlamin's tooling but should be verified against a live network request before you depend on it.
- DB2 column names/order change per patch; always validate against the build-specific `.dbd` in WoWDBDefs rather than hardcoding.
- `wow-model-viewer` is a low-adoption wrapper over Wowhead's minified viewer; treat it as a dependency that can break on Wowhead updates, and abstract your viewer behind an interface so you can swap renderers.
- Extracted models/textures and Wowhead's viewer data are Blizzard/Wowhead IP; this plan assumes a strictly non-commercial, free fan project and is not legal advice.
- Blizzard's `search/item-appearance` API is oriented toward collected appearances and is not a reliable way to enumerate the entire game — hence the DB2-first strategy.
- Vercel's Hobby function-invocation allowance is currently documented as 1M/month (older third-party write-ups cite 100k); verify current limits at deploy time, as Vercel has repeatedly revised its consumption model.

---

## Verification notes (added 2026-07-05, this repo)

Checked live from this machine while drafting the plan:

- `curl https://wago.tools/db2/ItemModifiedAppearance/csv` → **works**, returns a header row with named
  columns: `ID,ItemID,ItemAppearanceModifierID,ItemAppearanceID,OrderIndex,TransmogSourceTypeEnum,Flags`.
  Two implications: (1) no local `.dbd` parsing is needed for CSV ingestion — wago.tools resolves column
  names per build; (2) `TransmogSourceTypeEnum` is available directly for a "source" filter.
- `npm view wow-model-viewer` → **v1.5.3, last modified 2025-11-10** — actively maintained, more recent
  than the research implied.
- `npm view @wowserhq/scene` → v0.32.0 exists (fallback renderer path is real).

Still unverified (each phase brief lists these as verify-first steps): `?build=` parameter behavior and
build pinning, `ManifestInterfaceData` icon-path mapping, the exact displayId the Wowhead viewer expects,
CORS behavior of `wow.zamimg.com` from a non-Wowhead origin, and the Battle.net transmog-collection
response shape.
