# Tracker

The canonical tracker page — the planned replacement for the legacy
`explore.openelectricity.org.au`. Lives at `/tracker`, promoted from
`/tracker/next`. The map/dashboard/explore concepts that informed it live on at
`/studio/tracker`, with their own copy of `tracker-regions.js` and a
`RegionDropdown.svelte` wrapper.

## Composition

### Region comparison

The scenarios-style view switch offers Timeline, Time of day and **Compare
regions** (`view=regions`). Comparison offers 21 Stratum line charts: carbon
intensity; renewable, solar + wind, solar, wind, gas and coal generation and
proportions; net imports proportion; solar, wind, hydro, gas and coal market
values; and nominal and inflation-adjusted volume-weighted prices. All start
visible. The existing bordered Facilities FilterDropdown stages chart selections until
Apply, updating charts and their table/export columns. Its standard grouped
checkboxes, Select all and Reset controls are reused. A shared gross-demand / source-generation
selector controls generation proportions; net imports always uses gross demand.
The shared Regions table controls regional visibility across charts and follows hover, pinned inspection or the latest common complete period.
NSW, QLD, SA, TAS, VIC and WA (WEM) start selected; NEM and All Regions (NEM + WEM)
are optional. Colours come from the shared region registry. Chart heights and
panel width persist separately from Timeline; the panel starts closed on mobile.
Y axes follow the visible time window during pan/zoom, using selected regions
and interpolated line segments at the edges. Offscreen peaks and missing-value
gaps do not distort the visible scale. Charts reuse Timeline's Stratum options
bar, static zoom buttons, shared pan/zoom engagement and active card border.
Smooth / Straight / Step styles apply to regional lines, with MWh / GWh / TWh
choices on generation charts. Regional lines do not offer stacking or proportions
of overlapping regions. User curve/unit choices survive viewport and height
changes. The Y-domain helper accounts for the chosen curve at viewport edges;
Step uses the rendered domain for both plotting and pointer inspection.
Keyboard inspection is available through a focus-only chart control.

Monthly source data comes through the existing network endpoint and headless
providers. All history starts at the earliest available completed comparison
period. Monthly 12-month rolling values are the default, with monthly, calendar
year and July–June financial year alternatives. Only complete periods are shown;
rolling gaps and incomplete annual components stay unavailable. Ratios are
calculated after summing components: emissions tonnes × 1,000 / energy MWh, or
renewable energy / gross demand or source generation × 100. Intensity and source
generation reuse Tracker's fuel-tech classifications. The renewable numerator
is the official `generation_renewable_energy` series, excluding storage discharge.
Demand shares can exceed 100%. Net imports subtract exported energy from imports
and can be negative. Non-interconnected whole networks have zero net imports.
Technology market values divide summed market value by matching fuel-tech energy;
volume-weighted prices divide total generation market value by intensity energy,
using the same battery exclusion as Tracker. Negative market values remain valid.

Inflation adjustment uses quarterly CPI from the
[public monthly aggregate](https://data.openelectricity.org.au/v4/stats/au/all/monthly.json),
fetched in the server load through the existing SWR cache. Each quarter-end label
maps to its three calendar months. Monthly market values are adjusted before
aggregation; unknown CPI quarters stay unavailable. The chart and exports label
the latest CPI reference month (June 2025 when implemented). A failed CPI fetch
only affects adjusted prices; it does not block the other metrics.

Provider timestamps use UTC as a synthetic **calendar-label axis**, joining each
network's January to January without shifting WEM into December. This is not an
instantaneous cross-network comparison. National values sum NEM + WEM inputs
before calculating ratios and require both networks. Regional failures can be
retried independently; stale or disabled providers cannot populate current values.

Comparison settings are independent of Timeline: `compare-interval`,
`compare-regions` (an empty value intentionally selects none), `compare-renewables`,
`compare-charts` (empty selects none), `compare-basis`, `compare-start` / `compare-end`, and `compare-table`. Defaults are
omitted. Explicit view switches reset all query settings to that view's defaults
(`view=average` or `view=regions`; Timeline has no view parameter). Back/Forward
and direct links restore the full historical selection. Legacy `profile-view`
links remain readable. Explicit filter changes push history; settled gestures
replace it. The top nav holds all three views' filters with uniform spacing and
a divider after the switcher. The outgoing controls slide left, then the incoming
controls slide right into place; reduced-motion users get an immediate change. CSV/XLSX export
the visible metrics for selected regions and visible periods, in base units with
the percentage denominator stated. PNG uses the existing Stratum capture flow.

### Timeline and profile composition

- **`+page.svelte`** — page chrome, navigation menus, notices and download actions.
- **`tracker-session.svelte.js`** — one per-page owner of selection state and
  the shared range controller. Explicit range/date/interval picks push history;
  settled pan/zoom replaces it. The canvas registers charts and providers here.
- **`tracker-navigation.js`** — the sole URL writer and restoration adapter,
  using `tracker-url.js` for parsing/serialisation. SvelteKit shallow history
  updates the address bar without updating `page.url`, so Back/Forward uses
  `popstate`; ordinary same-route links are observed through `page.url`.
- **`TrackerCanvas.svelte`** — three mounted timeline chart cards and the table
  layout, with shared hover/gesture state and series selection.
- **`TimeOfDay.svelte`** / **`time-of-day.js`** — a separate bounded profile view
  and pure network-local window, aggregation and CSV helpers. Timeline and profile
  canvases are mutually exclusive; explicit view changes reset selections and
  browser history restores them.
- **`AverageDayStack.svelte`** — all-technology average-day stacked area above
  the individual profiles, including while viewing daily overlays or spot price.
  **`profile-data.svelte.js`** shares the bounded source lifecycle: one power
  source serves both stack and individual power, with price enabled on demand.
- **`ProfileChart.svelte`** / **`profile-chart.js`** — adapt profile rows to the
  existing StratumChart, sharing its rendering, tooltips, options and gestures.
  Clock-only axes and bounded viewports keep the synthetic chart date invisible.
- **`DateComparison.svelte`** / **`comparison.js`** — compare two accepted
  generation display buckets using Stratum's categorical bars, a signed-value
  table and CSV. No separate fetch or data manager.
- **`tracker-providers.svelte.js`** — enables and coordinates the six optional
  headless providers through their existing shared request/cache lifecycle.
- **`tracker-data.svelte.js`** — accepts producer-tagged snapshots only for
  the current region, grouping, metric, intervals, bounds, calendar filter and
  exclusions. Reactive chart readiness releases held frames without polling.
- **`tracker-table.svelte.js`** — derives table sections from matching
  generation/provider data. The canvas retains one complete table and its
  descriptive metadata during refreshes; exports use the same accepted values.
- **`tracker-chart-overlays.js`** — pure rolling renewable-share calculation.
- **`resize-control.svelte.js`** (shared UI helper) — bounded pointer and keyboard
  resizing, teardown on unmount and optional persistence. Arrow keys resize,
  Shift increases the step, and Home/End select the bounds.
- **`tracker-overlays.js`** — the registry behind the generation chart's
  URL-owned overlays: canonical `overlay=` order, the demand/renewables line
  colours and the curtailment bands (ids, labels, colours, stacking order).
  The canvas, the table swatches and the URL codec all read it.
- **Split toggles** flip `metric`/`chartKind` props on the single mounted
  chart instance — no remount, so `isSwitchingData` veils the previous frame
  and the response LRU makes toggling back near-instant. For the `au` scope
  (no national spot price) `resolvePriceMode` forces market value and hides
  the Price toggle; the user's selection survives the region round trip.
- **Chart heights are drag- and keyboard-adjustable** (`ChartCard`'s shared resize control) and
  persist to localStorage per card; each split pair shares one key so
  toggling modes keeps the chosen height.
- **Generation units are selectable in the chart options**: power offers
  MW/GW and starts in MW; energy offers MWh/GWh/TWh. Energy automatically
  promotes its default from MWh to GWh when the largest visible positive
  stack reaches six digits in MWh, while an explicit unit choice remains
  pinned until the power/energy basis changes. The selected prefix drives the
  chart header, y-axis and floating tooltip values together. The current open
  energy bucket (hour/day/week/month and coarser calendar grains) is hatched
  until that interval is complete.
- **Grouping menu** mirrors the legacy explore tool: Detailed, Simplified,
  Coal/Gas/Renewables, Flexibility, Renewables/Fossils, VRE/Residual
  (`groups.js` registry). It lives in the Fuel technologies panel header's
  options (sliders) menu, next to contribution basis (% generation ⇄ % demand).
  Both sections use labelled radio groups with tinted, bold selected rows; the table
  headers echo current choices as muted sub-labels. The same menu stays in the
  collapsed table rail, allowing chart configuration without table-provider
  fetches. Time of day has a grouping-only menu in the top nav. Global page
  options now contain only page actions (exports, link, fullscreen and docs).
  `FuelTechOptions` uses the installed Bits UI menu primitives for keyboard
  navigation, typeahead, Escape/outside dismissal, focus restoration, portalling
  and viewport-bounded scrolling, composed with the same `OptionsMenuItem`,
  `OptionsMenuHeading` and `OptionsMenuDivider` components as the top-nav menu.
  Typography, spacing, icon gutters, row highlights and menu chrome follow that
  existing design rather than a separate panel-specific style.
  Its trigger matches the panel controls' 40px
  target with a smaller 16px muted-grey sliders icon. Choices still use the session's URL/history
  path; they affect linked charts, not just the table.
  Grouping is applied client-side in
  `processNetworkData` — the API always returns detailed per-fuel-tech
  series, so switching groups re-processes cached responses without a fetch.
- **Fuel-tech table** (`FuelTechPanel` + `FuelTechTable` in a `ResizablePanel`)
  — window energy (MWh/GWh/TWh), Av power (MW/GW), contribution (% of source
  generation ⇄ % of gross demand),
  volume-weighted price ($/MWh), window emissions (tCO₂e, always in
  plain tonnes) and emissions intensity (kgCO₂e/MWh, Σ tonnes ÷ Σ
  energy) per group, computed in `table-model.js` from: the generation chart's
  `onvisibledata` snapshot, the headless `createNetworkFuelTechSeries`
  providers for `market_value` and `emissions`, and the market pair's
  `demand_gross`. Loads report no emissions. Ratios are ratios of window sums (each side normalised to
  MWh via its own interval length), never means of per-bucket ratios. Row
  clicks toggle chart series; denominators ignore visibility so percentages
  stay stable. Stale rows stay visible under a veil while refetching. The
  panel also shows a curtailment section (official solar/wind curtailment, outside the
  grouping, shared against the same contribution denominator), and Demand /
  Renewables summary rows — official OE series (`demand`,
  `generation_renewable`, `renewable_proportion`), whose row toggles draw an
  OE-red demand line and a renewables-green share line (right-hand % axis
  that extends past 100% in 20-point steps for exporting regions) over the
  generation chart via `ChartStore.overlayLines`. These four overlay toggles
  are URL-owned so direct and copied links reproduce them. When enabled, each
  also appears in the generation chart's floating tooltip: demand follows the
  selected generation unit, and curtailment/renewables show amounts and shares.
  A divider separates curtailment from the Demand and Renewables rows.
  Below a 760px panel width (a CSS container query) the Technology
  column pins left and the value columns scroll horizontally with snap points. Av power follows the chart's
  MW/GW choice while the chart shows power and stays in MW otherwise; Energy
  sizes its own prefix from the table's largest value, stepping MWh → GWh →
  TWh only at five digits (`energyDisplayPrefix`).
- **Data export** (`tracker-export.js`) — the options (⋮) menu's "Download as
  CSV" rows (Generation, Market, Emissions, and the Fuel tech table while its
  panel is open) and a single "Download as XLSX" workbook (a Summary sheet —
  region, range, interval, timezone, grouping, modes, hidden groups, source
  URL — then one sheet per dataset). Download actions remain disabled until their own datasets are ready; a CSV
  can become available before the full workbook. Both serialisers share one
  `ExportDataset` shape built from the canvas's `getExportContext()`, which
  packages the settled chart snapshots (all three charts pass `onvisibledata`;
  snapshots are tagged at the producer with their complete query identity and
  only exported while current) and the table rows. Every series exports regardless
  of the chart hide toggles; the intensity line inherits the chart's excluded
  groups. Values are base units (MW/MWh, $, $/MWh, tCO2e, kgCO2e/MWh) with the
  unit in the header; the volume-weighted price and intensity lines are
  re-derived from their exported components. Drawing-only calendar-band
  closing points are omitted. Timestamps are
  network-local —
  offset-suffixed text in CSV, real date-time cells in XLSX. The workbook
  writer (`write-excel-file`, via `$lib/utils/download-xlsx.js`) is imported
on demand so it stays off the page bundle. Filenames:
`tracker-<region>-<dataset>-<range>.csv`/`tracker-<region>-<range>.xlsx`.

## Window metrics

The timeline has a resizable left metrics pane, reusing the shared `MetricCard`
presentation from `/facility/[code]`. Metrics use two columns: minimum on the left and maximum on the right, with
independent panel scrolling. The shared pane/resize controls support dragging, arrow keys, Home/End
and pointer cancellation; width is remembered locally when storage is available.
The divider sits in the page-background gap outside the white metrics content,
matching the fuel-tech table divider on the right.
Both panels use `PanelToggle`: mirrored open/collapse icons, explicit 16px icons
inside 40px buttons (the app uses a 10px rem base), matching 48px headers/rails,
muted grey icons with a lighter 1.5 stroke (also used by the sliders options icon)
that remain grey on hover, background hover/pressed treatments,
labelled controls and visible keyboard focus. Closing
returns focus to the opener; reopening focuses the collapse control. The metrics
header stays visible while scrolling its values. Resize dividers also show focus.

Desktop widths are bounded to leave space for the charts and fuel-tech table.
Below 1024px the pane starts closed and opens over the left edge without shrinking
the charts. The close button (or Escape on small screens) returns focus to the
opener. Pane visibility is local UI state, not part of the shared URL.

It shows minimum and maximum
net power/energy, the selected market measure (spot price, volume-weighted price
or market value), regional operational demand and renewables share (%). Emissions volume is also shown
when Volume is selected; emissions-intensity extrema are omitted.
Each metric has one label spanning both cells, with a tooltip explaining the measure.
Each cell has an app tooltip such as “Minimum spot price”, with no separate
Minimum/Maximum header row. The 20px down/up-to-line icons are vertically centred
in each cell, left of its value and timestamp, and use the primary colour when
selected. Metric labels use the default font, 14px semibold dark-grey text and a pale
background, with 16px icons for energy/power, price, demand, renewables and emissions.
Sections sit flush with light-grey bottom borders and matching borders beneath each label.
Label rows have equal vertical padding.
Value cells fit their content, with matching heights within each row; values,
units and timestamps wrap without clipping. Generation's plot defaults to 320px high; saved resized
heights still take precedence.
Hover, focus or select a metric to highlight its interval on the synced charts.

`window-metrics.js` calculates extrema from accepted, query-matching **display
buckets**, not native-cadence peaks or sums of overlapping rolling periods.
Only actual interval starts inside the selected bounds are considered; synthetic
calendar-band closing rows are excluded. Ties show the earliest occurrence.
Network-local timestamps use the same interval formatting policy as the charts.

Values stay absolute when charts use percentage/change-since transforms. Net
generation is the signed sum of selected technologies, including imports and
negative loads; it is not gross demand. Hidden technologies are excluded from
net generation, market value and emissions. Regional price stays regional;
demand also stays regional. Volume-weighted price reuses the chart's ratio-of-components
helper after display aggregation. Energy extrema are MWh per displayed bucket,
not instantaneous MW. Generation and demand units follow the chart's selected prefix.

All selected members of a summed bucket must be finite; missing members never
become zero. Partial input reports how many returned display intervals have
complete selected-series values, not guaranteed upstream/native-cadence coverage.
Zero and negative observations are valid. Loading, failed, empty or stale data
show placeholders rather than an old value under a new range label. The section
uses accepted chart snapshots and existing demand/renewables providers, enabled
while the metrics pane is open even if the table and overlays are closed. Renewables
uses the official regional share series, or the ratio of renewable generation to
gross demand window sums for rolling intervals, matching the chart line. Technology
visibility does not change this share. Both use shared display aggregation/calendar
filters, loading/error guards and the request broker, with individual retry controls.
Time-of-day remains a separate profile view. PNG export still captures charts,
not the metrics grid; existing CSV/XLSX exports are unchanged.

## Freshness and live follow

Relative timeline presets follow the latest data automatically. Custom dates and
settled pan/zoom gestures pause at the displayed bounds, selecting the date-picker
state in the navigation. Selecting a preset resumes following its latest window;
there is no separate Live control. Pausing serialises exact `start`/`end` bounds,
so copy/reload and Back/Forward preserve the choice without a second live-state
URL flag. Ambient ticks never write browser history.

While the tab is visible, the page clock ticks once a minute. An idle, connected
timeline advances all enabled charts/providers together; busy requests and active
gestures are not interrupted. All retains its historical floor while its right
edge grows. Two recent native buckets are made eligible for normal gap fetching
to revisit late observations and open-bucket revisions, without discarding old
rows or fetching full history again. Existing request deduplication, completed-
response caching, server caching and retry limits remain in force: a minute tick
does not promise a new upstream reading every minute.

Hidden tabs suspend the live timer and queued speculative prefetch work. Existing
in-flight requests may complete; returning to the tab performs one catch-up tick,
not a replay of missed ticks. Paused timelines and time-of-day analysis never
advance automatically. Timers/listeners are disposed on navigation.

Timeline card headers show exceptional states only: `Data delayed`,
`Update unavailable` or `No readings`. Routine latest-reading and updating labels
are hidden. Delayed readings show their latest finite native interval in
network-local time; synthetic closing points and missing/non-finite values do
not count. A following, unfiltered timeline is delayed after three native
intervals; historical and calendar-filtered selections do not show this warning.
The latest reading does not guarantee complete coverage of every technology.

## Branded PNG export

Options → Export PNG opens a frozen preview of the current view. Choose ready
charts, edit the title/description, then download that exact preview. Timeline
generation, market and emissions charts, an open two-date comparison, and
time-of-day plots are supported. The image includes the Open Electricity logo,
visible-series/overlay legends, units, date window, interval, grouping, calendar
filter, network time zone, attribution and generation timestamp. Displayed
transforms, negative stacks, chart size, profile zoom and hidden series are retained;
hover/focus indicators, controls, tables and resize handles are omitted.

`PngExport.svelte` owns the native modal and disposable preview lifecycle.
`png-export.js` captures all LayerCake SVG layers together, inlines their rendered
styles and composes them on a white canvas. It uses the existing brand asset and
browser APIs only: no new package, endpoint or data request. Standard images use
2× density; extreme layouts are bounded to 8,192 pixels per side and roughly
24 megapixels. Exported chart text uses Arial for self-contained rendering.
Capture waits up to one second for finite axis transitions, excluding loading
spinners, so fading-out ticks are not baked into the image.

Readiness comes from query-matching chart snapshots and the accepted-frame guard;
generation also waits for active overlay/percentage providers, not unrelated
table-only providers. Loading, failed, empty or held charts cannot be selected.
The snapshot is captured when the dialog opens, including its readiness state;
close and reopen to capture later data. Caption edits do not recapture live charts.
PNG options are temporary and are not added to shared URLs. Canvas/image errors
are explicit and retryable, with stale asynchronous previews and object URLs
disposed on changes or close. CSV/XLSX semantics remain unchanged.

## URL schema

Time-of-day selections: `view=average|daily` (default timeline),
`profile-days=14|28` (default 7), `profile-metric=price` (default power),
`profile-series=<group-id>` (default first available), and
`profile-end=YYYY-MM-DD` (inclusive last day; default yesterday in network time).
Copied links and Back/Forward retain these separately from the timeline range.
All-Australia has no spot-price series and normalises that metric to power.
Changing grouping validates the chosen series against the new group. A requested
technology absent from the response stays unavailable instead of showing another.

### Time-of-day semantics

Use the navigation **Analysis view** dropdown (the same `FilterSelect` component
as Region) to select **Time of day**, then **Average day** or **Daily overlay**. Choose a fuel
technology (using the top nav's fuel technology options) or regional spot price, a 7/14/28-day
window and an optional historical last day. Future dates clamp to yesterday;
days use fixed network offsets (NEM/Australia UTC+10, WEM UTC+08), not civil DST.
The overview stacks all returned fuel technologies in the selected grouping,
using the standard group colours/order and the main chart's cumulative stack:
negative power pulls the stack down rather than forming an independent negative
stack. Average power uses smooth curves. It is independent of the selected individual technology and
timeline visibility. Each technology uses the same daily averaging as its
individual profile. If any technology's half-hour average is missing, that whole
stacked half-hour is a gap rather than a partial total. The expandable overview
table retains each technology's available averages and day counts, even where
the stack cannot be drawn. It remains visible beside spot-price analysis, with
its own loading/error/retry state.
Half-hour slots average available 5-minute readings within each day, then average
those daily values with equal day weights. Nulls/non-finite readings remain gaps;
zero and negative values are retained. Partial coverage is explicit in the table
and CSV. Price is time-weighted, not volume-weighted. Power uses absolute MW and
negative charging/pumping; timeline visibility, contribution and transforms do
not apply. All profiles use the existing StratumChart. Power curves are smooth;
spot price remains stepped. The average is a dark line among daily overlays.
Legend buttons show/hide series; Ctrl/⌘-click solos/restores them. Hover and pinning,
keyboard inspection, bounded pan/zoom (one hour to 24 hours), unit/curve options
and resizing use the shared chart conventions. Legend and viewport changes are
local display state and do not alter aggregation, coverage tables or CSV.

The documented browser caller is `TimeOfDay.svelte` via `profile-data.svelte.js`, using the existing
`ChartDataManager` and `/api/network/data` (`metric=power|price`, `interval=5m`).
Each source requests only the selected complete days, with no speculative widening or
cross-grain prefetch; at most 28 days per source/selection. Power stays mounted
for the overview; price is fetched only when selected. Scope/window changes dispose
the prior consumer, and identity checks prevent stale displays/exports. Shared
response caching, deduplication and bounded retry/error handling remain in use.
View, technology, legend and chart-interaction changes do not refetch. Profile CSV contains
the average, every daily value, available-day counts and per-day native sample
counts in base units; timeline CSV/XLSX actions are disabled in this view.

### Timeline selections

The Generation card's **Compare dates** action opens a two-interval comparison.
A and B come from the current displayed generation buckets, with the same network
timezone and interval labels as the chart. The first opening selects the earliest
and latest available buckets; dropdowns allow exact selection and swapping.
Changing range, interval or filter never silently substitutes another date:
unavailable selections remain labelled and cannot export until both are present.
Synthetic calendar-band closing rows are excluded; rolling values remain rolling
interval values, not independent window sums. Open/partial buckets remain partial.

Values are absolute MW/MWh, regardless of timeline percentage/change transforms.
The comparison follows grouping and hidden technologies, and displays the main
generation chart's unit prefix. The comparison table matches the main table's
header/row typography, colour swatches, muted label qualifiers and Sources/Loads
sections using the same load-group classification. A, B and change values reuse
its power/energy formatters; percentage changes use its one-decimal formatter.
Category-axis labels use dark grey for contrast. Differences are signed B − A; relative change is
(B − A) / |A| × 100, so negative loads retain a meaningful signed direction. Missing
readings remain unavailable; a zero baseline has no percentage, while a fall to
zero from a non-zero baseline remains valid. CSV uses base MW/MWh and includes
region, network timezone, interval and both date labels. Bar hover and keyboard
focus on table technology buttons inspect values through the shared Stratum tooltip.

`compare=1`, `compare-a` and `compare-b` persist the open state and exact epoch-ms
bucket starts through copied URLs, reload and history. Dates do not trigger
off-screen fetches; change the timeline range to bring other dates into scope.
Only query-matching, ready generation snapshots are consumed. Loading, failed or
stale generation cannot display/export old comparison values. Market/table-provider
failures do not block an otherwise ready generation comparison.

`region` (`_all`, the NEM) · `range`/`start`+`end`/`interval` via the shared
`range-params.js` (default 3-day preset; the tracker opts into the
12-month rolling variants on the 1Y/All tiers via `includeRolling`) ·
`group` (simple) · `hidden` (comma-separated group IDs) · `contribution=generation`
(gross demand is the default) · `transform` / `market-transform` (`proportion` or
`changeSince`, absolute is the default) · `price=mv` · `emissions=volume` (intensity is the default) ·
`overlay` — a canonical comma-separated selection of `demand`, `renewables`,
`curtailment-solar`, and `curtailment-wind` · `table=0` · `fullscreen=false` ·
`filter` — a calendar-period id (`jan`…`dec`,
`summer`…, `q1`…`q4`, `h1`/`h2`) shown beside the interval control in the All
range. Charts connect matching occurrences across years. For non-rolling
intervals, table summaries retain the native row cadence but ignore values
outside the selected period.
Defaults are omitted.
At the rolling grain every summed surface shows trailing 12-month windows,
intensity and the price card derive ratios of 12-month sums (the price card
swaps its spot series for `price_vw`, volume-weighted), and the table computes
from native monthly rows so overlapping windows do not double-count.
Hidden fuel-tech IDs, contribution basis and generation/market-value transforms
are owned by the per-page session and restored from both copied links and browser
history. Hidden IDs are validated against the selected grouping, deduplicated
and written in group order. Changing grouping clears them; Back restores the
previous grouping and its hidden IDs together. Hidden IDs also restore the
emissions-intensity exclusions, not merely the generation chart's appearance.

Visibility, contribution and transform selections push one history entry.
Solo/restore actions update visibility and overlays atomically; individual overlay
toggles and viewport gestures retain replace behaviour. Chart-option events
publish user changes only, so restoring a URL
does not echo an update back into history. The market-value transform is retained
while the card shows Price, but applies only when Market value is displayed.
Malformed analytical values fall back to defaults; older links need no migration.

For example: `/tracker?region=nsw1&hidden=coal&contribution=generation&transform=proportion`.
Copied links reproduce selections, not immutable data: presets remain relative
to opening time, while custom/panned ranges preserve exact bounds. Hover,
pan/zoom engagement, chart type/curve/unit preferences, chart sizes and custom
layouts remain session/local preferences rather than URL state.

## Data notes

### Rooftop solar interpolation

The Timeline generation chart interpolates rooftop solar at the **5-minute
display interval only**. OE responses observed on 7 September 2026 repeat each
half-hour rooftop power value at six consecutive 5-minute timestamps. Plotting
those repeated values creates a staircase; they are not six independent readings.

`network/rooftop-interpolation.js` linearly interpolates the five intermediate
points between aligned half-hour anchors. A block is eligible only when all six
reported values are equal, contiguous and finite, and the next half-hour anchor
is finite and non-negative. Missing timestamps/nulls are not filled, genuine
5-minute variation is retained, and incomplete leading/trailing blocks are not
extrapolated. All-zero blocks stay zero. Interpolation uses the full cached
window before viewport slicing, so panning does not change the anchors. Newly
available anchors can replace a previously held trailing block on refresh.

This is a **display estimate**, not additional measured data. It changes the
generation plot, its hover values and derived chart transforms (including
contribution percentages). In combined groups, only the rooftop component is
interpolated; utility solar and other technologies are unchanged. It does not
alter the API response, native cache, published snapshots, table summaries,
window metrics, date comparisons, CSV/XLSX downloads or emissions calculations.
Those retain reported values and may therefore differ from an interpolated
chart hover. The 30-minute/coarser views and time-of-day analysis are unchanged.

The fuel-tech table marks rooftop-containing rows with an asterisk and explains
the distinction in a visible footnote. Generation PNG exports carry an
interpolation caption, because the image captures the displayed chart.

### Requests and processing

- Everything fetches through `/api/network/data`; the providers share the
  charts' request broker, LRU and gap-aware fetching. The six headless
  providers are thin specialisations of one core
  (`$lib/components/charts/network/headless-series-provider.svelte.js`),
  which owns the manager lifecycle, viewport replay and display-grain rows.
- Individual NEM region generation responses merge the official import/export
  flow metrics into the fuel-tech series. Imports render as a positive source;
  exports render below zero as a load. They therefore appear consistently in
  the generation stack, grouping menu, table and floating tooltip. Whole NEM,
  All Regions and WA do not add regional flows.
- Providers request the same buffered windows as the charts
  (`fetch-window.js`), so overlapping URLs collapse in the broker — in
  market-value mode the table's provider and the price chart share one
  fetch. Each provider is `enabled`-gated on the surface that consumes it:
  with the table panel closed and the overlays off, only the three chart
  metrics fetch at all.
- Background idle prefetch (`idle-prefetch.js` via the chart host): every
  chart warms nearby data in its active grain after settling: up to 3× the
  viewport each side, capped at seven days per side and the API range limit.
  Daily/monthly history is fetched only when selected, avoiding speculative
  decades-wide scans. Previously visited grains still revive cached managers.
  Prefetch traffic runs at fetch priority 'low' during idle slices and is not
  retried automatically. The full
  trigger, job ordering, de-duplication, edge/D1 lifecycle and production test
  procedure live in `src/routes/api/admin/network-cache/README.md`.
- Active chart requests retry HTTP 408/500/502/503/504 once after 750 ms, through
  the existing shared request broker. Cancelling the last consumer also cancels
  the backoff; a remaining consumer keeps the shared retry alive. Other errors
  (including 429) surface immediately. Final errors retain a bounded server
  message in the chart and console; HTML/error-detail objects are not rendered.
  Failed windows remain retryable via the chart's Retry button, never empty data.
- The route carries a keyed edge SWR cache (`keyed-swr-cache.js`, Cloudflare
  Cache API): any cached window serves instantly and refreshes in the
  background — live windows on a 5-minute horizon, fully-historical ones
  6-hourly — so the slow upstream fuel-tech scans (a cold full-history
  request takes tens of seconds) are paid once per colo, not per visitor.
  `x-oe-cache: hit|stale|miss` reports the tier; dev is uncached.
- An explicit range/interval pick is pinned: pans and zooms keep it until the
  span leaves the tier that offers it (`pinnedInterval` in the range
  control), so the first pan after "All" no longer flips 1M→1y and refires
  every surface.
- Timeline uses one right-aligned 28px app-logo loading indicator in the top
  navigation. The date label and logo slide right to hide and left to show
  within the same desktop slot; the logo also
  stays visible beside the scrollable controls at smaller widths. Chart bodies
  and the table share a fading white overlay with a soft sweeping highlight.
  Headers and metrics remain clear, and range/grouping controls remain usable.
  All loading visuals clear after the selected chart snapshots and enabled
  table/overlay feeds settle. Reduced-motion preferences disable the slide,
  pulse and sweep. Individual chart indicators are suppressed. Background chart
  cache warming and active pan/zoom gestures do not trigger these visuals.
  Failed and empty feeds settle into their existing messages.
- During pan/zoom gestures the charts freeze their y-domains and render
  padded whole-bucket slices with stable identity (`display-aggregation.js`),
  so per-frame work is path regeneration only; the table, overlays, URL and
  label track the settled window and update once per gesture. Debug flags:
  `localStorage['oe:debug-chart-fetch']` (request counts) and
  `localStorage['oe:debug-chart-fps']` (per-gesture frame stats).
- HTTP failures remain retryable unknown ranges, not cached empty ranges.
  Charts and the table offer Retry; a successful empty response settles with
  an explicit empty state. Workbooks identify empty chart datasets in Summary.
- Chart-store identity follows metric family. Height, title and timezone update
  the existing store so resizing preserves explicit display-unit choices.
- Demand-mode contribution shares needn't sum to 100% (losses, imports,
  basis differences) — this matches the homepage renewables methodology.

## Percentage semantics

Gross demand is the default contribution basis and appears first in the menu,
followed by generation. Explicit links for either basis remain supported.

The generation tooltip adds a `%` column beside absolute power or energy values.
It uses the selected contribution basis for the hovered interval; excluded
technologies and unavailable denominators show a dash. Other chart tooltips keep
their existing columns, and Proportion view uses its single percentage column.
Curtailment rows also pair their power/energy values with the selected contribution
basis. The Renewables row pairs the official renewable-generation amount with
the overlay's independent gross-demand percentage. Each value joins at the exact
hovered timestamp; a missing amount or percentage leaves only that cell unavailable.
The renewables amount feed loads whenever its absolute tooltip is enabled, even
with the table closed.

The generation chart's **Proportion** view uses the same basis selected in
**Fuel technology options → Contribution** as the table, including from the
collapsed table rail when the table is closed.
Generation shares use all source generation, excluding loads and imports;
gross-demand shares include imports but exclude loads. Hiding a technology
changes visibility, not the denominator. Excluded technologies are omitted from
the percentage plot and tooltip; their absolute values remain available.

Chart percentages describe each displayed interval, calculated after aggregation
or rolling sums. Table contributions summarise the selected window, using native
rows where rolling or filtered display rows would double-count. They therefore
need not equal the percentage at any one chart timestamp.

Demand and curtailment overlays use the active denominator in percentage view.
The renewables overlay retains its independent share-of-gross-demand definition
and right-hand scale. Shares above 100% are not clipped. Missing, zero or invalid
denominators produce gaps and unavailable values; gross-demand loading/failure
is explicit and retryable. Percentages never fall back to visible-selection
normalisation. Absolute/change-since views and raw CSV/XLSX exports are unchanged.

The shared chart layer supports an opt-in `ProportionContext` (label, excluded
series and display-row transform); other chart consumers retain their default
percentage behaviour. The Tracker persists its percentage basis and transforms
through the URL schema above.

## Tests

Colocated vitest suites: `tracker-url.test.js`, `tracker-model.test.js`,
`tracker-overlays.test.js`, `table-model.test.js`, `table-format.test.js`,
`tracker-prefetch.test.js`, `tracker-export.test.js`,
`page-load.test.js`, `tracker-session.test.js`, `tracker-data.test.js`.
Live-data E2E smoke: `tests/e2e/tracker.spec.js`. Deterministic response-order,
failure/retry, empty-data, history, resize, export-content and responsive checks:
`tests/e2e/tracker-refactor.spec.js`.

## Deferred

Nav-items entry (currently behind the `tracker_nav` flag); saved views.
