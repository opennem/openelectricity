# Facility Detail — Fuel-Tech Metrics

The facility detail page renders a metrics panel tailored to each facility's primary fuel technology group. The routing component `FacilityMetrics` detects the group via `getPrimaryFuelTechGroup()` and delegates to the appropriate panel.

## Architecture

```
FacilityMetrics (router)
├── SharedContextBar           — region, commissioned year, MLF, total capacity
├── WindMetrics                — wind-specific panel
├── SolarMetrics               — solar-specific panel
├── BatteryMetrics             — battery-specific panel
├── CoalMetrics                — coal-specific panel
├── GasMetrics                 — gas-specific panel
├── HydroMetrics               — hydro-specific panel
└── (generic fallback)         — universal metrics for unrecognised groups
```

### Shared Components

| Component | Purpose |
|---|---|
| `MetricCard` | Reusable card with label, value, optional unit/subtitle, and size variants (`sm`, `md`, `lg`) |
| `SharedContextBar` | Horizontal bar shown above all panels: network region badge, commissioned year (Sanity `commencement_date` preferred, OE API `data_first_seen` fallback), capacity-weighted average MLF with colour indicator (green >0.95, amber 0.90–0.95, red <0.90), and total registered capacity |
| `DailyProfileChart` | Lightweight SVG area chart showing a 24-hour generation profile with peak annotation. Requires sub-daily interval data |

### Data Flow

Each metrics panel receives four data props from `FacilityMetrics`:

| Prop | Source | Contents |
|---|---|---|
| `facility` | OE API | Facility object with units array (fueltech_id, capacity_registered, dispatch_type, etc.) |
| `sanityFacility` | Sanity CMS | Enriched facility data: commencement dates, MLF, emissions factors, storage capacity, unit types (brand/model/size), closure dates, etc. |
| `summaryData` | `FacilityPriceChart` callback | Visible-range data: `energyData` rows, `mvData` rows, series names for each, and the MV chart store. Used for all computed metrics |
| `intervalData` | `FacilityChart` visible data callback | Raw interval rows with series names and labels. Used for daily profiles and unit availability |

### Utility Functions (`_utils/`)

| Module | Functions | Purpose |
|---|---|---|
| `compute-metrics.js` | `sumSeries`, `getHoursInRange`, `capacityFactor`, `avgPriceReceived`, `peakOutput`, `totalEmissions`, `runningHours`, `startCount`, `batteryMetrics`, `dcAcRatio` | Pure metric computation — no side effects, no API calls |
| `daily-profile.js` | `computeDailyProfile`, `isSubDailyData` | Aggregates sub-daily interval data into 24 hourly buckets by local time |
| `fuel-tech-group.js` | `getPrimaryFuelTechGroup`, `isGasPeaker`, `isPumpedHydro` | Classifies facilities by dominant capacity into fuel tech groups |
| `unit-availability.js` | `computeUnitAvailability` | Calculates per-unit availability percentage from interval data |

---

## Wind (`WindMetrics`)

**Metrics:**

| Metric | Computation | Unit |
|---|---|---|
| Capacity Factor | `totalEnergy / (totalCapacity × hours) × 100` | % |
| Total Energy | Sum of all energy series across visible range | MWh |
| Avg Price Received | `totalMarketValue / totalEnergy` | $/MWh |
| Revenue | Total market value, formatted as $Xk or $X.Xm | $ |
| Peak Output | Max per-interval power across all units (energy ÷ interval hours) | MW |

**Sanity CMS enrichments:**
- **Turbine Specs** — grouped by brand + model with count, size (MW), and hub height (m). Extracted from `unit_types` on each Sanity unit.

**Daily Profile:** Shown when sub-daily interval data is available. Colour: `fuelTechColourMap.wind`.

---

## Solar (`SolarMetrics`)

**Metrics:**

| Metric | Computation | Unit |
|---|---|---|
| Capacity Factor | `totalEnergy / (totalCapacity × hours) × 100` | % |
| Peak Output | Max per-interval power across all units (energy ÷ interval hours) | MW |
| Avg Price Received | `totalMarketValue / totalEnergy` | $/MWh |
| Revenue | Total market value | $ |
| DC:AC Ratio | `totalDC / totalAC` from Sanity capacity data | ratio |

**Sanity CMS enrichments:**
- **DC:AC Ratio** — `capacity_registered` (DC array) ÷ `capacity_maximum` (AC connection) aggregated across all Sanity units. Only shown when ratio is between 1.05 and 3.0.
- **Capacity subtitle** — Shows DC array MW and AC connection MW below the ratio card.

**Daily Profile:** Shown when sub-daily interval data is available. Colour: `fuelTechColourMap.solar`.

---

## Battery (`BatteryMetrics`)

Battery facilities have both generator (discharge) and load (charge) units. In the facility detail view, `battery_charging` and `battery_discharging` units are stripped at the source — the remaining `battery` units with `dispatch_type: 'GENERATOR'` are treated as bidirectional (positive = discharge, negative = charge).

**Metrics:**

| Metric | Computation | Unit |
|---|---|---|
| Net Revenue | Sum of all market value series (includes both charge and discharge) | $ |
| Storage Duration | `storageCapacity / totalCapacity` from Sanity | hours |
| Round-trip Efficiency | Placeholder — "Requires interval data" | — |
| Total Energy | Sum of absolute values of each energy series | MWh |
| Capacity Factor | `totalEnergy / (totalCapacity × hours) × 100` | % |

**Sanity CMS enrichments:**
- **Storage Capacity** — `storage_capacity` field from Sanity units, used to compute storage duration.
- **Equipment** — Unique brand + model pairs from `unit_types`.

**Note:** The "Net Revenue" subtitle clarifies this is energy arbitrage only — FCAS revenue is not included.

---

## Coal (`CoalMetrics`)

**Metrics:**

| Metric | Computation | Unit |
|---|---|---|
| Capacity Factor | `totalEnergy / (totalCapacity × hours) × 100` | % |
| CO2 Emissions | Sum of `energy × emissionsFactor` per unit | tCO2 |
| Emissions Intensity | Capacity-weighted average emissions factor × 1000 | kgCO2/MWh |
| Revenue | Total market value | $ |
| Avg Price Received | `totalMarketValue / totalEnergy` | $/MWh |

**Sanity CMS enrichments:**
- **Emissions Factors** — Per-unit `emissions_factor_co2` (tCO2/MWh) from Sanity units. Shows "--" if no factors are available.
- **Coal Type Badge** — "Black Coal" or "Brown Coal" based on capacity-weighted dominant `fueltech_id` (`coal_black` vs `coal_brown`), with matching colour.
- **Expected Closure Date** — Earliest `expected_closure_date` from Sanity units, formatted based on specificity (year, month, or day).
- **Minimum Stable Generation** — `min_generation_capacity` from Sanity units (MW).
- **Unit Availability** — Per-unit bar chart showing percentage of intervals where each unit was generating (power > 0). Computed from sub-daily interval data via `computeUnitAvailability()`.

---

## Gas (`GasMetrics`)

**Metrics:**

| Metric | Computation | Unit |
|---|---|---|
| Capacity Factor | `totalEnergy / (totalCapacity × hours) × 100` | % |
| Running Hours | Placeholder — "Requires power data" | — |
| Start Count | Placeholder — "Requires power data" | — |
| Avg Price Received | `totalMarketValue / totalEnergy` | $/MWh |
| Revenue | Total market value | $ |

**Sanity CMS enrichments:**
- **Gas Subtype Badge** — Dominant subtype by capacity: CCGT, OCGT, Gas Steam, Reciprocating, Waste Coal Mine Gas, or Distillate. Colour matches the specific `fuelTechColourMap` entry.
- **Peaker Indicator** — "Peaker plant" label shown when >50% of capacity is OCGT, reciprocating, or distillate (via `isGasPeaker()`).

**Daily Profile:** Shown when sub-daily interval data is available. Colour: `fuelTechColourMap.gas`.

**Note:** Running Hours and Start Count placeholders require power data (not energy) — the `runningHours()` and `startCount()` utility functions exist but are not yet wired to the summary data pipeline.

---

## Hydro (`HydroMetrics`)

**Metrics:**

| Metric | Computation | Unit |
|---|---|---|
| Capacity Factor | `totalEnergy / (totalCapacity × hours) × 100` | % |
| Total Energy | Sum of all energy series across visible range | MWh |
| Running Hours | Placeholder — "Requires power data" | — |
| Avg Price Received | `totalMarketValue / totalEnergy` | $/MWh |
| Revenue | Total market value | $ |

**Additional indicators:**
- **Pumped Hydro Badge** — Shown when the facility has both `hydro` and `pumps` fueltech units (via `isPumpedHydro()`). Includes a note that net revenue and efficiency metrics are available with interval power data.

**Daily Profile:** Shown when sub-daily interval data is available. Colour: `fuelTechColourMap.hydro`.

---

## Generic Fallback

When `getPrimaryFuelTechGroup()` returns `'other'`, FacilityMetrics renders a universal panel with four metrics:

| Metric | Computation | Unit |
|---|---|---|
| Capacity Factor | `totalEnergy / (totalCapacity × hours) × 100` | % |
| Total Energy | Sum of all energy series | MWh |
| Revenue | Total market value | $ |
| Avg Price Received | `totalMarketValue / totalEnergy` | $/MWh |

---

## Fuel Tech Group Detection

`getPrimaryFuelTechGroup(units)` classifies facilities by summing registered capacity per group and returning the dominant one:

| Group | Fuel Tech Codes |
|---|---|
| wind | `wind`, `wind_offshore` |
| solar | `solar_*` |
| battery | `battery`, `battery_charging`, `battery_discharging` |
| coal | `coal_*` |
| gas | `gas_*`, `distillate` |
| hydro | `hydro`, `pumps` |
| other | Everything else |
