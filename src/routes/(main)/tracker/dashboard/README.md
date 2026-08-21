# Dashboard tracker

The Dashboard tracker is an analysis-first concept available at
`/tracker/dashboard`. It is linked from the `/tracker` design-review index,
excluded from sitemaps and marked with `noindex` metadata. The Map tracker at
`/tracker/map` remains its architectural and visual reference.

## State architecture

- The page owns region, grouping, panel composition and edit state with local
  Svelte runes.
- `DashboardCanvas.svelte` owns one `createChartRangeControl`, its viewport,
  shared hover state, visible datasets and a record of dynamically mounted chart
  references. Adding or removing a panel therefore joins or leaves the existing
  synchronisation protocol without a dashboard or global store.
- Built-in layouts are temporary composition presets. Custom layouts remain in
  memory for the current page session; saved views are deferred until after the
  core dashboard experience is settled.
- URLs carry compact scope and range state. Panel composition is never
  serialised into the query string.
- Current flow and price labels on the map come from `createGridLive`; analytical
  charts use the selected dashboard range and interval.

## Legacy parity ledger

Source reference: `opennem/opennem-fe` (linked from the repository root README).

### Core dashboard iteration

- Discrete-time analysis
- NEM, WEM, AU and individual regions
- Preset and custom date ranges
- Interval ladder and Detailed/Simplified grouping
- Generation, demand, price, emissions, curtailment and interconnector flows
- Metrics and fuel-technology breakdown
- Shared hover, pan/zoom, live-edge advancement and fetch reconciliation
- Optional live map panel
- In-memory layout customisation, compact analysis links and CSV export

### Deferred parity

1. Time-of-day analysis and daily overlays
2. Records and two-date comparison
3. Temperature
4. Market value and volume-weighted price
5. Renewables/net overlays and contribution mode
6. Proportion, change and growth transformations
7. Rolling 12-month and calendar subfilters
8. Branded PNG export

### Redesigned rather than copied

- Dashboard add/remove replaces chart visibility menus.
- Responsive panel sizing replaces the fixed chart/table split.
- Automatic units replace manual SI-prefix controls.
- Data-grain-derived curves replace manual curve selection.
- Responsive axes replace the date-axis visibility switch.
