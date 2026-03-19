# Scenarios (ISP) Page

Explore the future of Australia's electricity market through modelled scenarios from AEMO's Integrated System Plan (ISP).

## Page Structure

```
+page.server.js      → Fetches articles from Sanity CMS
+page.js             → Pipes server data to client
+page.svelte         → Main page: chart rendering, data fetching, fullscreen/keyboard handling
components/          → UI components (Filters, Charts, Tables, MiniCharts, etc.)
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
| `combine-history-projection.js` | Merges history and projection arrays into a single time series, handling overlapping timestamps and computing yDomain |
| `exclude-battery-and-loads.js` | Filters battery/storage/export fuel techs from group maps |
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

Charts are synced via `createSyncedCharts()` for coordinated hover/focus interactions. Each chart is wrapped by `ScenarioChart.svelte` which provides the `StratumChart` integration with custom header snippets and tooltips.

Row visibility toggling (`hiddenRowNames`) is synced across all four charts.

## Available Models

Configured in `page-data-options/models.js`. Models are listed newest-first, with 2026 ISP Draft as the default:

- **AEMO 2026 ISP (Draft)** (`aemo2026draft`) — scenarios: Step Change, Accelerated Transition, Slower Growth. CDPs 1–23 + Counterfactual, ODP = CDP4 (ODP)
- **AEMO 2024 ISP (Final)** (`aemo2024`) — scenarios: Step Change, Progressive Change, Green Energy Exports. CDPs 1–25 + Counterfactual, ODP = CDP14
- **AEMO 2024 ISP (Draft)** (`aemo2024draft`) — scenarios: Step Change, Progressive Change, Green Energy Exports. CDPs 1–17 + Counterfactual, ODP = CDP3
- **AEMO 2022 ISP (Final)** (`aemo2022`) — scenarios: Step Change, Slow Change, Progressive Change, Hydrogen Superpower. CDPs 2,5,6,8–13 + Counterfactual, ODP = CDP12
- **AEMO 2022 ISP (Draft)** (`aemo2022draft`) — scenarios: Step Change, Slow Change, Progressive Change, Hydrogen Superpower. CDPs 1–13 + Counterfactual, ODP = CDP12
- **AEMO 2020 ISP (Final)** (`aemo2020`) — scenarios: Step Change, Slow Change, Central. DPs 1–8, default = DP4
- **AEMO 2020 ISP (Draft)** (`aemo2020draft`) — scenarios: Step, Fast, Slow, Central, High DER. Single default pathway
- **AEMO 2018 ISP** (`aemo2018`) — scenarios: Neutral, Neutral with Storage, Fast, Slow, High DER, IRFG. Single default pathway

Static model JSON files are stored in `static/data/scenarios/` organised by model version.

## Components

| Component | Purpose |
|-----------|---------|
| `Filters.svelte` | Main filter UI with view switcher, region/model/scenario selection |
| `ScenarioChart.svelte` | StratumChart wrapper with header snippets and tooltips |
| `DetailedTechnology.svelte` | Mini-chart grid for technology view breakdown |
| `DetailedScenario.svelte` | Mini-chart grid for scenario comparison |
| `DetailedRegion.svelte` | Mini-chart grid for regional breakdown |
| `MiniCharts.svelte` | Reusable mini-chart grid component |
| `TableTechnology.svelte` | Data table for technology view |
| `TableScenario.svelte` | Data table for scenario view |
| `TableRegion.svelte` | Data table for region view |
| `TableHeader.svelte` | Reusable table header |
| `ScenarioSelection.svelte` | Multi-select for scenario view |
| `ScenarioButton.svelte` | Individual scenario selector button |
| `PathwaySelection.svelte` | Pathway dropdown |
| `ScenarioDescription.svelte` | Scenario metadata and description display |
| `Tooltip.svelte` | Custom chart tooltip |
| `OptionsMenu.svelte` | Settings menu for chart display preferences |
| `DownloadButton.svelte` | CSV/JSON export |
| `ArticlesSection.svelte` | ISP-tagged articles from Sanity CMS |

## Stores

| Store | File | Purpose |
|-------|------|---------|
| Filters | `stores/filters.js` | Writable stores for view section, region, fuel tech group, model, scenario |
| By-scenario | `stores/by-scenario.js` | Scenario selection state and ordering logic for scenario view |

## Keyboard Shortcuts

Handled in `+page.svelte` via `handleKeydown()`:

| Key | Action |
|-----|--------|
| `F` | Toggle fullscreen mode (synced to URL `?fullscreen=true`) |
| `?` | Toggle shortcuts toast |
| `Esc` | Exit fullscreen |

Fullscreen mode uses `layoutContext?.setFullscreen()` for layout coordination.

## Configuration Files

| File | Purpose |
|------|---------|
| `page-data-options/view-sections.js` | View mode options (Technology, Scenario, Region) |
| `page-data-options/data-types.js` | Chart display options (Generation, Emissions, Intensity, Capacity) |
| `page-data-options/models.js` | Model definitions, scenarios, pathways, default pathway per model |
| `page-data-options/descriptions.js` | Scenario labels and descriptions |
| `page-data-options/groups-technology.js` | Fuel tech grouping for technology view (also includes homepage groups) |
| `page-data-options/groups-scenario.js` | Fuel tech grouping for scenario view |
| `page-data-options/groups-region.js` | Fuel tech grouping for region view |
| `page-data-options/chart-ticks.js` | X-axis tick and highlight configuration per model |

## Homepage Integration

The homepage scenarios preview (`src/lib/components/info-graphics/scenarios-explorer/homepage/`) reuses the same data pipeline (`fetchTechnologyViewData`, `processTechnology.generation`) and chart system. It has its own fuel tech groups (`homepage_preview`, `homepage_renewables_vs_fossil_fuels`) registered in `groups-technology.js` but not shown in the scenario page filters.
