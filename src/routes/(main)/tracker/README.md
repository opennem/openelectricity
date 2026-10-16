# Tracker

The canonical tracker page — the planned replacement for the legacy
`explore.openelectricity.org.au`. Each analysis view is its own route —
`/tracker/timeline`, `/tracker/profile` and `/tracker/compare` — and `/tracker`
redirects to Timeline (moving retired `?view=` links onto their route with the
rest of the query intact). Promoted from `/tracker/next`. The map/dashboard/explore concepts that informed it live on at
`/studio/tracker`, with their own copy of `tracker-regions.js` and a
`RegionDropdown.svelte` wrapper.

## Composition

### Region comparison

The scenarios-style view switch offers Timeline, Profile and **Compare**
(`/tracker/compare`). Comparison offers 15 selectable Stratum charts covering
24 metrics: carbon
intensity; emissions volume (tCO₂e, shown in kt, the Regions table cycling
kt / Mt / t; on the heatmap it scales to the visible maximum, as generation
does); net imports, renewable, solar + wind, solar, wind, gas and coal
proportions; renewable, solar + wind, solar, wind, gas and coal generation;
solar, wind, hydro, gas and coal market values; and nominal and
inflation-adjusted volume-weighted prices. Only carbon intensity and renewables
proportion start visible. Charts are chosen in the top nav
(`ComparisonChartToggles`): one multi-select `FilterDropdown` per group
(Emissions, Proportion, Generation, Prices) in its `immediate` mode, so each
tick shows or hides its chart at once and the panel's button reads Done;
⌘/Ctrl-click keeps a chart alone within its group (`selectComparisonCharts`).
A fuel's proportion and its generation are separate charts. Each chart is one
option whatever its presentation (`comparisonChartId`); the price card's
Inflation adjusted toggle switches its presentation, and a chart switched off
and on again returns in the one it had for the visit. The table and exports
follow the selected presentation, which is preserved in the URL. A shared gross-demand / source-generation
selector controls generation proportions; net imports always uses gross demand.
The shared Regions table controls regional visibility across charts and follows hover, pinned inspection or the latest common complete period (`latestCommonComparisonPeriod`: the latest period where every selected region's current metrics all have a value). Regions without data in view (loading or failed) are left out, and so is a region's metric with no value in the view's latest year (two periods at coarser grains) — a fuel it never had or that ended long ago reads "—" rather than pinning the table to its last month; a feed lagging within that year (real prices awaiting CPI) still holds the table back.
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
period. The interval controls are Timeline's All-range ones (`IntervalControls`):
a Month, Season, Quarter, Half-Year, Fin-Year or Year pill whose footer
switches the 12-month rolling sum on for the grains that have it (month,
season, quarter, half; ids `12mr`, `12mr-season`, `12mr-quarter`, `12mr-half`),
beside a calendar-period pill (All, a month, season, quarter or half) that
follows the grain. 12-month rolling months are the default. Seasons are
meteorological (summer is December to February) and financial years run July
to June. Buckets and rolling windows are Timeline's own
(`completeBucketRows`, `displayFullTransform`), run on the UTC calendar-label
axis (`offsetHoursFromIana('UTC')` is 0), and periods and the range readout
use Timeline's label policy (`getTimeFormatPolicy`, `formatRangeLabel`): a
rolling grain is named by its last period ("12 months to Summer 2024/25").
Geometry steps by `periodMonths(interval, filter)`. A calendar-period filter (`compare-filter`) keeps
that period each year, so rows, cells and ticks step a year apart. Only
complete periods are shown; rolling gaps and incomplete buckets stay
unavailable. **Nulls in source series** (`normaliseComparisonResponse`, applied once
as each response is processed): the API pads
a fueltech's series with nulls before it starts and after it retires, which
count as absent. Inside its life, a fueltech that also reports explicit zeros
(idle plant such as distillate and OCGT peakers) has its nulls counted as
zero. For any other fueltech a null is a missing reading, which blanks that
month and every rolling window containing it. A live audit (October 2026,
every metric and region, Month and 12-month rolling) left exactly two such
source gaps: SA wind, May 2008 – June 2009, and WA battery charging, November 2023. Ratios are
calculated after summing components: emissions tonnes × 1,000 / energy MWh, or
renewable energy / gross demand or source generation × 100. Intensity and source
generation reuse Tracker's fuel-tech classifications. The renewable numerator
is the official `generation_renewable_energy` series, which is not a plain
renewable fueltech sum (checked against the live API for August 2026): it adds
battery discharge (VIC matches renewables + battery discharge exactly), keeps
Shoalhaven and Wivenhoe pumped-hydro output as hydro, apparently adds their
pump consumption too, and leaves out Tumut 3's generation and its SNOWYP pump
load, which `generation_renewable_with_storage_energy` adds back. The
renewables footnote links OE's renewables guide while a Renewables chart is on
screen.
Demand shares can exceed 100%. Net imports subtract exported energy from imports
and can be negative. Non-interconnected whole networks have zero net imports.
Technology market values divide summed market value by matching fuel-tech energy;
volume-weighted prices divide total generation market value by intensity energy,
using the same battery exclusion as Tracker. Negative market values remain valid.

Electricity data comes from the OE API via `/api/network/data` and its shared
server cache. Energy, emissions and market value use `/v4/data/network`;
renewables, demand and flows use `/v4/market/network`. Ratios and national totals
are calculated locally from those inputs. ABS All Groups CPI is the explicit
exception for inflation adjustment; no legacy OE static feed is used.

The single volume-weighted price entry has an Inflation adjusted toggle, enabled
for newly selected charts. Existing nominal links preserve their choice; the
selected presentation persists in the URL, table, CSV, workbook and PNG exports.
Prices are expressed in the latest available quarter's dollars, labelled on the
chart. Each month uses its quarter's index. Monthly dollar totals are adjusted
before rolling/yearly aggregation; unpublished CPI quarters remain gaps.

GitHub Actions refreshes the full validated ABS quarterly series into Cloudflare
KV. The server loader reads the binding (one-hour KV read cache) and falls back
to a bundled ABS snapshot on missing/invalid KV data. Page loads never fetch ABS.
See [CPI setup and methodology](../../../../docs/cpi.md) for sources, refreshes,
credentials, bindings and failure handling.

Provider timestamps use UTC as a synthetic **calendar-label axis**, joining each
network's January to January without shifting WEM into December. This is not an
instantaneous cross-network comparison. National values sum NEM + WEM inputs
before calculating ratios and require both networks. Regional failures can be
retried independently; stale or disabled providers cannot populate current values.

**Displays.** An icon-only display switch in a bar under the top nav (as
Profile's breakdown options sit; the same compact `SwitchWithIcons` as the view
switcher, each icon naming itself in a tooltip and to assistive technology, as
Profile's Style switcher) re-renders every selected metric card one way: **Trends** (a line per
region), **Panels**, **Ranks** and **Heatmap**. The displays are a registry,
`COMPARISON_DISPLAYS` in `region-comparison.js`: each descriptor carries its
URL slug (`compare-display=panels|ranks|heatmap`, omitted for Trends; older
`stripes` links still parse) and the flags the page reads instead of naming
displays (`resizable` cards keep a drag-to-resize height; `panZoom` cards take
Trends' tap-to-engage pan and zoom). Switching display never refetches: every
display draws from the same per-card rows (`comparisonChartRows`), and pure
reshaping lives in `comparison-displays.js`.

- **Panels** (`RegionPanels`, one `RegionPanel` per region) are small multiples:
  a 120px Stratum line chart per selected region on the shared viewport and one
  y-scale (`comparisonYDomain` over every region), so heights compare across
  panels, with the other selected regions drawn first as grey ghost lines and
  this region's line on top, a touch heavier (`chartStyles.seriesStrokeWidths`,
  per-series line widths in the shared v2 chart). Each panel's label row is SVG (region and the
  inspected or latest value), so PNG export composes the whole grid as one
  image. Hovering a panel inspects its period in every panel and names its
  region to the table; zoom is by the buttons, with no drag-pan.
- **Ranks** reuse the Trends chart with `shape="rank"`: each period's values
  become ranks among the regions with a value (`rankComparisonRows`,
  competition ranking, so ties share a rank and the next skips), on a reversed
  y-domain (`[n + 0.5, 0.5]`, which LayerCake applies as given) so 1 sits at the
  top, read as `#1` on the axis and in tooltips. Only ratios are ranked
  (`isRankableComparisonMetric`): generation and emissions volumes mostly
  measure a region's size, so their cards stay as Trends lines, badged "Not
  rankable"; ranked cards are badged "1 = highest". Only the states and WEM
  are ranked (`rankedComparisonRegions`). NEM and All Regions contain them,
  so they are dashed reference lines (v2 overlay lines with `dasharray`)
  placed among the ranks by `benchmarkRankRows`: on the rank they tie, or
  halfway between the ranks either side, read as `#4–5`, `above #1` or
  `below #6`. Labels come from that period's competition ranks among the
  regions reporting then, not the selection's size: one of three reporting
  gives `below #1`, and 10, 10, 5 with a reference at 7 gives `#1–3`. The
  tooltip reads each period's label from the overlay row (v2 overlay
  formatters receive the row). Hovering a reference names its row in
  the table. With only NEM or All Regions selected, a ranked card asks for a
  state or WEM. While Ranks shows, the Regions table's rows follow a card's
  ranking at the table's period (`rankedRegionOrder`): the hovered card's
  when it ranks, else the first ranked card. NEM and All Regions sit where
  their line does; then selected regions without a value, then unselected
  ones. Rows glide between orders (`animate:flip`, instant with reduced
  motion), and keep the list order when nothing ranks that period.

`RegionTooltip` is the floating tooltip of the custom displays (heatmap and
panels), styled as Stratum's.

**Heatmap display.** The Heatmap re-renders every selected metric card as a
heatmap of stripes: one row per selected region,
one colour cell per period, over the same viewport, ticks, hover and pinned
period as the line charts, so the Regions table doubles as the readout. Colour
scales are fixed and absolute so a shade means the same in every region and
year: carbon intensity uses the house intensity ramp at 0 / 100 / 300 / 550 /
1,000 kgCO₂e/MWh; renewable, solar + wind, solar and wind proportions run
white → fuel colour → darker over 0–100 %; gas and coal proportions start at
renewables green so a fossil-free period is unmistakable; net imports diverge
export-blue → white → import-red over −25 / 0 / +25 %; prices use the eight
legacy stops from −$1k to $15k/MWh; generation alone scales to the visible
maximum. Missing readings are `warm-grey`, never zero. Each card's header
carries its legend. The cells are painted to a canvas per card (one `fillRect` per visible cell,
edges rounded to whole pixels so neighbours share an edge), repainted once
per frame from an effect; labels, axis, month cells, the highlight and the
pointer overlay are SVG above it, so the DOM holds a few dozen nodes per card
however many periods are visible; mouse drag and horizontal wheel pan, touch keeps scrolling
the page, and the same sr-only Inspect button drives keyboard inspection
(`comparison-inspection.js` is shared with the line chart). Labels and swatches
are SVG so PNG export keeps them; `png-export.js` captures any
`svg[data-png-layer]` or `canvas[data-png-layer]` (embedded as a raster
image) inside a `[data-chart-area]` root as well as LayerCake layers. `comparison-stripes.js` holds the scales and geometry.

**Windows and ticks.** Every interval opens on all history, where its
metrics first have data; zooming out returns to it, and a window is never
narrower than a year of periods (`clampComparisonViewport`). The top nav's range readout
(`RangeStatus`, as in Timeline and Profile) names the first and last period
on screen with a displayed value, so an unfinished year is never named
(`comparisonRangeLabel`: `Jan 1999 — Aug 2026`, `1999 — 2025`,
`FY2000 — FY2026`, `Autumn 2024 — Spring 2025`), and swaps to the hovered
or pinned period while one is inspected. Since the readout names it, no
Tracker tooltip repeats the hovered time (Timeline's `NetworkChart`s take
`showTooltipDate={false}`; Profile's and Compare's own readouts drop it), so
the tooltips show values alone. The Regions table shows the period
it reads under its Region heading: the hovered or pinned period, else that
latest common complete period. A pin clears by clicking the period again or pressing Escape; it survives panning, zooming and other selection changes, and clears only when the periods themselves change (a new interval or calendar filter, `changesComparisonPeriods`). Axis ticks are anchored to the calendar
(`comparisonTicks`): monthly rows at the finest month step from January (1,
2, 3, 6, 12… months) that keeps at most six ticks, coarser rows at each year's
first row a year step (1, 2, 5…) apart, so a tick keeps its date as the
window slides and leaves the axis only when it leaves the viewport.

Compare has no Daily interval (removed October 2026); an older
`compare-interval=1d` link falls back to the default.

**Pan performance.** Every interval is aggregated from each region's warm
monthly provider set (`region-comparison-data.svelte.js`), pinned once to the
full history. The data module derives only the interval, filter and regions
from the selection, so a pan (which replaces the selection object each frame)
never rebuilds the joined dataset. For the
same reason `RegionComparison` derives its `metrics` and `regions` arrays from
join-keys of the selection (stable identity while the contents are) and
passes `basis` and `interval` through its own string deriveds rather than as
`selection.basis` (a prop expression tracks the object it reads, so children
would re-derive on every move even though the string is unchanged); the
stripes colour scale is memoised on metric, basis and visible maximum, and
the UTC date formatters are cached. Pointer and wheel deltas are
accumulated and applied once per animation frame.

Comparison settings are independent of Timeline: `compare-display`
(`panels`, `ranks`, `heatmap`), `compare-interval` (Timeline's ids: `1M`, `season`,
`quarter`, `half`, `fy`, `1y` and the `12mr*` rolling variants; `12mr` is the
default), `compare-filter` (Timeline's calendar-period ids: `jan`…`dec`,
`summer`…, `q1`…, `h1`/`h2`, validated against the grain), `compare-regions` (short names `nsw,qld,sa,tas,vic,wem,nem,au`;
an empty value intentionally selects none),
`compare-charts` (hyphenated names such as `intensity,renewables,solar-generation,price-real`;
empty selects none), `compare-basis`, `compare-start` / `compare-end`,
`compare-table`, and compare mode's `compare-dates` (the comparing cards'
chart names) with `compare-date-a` / `compare-date-b` (`YYYY-MM`; Timeline's
own `compare-a` / `compare-b` are epoch ms). Defaults are omitted. Older links with the full ids
(`nsw1`, `solar_generation`) still parse. Every Tracker list parameter
(`hidden`, `overlay` and the two above) is written with bare commas
(`readableQuery` in `tracker-url.js`), never `%2C`. Explicit view switches navigate to the bare view route, so every query
setting starts at that view's defaults. Back/Forward
and direct links restore the full historical selection. Explicit filter changes push history; settled gestures
replace it. The top nav holds all three views' filters with uniform spacing and
a divider after the switcher. Switching views is a route change, so the site's
filter-bar view transition slides the incoming controls in from the left and
the chart body cross-fades. The view switcher is named for the transition
(`SwitchWithIcons` `transitionName`), so it holds still while its thumb slides
to the new view. Each chart card downloads its metric for the selected regions
over the visible periods (ranks too, under Ranks), in base units with the
percentage denominator stated; the Regions table downloads as shown. PNG uses the existing Stratum capture flow, extended to the stripes' own SVG.

### Timeline and profile composition

- **`+layout.js`** — parses the query into the initial selection with the
  `nowMs` anchor the hydrating client reuses. **`+page.js`** redirects `/tracker` to a view route.
- **`timeline/`, `profile/`, `compare/+page.svelte`** — one route per view
  (`TRACKER_VIEWS` in `tracker-url.js` lists them with their labels and route
  ids). Each composes `TrackerShell` around its canvas and owns what differs: its
  filter-bar controls and range status, extra menu items, shortcuts and the
  workbook's Summary rows and file names. Compare's `+page.server.js` loads the CPI series only there.
- **`TrackerShell.svelte`** — the chrome every view shares: view switcher,
  region select, options menu (copy link, PNG export, Download data), notices,
  fullscreen and the shortcuts toast. It owns the download registry and the
  "Download data" dialog (see Data export). Its `<main>` gains `data-hydrated` once
  mounted: the server-rendered charts already contain svgs, so automation waits
  for this marker before clicking (a click on the SSR skeleton is lost).
- **`tracker-page.js`** — `createTrackerPage()` builds a view page's session
  and wires it to browser history, the freshness clock and the below-tablet
  table default.
- **`tracker-session.svelte.js`** — one per-page owner of selection state and
  the shared range controller; each view route creates its own, so switching
  views starts a fresh session. Explicit range/date/interval picks push history;
  settled pan/zoom replaces it. The canvas registers charts and providers here.
- **`tracker-url.js`** — `normaliseTrackerState()` is the one place the
  selection's invariants live (valid region/group, hidden and profile series
  within the grouping, spot-price-gated profile metric, All-tier calendar
  filter); parsing, serialising and the session all pass through it. The
  session also exposes `timeZone` and `ianaTimeZone` so components
  do not re-derive them.
- **`tracker-navigation.js`** — the sole URL writer and restoration adapter,
  using `tracker-url.js` for parsing/serialisation. Writes change only the
  query of the path the page loaded, and reads ignore other routes' URLs and
  our own writes. SvelteKit shallow history updates the address bar without a
  navigation, so Back/Forward within a view arrives through `popstate` and
  same-route links through `onNavigate`. Back/Forward onto another view's
  shallow entry renders that entry's base URL (`page.url`), so the page
  reconciles with the address bar once mounted.
- **`TrackerSplitLayout.svelte`** — every view's shell: a scrolling chart
  column beside the resizable docked table panel, or the rail that reopens
  it. Each view passes its panel bounds (`FUEL_TECH_SPLIT` for Timeline and
  Profile; Compare's regions table remembers its width and overlays the charts
  below 1024px) and renders its panel through a snippet that receives the
  docked-panel controller for the close/open focus hand-off. Opening and
  closing slide the panel in from and out to the right edge: its column (the
  drag handle and panel) eases its width, so the charts give way smoothly,
  while the panel keeps its full width and is clipped (`overflow: clip`, which
  the focus hand-off can't scroll). A closing panel is inert while it slides
  away, and reopening mid-slide reverses it live; reduced motion skips it.
- **`TrackerCanvas.svelte`** — three mounted timeline chart cards and the table
  layout, with shared hover/gesture state and series selection.
- **`TimeOfDay.svelte`** / **`time-of-day.js`** — a separate bounded profile view
  and pure network-local window, aggregation, table and CSV helpers. Timeline and
  profile canvases are mutually exclusive; explicit view changes reset selections
  and browser history restores them. It mirrors Timeline's layout: chart cards
  beside the fuel-tech table on the right (`averageDayTableRows`). A **Stacked
  / Breakdown** switch at the start of the top-nav filters chooses the cards:
  one stack of every technology, titled for its window ("Average over last 28
  full days", or "Average over 28 full days" once a last day is picked), or a
  chart per technology, two columns wide, then spot price. Stacked shows the
  stacked area chart across the canvas, and the stacked **Radial bars**
  ("Average by hour") in the table panel, between the table and its footnotes
  (`FuelTechTable`'s `companion` snippet): every visible technology's hourly
  average stacked around the dial (sources outward, loads inward from the
  zero ring), read out as the hour's net. The two share one hover and one
  pinned slot (`pinnedSlot`, which the breakdown charts share too), so a
  pinned time stays highlighted on the dial; closing the panel hides the
  dial. The radial bars have no enlarge mode and no PNG of their own; the retired
  `profile-stack` style parameter is dropped from old links.
  **`profile-data.svelte.js`** shares the bounded source lifecycle on the
  headless provider core (`exactWindow`, so the selected days are fetched with
  no speculative buffer): one power source serves the stack, the table and the
  technology cards, price and gross demand load on demand, and each source
  exposes `rows`, `meta`, `pending`, `error` and `retry()`. Each source input is
  derived on its own and the window is keyed by its bounds, so a new interval
  or an unrelated selection change never rebuilds a manager or refetches.
- **`ProfileChart.svelte`** / **`profile-chart.js`** — the profile chart on the
  existing StratumChart (rendering, tooltip strip, options bar, zoom/pan and
  `ChartCard` resizing), plus the pure row adapters. Clock-only axes and bounded
  viewports keep the synthetic chart date invisible. Stacked draws the
  all-technology average-day stack. Breakdown draws one card per technology,
  in table order and two columns wide from `md` (the fuel-tech table's row
  toggles show and hide them through the same `hidden` as the stack), then a
  **Market** card charting regional spot price ($/MWh, stepped, in neutral grey
  so the red today line reads) where the region has one: each with its
  average area, lightened to
  35% opacity, with every day as a thin line in the series colour and the
  average as a dark (`#222222`) line on top (Stratum overlay lines). The
  breakdown's optional **Show today** toggle (`profile-today=1`, off by
  default) adds the current, incomplete network-local day so far as a thicker
  (2.5px) OE red line (`OE_RED`, `#C74523`) ending at the latest reading. Today
  is fetched by its own bounded sources (network midnight to the page's clock)
  only while the line is shown, and never joins the average, stack, table or
  CSV. Its loading shows in the top-nav loader and holds the PNG export; a
  failure shows an alert with "Retry today" beside the toggle, leaving the
  historical profile on screen. On NEM scopes, AEMO's rooftop solar forecast
  tops up today's lagging rooftop readings to the latest data time, as on
  Timeline (the same `rooftop-forecast.svelte.js` source and
  `topUpRooftopPower`, keyed on today's last refresh; `forecast=0` turns it
  off), and the table's footnote names the run. The radial heatmap has no today ring: there the toggle is disabled and
  shows off (Toggle's `disabled`), and today isn't fetched, while the URL keeps
  the choice for the other styles. The breakdown's charts share one hover (`ProfileChart`'s
  `onhoverchange` / `syncHoverTime`), as Timeline's cards do, and the radial
  clocks share the hovered hour (`RadialClock`'s bindable `active`). Hovering or
  pinning any card drives the table and the range readout. The linear
  breakdown charts (bands and multi-line) have no pan or zoom, so a click pins
  a slot straight away; the pin is shared by every card (TimeOfDay's
  `pinnedSlot`, through `ProfileChart`'s controlled `focusTime` /
  `onfocuschange`), and a second click, or Esc, releases it. Whatever the style,
  the card under the pointer gets a dark border (`ChartCard`'s `highlighted`;
  not the spot price card, which has no row) and highlights its technology's
  table row (`FuelTechTable`'s `focusRow`), as hovering the row itself would.
  The part of the chart under the pointer is shared too (TimeOfDay's
  `chartPart`): a day (a multi-line day line, ridge or heatmap ring), the
  multi-line average (its line or area), or a percentile band or the median
  line. Every card emphasises it — the day's line or median thickens, other
  bands fade (`ProfileChart`'s `activeKey`, fed by `onhoverkeychange`) — and
  the table outlines its columns (`focusColumns`, from `profileFocusColumns`):
  the day or Average, or a band's two percentile bounds as one block. The
  cells where the focused row and columns meet read white on OE red. A load's
  bands mirror between chart and table (`profileChartPart`), since the table
  reads loads as magnitudes. Day and median lines take the pointer through
  Stratum's `hoverable` overlay lines (an invisible 8px hit stroke reporting
  the line's id as the series hover key, as a stack path does). Every linear
  style's tooltip strip reads the same way (`ProfileReadout`; the range readout
  names the slot): today's value (with Show today on) in OE red and the
  slot's average ("Av."), each a swatch, label and bold value; multi-line adds
  a hovered day after them.
  Stacked shows the stacked radial bars, then the stacked area, sharing one
  hover (TimeOfDay's `stackHover`): an area slot marks its hour on the dial, a
  dial hour marks the start of that hour on the area, and the table and readout
  inspect the slot or the whole hour, whichever is under the pointer. As in the
  breakdown and on Timeline, a hovered card's border darkens and the table
  outlines the column it plots (Energy for the stacked radial bars, which read
  each hour in MWh, and Av power for the stacked area; on Timeline,
  `chartTableColumn` maps Generation, Market and Emissions to theirs, while the
  table shows it), and a hovered stack series fades the others and highlights
  its row (`NetworkChart`'s and `ProfileChart`'s `onhoverkeychange`). Stacked's
  two charts share that series (TimeOfDay's `stackSeries`): the radial bars
  pick the layer under the pointer from its radius within the hour
  (`RadialClock`'s bindable `activeLayer`), and either chart's series stands
  out on both. Cards report the pointer through `ChartCard`'s `onhover`.
  The breakdown's own options sit in a **Breakdown options** bar under the
  top nav, as Timeline's metrics strip does, sliding open and shut with the
  display: the compact **Show today** toggle, a divider, then a **Style**
  icon switcher (`profile-style`), which switches the breakdown between
  that **Multi-line** view (the default; curves), **Percentile bands** (a
  filled-area icon) and **Ridgeline** (waves), then **Radial
  bars** (a dashed ring) and **Radial heatmap** (concentric rings). Each icon
  carries its style's name as its accessible label and in the app's hover
  tooltip (`SwitchWithIcons`' `tooltip`), and the
  URL keeps `bands` / `radial` / `heatmap`. Percentile bands show each slot's 10–90% and 25–75% spread across
  the window's days (drawn as an invisible 10th-percentile base plus four
  stacked bands) with a dark median line and today; the strip (`ProfileChart`'s
  `readout`) shows the slot's average rather than a band thickness. The
  fuel-tech table swaps its window columns for the percentile range
  (`PERCENTILE_TABLE_COLUMNS`: 10%, 25%, Median, 75%, 90%, in the Av power
  unit, through `FuelTechTable`'s generic `powerColumns` / row `powerValues`;
  the multi-line, ridgeline and heatmap use the same mechanism for an
  Average column plus one per date — each day's value in the inspected slot, else each day's average
  power): across the inspected slot's days, or, without one, across each day's
  average power (`profileRange`). Loads read as magnitudes, so their order
  flips (their 10% is minus the raw 90%). The
  percentiles (`profilePercentiles`) take, for each time-of-day slot, one value
  per day — that day's mean of its 5-minute readings in the slot, days without
  a reading left out — sort them and interpolate linearly between neighbours
  (d3 `quantileSorted`, the same as Excel's `PERCENTILE.INC`): percentile p
  sits at position (n − 1) × p in the sorted list. With 7 days the 10th
  percentile is 0.6 of the way from the lowest day to the second lowest and the
  median is the middle day; 28 days give smoother bands. They describe how the
  slot varies from day to day, not within the slot, and today never joins them.
- **`Ridgeline.svelte`** — one offset curve per day for comparing day shapes:
  the oldest at the top, each later day in front of and overlapping the one
  above (an opaque tint hides the ridges behind, and each casts a very subtle
  shadow up onto the one behind it for depth), on one
  shared amplitude scale over the whole synthetic day; today, when shown, is
  the front ridge outlined in OE red. Only each ridge's top carries its
  outline (a stroked top line over the unstroked fill), so its ends and
  baseline have no dark edge. Each ridge gets at least 18px between
  baselines, so longer windows grow the chart past the card's height (7 days
  keep it, 14 days reach about 300px, 28 days about 550px with every date
  labelled). Loads read positive, as in the radial
  clock; spot price steps. Hover joins the shared breakdown hover (and so the
  table and range readout) and the strip reads today and the slot's average.
  The day whose ridge is under the pointer (`onhoverday`: each ridge owns the
  band just above its baseline) becomes the table's focused column, which
  scrolls that date's column in beside the pinned Technology column and
  highlights it. The same day's ridge is highlighted on every ridgeline card
  (`activeDay`): a stronger tint, a thicker outline and a bold label.
  Custom SVG (d3-shape) because Stratum has no offset baselines; PNG export
  captures it like the radial clock.
- **`dial.js`** / **`DialNight.svelte`** / **`DialFace.svelte`** / **`daylight.js`**
  — the 24-hour dials' shared face. Noon sits at the top and midnight at the
  bottom, running clockwise (`dialAngle`), so day fills the upper half like the
  sun's path. `DialNight` shades the window's average night (sunset round to
  sunrise) behind the data, and `DialFace` draws the 00/06/12/18 ticks and
  labels in a `DIAL_MARGIN` around the dial, each label anchored by its inner
  edge so all four sit the same gap from the dial. On hover it marks the
  hovered hour's (or heatmap slot's) start time on the arc the same way, in
  dark text, and hides any fixed label within two hours of it. `averageDaylight` (low-precision NOAA solar
  equations, no dependency) averages each day's sunrise and sunset at the
  region's capital — or across the capitals for the NEM and All Regions — as
  hours on the network clock. Market time never shifts for daylight saving, so
  South Australia's night sits visibly later. The heatmap's cells fill its
  dial, so there `DialNight` is an `overlay`: a translucent dark wash above
  the cells (which read through it), never taking the pointer. While a dial
  shows, `daylightNote` adds the
  table's last footnote (FuelTechTable's `notes`), naming the capitals and the
  market clock behind the shading.
- **`ChartLightbox.svelte`** — enlarges one radial chart over the page like a
  photo lightbox (on the shared `Modal`). Each radial card's header gets an
  Enlarge button (ChartCard's `onexpand`). Previous / Next or ← / → step
  through the breakdown's radial cards, wrapping at the ends; the stacked dial
  opens alone. TimeOfDay's `dial` snippet draws the same chart for a card and
  the lightbox, on the same hover state, so the readout and table follow it.
  Heatmap cards are `mini` ChartCards, styled like the scenarios' mini charts:
  an h6 title on the left over a header rule, and an unpadded body (the
  heatmap pads its dial, so its readout band runs edge to edge).
- **`RadialHeatmap.svelte`** — each ring is a day on a 24-hour dial (noon at
  the top, clockwise; the oldest day innermost, the latest outermost). Each cell is a slot shaded from near-white to the series
  colour; missing readings stay blank. Cells paint to a canvas (thousands at
  5-minute slots, too many for SVG paths); the dial, labels and hover outline
  are SVG above it, both PNG-exportable. Hover shares the breakdown's slot and
  day (`onhoverday`), so siblings outline the same
  cell, a one-line readout on a light band flush to the card's edges (day and
  slot on the left, a step smaller; value and unit on the right, dollars as
  "$43.17/MWh" via `dial.js`'s `dialValue`) follows it, and the table scrolls to the
  day's column (the ridgeline's Average-and-dates columns). Square cards in the
  radial clock's flowing grid; loads read positive.
- **`RadialClock.svelte`** — a series' average by hour (`hourlyProfile`)
  around a 24-hour dial, square at its card's width (radial cards flow in as
  many ≥240px columns as fit, without the shared drag-to-resize height), noon at the top running clockwise, night shaded behind: slices grow from
  a baseline ring (inward for negative hours, such as negative prices; the
  grouping's loads — charging, pumping — are flipped positive so they grow
  outward), today's hourly averages draw as
  an OE red radial line, and hovering anywhere in an hour's sector — centre to
  just past the dial, through invisible gap-free hit areas, however short the
  bar — shades that sector in warm grey behind the bars and reads out the
  hour and value (with "net" when stacked) on the heatmap's band
  (`DialReadout`, shared by both radial charts). With Show today on, the
  hovered hour's today value reads in OE red, centred below the dial (its
  line is reserved while today shows, so the card never jumps). While nothing
  is hovered, the band and the today line read the average across the hours
  ("Av.", `meanOfHours`): the day's hourly mean (net when stacked) and today's
  so far. Radial bar cards are
  `mini` ChartCards like the heatmap's, the stacked dial included. The
  hovered hour also drives the table
  and the range readout: `averageDayTableRows` inspects a time range (an
  inspected chart slot, or the hour's two or twelve slots), so the table shows
  that hour's average power. Values also sit in a visually hidden table (the
  hour sectors carry no `<title>`, so hovering shows no browser tooltip); the
  SVG carries `data-png-layer` inside a
  `data-chart-area` root, so PNG export captures it. Custom SVG (d3-shape)
  because Stratum has no radial chart. With several `layers` (the Stacked
  display's radial style) each hour stacks them in order, positives outward
  and negatives inward, the hub and titles read the net total and the hidden
  table gains a column per layer; the breakdown passes a single layer. The hub is a
  third of the radius.
- **Chart cards** live in `$lib/components/charts/card/` (shared with
  `/facility/[code]`; see its README): `ChartCard`, the table view, the
  download registry and dialog, the export dataset serialisers and compare
  mode. The tracker keeps its own datasets (`tracker-export.js`) and compare
  sources (`chart-compare-sources.js`).
- **Compare mode** (`$lib/components/charts/card/compare/`,
  `chart-compare-sources.js`) — any chart card can compare two of its buckets; see
  [Compare mode](#compare-mode).
- **`tracker-providers.svelte.js`** — enables and coordinates the six optional
  headless providers through their existing shared request/cache lifecycle.
- **`tracker-data.svelte.js`** — accepts producer-tagged snapshots only for
  the current region, grouping, metric, intervals, bounds, calendar filter and
  exclusions. Reactive chart readiness releases held frames without polling.
- **`tracker-table.svelte.js`** — derives table sections from matching
  generation/provider data and owns the accepted table: one complete table and
  its descriptive metadata is held during refreshes (`accepted`,
  `valuesPending`, `displayedRows`); exports use the same accepted values.
- **`tracker-metrics.svelte.js`** — the window-metrics feed: per-metric
  readiness and inputs from accepted chart snapshots plus the demand and
  renewables providers. `tracker-providers.svelte.js` decides which provider
  serves the renewables share (`renewablesSource`, `renewableShareRows`) for
  the overlay, the metrics and retries alike.
- **`tracker-visibility.js`** — pure show/hide rules for the table's row and
  overlay toggles (solo, restore-on-last, overlay solo); the canvas applies the
  result through the session.
- **`tracker-chart-overlays.js`** — pure rolling renewable-share calculation.
- **`TrackerPanelHeader.svelte`** / **`PanelRail.svelte`** — the 48px header
  (collapse control on the outer edge, title, panel actions) and the 48px
  collapsed rail (reopen control plus any controls that must stay reachable)
  shared by the metrics pane, the fuel-tech table and the regions table.
- **`docked-panel.svelte.js`** (shared UI helper, `$lib/components/ui/panel`)
  — a resizable pane on the shared `resize-control` (pointer and keyboard,
  teardown on unmount): bounded size, a remembered size restored after mount,
  and the open/close focus hand-off between a panel's close control and its
  rail opener. The metrics pane, the fuel-tech table, the regions table and
  `ChartCard` heights all use it; `panel-bounds.js` holds the pure
  percentage-of-container bounds. Arrow keys resize, Shift increases the step,
  and Home/End select the bounds.
- **`tracker-overlays.js`** — the registry behind the generation chart's
  URL-owned overlays: canonical `overlay=` order, the demand/renewables line
  colours and the curtailment bands (ids, labels, colours, stacking order).
  The canvas, the table swatches and the URL codec all read it.
- **`ChartCard.svelte`** — every chart sits in one card with one header, on
  a subtle diagonal gradient from warm grey to light warm grey:
  - Row 1: the chart's ⋮ options (its flyout opens under the header's left
    edge), the title (the card's heading), the chart's own title and unit,
    then on the right the card's actions — Table (a table view), CSV (the
    card's download, as the "Download data" dialog gives it) and Enlarge
    (radial and heatmap cards), 28px icon buttons with tooltips like the
    chart's own — and the chart's pan/zoom (✥, − / +;
    unlike the grey bar elsewhere, − / + stay while pan/zoom is engaged,
    `keepZoomWhileEngaged`). A StratumChart inside a card hands its toolbar over
    through a chart header host (`$lib/components/charts/v2/chart-header-host.svelte.js`)
    instead of drawing its grey `ChartHeader` bar; the card composes the same
    pieces (`ChartHeaderUnit`, `ChartOptionsMenu`, `ChartPanZoomButtons`).
  - Row 2, when a card has them: `controls` on the right — `CardToggle`
    options (e.g. Inflation adjusted) before the compact `SwitchTabs` chart
    switcher.
  - The `legend`, when a card has one, sits under the chart in the card's
    footer, at every width.
  - **Compare** (`compare` prop): a Compare button (⇄ arrows) before Table
    turns the card's compare mode on and off — see [Compare mode](#compare-mode).
  - **Legends only where nothing else keys the colours**
    (`chart-legend.js`, `SeriesLegend.svelte`): the stacked charts (Timeline's
    Generation, market value and emissions volume; Profile's stack) list
    their visible series, top of the stack first, plus Generation's overlays,
    while the fuel-tech table is closed; Compare's Trends and Ranks list the
    regions while the Regions table is closed. Panels and stripes label their
    regions in the chart; the heatmap always shows its colour scale.
  - **The table view** (`ChartDataTable.svelte`) renders the card's download
    dataset — the CSV's columns and rows — over the chart, mounted only while
    toggled on. The chart stays mounted underneath (`invisible`, `inert`), so
    its data, viewport and the fuel-tech table carry on. Only the rows in view
    render; the header row and first column stay pinned; each number column
    keeps one precision (`datasetColumnPlaces`, `formatDatasetCell`), while
    the CSV keeps full precision. The chart's toolbar steps aside, and pan/zoom
    is released, while the table shows.
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
  chart header, y-axis and hover-strip values together. The current open
  energy bucket (hour/day/week/month and coarser calendar grains) is hatched
  until that interval is complete.
- **Fuel technology options modal** offers Detailed, Simplified,
  Coal/Gas/Renewables, Flexibility, Renewables/Fossils, VRE/Residual
  (`groups.js` registry). It lives in the Fuel technologies panel header's
  options (sliders) dialog, next to contribution basis (% generation ⇄ % demand)
  and checkboxes for the six table value columns. Technology is always shown;
  Energy, Av power and Contribution show by default; Show all columns adds Av price,
  Emissions and Intensity. Choices apply immediately. Grouping and
  contribution persist in the URL/history; table columns are a personal preference
  in localStorage (`tracker-table-columns`, restored after mount) so shared links
  never change the recipient's columns, and the retired `columns` param is dropped
  from old links. The table headers echo the grouping and
  contribution choices as muted sub-labels and change them in place: the
  Technology header opens the grouping list (the shared `FilterSelect`
  through a custom `trigger`), and the Contribution header toggles its basis. The same trigger stays in the
  collapsed table rail, allowing chart configuration without table-provider
  fetches. Profile changes its grouping and contribution basis the same way (Technology and Contribution headers, or the table options — without table columns — in the panel header and rail); its top nav has no grouping control. Global page
  options now contain only page actions (exports, link, fullscreen and docs).
  `FuelTechOptions` fills `TableOptions`: the sliders trigger opens a
  popover under it (a sheet over the table's sheet on phones; `FilterPanel`
  with `dialog`, named for the options) laid out as the filter sheet's titled
  sections — the grouping and contribution basis as segmented switches
  (`SwitchWithIcons` `columns`), and a switch per table column (`Toggle`
  `spread`, with "Show all columns" at the end of the Columns title) — and a
  full-width Done in its footer. Picks apply as
  they land; Done, ✕, Escape or a click outside closes it, and Done, ✕ and
  Escape hand focus back to the trigger. Escape closes the options before
  the phone table sheet under them.
  Its trigger matches the panel controls' 40px
  target with a smaller 16px muted-grey sliders icon. Choices still use the session's URL/history
  path; they affect linked charts, not just the table.
  Grouping is applied client-side in
  `processNetworkData` — the API always returns detailed per-fuel-tech
  series, so switching groups re-processes cached responses without a fetch.
- **Fuel-tech table** (`FuelTechPanel` + `FuelTechTable` in a `ResizablePanel`)
  — window energy (MWh/GWh/TWh), Av power (MW/GW), contribution (% of source
  generation ⇄ % of gross demand),
  volume-weighted price ($/MWh), window emissions (tCO₂e) and emissions
  intensity (kgCO₂e/MWh, Σ tonnes ÷ Σ energy) per group, computed in `table-model.js` from: the generation chart's
  `onvisibledata` snapshot, the headless `createNetworkFuelTechSeries`
  providers for `market_value` and `emissions`, and the market pair's
  `demand_gross`. Loads report no emissions. Window totals read every feed at its
  native cadence (calendar-filtered when a filter is set) and give each bucket its own
  duration — months and years vary in length, and filters skip periods — so energy and
  Av power never infer a bucket length from the gap between rows. On energy grains the
  bucket still in progress (the one the chart hatches) counts only the hours up to the
  window's end, which a refresh advances, because its energy so far covers only those.
  Ratios are ratios of
  window sums over the periods both sides report (a period missing its market value or
  emissions leaves its energy out too), never means of per-bucket ratios. When a
  generating period has no market value or emissions, the Av price or Intensity cell
  carries a `*` linked to a footnote, and the table export's `Av price partial` /
  `Intensity partial` columns say the same. Row
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
  is available in the table’s interval inspection: demand follows the
  selected generation unit, and curtailment/renewables show amounts and shares.
  A divider separates curtailment from the Demand and Renewables rows.
  Hovering any timeline chart (or inspecting it with the keyboard) shows that
  displayed interval across every table section, and the filter bar's range
  label switches to the inspected timestamp for as long as inspection lasts.
  Leaving inspection restores the accepted window totals. Feeds match the exact
  timestamp; missing values stay unavailable. Single intervals use their explicit
  duration for energy and average power. Window totals and exports remain separate
  from inspection, and exports retain every column regardless of table visibility.
  When the selected columns exceed the panel width, Technology pins left and
  the value columns scroll horizontally with snap points. Av power follows the chart's
  MW/GW choice while the chart shows power and stays in MW otherwise; Energy
  sizes its own prefix from the table's largest value, stepping MWh → GWh →
  TWh only at five digits (`energyDisplayPrefix`); emissions start in plain
  tonnes and intensity in kgCO₂e/MWh. Clicking a value header steps its unit
  through its SI set and wraps (`table-units.js`): Energy MWh → GWh → TWh,
  Av power MW → GW, Emissions t → kt → Mt, Intensity kg → t per MWh (two
  decimals in tonnes). Av price has one unit, so its header is static. A
  header choice pins that column until the page reloads; it is session state,
  not URL or localStorage, because the defaults follow the window's scale.
- **Data export** — the options (⋮) menu's single **Download data** item opens
  `DownloadDataModal` (`$lib/components/charts/card/`): a "Download as CSV" row for every chart and panel
  on screen, each with a download button, then a "Download as XLSX" row for
  the "All charts" workbook (a Summary sheet, then one sheet per listed chart
  with data, named as the dialog lists it).
  - **What's listed is what's rendered.** `TrackerShell` creates a registry
    (`chart-downloads.svelte.js`, which also builds the CSVs and the
    workbook) and puts it in context. `ChartCard`'s
    `download` prop, `FuelTechPanel`'s and the `chartDownload` attachment
    (each open compare panel, Profile's stacked dial, Compare's Regions
    panel) register an element while it is mounted and drop it on unmount;
    the dialog lists them in screen order (`orderByDocument`). Each source
    is read lazily when the dialog shows (id, label, state, dataset), so a
    row follows its card live, and a dataset is built only on click. Ids
    match the PNG export's, and registered elements carry
    `data-chart-download`, which the e2e checks compare with the dialog.
  - **States.** A row's button is enabled only when its chart is `ready`;
    `loading`, `empty` ("No data") and `error` say so. The workbook builds
    once nothing is loading or failed (`workbookAvailability`); empty charts
    are left out and named on its Summary. A chart's CSV can download before
    the workbook can.
  - **Timeline** (`tracker-export.js`, `timelineDataset`): each card as drawn —
    Generation's visible series, then the drawn overlays joined on its times
    (Demand, Renewables (% of gross demand), each curtailment band); Market's
    tab (spot price; volume-weighted price with its market value and energy;
    or market value's visible series); Emissions' tab (intensity with its
    emissions and energy, re-derived as the chart does; or volume's visible
    series); the fuel-tech table while its panel is open; each open compare
    panel, after its chart (`compareDataset`: the series at A and B, the
    change and, for relative changes, the percentage; base units, with the
    region, network time and interval). Values are base units (MW/MWh, $, $/MWh,
    tCO2e, kgCO2e/MWh) with the unit in the header, whatever the chart's
    prefix or proportion / change-since view (the Summary notes it). Each
    card is ready on its own current snapshot; Generation also waits for its
    overlays' feeds. Drawing-only calendar-band closing points are omitted.
  - **Profile** (`time-of-day.js`): the Stacked area (`profileStackDataset`:
    each visible technology's own slot average), the "Average by hour" dial
    while the table is open (`profileHourlyDataset`, MWh), the table
    (`profileTableDataset`: the columns it shows, including a style's own
    power columns) and each Breakdown card in its style
    (`profileCardDataset`): Multi-line — average, days with data and every
    day; Percentile bands — the 10th–90th percentiles, median and average;
    Ridgeline — average and every day; Radial bars — hourly averages;
    Radial heatmap — every day. Today joins every style that draws it. Clock
    labels are text headed with the zone (`Time of day (UTC+10:00)`), and
    values keep their sign: the shape styles draw loads outward, the
    downloads don't flip them.
  - **Compare** (`region-comparison-export.js`): each card as its display
    draws it (`comparisonChartDataset`) — a value column per selected region,
    or under Ranks each state's rank, where NEM and All Regions fall
    (`#2–3`) and the values ranked — over the visible periods with a value,
    and the Regions table at its period (`comparisonTableDataset`).
  - CSV and XLSX share one `ExportDataset` shape (`datasetToCsv`,
    `datasetToSheet`; `buildWorkbookSheets` with `uniqueSheetNames` for
    Excel's 31-character, case-insensitive names). Timestamps are
    network-local — offset-suffixed text in CSV, real date-time cells in
    XLSX. The workbook writer (`write-excel-file`, via
    `$lib/utils/download-xlsx.js`) is imported on demand so it stays off the
    page bundle. `trackerFileName` names every download, with the NEM's
    `_all` scope written as `nem`: `tracker-nem-generation-3d.csv` /
    `tracker-nem-3d.xlsx`, `tracker-wem-time-of-day-coal-2026-08-31.csv`,
    `tracker-regions-intensity-1m-2024-01-to-2024-12.csv`.

### Touch

On touch screens every Tracker chart leaves vertical swipes to the page, so
the chart column scrolls whichever chart a swipe starts on. A horizontal drag
scrubs the readout and a tap pins a time (a second tap on it releases it),
and two fingers pan and pinch any pannable chart straight away: on touch
there is nothing to engage, so cards show no ✥ toggle (mice and trackpads
keep it). The custom charts (ridgelines, radial clocks and heatmaps, the
Compare panels) read the same way through the `pointerInspect` attachment: a
tap shows the reading, which stays until a tap elsewhere. Chart cards have no
height handles on touch screens, so the gaps between them scroll too. The
shared rules live in `$lib/components/charts/v2` (`elements/touch-gesture.js`,
`elements/pointer-inspect.js`); `tests/e2e/tracker-touch.spec.js` covers them
at phone size.

### Narrow screens: the table panel

Below 768px there is no side panel and nothing docked: the charts have the
screen, and a table button floating at the bottom middle (`TrackerShell`'s
`table`, a pill naming the table, clear of the page's end, sliding down out of view while the table is open) opens the fuel tech table (or Compare's Regions table) in a sheet
over the dimmed page, reaching up to just under the top nav
(`TrackerSplitLayout`, a `BottomSheet` sized as it opens from where the
shell's nav ends, shared through `tracker-sheet.js`; at most 94% once the
nav has scrolled away). The panel header (`TrackerPanelHeader`, through
`tracker-sheet.js`'s context) becomes the sheet's header, laid out like the
filter sheet's: the panel's actions (Show all, the table options) on the
left, the title centred and a round ✕ on the right; the header drags the
sheet. ✕, a tap on the page, Esc or a drag down closes it, which closes the
table (`table=0`). Profile's stacked dial comes along under the table.
From 768 to 1023px the panel overlays the charts with a
backdrop that closes it, and every view opens with the table closed there
(`tracker-page.js`, `WIDE_QUERY`); docked beside the charts is for 1024px and
up. The docked panel and rail are hidden by CSS below 1024px, where they
aren't used, so the server render never flashes them. On touch, a long press
on a fuel tech or region row solos it (`$lib/utils/long-press.js`), as
⌘/Ctrl-click does.

### Narrow screens: the top bar and controls

Below 768px the page scrolls as a document (`FullscreenLayout` and
`FullscreenContainer`'s `phoneScroll`), so the top bar scrolls away with the
charts, and the table sheet is fixed to the viewport. The bar is one row (the
"Tracker" logo menu, the view dropdown and the Feedback and options buttons;
`FullscreenFilterBar`'s `wrapOnPhone` turns its wrappers into
`display: contents`), and the filters leave it. In their place, a pill at the
top of the body stays in view (`RangeStatus`'s `sticky` variant): the filters
icon, then the range over a smaller line of the other filters and the zone
its times are in ("NEM · 30 min · AEST"; the bar shows the zone after the
range). As wide as its text and centred, it lifts out over the charts with a soft shadow once stuck to the top
(`TrackerShell` watches a marker above it). A tap opens the filters
(refresh is in the options menu).

The filters open in a bottom sheet over a dimmed page (`TrackerFilterSheet`),
in the Facilities filter sheet's chrome (`ModalSheet`, in
`$lib/components/ui/bottom-sheet`): a centred "Filters" title, a round
✕ and a full-width Done in the footer. It renders the Region switch (All,
NEM, the five states and WA, four to a row, like the range presets) and then
the view's own `controls`, the snippet the bar shows from 768px up, in a
filter-sheet subtree (`$lib/components/filters/filter-sheet.js`), where the
shared filter controls lay themselves out as the sheet's sections:

- `FilterSelect`: a flat list (the interval, the calendar period, Profile's
  window) is a segmented switch, one tap to pick, wrapping into rows of up to
  four; a nested or grouped one is a radio list (`FilterRadioList`) that unfolds under its title
  (`FilterAccordionSection`), with the picked option as its tag, and folds
  again once a pick lands.
- `ChartRangeBar`: the range is the preset switch (1D … All, then the
  calendar), and picking the calendar opens the custom dates
  (`DateRangePicker`) beneath it.
- `FilterDropdown` (Compare's charts): a folding checkbox list.
- `FilterSheetSection` titles any other control (Profile's display switch and
  last day), and `FilterBarGroup` drops bar-only layout (a separator, the
  "to" between the window and its last day).

Every pick applies as it lands, so the charts behind update while the sheet
is open.

The shell opts its subtree into touch-sized controls (`setTouchControls()`,
`$lib/components/ui/touch-controls.js`): below 768px pills, segmented switches,
the date input and the Feedback and options buttons are 40px tall with 14px
type, and the view dropdown opens the phone's own picker (`NativeSelect`: a
transparent `<select>` over the pill). The popovers above 768px
stay inside the viewport and scroll when taller than the space below their
trigger (`dropdownPosition`). On touch screens the small controls take a 44px
tap area without changing size (the `touch-hit` utility in `app.css`), the
Profile calendar's days are 40px, informational tooltips (a card's ⓘ, a
metric's description) open on a tap (`Tooltip`'s `tapToOpen`), and narrow
cards let a long title wrap to two lines. The options menu leaves out full
screen on phones (always full screen) and keyboard shortcuts below 1024px.

Phones hide the fullscreen footer. Its details move to the options menu's
last item, About, which opens a `ModalSheet` (`TrackerAboutSheet`) of grouped
rows: the version and the API status (checked as the sheet opens, a link to
the status page), the data sources (AEMO, APVI) and Open Electricity's
platform, documentation and data licence. The footer and the sheet share
their links (`$lib/components/fullscreen/site-links.js`). The shell checks the
API status on phones as the page loads, every five minutes and as About opens
(`createApiStatusState`, `$lib/api-status-state.svelte.js`): a dot in the status
page's colour sits over the options button's top-right corner
(`OptionsMenu`'s `badge`), and a row above About carries it too: the dot in
the icon gutter (`OptionsMenuItem`'s `leading`) beside "API status", opening
the status page (the status's name is there for assistive tech only).

### Narrow screens: density and performance

X-axis labels thin to every n-th tick when they'd collide
(`axis-label-step.js`, used by every v2 `AxisX`; gridlines stay on every
tick). On narrow cards a long `SeriesLegend` shows two rows and a "Show all"
toggle. The floating tooltip (Compare on phones) also learns where a tap
lands, so it snaps to the half of the plot away from the finger. On the
Profile breakdown, ridgelines drop their per-ridge shadow filter on
touch-only devices and the radial heatmap repaints after a resize settles
(new data still paints at once). The chart lightbox opens full screen on
phones. With the browser's Data Saver on, nothing is prefetched in idle
time (`idle-prefetch.js`).

## Compare mode

Any `ChartCard` can compare two of its buckets. The card header's **Compare**
button (⇄ arrows, before Table) switches it on: the chart tweens to half its
height (at least 160px; the halved height is a resizable, remembered size of
its own, `<heightStorageKey>-compare`) while the compare panel slides down
inside the card, under the chart, both over 220ms (instant with reduced
motion). Cards whose height is their content (Panels, Heatmap) keep it.
Switching it off returns the chart to its height. Wired on Timeline's three
cards and every `/tracker/compare` card; Profile can join by handing its cards
a source.

- **Picking A and B.** The panel opens on the first and last buckets in view,
  with A armed. A click on the chart sets the armed slot and arms the other,
  so two clicks set A then B; while a card compares, its clicks never engage
  pan and zoom (the chart's `onpick`; ✥ still does) or pin a time. The A / B bar
  (`ComparePicker`) shows each slot's bucket in the chart's tooltip format,
  with ‹ › steppers (← / → on a focused slot, Shift for ten), a swap button
  and a hint naming the slot the next click sets. Picks and swaps push
  history; stepping replaces it. The armed slot is page state.
- **Markers.** The chart draws A and B as dark lines with letter chips and a
  faint band between them (StratumChart's `timeMarkers`), an edge arrow when
  one lies outside the view, and a dashed ghost of the armed slot under the
  pointer. They are kept in PNG exports. The heatmap outlines A's and B's
  cells instead.
- **Shared A and B.** Every comparing card on a page shows the same A and B;
  open and closed is per card. Closing the last card drops the comparison.
- **What closes it.** Anything that redraws the charts over other periods or
  as other charts closes every comparison on the page. On Timeline that is a
  range preset, custom dates, the interval, the calendar filter, the region,
  or the Market and Emissions tabs (`CLOSES_COMPARISON` and `chooseRange` in
  `tracker-session.svelte.js`). On Compare it is the display, the interval,
  the calendar filter, or the charts, a presentation switch included
  (`closesComparisonDates`). On Timeline a pan or zoom that switches the
  grain (5 min → 30 min, power → energy) closes it too (`keepingGrain`):
  A and B were buckets the charts no longer draw. Units, curves, pan and
  zoom within a grain, show / hide, grouping, transforms, regions and the
  percentage basis leave it open.
- **Unavailable dates.** A date the chart never drew reads "not in view",
  with **Show in chart** (Timeline: pans to cover A and B) and **Use nearest
  date**. Dates are never silently swapped.
- **Per chart** (`chart-compare-sources.js` builds each card's
  `CompareSource`, Timeline's on the shared `stackCompareSource` /
  `lineCompareSource`; `ComparePanel` draws it by kind):
  - _Composition_ — Generation, Market value, Emissions volume: the net total
    (A, B, change, %; sources less loads), then one change list
    (`CompareChangeList`): a row per visible technology, each with A, B
    (narrow cards drop them), a diverging bar of its change about a centre
    zero line on one shared scale, the change and the %. Loads (the
    fuel-tech table's rule: a listed load group or a negative reading) read
    as consumption — signs inverted and tagged "load" — so charging and
    pumping rank and compare alongside the sources. Where the chart drew a
    bucket, a technology without a reading in it (solar before it was built)
    compares as 0; a bucket the chart never drew stays missing. Rows run from
    the largest rise to the largest fall (_Largest change_, the default), so
    the bars step down one diagonal, or in _Stack order_. Region lists use
    the same order. Hovering a row highlights its fuel-tech table row. The
    CSV matches the panel, with a `Load (as consumption)` column.
  - _Single line_ — spot price, volume-weighted price, intensity: A and B
    value tiles either side of the change (`CompareValueTiles`), over a range
    strip placing both between the window's low and high, with its mean
    (spot price) or the ratio of its window sums (VW price, intensity, both
    derived from their components as the chart does).
  - _Lines_ (regions) — every Compare card: a slope chart (`CompareSlopeChart`, on
    the shared Stratum line chart; A always on the left) beside a change list
    per region; hovering a line or row names the region to the Regions table.
    Shares change in percentage points (no %). Under Ranks it is a bump
    chart, NEM and All Regions dashed among the ranks, and changes read
    ▲2 / ▼1 places. Under Heatmap the list alone, with A's and B's shades
    on the heatmap's scale as chips just right of their values.
- **Downloads.** Each open panel registers its own download after its
  chart's (`<card>-comparison`, `tracker-nem-generation-comparison-<a>-to-<b>.csv`,
  `tracker-regions-<metric>-comparison-<a>-to-<b>.csv`) and its own PNG.
  A visually hidden table carries every value for assistive technology.
- **Floating-point noise** (ratios and rolling sums of the same readings)
  reads as no change, never `-0.0` (`compareValues`, `formatSignedChange`).

## Window metrics

The timeline shows its window metrics in a ticker strip (`WindowMetrics.svelte`)
between the navigation and the charts: a white band with a light bottom border,
always visible, that scrolls sideways when the items overflow. The scrollbar is
hidden and the band's edges fade to hint at the overflow; there is no
scroll-snap. The fuel-tech table on the right keeps its docked panel, toggle
and resize divider; the strip has no resizing, but it can be hidden: press `M`
(a bare key, ignored while typing) or choose Hide/Show metrics in the Options
menu, and it slides shut or open (no motion under `prefers-reduced-motion`).
Like the table columns, that choice is a personal display preference kept in
localStorage (`tracker-metrics-visible`), never in the URL, and the demand and
renewables feeds it needs load only while it is shown.

Phones hide the strip. There the options menu's Metrics opens the same
readings in a dialog (`layout="list"`): a row per metric with both extremes as
large buttons, each showing its time. Picking one closes the dialog, pins its
time on every chart and scrolls its chart into view.

A picked extreme (from the strip or the dialog) is marked on its chart (net
power, demand, renewables and curtailment on Generation, the price on Market,
emissions and intensity on Emissions) with a labelled line, "Max net power
31,318 MW", in the style of a comparison's A and B (`timeMarkers`); hovering
or focusing an extreme in the strip previews it as a dashed marker, like a
comparison's armed one. Pinning another time drops the marker.

Each item is a single line reading "label unit · ↓ minimum · ↑ maximum": the
metric label in 10px uppercase Space Grotesk, semibold and the values'
dark grey (only Renewables has a label tooltip, with its description and a link
to the methodology page), its unit in small mono text beside it (`$/MWh`, `tCO₂e`; dollar values
also lead with `$`, the renewables share writes `%` on the values, and net
power, net energy, demand and curtailment put `MW`/`MWh` after each value
instead),
then the window minimum and maximum as 14px
monospaced tabular values, each marked with a bold down-to-line or up-to-line
icon in the site red. Each value's tooltip is just its time, "Min: 19 Sept, 11:30 pm", in the
interval policy's short form: "19 Sept, 11:30 pm" or
"19 Sept", with the year only outside the current network-local year, since
the navigation's range readout already fixes the year. When an extreme ties, the time is the
earliest. A partial window (typically only the newest bucket still filling in)
is not flagged. Items are sized to
their content, divided by light borders including one after the last item. A
value slides in from the left when it appears or changes (no motion under
`prefers-reduced-motion`).

It shows, in order, minimum and maximum net power, regional operational
demand, renewables share (%), the selected market measure (spot price,
volume-weighted price or market value), emissions volume (tCO₂e per bucket)
and emissions intensity (kgCO₂e/MWh, the ratio of sums per display bucket
exactly as the intensity chart draws it), then solar and wind curtailment
(the official regional series, in the window's basis, from the same provider
as the curtailment overlays). The emissions pair reads one
headless `emissions_intensity` components feed (`providers.intensityData`),
collapsed to the visible technologies, so both show whichever mode the
Emissions chart is in; the feed shares the chart's request when the chart
shows intensity, and retries from the strip. It is the strip's alone: the
fuel-tech table waits on, reports and retries only its own feeds (market pair,
market value, emissions, demand, curtailment, share; `table.feedsError`,
`table.retryFeeds`), so a slow or failed intensity feed never holds the table. On daily and longer
grains, where a bucket holds MWh, a Net energy pair leads the strip and net
power reads each bucket's average MW (MWh ÷ bucket length, from
`getIntervalHours`). Sub-daily grains show power only: a 5- or 30-minute
bucket's energy is its power rescaled, so it would land on the same buckets.

Each value is a button with an app tooltip such as "Minimum spot price".
Hover or focus it to highlight its interval on the synced charts; click to
pin it (a dark-grey fill with white text), click again to clear. The pin is
the one focus time the three charts share: pinning an extreme moves the
charts' focus line to its time, pinning a time on a plot (click or Enter)
moves the strip's pressed state to whichever extremes fall on that time, and
clearing either clears both. Hovering only previews. Loading shows
placeholders; a failed demand or renewables feed shows "Unavailable" with an
inline retry, while failed charts retry from their cards. Generation's plot
defaults to 320px high; saved resized heights still take precedence.

`window-metrics.js` calculates extrema from accepted, query-matching **display
buckets**, not native-cadence peaks or sums of overlapping rolling periods.
Only actual interval starts inside the selected bounds are considered; synthetic
calendar-band closing rows are excluded. Ties show the earliest occurrence.
Network-local timestamps use the same interval formatting policy as the charts.
On energy grains the bucket still in progress (the one the chart hatches) holds
only part of its total, so it is left out of the volume extrema (net energy,
demand, emissions, curtailment, market value); its net power divides by the
hours elapsed so far, and its ratios count as they are.

Values stay absolute when charts use percentage/change-since transforms. Net
generation is the signed sum of selected technologies, including imports and
negative loads; it is not gross demand. Hidden technologies are excluded from
net generation, market value and emissions. Regional price stays regional;
demand also stays regional. Volume-weighted price reuses the chart's ratio-of-components
helper after display aggregation. Net power, net energy and demand units
follow the chart's selected prefix.

All selected members of a summed bucket must be finite; missing members never
become zero. Partial input reports how many returned display intervals have
complete selected-series values, not guaranteed upstream/native-cadence coverage.
Zero and negative observations are valid. Loading, failed, empty or stale data
show placeholders rather than an old value under a new range label. The section
uses accepted chart snapshots and the demand, renewables and emissions-components
providers, enabled while the strip is shown even if the table and overlays are
closed. Renewables
uses the official regional share series, or the ratio of renewable generation to
gross demand window sums for rolling intervals, matching the chart line. Technology
visibility does not change this share. Both use shared display aggregation/calendar
filters, loading/error guards and the request broker, with individual retry controls.
Time-of-day remains a separate profile view. PNG export still captures charts,
not the metrics grid; existing CSV/XLSX exports are unchanged.

## Freshness and refresh

The timeline never polls. Relative presets define a window ending "now", but
the page only moves that edge and fetches new readings when the reader asks:
tapping the range readout in the top nav (it is a button whose tooltip says
when the data last finished loading), the `R` key, or "Refresh data" in the
Options menu. A refresh
makes every connected chart and provider revisit its two newest native buckets
for late observations and open-bucket revisions — bypassing the completed-
response LRU and the browser's cached copy (`fetch` with `cache: 'no-cache'`),
so the server answers afresh — and advances a following window to now; custom dates and settled pan/zoom gestures keep their bounds
(All retains its historical floor while its right edge grows). Active gestures
defer it, the readout and menu row are disabled while loading, and a refresh
never writes browser history. In-flight request deduplication, server caching
and retry limits remain in force.

Pausing serialises exact `start`/`end` bounds, so copy/reload and Back/Forward
preserve the choice without a second live-state URL flag; selecting a preset
resumes following its latest window.

The range readout keeps its place at the end of the top nav at every width.
To make room, the Region pill shows its short name (NEM, VIC, WA…) below `lg`
(1440px), and below `md` (1024px) the view switcher folds into a dropdown at the
same point the range presets do; past that, the readout truncates rather than
squeezing the controls. Each view passes the shell one `status` object
(`TrackerRangeStatus`).

Profile and Compare refresh the same way (readout, `R`, Options menu) and
likewise never poll; the top-nav loader shows while any source on screen is
fetching. A refresh moves the view's "now" to the present (`session.reanchor`).
Profile's sources each fetch their two newest 5-minute buckets afresh, its full
days roll past midnight and Show today extends to the latest readings.
Compare's shown regions fetch their two newest complete months afresh, and a
new month joins once one completes; loaded months stay on screen while that
happens (a region is blank only until its first load). Each view is
its own route, and the tracker layout's load reads the route, so switching
views starts the next view's session at the current time rather than the
first view's.

The tracker's single-key shortcuts (`tracker-shortcuts.js`, bare keys ignored
while typing) are `R` refresh, `M` show/hide metrics, `F` full screen (desktop
only) and `?` for the shortcuts modal shared with /facilities; the Options menu
badges the same keys.

While the tab is visible a minute clock keeps the freshness labels current; it
fetches nothing. Hidden tabs suspend it and queued speculative prefetch work;
returning performs one catch-up tick. Timers/listeners are disposed on
navigation.

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
generation, market and emissions charts, every open compare panel (with the
A / B markers on its chart), and time-of-day plots are supported. The image includes the Open Electricity logo,
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

Profile selections (on `/tracker/profile`):
`profile-display=breakdown` (default stacked), `profile-style=bands|radial|ridgeline|heatmap` (the breakdown's style; default
multi-line; older `lines` links still parse), `profile-today=1` (the
breakdown's current-day line; default off), `profile-interval=5m`
(default 30-minute slots), `profile-days=14|28` (default 7), and
`profile-end=YYYY-MM-DD` (inclusive last day; default yesterday in network time).
Copied links and Back/Forward retain these separately from the timeline range.
Profile also honours the shared `hidden` (technologies left out of the stack
and the breakdown),
`contribution` and `table=0` (fuel-tech panel closed) parameters.
The retired `profile-metric`, `profile-view`, `profile-series` and `profile-stack` parameters
are dropped from old links.

### Time-of-day semantics

Use the navigation **Analysis view** switch to select **Profile**, then
**Stacked** or **Breakdown**, a 7/14/28-day window "to" an optional
historical last day (one phrase: "7 days to 30/09/2026"), then a 5- or
30-minute **Interval**, in the top nav. The last day uses the app's `DatePicker` (`$lib/components/ui/date-picker`, built on bits-ui's
DatePicker: a typeable input whose calendar opens in its own popover); its
border darkens for a past day and its calendar footer offers **Latest complete
days**. Breakdown adds
**Style** and **Show today** to the top nav, and its charts follow the fuel-tech
table's row toggles. Future dates clamp to yesterday;
days use fixed network offsets (NEM/Australia UTC+10, WEM UTC+08), not civil DST.
The overview stacks all returned fuel technologies in the selected grouping,
using the standard group colours/order and the main chart's cumulative stack:
negative power pulls the stack down rather than forming an independent negative
stack. Average power uses smooth curves. Each technology uses the same daily averaging as its
technology card. If any technology's slot average is missing, that whole
stacked slot is a gap rather than a partial total. It has its own
loading/error/retry state.

The fuel-tech table on the right replaces the legend. It reuses Timeline's
`FuelTechPanel`, fed by `averageDayTableRows` (a thin wrapper over
`buildFuelTechTableRows`): each technology's average power, its energy over the
average day (MWh) and its contribution, from that technology's own half-hour
averages, so a technology missing from some slots still reports the slots it
has. Contribution follows Timeline's URL-owned basis (`contribution`): a share of
the average day's gross demand (the default; regional `demand_gross` for the
same complete days via `createProfileDemand`, averaged like any profile and
fetched only while the table shows it) or of source generation. While the stack
or a card is hovered or pinned, the table shows that slot and the top nav's range readout (the selected days, e.g.
"25 – 31 Aug 2026") shows its clock range. Row clicks show/hide technologies in
the stack (Ctrl/⌘-click solos, hiding the last row restores all) through the
same URL-owned `hidden` selection as Timeline; the Technology header changes the
grouping and the value headers cycle units.
Each slot (30 minutes, or 5 for the native readings) averages the available
5-minute readings within each day, then averages those daily values with equal
day weights. Nulls/non-finite readings remain gaps;
zero and negative values are retained. Partial coverage is explicit in the table
and CSV. Power uses absolute MW and
negative charging/pumping; timeline visibility, contribution and transforms do
not apply. All profiles use the existing StratumChart on smooth power curves.
The average is a dark line among the breakdown's days. Charts use Timeline's
tooltip strip (the table holds the full breakdown). Hover and
pinning, keyboard inspection (a focus-only Inspect values control), bounded
pan/zoom (one hour to 24 hours), unit/curve options and `ChartCard` resizing use
the shared chart conventions. Viewport changes are local display state and do
not alter aggregation or CSV.

The documented browser caller is `TimeOfDay.svelte` via `profile-data.svelte.js`, using the existing
`ChartDataManager` and `/api/network/data` (`metric=power|price`, `interval=5m`).
Each source requests only the selected complete days, with no speculative widening or
cross-grain prefetch; at most 28 days per source/selection. Widening the window
fetches only the missing earlier days (the provider's cache is gap-aware). Power stays mounted
for every chart and the table; gross demand and today load only when shown. Scope/window changes dispose
the prior consumer, and identity checks prevent stale displays/exports. Shared
response caching, deduplication and bounded retry/error handling remain in use.
View, interval, series (once loaded), visibility and chart-interaction changes do
not refetch. Download data lists the view's charts (see Data export): the
stack, table and hourly dial when Stacked; each technology and spot price,
shaped by the style, and the table, when Breakdown; and the workbook. PNG
export offers the stack, or each breakdown card. Spot price loads only in Breakdown.

### Timeline selections

Any Timeline card can compare two of its buckets (see
[Compare mode](#compare-mode)). Values are absolute MW/MWh (or $, $/MWh,
tCO₂e, kgCO₂e/MWh), whatever the chart's proportion or change-since view;
the comparison follows grouping and hidden technologies, and displays the
generation chart's unit prefix. Differences are signed B − A; relative
change is (B − A) / |A| × 100, so negative loads keep a meaningful signed
direction. Missing readings stay unavailable; a zero baseline has no
percentage, while a fall to zero from a non-zero baseline remains valid.
Synthetic calendar-band closing rows are never offered; rolling values
remain rolling interval values, and open buckets remain partial.

`compare=generation,market,emissions` (the comparing cards, in card order;
the earlier `compare=1` opens Generation), `compare-a` and `compare-b`
persist the comparison and its exact epoch-ms bucket starts through copied
URLs, reload and history. Dates never trigger off-screen fetches. Only
query-matching generation snapshots, or rows the chart drew at A or B since
its series last changed (`compare-pins.svelte.js`), are read: loading or
failed charts cannot show or export old values.

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
intervals, table summaries keep the native row cadence (as they always do) but
ignore values outside the selected period.
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
  the generation stack, grouping options, table and hover strip. Whole NEM,
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
  Loading visuals appear only after 200 ms of sustained pending data, so cached
  frontend updates do not flash the overlay. Settled chart snapshots publish
  immediately: the previous extra 300 ms table debounce was redundant with the
  gesture guard. Readiness/export validation stays immediate and independent of
  the visual delay. All loading visuals clear after the selected chart snapshots and enabled
  table/overlay feeds settle. Reduced-motion preferences disable the slide,
  pulse and sweep. Individual chart indicators are suppressed. Background chart
  cache warming and active pan/zoom gestures do not trigger these visuals.
  Failed and empty feeds settle into their existing messages.
- Emissions intensity retains per-group emissions and energy components in its
  loaded cache. Table row visibility filters those components locally, before
  display aggregation and ratio calculation. The first toggle therefore needs
  neither another data manager nor an HTTP-cache hit; snapshots and exports keep
  their visibility-specific identity and receive the selected component totals.
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

Timeline charts use the shared fixed tooltip strip above each chart, showing the
interval, hovered series and total where applicable. Narrow cards reserve two
lines, keeping the plot stable on hover. The table provides the complete series
breakdown and contribution percentages at the same timestamp; leaving inspection
restores the window totals. Profile's average-day stack shares the strip; its
individual profile keeps floating tooltips. Compare's displays have
no tooltip beside the Regions table, which is their readout (with the period in
the top nav); while the table is closed, or below 1024px where it overlays the charts, they float one. Price tooltips use the table's one-decimal format.

**Regions table.** Its header carries the same sliders button as the fuel-tech
table (`TableOptions`, shared with `FuelTechOptions`), whose popover sets the
percentage basis (`compare-basis`); the collapsed rail keeps it. Column headers
work like the fuel-tech table's (`comparisonTableColumn`): generation steps
through MWh / GWh / TWh and intensity through kg / t per MWh, with the same
precision rule as the fuel-tech table, and proportion headers toggle
% demand ⇄ % generation. Net imports are always a share of demand and prices
have one unit, so their headers are static. Its notes (ratios, net imports, the heatmap's
scales, ABS CPI) sit under the table in `TableFootnotes`, the
dashed note box the fuel-tech table also uses.

Hovering the charts highlights the table as Profile's breakdown does: the card
under the pointer outlines its metric's column (and darkens its border), the
region under the pointer outlines its row, and their cell reads white on OE red.
On the line charts a region is under the pointer while its line is: with
`chartStyles.lineHitWidth` (10px here), one transparent hit area over the plot
names the line nearest the pointer at the hovered time, within 5px
(`nearestLine` in `elements/line-hit.js`), with no extra path per line. With `allowHoverHighlight`, the hovered
region stays solid on every card while the others recede. On the heatmap it is
the row under the pointer, and on Panels the panel under it. A hovered card's column also scrolls into view
beside the pinned Region column (`scrollColumnsIntoView` in `table-styles.js`,
shared with the fuel-tech table's focused columns). Both tables' value
headers and cells share their classes and outlines (`columnFocusFor`,
`valueHeaderClass`, `valueCellClass`, `valueCellEdges`). The line hit area is
mirrored in `@chienleng/stratum-ui` (`chartStyles.lineHitWidth`).

The generation chart's **Proportion** view uses the same basis selected in
**Fuel technology options → Contribution** as the table, including from the
collapsed table rail when the table is closed.
Generation shares use all source generation, excluding loads and imports;
gross-demand shares include imports but exclude loads. Hiding a technology
changes visibility, not the denominator. Excluded technologies are omitted from
the percentage plot and tooltip; their absolute values remain available.

Chart percentages describe each displayed interval, calculated after aggregation
or rolling sums. Table contributions follow the hovered interval during inspection; otherwise they
summarise the selected window, using native
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

Every pure module has a colocated vitest suite (`thing.js` → `thing.test.js`):
URL codec, model, overlays, visibility, table model and formatting, window
metrics, comparison metrics, compare mode (`chart-compare`, its sources and
pins), region comparisons, exports (every
chart's download shape per tab, style and display), the download registry's
ordering and workbook rules, PNG layout, live follow, prefetch, time of day
and the profile chart adapter. `chart-downloads.svelte.test.js` (in the card kit) covers
registration, screen order, live sources and attachment stability.
`page-load.test.js`, `tracker-session.test.js` and `tracker-data.test.js`
cover the page load and the rune-based state owners that use only `$state` and
`$derived`.

Rune modules whose behaviour depends on `$effect` are tested as
`*.svelte.test.js` in the `runes` vitest project (`vite.config.js`), which
compiles them for the client under jsdom so effects run and `flushSync`
flushes; the node project compiles rune modules for the server, where effects
never run. `tracker-table` and `tracker-metrics` are driven with reactive
provider stand-ins; `tracker-providers`, `profile-data` and
`region-comparison-data` run their real `ChartDataManager` lifecycles against
a stubbed `fetch` (`stubNetworkFetch` in `test-fixtures.svelte.js`, with fake
timers for the request debounce and retry backoff), asserting which requests
each selection issues, exact windows, gap-aware widening, enable gating,
failure roll-up and retry.

Live-data E2E smoke: `tests/e2e/tracker.spec.js`. Deterministic response-order,
failure/retry, empty-data, history, resize, export-content and responsive checks:
`tests/e2e/tracker-refactor.spec.js`; region comparison flows:
`tests/e2e/tracker-regions.spec.js`; "Download data" correspondence for every
view, tab, display and style: `tests/e2e/tracker-downloads.spec.js`; the
chart card header (the hosted toolbar, header CSV, table view matching the
CSV, legends): `tests/e2e/tracker-card-header.spec.js`. The specs
share `tests/e2e/helpers/tracker.js`: the OE-shaped response synthesisers
(`trackerFixture`, `regionsFixture`), the hydration wait, card/table locators,
the Download data dialog flow (`download`, `downloadWorkbook`,
`workbookSheetNames`, and `expectDownloadsMatchCharts`, which checks the
dialog's rows against the page's registered elements and PNG charts) and the
horizontal-scroll check.

## Deferred

Nav-items entry (currently behind the `tracker_nav` flag); saved views.
