# Data Model Reference

Shared reference for all phases that touch data (ingestion, catalog, builder, AI). Read this before
Phase 2, 3, 4, 6, or 7. Source research: [RESEARCH.md](RESEARCH.md).

## 1. ID glossary — do not mix these up

WoW's item/appearance data uses five distinct ID spaces. Confusing them is the #1 way this project breaks.

| ID | Table of origin | Meaning | Example use |
|---|---|---|---|
| **ItemID** | `Item` / `ItemSparse` | A specific item ("Judgement Crown", heroic version) | Wowhead item URLs, Blizzard `/data/wow/item/{id}` |
| **ItemModifiedAppearanceID** ("IMA") | `ItemModifiedAppearance.ID` | One (item, difficulty-modifier) → appearance link. This is what the in-game wardrobe collects and what `TransmogSetItem` references | Battle.net collection import likely speaks this space (verify in Phase 5) |
| **ItemAppearanceID** | `ItemAppearance.ID` | A distinct visual look, shared by many items | Our `appearances.id` — the primary unit of the catalog |
| **ItemDisplayInfoID** | `ItemDisplayInfo.ID` | The render definition (models, textures, geosets) | What the Wowhead viewer's "displayId" is expected to be (verify in Phase 1) |
| **FileDataID** ("FDID") | various | A raw client file (icon .blp, model .m2) | `DefaultIconFileDataID` → icon image |

Resolution chain (each arrow is a join):

```
Item / ItemSparse (ItemID)
  └─ ItemModifiedAppearance (ItemID → ID=IMA, ItemAppearanceModifierID, ItemAppearanceID, TransmogSourceTypeEnum)
       └─ ItemAppearance (ID → ItemDisplayInfoID, DefaultIconFileDataID, UiOrder)
            └─ ItemDisplayInfo (ID → ModelResourcesID[2], ModelMaterialResourcesID[2], GeosetGroup[], HelmetGeosetVis[])
                 └─ ModelFileData / ComponentModelFileData (→ .m2 FileDataID)   ← ONLY needed for Phase 8 (self-hosted renderer)
```

Notes:
- `ItemAppearanceModifierID` distinguishes difficulty variants (LFR/normal/heroic/mythic recolors) of the
  *same ItemID*. Each variant is its own IMA row pointing at a different ItemAppearanceID.
- Many items share one ItemAppearanceID (e.g. quest reward + vendor copy). The catalog's unit is the
  appearance; items are listed under it.
- Appearances have **no name of their own**. Display name heuristic: the name of the lowest-ItemID item
  sharing the appearance (store as `appearances.display_name` at ingest).
- `slot` is also not on ItemAppearance — derive from the items' `InventoryType` and denormalize onto
  `appearances`.

## 2. DB2 tables to ingest (from wago.tools)

URL pattern: `https://wago.tools/db2/{Table}/csv?build={build}` (omit `?build=` for latest; we pin — see
Phase 2). CSVs include a header row with per-build column names (verified 2026-07-05).

**v1 (Phase 2) — required:**

| Table | Columns we need (verify names at ingest; assert-and-fail on mismatch) |
|---|---|
| `ItemSparse` | `ID`, `Display_lang` (name), `OverallQualityID`, `ExpansionID`, `InventoryType`, `ItemNameDescriptionID` (variant suffix like "Mythic") — large file, stream-parse |
| `Item` | `ID`, `ClassID`, `SubclassID`, `InventoryType`, `IconFileDataID` |
| `ItemModifiedAppearance` | `ID`, `ItemID`, `ItemAppearanceModifierID`, `ItemAppearanceID`, `OrderIndex`, `TransmogSourceTypeEnum` (verified live) |
| `ItemAppearance` | `ID`, `ItemDisplayInfoID`, `DefaultIconFileDataID`, `UiOrder` |
| `TransmogSet` | `ID`, `Name_lang`, `ClassMask`, `ExpansionID`, `TransmogSetGroupID`, `UiOrder` |
| `TransmogSetItem` | `ID`, `TransmogSetID`, `ItemModifiedAppearanceID`, `Flags` |
| `ManifestInterfaceData` | `ID` (= FileDataID), `FilePath`, `FileName` — to map icon FDID → `inv_sword_04` slug. Verify table name/columns on wago.tools first; fallback: community listfile `https://github.com/wowdev/wow-listfile` |

**Later (Phase 8 only):** `ItemDisplayInfo`, `ModelFileData`, `ComponentModelFileData`,
`TextureFileData`, `ItemDisplayInfoMaterialRes`. Do NOT ingest these in v1 — nothing uses them until we
self-host rendering. Exception: if Phase 1 finds the viewer needs `ItemDisplayInfoID` (likely), ingest
just the `ItemAppearance.ItemDisplayInfoID` column, which we get for free.

**Stable enums (hardcode as TS constants, don't ingest):**
- ItemClass: 2 = Weapon, 4 = Armor.
- Armor subclass: 1 Cloth, 2 Leather, 3 Mail, 4 Plate; 0 Misc (rings etc. — not transmoggable).
- Transmoggable InventoryTypes: 1 Head, 3 Shoulder, 4 Shirt (Body), 5 Chest, 6 Waist, 7 Legs, 8 Feet,
  9 Wrist, 10 Hands, 16 Back, 19 Tabard, 20 Robe (treat as Chest), 13/17/21/22/23/26 weapon types
  (one-hand, two-hand, main-hand, off-hand, holdable, ranged).
- ExpansionID: 0 Classic … 10 The War Within (check current max at ingest).
- `TransmogSourceTypeEnum`: verify value meanings against wowdev.wiki at ingest (observed values 3, 5, 9
  in live data); used for the "source" filter.

## 3. Postgres schema (Supabase)

All catalog tables: RLS enabled, `anon` gets SELECT only, writes only via service-role (ingest). User
tables: owner-scoped RLS. Migrations live in `supabase/migrations/` (Supabase CLI or MCP `apply_migration`).

```sql
-- ============ catalog (ingest-owned, public read) ============
create table items (
  id              int primary key,          -- ItemID
  name            text not null,            -- ItemSparse.Display_lang (DB2-sourced: NOT under 30-day TTL)
  quality         smallint,
  item_class      smallint not null,
  item_subclass   smallint not null,
  inventory_type  smallint not null,
  expansion       smallint,
  icon_fdid       int,
  name_description text                     -- "Mythic", "Elite" etc., nullable
);

create table appearances (
  id               int primary key,         -- ItemAppearanceID
  display_info_id  int,                     -- feed to 3D viewer (pending Phase 1 confirmation)
  icon_fdid        int,
  icon_slug        text,                    -- e.g. 'inv_sword_04' → zamimg/render CDN URL
  slot             smallint,                -- denormalized InventoryType (canonical: robes→chest)
  armor_type       smallint,                -- 0 none/weapon, 1..4 cloth..plate (denormalized)
  display_name     text,                    -- heuristic: lowest-ItemID item's name
  quality          smallint,                -- max quality among source items
  expansion        smallint,                -- min expansion among source items
  ui_order         int
);

create table item_modified_appearances (
  id             int primary key,           -- IMA id (wardrobe-collection unit)
  item_id        int not null references items(id),
  appearance_id  int not null references appearances(id),
  modifier_id    smallint not null default 0,
  source_type    smallint,
  order_index    smallint
);
create index on item_modified_appearances (item_id);
create index on item_modified_appearances (appearance_id);

create table transmog_sets (
  id         int primary key,
  name       text,
  class_mask int,
  expansion  smallint,
  group_id   int,
  ui_order   int
);

create table transmog_set_items (
  set_id  int not null references transmog_sets(id),
  ima_id  int not null,                     -- references item_modified_appearances(id); soft FK, some rows dangle
  primary key (set_id, ima_id)
);

-- ============ enrichment (Phase 6) ============
create extension if not exists vector;

create table appearance_tags (
  appearance_id  int primary key references appearances(id),
  dominant_hex   text,
  palette        jsonb,                     -- node-vibrant swatches
  color_buckets  text[],                    -- ['red','gold'] via HSL rules — the filterable field
  theme_tags     text[],                    -- controlled vocab from vision tagging
  tagged_at      timestamptz
);

create table appearance_embeddings (
  appearance_id  int primary key references appearances(id),
  embedding      vector(384)                -- gte-small; regenerate all if model changes
);
-- after bulk load:
-- create index on appearance_embeddings using hnsw (embedding vector_cosine_ops);

create table appearance_pairs (              -- precomputed set co-occurrence (Phase 6)
  a_appearance_id int not null,
  b_appearance_id int not null,
  b_slot          smallint not null,
  sets_count      int not null,
  primary key (a_appearance_id, b_appearance_id)
);
create index on appearance_pairs (a_appearance_id, b_slot, sets_count desc);

-- ============ ops ============
create table ingest_runs (
  id           bigint generated always as identity primary key,
  build        text not null,               -- e.g. '11.2.0.62213'
  status       text not null,               -- running|success|failed
  table_counts jsonb,
  started_at   timestamptz default now(),
  finished_at  timestamptz
);

-- ============ users (Phase 5) ============
create table profiles (
  id          uuid primary key references auth.users(id),
  username    text unique,
  battletag   text,
  bnet_region text,
  created_at  timestamptz default now()
);

create table saved_sets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references profiles(id),
  name       text not null,
  race       smallint,
  gender     smallint,
  is_public  boolean default true,
  share_slug text unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table saved_set_items (
  set_id        uuid not null references saved_sets(id) on delete cascade,
  slot          smallint not null,
  appearance_id int not null references appearances(id),
  primary key (set_id, slot)
);

create table collected_appearances (         -- Blizzard-API-derived → 30-day TTL applies
  user_id       uuid not null references profiles(id),
  appearance_id int not null,                -- confirm ID space during Phase 5 (IMA vs ItemAppearanceID)
  fetched_at    timestamptz not null default now(),
  primary key (user_id, appearance_id)
);
```

## 4. Field provenance & compliance TTL

| Data | Source | 30-day TTL? |
|---|---|---|
| Names, qualities, slots, sets, source types | wago.tools DB2 (client data) | No (but is Blizzard IP — free/non-commercial use only) |
| Icon images | zamimg hotlink or Blizzard render CDN (hotlinked, not stored) | N/A (not stored) |
| User's collected appearances | Blizzard Profile API | **Yes** — store `fetched_at`, refresh on login, purge rows older than 30 days |
| Anything fetched from `/data/wow/*` | Blizzard Game Data API | **Yes** — v1 avoids storing any of it (DB2 covers catalog needs) |

Key simplification vs. the original research: take **names from `ItemSparse` (DB2)**, not the Blizzard
API. Then the entire public catalog is DB2-sourced and the 30-day TTL only governs per-user collection
imports.

## 5. Icons

1. Ingest resolves `icon_fdid` → `icon_slug` via `ManifestInterfaceData` (path like
   `interface/icons/inv_sword_04.blp` → slug `inv_sword_04`).
2. Render in the app via hotlink — pick one at Phase 3 and abstract behind `iconUrl(slug, size)`:
   - `https://wow.zamimg.com/images/wow/icons/{small|medium|large}/{slug}.jpg` (Wowhead CDN — we already
     depend on zamimg for the viewer), or
   - `https://render.worldofwarcraft.com/us/icons/56/{slug}.jpg` (Blizzard render CDN).
3. Fallback for missing slugs: Blizzard `/data/wow/media/item/{id}` one-offs (TTL-bound) or a placeholder.

## 6. Known gotchas

- **Column names shift across builds.** The ingest parser must assert the exact header set it expects and
  fail loudly (never positional indexing). Pin `?build=` and bump deliberately.
- **ItemSparse is huge** (hundreds of MB as CSV). Stream-parse (`csv-parse` streaming API); never
  `readFileSync`. Only keep transmoggable rows (filter by InventoryType + ClassID early).
- **Bulk load**: use a direct Postgres connection (`pg` + `COPY`/batched multi-row inserts) from the
  ingest job — supabase-js REST inserts are too slow for ~500k rows. Load into staging tables, swap or
  upsert, keep the job idempotent.
- **Dangling references are normal** in client data (TransmogSetItem rows pointing at removed IMAs, icons
  with no manifest entry). Log counts, skip rows, never hard-fail the run on them.
- **Row counts** (sanity anchors, latest retail build, order-of-magnitude): ItemModifiedAppearance
  ~300–400k, ItemAppearance ~150–250k, TransmogSet ~2–4k. If a parse yields 10x less, the parse is broken.
