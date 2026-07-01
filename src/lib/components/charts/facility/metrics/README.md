# Facility Metrics

At-a-glance metrics for a facility, computed **for the chart's current visible date
range**. Rendered above the chart on `/facility/[code]` and inside the `/facilities`
detail panel. As the user pans, zooms, or changes the range preset, every number
recomputes.

```
<FacilityMetrics
  facility        // OE API facility (battery-filtered units)
  sanityFacility  // Sanity CMS doc (optional — enriches the "specs" garnishes)
  summaryData     // { energyData, mvData, energySeriesNames, mvSeriesNames }
  emissionsData   // { rows, seriesNames }  (reported tCO₂)
  intervalData    // { data, seriesNames, seriesLabels }  (raw power)
/>
```

## How it works

`FacilityMetrics.svelte` is a **single, declarative renderer** — not one component per
fuel tech. The flow is:

1. **Pick the fuel group.** `getPrimaryFuelTechGroup(units)` returns the dominant group
   by registered capacity: `wind | solar | battery | coal | gas | hydro | other`
   (`fuel-group.js`).
2. **Resolve the metric set.** `resolveMetricKeys(group, flags)` returns an ordered list
   of metric ids for that group (`metric-definitions.js`). A few are conditional —
   gas peakers add `runningHours`/`startCount`, solar adds `dcac` only when an oversizing
   ratio is known.
3. **Build one shared context** (`ctx`). `FacilityMetrics.svelte` computes every scalar
   once from the visible-range data using the pure helpers in `metrics-calc.js`.
4. **Render.** Each id maps to a descriptor in `METRICS` whose `compute(ctx)` returns
   `{ value, unit?, subtitle? }` for a `MetricCard`. Group-specific **garnishes** (badges,
   DC:AC line, turbine/equipment specs, unit-availability bars) hang off the same context.

### Data sources

Everything is produced by the existing facility data layer, keyed on
`viewStart`/`viewEnd`, so the metrics inherently track the chart:

| Prop             | Produced by                                     | Feeds                                                 |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `summaryData`    | `FacilityFinancialDataProvider` `onsummarydata` | energy, capacity factor, revenue, avg price, peak     |
| `emissionsData`  | `FacilityEmissionsDataProvider` `onsummarydata` | CO₂ volume + intensity                                |
| `intervalData`   | `FacilityChart` `onvisibledata`                 | running hours, starts, unit availability              |
| `sanityFacility` | server load (Sanity CMS)                        | DC:AC, turbine/equipment specs, MLF, storage, closure |

The metrics card is rendered above the chart, while the providers that feed it render
below (or headless, in the panel). DOM order doesn't matter — data flows through state,
so the card fills in once the providers' fetch settles (showing `--` until then).

## Metric sets by fuel group

| Group       | Metrics                                                                                                            | Garnishes                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **coal**    | Capacity Factor, CO₂ Emissions, Emissions Intensity, Revenue, Avg Price                                            | black/brown badge, expected closure, unit-availability bars |
| **gas**     | Capacity Factor, CO₂ Emissions, Emissions Intensity, Revenue, Avg Price _(+ Running Hours, Start Count if peaker)_ | subtype badge (CCGT/OCGT/…), "Peaker plant"                 |
| **wind**    | Capacity Factor, Total Energy, Avg Price, Revenue, Peak Output                                                     | turbine specs                                               |
| **solar**   | Capacity Factor, Peak Output, Avg Price, Revenue _(+ DC:AC if known)_                                              | DC/AC capacity line                                         |
| **hydro**   | Capacity Factor, Total Energy, Running Hours, Avg Price, Revenue                                                   | pumped-hydro badge                                          |
| **battery** | Net Revenue, Storage Duration, Round-trip Efficiency, Total Energy, Capacity Factor                                | equipment specs                                             |
| **other**   | Capacity Factor, Total Energy, Revenue, Avg Price                                                                  | —                                                           |

**Why these?** Each group surfaces what's decision-relevant for that technology: fossil
plants are judged on emissions and how hard they run; renewables on how much they
generate and the price they capture; batteries on arbitrage economics. The groupings
originated in the `/studio/facility-detail` prototype and were confirmed in the
implementation plan; the underlying formulas are standard energy-market definitions
(see Provenance).

## Metric definitions

All formulas live in `metrics-calc.js` (pure, unit-tested in `metrics-calc.test.js`).
Energy is MWh, power MW, market value $, emissions tCO₂e.

| Metric                        | Definition                                                                                                                                                                                                                                                                                                                          | Source                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Capacity Factor**           | `energy / (registered_capacity × hours) × 100`                                                                                                                                                                                                                                                                                      | summaryData                                   |
| **Total Energy**              | Σ energy across unit series (Σ\|energy\| for batteries)                                                                                                                                                                                                                                                                             | summaryData                                   |
| **Revenue**                   | Σ market value across unit series                                                                                                                                                                                                                                                                                                   | summaryData                                   |
| **Avg Price Received**        | `market_value / energy` ($/MWh)                                                                                                                                                                                                                                                                                                     | summaryData                                   |
| **CO₂ Emissions**             | Σ reported emissions across unit series (tCO₂)                                                                                                                                                                                                                                                                                      | emissionsData                                 |
| **Emissions Intensity**       | `total_tCO₂ × 1000 / energy_MWh` (kgCO₂e/MWh)                                                                                                                                                                                                                                                                                       | emissionsData + summaryData                   |
| **Peak Output / Peak Energy** | the peak `summaryData` bucket (`peakBucket`). Power mode (sub-daily rows): "Peak Output" = peak MW (`÷ interval_hours`), shown `peak / capacity`. Energy mode (daily+ rows): "Peak Energy" = highest-energy bucket (MWh, raw). Both show the period as a subtitle and annotate the chart at that time on hover (`onpeakhighlight`). | summaryData                                   |
| **Running Hours**             | intervals where any series generated × interval length                                                                                                                                                                                                                                                                              | intervalData (sub-daily only)                 |
| **Start Count**               | transitions from not-generating → generating                                                                                                                                                                                                                                                                                        | intervalData (sub-daily only)                 |
| **Net Revenue**               | Σ market value (discharge revenue − charge cost)                                                                                                                                                                                                                                                                                    | summaryData                                   |
| **Storage Duration**          | `storage_capacity_MWh / power_capacity_MW` (hours)                                                                                                                                                                                                                                                                                  | Sanity storage_capacity                       |
| **Round-trip Efficiency**     | `discharge_energy / charge_energy × 100` (from the signed battery series)                                                                                                                                                                                                                                                           | summaryData                                   |
| **DC:AC Ratio**               | `DC_array / AC_connection`, only when 1.05–3.0                                                                                                                                                                                                                                                                                      | Sanity capacity_registered / capacity_maximum |

### Emissions: reported, not estimated

CO₂ comes from the OE API's reported `emissions` metric over the visible range, summed
to a volume and divided by energy for an **energy-weighted** intensity — more accurate
than `emissions_factor × energy`, and it needs no Sanity data. The emissions provider is
only mounted for facilities with emitting units, so renewables/storage fire no emissions
request.

## "Specs" garnishes — and where they come from

The non-metric extras (turbine brand/model, DC/AC capacities, battery equipment, MLF,
storage capacity, closure dates) are read from the **Sanity CMS** facility document's
`units[]`, via the shared projection in `$lib/server/sanity-projections.js`
(`SANITY_FACILITY_UNITS_PROJECTION`), fetched server-side on both pages. When Sanity has
no data for a facility these garnishes simply don't render — the core metrics, which come
from the OE API data providers, are unaffected.

## Provenance

- **Formulas** — standard electricity-market definitions (capacity factor, emissions
  intensity, average price, round-trip efficiency, DC:AC oversizing ratio). Not invented
  here.
- **Metric sets** (which metrics per fuel group) — designed in the `/studio/facility-detail`
  prototype and confirmed in the implementation plan.
- **Correctness oracle** — the prototype's `compute-metrics.test.js`; this directory's
  tests mirror its expected values so the fresh implementation is provably equivalent.
- **Specs data** — OpenElectricity Sanity CMS facility documents.

## Files

```
metrics/
├── FacilityMetrics.svelte    # router/renderer: builds ctx, renders cards + garnishes
├── MetricCard.svelte         # label / value / unit / subtitle
├── metric-definitions.js     # METRICS descriptors + resolveMetricKeys (per-group sets)
├── metrics-calc.js           # pure maths incl. isSubDailyData (+ .test.js)
└── fuel-group.js             # dominant group, peaker / pumped-hydro (+ .test.js)
```
