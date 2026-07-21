# Facility Metrics

At-a-glance metrics for a facility, computed **for the chart's current visible date
range**. Rendered above the chart on `/facility/[code]` and inside the `/facilities`
detail panel. As the user pans, zooms, or changes the range preset, every number
recomputes.

```
<FacilityMetrics
  facility        // OE API facility (battery-filtered units)
  sanityFacility  // Sanity CMS doc (optional — enriches DC:AC / storage / closure)
  summaryData     // { energyData, mvData, energySeriesNames, mvSeriesNames }
  emissionsData   // { rows, seriesNames }  (reported tCO₂)
  intervalData    // { data, seriesNames, seriesLabels }  (raw power)
  hiddenUnitCodes // units toggled off in the units panel — excluded from every metric
/>
```

`hiddenUnitCodes` scopes the metrics to the selected units, matching the charts:
hidden units are dropped from the unit list (capacity, fuel-group selection, storage
duration) and their series are filtered out of every sum via `unitSeriesIds` across
the four metric prefixes (`power`/`energy`/`market_value`/`emissions`). On
`/facility/[code]` retired units start toggled off (unless the whole facility is
retired), so the default view describes the operating units.

## How it works

`FacilityMetrics.svelte` is a **single, declarative renderer** — not one component per
fuel tech. The flow is:

1. **Pick the fuel group.** `getPrimaryFuelTechGroup(units)` returns the dominant group
   by capacity (maximum falling back to registered, per unit):
   `wind | solar | battery | coal | gas | hydro | other` (`fuel-group.js`).
2. **Resolve the metric set.** `resolveMetricKeys(group, flags)` returns an ordered list
   of metric ids for that group (`metric-definitions.js`). A few are conditional —
   gas peakers add `runningHours`, solar adds `dcac` only when an oversizing
   ratio is known, pumped hydro adds `roundTrip`, and any group gains `storageDuration`
   when the facility has storage units (mixed-tech hybrids included).
3. **Build one shared context** (`ctx`). `FacilityMetrics.svelte` computes every scalar
   once from the visible-range data using the pure helpers in `metrics-calc.js`.
4. **Render.** Each id maps to a descriptor in `METRICS` whose `compute(ctx)` returns
   `{ value, unit?, subtitle? }` for a `MetricCard`; each descriptor also carries a
   `description` rendered as a hover tooltip on the card's label. Coal appends an
   Expected Closure cell. Per-unit fuel-tech, turbine and equipment detail lives in the
   units panel on `/facility/[code]` (which also renders coal's availability bars,
   computed from the same `intervalData` via `computeUnitAvailability`).

### Data sources

Everything is produced by the existing facility data layer, keyed on
`viewStart`/`viewEnd`, so the metrics inherently track the chart:

| Prop             | Produced by                                     | Feeds                                             |
| ---------------- | ----------------------------------------------- | ------------------------------------------------- |
| `summaryData`    | `FacilityFinancialDataProvider` `onsummarydata` | energy, capacity factor, revenue, avg price, peak |
| `emissionsData`  | `FacilityEmissionsDataProvider` `onsummarydata` | CO₂ volume + intensity                            |
| `intervalData`   | `FacilityChart` `onvisibledata`                 | running hours                                     |
| `sanityFacility` | server load (Sanity CMS)                        | DC:AC ratio, storage duration, expected closure   |

The metrics card is rendered above the chart, while the providers that feed it render
below (or headless, in the panel). DOM order doesn't matter — data flows through state,
so the card fills in once the providers' fetch settles (showing `--` until then).

## Metric sets by fuel group

Every group leads with **Total Energy** and **Capacity Factor**; the rest of the set is
technology-specific:

| Group       | Metrics                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| **coal**    | Total Energy, Capacity Factor, CO₂ Emissions, Emissions Intensity, Revenue, Avg Price _(+ Expected Closure if known)_      |
| **gas**     | Total Energy, Capacity Factor, CO₂ Emissions, Emissions Intensity, Revenue, Avg Price _(+ Running Hours if peaker)_        |
| **wind**    | Total Energy, Capacity Factor, Avg Price, Revenue, Peak Output                                                             |
| **solar**   | Total Energy, Capacity Factor, Peak Output, Avg Price, Revenue _(+ DC:AC if known, with DC/AC capacities as its subtitle)_ |
| **hydro**   | Total Energy, Capacity Factor, Running Hours, Avg Price, Revenue _(+ Round Trip if pumped)_                                |
| **battery** | Total Energy, Capacity Factor, Net Revenue, Storage Duration, Round-trip Efficiency                                        |
| **other**   | Total Energy, Capacity Factor, Revenue, Avg Price                                                                          |

Per-unit fuel-tech, turbine and equipment detail is shown in the units slide-out panel,
not here — only coal's Expected Closure appears as an extra cell. The unit slide-out
(`UnitDetail`) reuses the `capacityFactor` descriptor's label and tooltip for its own
per-unit Capacity Factor, computed over the unit charts' visible range from the same
financial-provider summary.

Any non-battery group additionally shows **Storage Duration** when the facility has
storage-carrying units (e.g. a solar + battery hybrid, or a pumped-hydro scheme).

**Why these?** Each group surfaces what's decision-relevant for that technology: fossil
plants are judged on emissions and how hard they run; renewables on how much they
generate and the price they capture; batteries on arbitrage economics. The groupings
originated in the `/studio/facility-detail` prototype (since removed) and were confirmed
in the implementation plan; the underlying formulas are standard energy-market definitions
(see Provenance).

## Metric definitions

All formulas live in `metrics-calc.js` (pure, unit-tested in `metrics-calc.test.js`).
Energy is MWh, power MW, market value $, emissions tCO₂e.

| Metric                        | Definition                                                                                                                                                                                                                                                                                                                          | Source                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Capacity Factor**           | `energy / (capacity × hours) × 100` — capacity is the per-unit sum of maximum falling back to registered (`$lib/utils/capacity.js`)                                                                                                                                                                                                 | summaryData                                   |
| **Total Energy**              | Σ energy across unit series (Σ\|energy\| throughput for storage facilities — batteries and pumped hydro, whose signed net is negative by physics)                                                                                                                                                                                   | summaryData                                   |
| **Revenue**                   | Σ market value across unit series                                                                                                                                                                                                                                                                                                   | summaryData                                   |
| **Avg Price Received**        | `market_value / energy` ($/MWh)                                                                                                                                                                                                                                                                                                     | summaryData                                   |
| **CO₂ Emissions**             | Σ reported emissions across unit series (tCO₂)                                                                                                                                                                                                                                                                                      | emissionsData                                 |
| **Emissions Intensity**       | `total_tCO₂ × 1000 / energy_MWh` (kgCO₂e/MWh)                                                                                                                                                                                                                                                                                       | emissionsData + summaryData                   |
| **Peak Output / Peak Energy** | the peak `summaryData` bucket (`peakBucket`). Power mode (sub-daily rows): "Peak Output" = peak MW (`÷ interval_hours`), shown `peak / capacity`. Energy mode (daily+ rows): "Peak Energy" = highest-energy bucket (MWh, raw). Both show the period as a subtitle and annotate the chart at that time on hover (`onpeakhighlight`). | summaryData                                   |
| **Running Hours**             | intervals where any series generated × interval length                                                                                                                                                                                                                                                                              | intervalData (sub-daily only)                 |
| **Net Revenue**               | Σ market value (discharge revenue − charge cost)                                                                                                                                                                                                                                                                                    | summaryData                                   |
| **Storage Duration**          | `storage_MWh / discharge_MW` (hours) summed over storage-carrying discharge units only — charging-side units (`battery_*_charging`, `pumps`) excluded; discharge MW uses the same maximum-falling-back-to-registered precedence                                                                                                     | OE capacity_storage (Sanity fallback)         |
| **Round-trip Efficiency**     | `discharge_energy / charge_energy × 100` (from the signed series; batteries and pumped hydro)                                                                                                                                                                                                                                       | summaryData                                   |
| **DC:AC Ratio**               | `DC_array / AC_connection`, only when 1.05–3.0                                                                                                                                                                                                                                                                                      | Sanity capacity_registered / capacity_maximum |

### Emissions: reported, not estimated

CO₂ comes from the OE API's reported `emissions` metric over the visible range, summed
to a volume and divided by energy for an **energy-weighted** intensity — more accurate
than `emissions_factor × energy`, and it needs no Sanity data. The emissions provider is
only mounted for facilities with emitting units, so renewables/storage fire no emissions
request.

## Sanity-sourced metrics

A few metrics (DC:AC ratio, storage duration, expected closure) read from the **Sanity
CMS** facility document's `units[]`, via the shared projection in
`$lib/server/sanity-projections.js` (`SANITY_FACILITY_UNITS_PROJECTION`), fetched
server-side on both pages. When Sanity has no data for a facility these simply don't
render — the OE-API-derived metrics are unaffected. Per-unit fuel-tech, turbine and
equipment detail is shown in the units slide-out panel, not here.

## Provenance

- **Formulas** — standard electricity-market definitions (capacity factor, emissions
  intensity, average price, round-trip efficiency, DC:AC oversizing ratio). Not invented
  here.
- **Metric sets** (which metrics per fuel group) — designed in the `/studio/facility-detail`
  prototype (since removed) and confirmed in the implementation plan.
- **Correctness oracle** — the prototype's `compute-metrics.test.js` (removed with the
  prototype); this directory's tests mirror its expected values so the fresh
  implementation is provably equivalent.
- **Specs data** — OpenElectricity Sanity CMS facility documents.

## Files

```
metrics/
├── FacilityMetrics.svelte    # router/renderer: builds ctx, renders metric cards
├── MetricCard.svelte         # label (with description tooltip) / value / unit / subtitle
├── metric-definitions.js     # METRICS descriptors + resolveMetricKeys (per-group sets)
├── metrics-calc.js           # pure maths incl. isSubDailyData (+ .test.js)
└── fuel-group.js             # dominant group, peaker / pumped-hydro (+ .test.js)
```
