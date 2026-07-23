# Emissions API (national, by sector)

Serves Australia's national greenhouse-gas emissions by sector as JSON:

- [`/api/emissions/au/quarter`](https://openelectricity.org.au/api/emissions/au/quarter) — quarterly, per-sector (NGGI)
- [`/api/emissions/au/year`](https://openelectricity.org.au/api/emissions/au/year) — annual per-sector history **plus projections**

These recreate the two endpoints of the retired **opennem-edge-data** Netlify
service. They are consumed cross-origin by the OpenNEM Data Tracker
([`opennem-fe`](https://github.com/opennem/opennem-fe)) `/emissions/au` page,
which points at them via its `EDGE_DATA_BASE_URL` env var.

## Files

```
src/routes/api/emissions/
├── README.md                          # this file
└── au/[period]/+server.js             # GET handler: thin (param → lookup → headers)

src/lib/server/emissions/
├── index.js                           # getEmissions(period): parses bundled CSV + meta
├── index.test.js                      # unit tests
└── data/                              # bundled snapshot of opennem/emissions-csv
    ├── quarter.csv / quarter-meta.json
    └── year.csv / year-meta.json
```

The route is deliberately thin. All parsing lives in
`src/lib/server/emissions/index.js` — kept server-only under `$lib/server`, so
the CSVs are inlined into the Worker bundle (Vite `?raw` import) rather than read
from disk at runtime, and are unit-testable in isolation.

`index.js` exports:

| Export                 | Purpose                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `EMISSIONS_PERIODS`    | The periods with a bundled dataset — `['quarter', 'year']`.                                       |
| `getEmissions(period)` | Returns `{ ...meta, data }` for the period, or `null` if unknown. `data` is parsed with `d3-dsv`. |

## Response shape

The dataset's metadata is spread over a `data` array of header-keyed CSV rows.
**Row values are kept as strings** (the consumer `parseFloat`s them) — do not
coerce to numbers.

`GET /api/emissions/au/quarter`:

```jsonc
{
	"id": "quarter",
	"path": "…", // upstream provenance; not used by consumers
	"prefix": "t",
	"source": { "label": "National Greenhouse Gas Inventory: Quarterly updates", "url": "…" },
	"data": [
		{
			"Quarter": "Sep-04",
			"Electricity": " 51.24… ",
			"Stationary": "…",
			"Transport": "…",
			"Fugitives": "…",
			"Industrial": "…",
			"Agriculture": "…",
			"Waste": "…",
			"Land sector": "…"
		}
		// …one row per quarter
	]
}
```

`GET /api/emissions/au/year` (adds `projectionStartYear`; one row per sector, one
column per year 1990→2040):

```jsonc
{
	"id": "year",
	"path": "…",
	"projectionStartYear": 2026, // number; first year treated as projection
	"prefix": "t",
	"source": { "label": "Australia's emissions projections 2025 (fig. 5)", "url": "…" },
	"data": [
		{ "Sector": "Electricity", "1990": "129530000", "1991": "…", "…": "…", "2040": "…" }
		// …one row per sector
	]
}
```

An unknown period (e.g. `/api/emissions/au/decade`) returns **404**.

### Sector labels differ between the two files — on purpose

The consumer maps each file through a different lookup, so the spellings must be
preserved exactly:

| quarter (`Quarter` column + these) | year (`Sector` column values) |
| ---------------------------------- | ----------------------------- |
| Agriculture                        | Agriculture                   |
| Electricity                        | Electricity                   |
| Fugitives                          | Fugitives                     |
| Industrial                         | Industrial processes          |
| Stationary                         | Stationary energy             |
| Transport                          | Transport                     |
| Waste                              | Waste                         |
| Land sector                        | LULUCF                        |

## Data source & updating

The CSV + `*-meta.json` files under `src/lib/server/emissions/data/` are a
**bundled snapshot** of [`opennem/emissions-csv`](https://github.com/opennem/emissions-csv)
(`data/au/emissions/*-meta.json` and the CSV each `meta.path` points to). Because
the data is bundled, it only changes on redeploy — that's why the responses are
cacheable (below).

To refresh the data (emissions figures update roughly quarterly):

1. Replace `data/quarter.csv` and/or `data/year.csv` with the latest CSV from the
   `emissions-csv` repo. **Keep the header row and sector spellings unchanged**
   (see the table above) — the consumer keys off them.
2. If the upstream **source figure changes** (e.g. a new projections publication),
   update the matching `*-meta.json` — `source.label` / `source.url`, and for the
   year file `projectionStartYear` (the first year rendered as a projection).
3. `pnpm run test` (the unit tests assert both periods still parse and are
   attributed), then redeploy.

Adding another region/period later is a couple of files in `data/` plus a map
entry in `index.js` — no route change.

## Caching

`Cache-Control: public, max-age=3600, s-maxage=86400` — 1 h in the browser, 1 day
at the edge. Safe to cache generously because the data is baked into the build and
only changes on redeploy. (The old Netlify service sent `no-cache` because it
fetched upstream on every request; bundling removes that need.)

## CORS

The handler sets `Access-Control-Allow-Origin: *` because `opennem-fe` fetches
these from a **different origin**. It's a simple `GET` with no custom request
headers, so no `OPTIONS` preflight is involved.

## Testing

```bash
# Unit tests (parses the bundled data, no network/dev server needed)
pnpm exec vitest run src/lib/server/emissions/index.test.js

# Eyeball the live output with the dev server running (pnpm run dev)
curl -s http://localhost:5173/api/emissions/au/quarter | python3 -m json.tool | head
curl -sD - -o /dev/null http://localhost:5173/api/emissions/au/year   # inspect headers (CORS, cache)
```
