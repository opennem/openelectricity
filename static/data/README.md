# static/data

Static datasets served at `/data/*` and consumed client-side. This README
documents `data-centres-au.json`; the other files here are the transmission
lines overlay (`transmission-lines.geojson`), the golf-courses easter egg
(`golf-courses*.geojson`) and precomputed scenario models (`scenarios/`).

## data-centres-au.json

Australian data centres and comparable large industrial electrical loads,
converted from a community-compiled spreadsheet (`data-centres-au.xlsx`,
generated 2026-07-21). Powers the **Loads** layer on `/facilities`: the map
overlay, the entries mixed into the list/grid/timeline views, and the load
detail pane.

**Figures are indicative only.** The source is community-maintained research,
not an official registry — loads, dates and statuses are best-effort and many
carry uncertainty markers.

### Structure

```json
{
	"_meta": { "source_file": "...", "generated": "YYYY-MM-DD", "record_counts": { ... }, "notes": { ... } },
	"data_centres": [ { ... } ],   // 294 records
	"other_loads": [ { ... } ]     // 32 records — smelters, refineries, water utilities etc.
}
```

`data_centres` merges the workbook's `Sheet1` (master list) with rows unique to
its `Commenced` tab; `source_tab` records each row's origin. `other_loads` are
**not data centres** — they're included in the source for scale comparison and
have **no coordinates**, so the app currently ignores them.

### data_centres fields

| Field | Notes |
| --- | --- |
| `id` | Row id within the source tab. Stable per generation, not a registry id. The app derives its facility code as `dc-{id}`. |
| `name`, `company`, `city`, `state`, `address` | Free text; `name` is null on a handful of rows. |
| `status`, `status_raw` | Free text (19 distinct values, see below). `status_raw` preserves the original when `status` was normalised of trailing markers. |
| `latitude`, `longitude` | Decimal degrees. **Only 118 of 294 rows have coordinates** — the rest can't be mapped. Source stored coordinates longitude-first; they have been split and corrected for Australian ranges. |
| `construction_date`, `commencement_date` | Strings, mostly `YYYY`, some `YYYY-MM-DD`, the odd junk value. |
| `operational_it_load_mw` | IT load while operating (best covered: 149/294). |
| `operational_total_load_mw` | Always null in this generation. |
| `max_total_load_mw`, `max_it_load_mw` | Sparse (29 and 37 rows). |
| `estimated_cost_m` | AUD millions. |
| `cooling_method`, `gpu`, `gpu_number`, `rack_capacity`, `rack_density_kw`, `pue_average`, `pue_peak_load`, `pue_peak`, `offtaker_tenant` | Facility details, sparsely populated. |
| `btm_power` | Behind-the-meter power — messy: sometimes `yes`/`likely`, sometimes free text ("Tri-generation plant"), often a citation URL. |
| `website`, `planning_url` | Usually URLs, occasionally free-text notes — validate before linking. |
| `estimated_fields` | Field names whose value carried an uncertainty marker in the source (`* ** *** ? + > <` or "planned"). Treat those values as approximate. |
| `sources` | Per-field citation map: field name → URL the source spreadsheet hyperlinked to that value. |
| `notes`, `source_tab` | Free text; provenance tab. |

### Status values

Raw statuses are free text. The app normalises them into four buckets
(`normaliseStatus()` in `src/lib/facilities/data-centres.js`):

| Bucket | Raw values (count) |
| --- | --- |
| `operating` | Commenced (167) |
| `construction` | Construction (19), Commenced/Construction (1) |
| `announced` | Planning (30), `?` (16), null (14), Approved (12), Awaiting approval (10), Development (5), Planned (3), Assessment (2), Unclear (2), `***` (2), `??`, Announced, Approval, Pre-application |
| `retired` | Retired (4), retired (3) |

The `announced` bucket deliberately absorbs the whole development-approval
pipeline **and** unknown/junk values — the dimmest rendering, so an unknown
status is never overstated. Note this lifecycle is *not* the OE facility one
(committed → commissioning → operating → retired): data centres pass through a
planning pipeline OE has no equivalent for, which is why the `/facilities`
Status filter carries a separate Loads section.

### MW figure

No single load field is well covered. The app uses a fallback chain
(`bestMw()`): `operational_it_load_mw` → `max_it_load_mw` →
`max_total_load_mw`. 92 of the 118 mappable rows resolve to a figure
(1.5–1,200 MW, median 70).

### How the app consumes it

Everything goes through `src/lib/facilities/data-centres.js` (fetched lazily,
cached per session, when Loads is first toggled on in the Type filter):

- `toLoadFacilities()` → facility-shaped objects (`isLoad: true`, one
  synthesised `data_centre` unit, full record under `dataCentre`) mixed into
  the list/grid/timeline views and the load detail pane, filtered by the
  Region and load-status filters client-side.
- `toGeoJSON()` → the map overlay (`DataCentresLayer.svelte`) rebuilds its
  features from the FILTERED loads' raw records, so the purple markers (sized
  by MW on a sqrt scale, status encoded as fill opacity) respect the same
  filters as the views; rows without coordinates are dropped.

### Regenerating

Re-export from the source workbook (`data-centres-au.xlsx`, not in this repo)
and replace this file, keeping the `_meta` block up to date. If field
semantics change, update `src/lib/facilities/data-centres.js` and its tests
(`data-centres.test.js`) alongside.
