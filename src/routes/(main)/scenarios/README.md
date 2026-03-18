# Scenarios (ISP) Page

Explore the future of Australia's electricity market through modelled scenarios from AEMO's Integrated System Plan (ISP).

## Page Structure

```
+page.server.js      → Fetches articles from Sanity CMS
+page.js             → Pipes server data to client
+page.svelte         → Main page: chart rendering, data fetching, fullscreen/keyboard handling
components/          → UI components (Filters, Charts, Tables, OptionsMenu, etc.)
page-data-options/   → Data fetching, processing, and configuration
stores/              → Svelte stores for filters and by-scenario state
```

## Views

Three view modes, selected via the Switch in the filter bar:

| View | Purpose | Key Params |
|------|---------|------------|
| **Technology** | Single scenario broken down by fuel tech | model, scenario, pathway, region |
| **Scenario** | Compare multiple scenarios (aggregated) | scenarios[], region |
| **Region** | Single scenario broken down by NEM region | model, scenario, pathway |

## Data Fetching

### External Data Sources

All hosted at `data.openelectricity.org.au` (configured via `PUBLIC_JSON_URL` and `PUBLIC_JSON_API` env vars).

| API Route | External URL | Returns |
|-----------|-------------|---------|
| `/api/scenarios` | `/models/v2/{model}/{scenario}.json` | Projection data (energy, capacity, emissions per fuel tech/pathway/region) |
| `/api/energy` | `/v4/stats/au/NEM/{region}/{type}/all.json` | Historical energy & emissions |
| `/api/capacity` | `/capacity/unified_annual_capacity.json` | Historical capacity |

### Fetch Functions

All in `page-data-options/fetch.js`. Each fetches history + projection data in parallel via `Promise.all`.

#### `fetchTechnologyViewData({ model, scenario, pathway, region })`
- `getEnergyAndEmissions(region)` — single request, parsed for both energy and emissions
- `getHistory(region, 'capacity')`
- `getScenarios(model, scenario)`
- Returns: `{ projectionEnergyData, projectionCapacityData, projectionEmissionsData, historyEnergyData, historyCapacityData, historyEmisssionsData }`

#### `fetchScenarioViewData({ scenarios, region })`
- Shared history: `getEnergyAndEmissions(region)` + `getHistory(region, 'capacity')`
- Per-scenario: `Promise.all(scenarios.map(s => getScenarios(s.model, s.scenario)))`
- Returns: `{ projectionsData[], historyEnergyData, historyCapacityData, historyEmisssionsData }`

#### `fetchRegionViewData({ regions, model, scenario, pathway })`
- Single scenario request: `getScenarios(model, scenario)`
- Per-region: `getEnergyAndEmissions(region)` + `getHistory(region, 'capacity')`
- Returns: array of region objects with attached history + projection data

### Caching

Fetched data is stored in plain JS variables (not `$state`) to avoid Svelte 5 proxy overhead on large datasets. Reactive version counters (`$state`) trigger reprocessing when new data arrives.

Cache keys prevent re-fetching when switching views with the same params:
- Technology: `${model}-${scenario}-${pathway}-${region}`
- Scenario: `${scenarios.map(s => s.id).join(',')}-${region}`
- Region: `${model}-${scenario}-${pathway}`

## Data Processing

### Pipeline

```
Raw API Response
  → Parser (scenario or history)
  → Process function (per view)
  → ProcessedDataViz object
  → ChartStore update
```

### Parsers

| Parser | File | Purpose |
|--------|------|---------|
| Scenario parser | `$lib/scenarios/parser.js` | Converts GWh → TWh, extracts pathways and fuel techs |
| History parser | `$lib/opennem/parser.js` | Filters by fuel tech, pads/aligns dates across series |

### Process Functions

All in `page-data-options/`:

| Function | File | Purpose |
|----------|------|---------|
| `processTechnology.generation/emissions/capacity/intensity` | `process-technology.js` | Combines history + projection for single scenario by fuel tech |
| `processScenario.generation/emissions/capacity/intensity` | `process-scenario.js` | Combines history + projection for multiple scenarios (aggregated) |
| `processRegion.generation/emissions/capacity/intensity` | `process-region.js` | Combines history + projection across regions |

### Utilities

| File | Purpose |
|------|---------|
| `combine-history-projection.js` | Merges history and projection arrays into a single time series |
| `sum-fuel-tech-data.js` | Optimised summing of fuel tech data with Set-based group lookups |
| `utils.js` | `mergeHistoricalEmissionsData()`, `covertHistoryDataToTWh()`, `mutateDatesToStartOfYear()` |

## Data Formats

### Scenario Data (projection)
```json
{
  "id": "au.nem.fuel_tech.solar.energy.step_change.cdp1",
  "type": "energy",
  "fuel_tech": "solar",
  "scenario": "step_change",
  "pathway": "CDP1",
  "units": "GWh",
  "projection": {
    "start": "2025-01-01T00:00:00+10:00",
    "last": "2052-01-01T00:00:00+10:00",
    "interval": "1Y",
    "data": [316.0, 657.9, 1890.9]
  }
}
```

### History Data (energy/emissions)
```json
{
  "id": "au.fuel_tech.solar.energy",
  "fuel_tech": "solar",
  "units": "GWh",
  "data_type": "energy",
  "history": {
    "start": "1998-12-01",
    "last": "2023-12-01",
    "interval": "1M",
    "data": [100, 200, 300]
  }
}
```

### Capacity Data
```json
{
  "id": "au.fuel_tech.solar.capacity",
  "fuel_tech": "solar",
  "network": "nem",
  "units": "MW",
  "history": {
    "start": "2015-01-01",
    "last": "2024-01-01",
    "interval": "1M",
    "data": [500, 510, 520]
  }
}
```

## Chart System

Uses ChartStore v2 (`$lib/components/charts/v2/ChartStore.svelte.js`) with four synced chart instances:

| Chart | Type | Key |
|-------|------|-----|
| Generation | stacked-area | `generation` |
| Emissions | stacked-area | `emissions` |
| Intensity | line | `intensity` |
| Capacity | stacked-area | `capacity` |

Charts are synced via `createSyncedCharts()` for coordinated hover/focus interactions.

## Available Models

Configured in `page-data-options/models.js`. Currently includes:
- **AEMO 2024 ISP** (`aemo2024`) — scenarios: Step Change, Green Energy Exports, Progressive Change
- **AEMO 2022 ISP** (`aemo2022`) — scenarios: Step Change, Hydrogen Superpower, Progressive Change, Slow Change

Static model files also exist in `$lib/models/` for 2022 ISP and draft 2024 ISP data.

## Configuration Files

| File | Purpose |
|------|---------|
| `page-data-options/view-sections.js` | View mode options (Technology, Scenario, Region) |
| `page-data-options/data-types.js` | Chart display options (Generation, Emissions, Intensity, Capacity) |
| `page-data-options/models.js` | Model definitions, scenarios, pathways |
| `page-data-options/descriptions.js` | Scenario labels and descriptions |
| `page-data-options/groups-technology.js` | Fuel tech grouping options for technology view |
| `page-data-options/groups-scenario.js` | Fuel tech grouping options for scenario view |
| `page-data-options/chart-ticks.js` | X-axis tick configuration per model |
