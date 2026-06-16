---
name: oe-api-route
description: Scaffold a new OpenElectricity API server route at src/routes/api/... following the project's +server.js conventions (timezone-naive date handling, NoDataFound fallback, Cache-Control headers, JSDoc types). Use when the user asks to "add an API route", "create an endpoint", "new API", "scaffold server route" involving the openelectricity client.
---

# OE API Route Scaffolder

Scaffold a new SvelteKit server route that wraps an OpenElectricity SDK call.

## Before generating — nudge the user about the cleanup plan

The `TODO.md` "API Route Cleanup" section recommends **inlining server-only calls into load functions** rather than creating new `/api/*` endpoints, because the latter becomes public surface area. Ask the user:

> "Will this endpoint be called client-side? If it's only for a server-side `load()` or `+page.server.js`, inline the OpenElectricityClient call there instead of creating a new public route."

Only proceed with scaffolding if they confirm client-side need or explicitly override.

## Gather inputs

Ask (or infer from args) if not specified:

1. **Endpoint path** — e.g. `facilities/[code]/pollution`, `market/price`. Used as `src/routes/api/<path>/+server.js`.
2. **SDK method** — one of: `getFacilityData`, `getFacilities`, `getNetworkData`, `getMarket`, `getFacilityPollution`.
3. **Required URL params** — e.g. `network_id`, `interval`, `metric`, `date_start`, `date_end`, `days`.
4. **Cache duration** — default to 5 minutes for 5m-interval data, 30 minutes for aggregated.

## Template

Use `src/routes/api/facilities/[code]/power/+server.js` as the reference template. The generated file must include:

```js
import { error } from '@sveltejs/kit';
import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
    apiKey: PUBLIC_OE_API_KEY,
    baseUrl: PUBLIC_OE_API_URL
});

// Validation constants (include only those relevant to the chosen method)
const VALID_INTERVALS = ['5m', '1h', '1d', '7d', '1M', '3M', '1y'];
const VALID_METRICS = ['power', 'energy', 'market_value'];

export async function GET({ params, url, setHeaders }) {
    // 1. Extract + validate params
    // 2. Build options object for the SDK
    // 3. Format any date params as timezone-naive (YYYY-MM-DDTHH:mm:ss)
    //    by adding the network offset (NEM +10:00, WEM +08:00) then slicing
    // 4. Call client.<method>(...)
    // 5. setHeaders({ 'Cache-Control': 'public, max-age=<N>' })
    // 6. return Response.json({...})
}
```

## Date handling — critical

The OE API expects timezone-naive dates in the network's local time. When accepting ms timestamps:

```js
const offsetMs = networkId === 'WEM' ? 8 * 3600_000 : 10 * 3600_000;
const dateStart = new Date(utcMs + offsetMs).toISOString().slice(0, 19);
```

When accepting `YYYY-MM-DD` strings from URL params, they're already naive — pass through. **Always reject sub-1-second ranges** (API returns `NoDataFound` for same-second start/end).

## Data-shape gotchas — `getNetworkData` power with `secondary_grouping: ['fueltech']`

The OE API returns *raw* per-fueltech series, **not** the pre-aligned, chart-ready shape the legacy OpenNEM static JSON (`data.openelectricity.org.au/.../power/7d.json`) gives. If you feed OE output into a pipeline written for the JSON (e.g. `processPower7d`), watch for these — all four bit the 7-day tracker migration (`/api/tracker/7d-oe`):

1. **No 30m interval for power.** `interval: '30m'` is rejected (`Unprocessable Entity`). Fetch `5m` and aggregate down yourself.
2. **Per-fueltech windows differ.** Each fueltech has its own `start`/length (e.g. rooftop solar starts later and is shorter than coal). Any code that reconstructs a point's time by *index* from a single reference start will misalign series. **Align all series onto one common grid first** (union of all start/last, null-padded). The shared `alignStatsDataToCommonRange` is **monthly-only**; for sub-daily data use a 5m-aware align (see `alignAndFillPowerSeries` in `7d-oe/+server.js`).
3. **30-minute series are step-held across 5m with nulls.** Rooftop solar repeats its 30m value across some 5m slots and leaves the rest `null`. If grouping turns `null`→`0` (as `groupData` does) and you then take a mean to 30m, those buckets get halved → visible dips. Fix with a **bounded forward-fill** (≤ one 30m block) to reconstruct the step, or make the aggregation null-aware. Don't bridge long gaps / coverage edges.
4. **Net `battery` series is returned alongside the split.** Fueltech `battery` = `battery_discharging − battery_charging` (net; negative when net-charging). It comes *in addition* to `battery_charging` and `battery_discharging`, which the static JSON returns on their own. Keeping all three **double-counts** battery in a stacked chart — drop `battery` (`d.fuel_tech !== 'battery'`) when the chart already stacks the charging/discharging split. The grouping's standalone `battery` group exists only for feeds that report *just* a net figure.

Also note OE returns the in-progress current bucket and may include extra fueltechs the JSON omits (curtailment, a blank-code series); filter/trim as needed.

## Error handling — always

```js
try {
    const { response } = await client.getFacilityData(...);
    setHeaders({ 'Cache-Control': 'public, max-age=300' });
    return Response.json({ /* ... */, response });
} catch (err) {
    if (err instanceof NoDataFound) {
        return Response.json({ /* ... */, response: { data: [] } });
    }
    console.error('Error fetching <what>:', err);
    return Response.json(
        { error: err.message, details: err.details },
        { status: 500 }
    );
}
```

The `NoDataFound` → empty-response pattern is **required** — upstream UI treats empty response as "no data for this range" rather than an error. Do not let `NoDataFound` 500.

## Validation

Before returning valid intervals, explicitly check the combination. `5m` interval only supports `power` and `market_value`; `energy` at `5m` is invalid.

## JSDoc

Always annotate the SDK method return type and the NetworkCode cast:

```js
const networkId = /** @type {import('openelectricity').NetworkCode} */ (
    url.searchParams.get('network_id') || 'NEM'
);

/** @type {import('openelectricity').IFacilityTimeSeriesParams} */
const options = { interval, dateStart };
```

## After writing the file

1. Run `pnpm run check` to verify no new type errors.
2. Remind the user to update `TODO.md` "API Route Cleanup" → "Remaining client-facing routes" table if the new route is client-facing.
3. Tell the user about the rate-limiting / origin-check TODOs that apply to all new `/api/*` routes.
