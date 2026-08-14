# Stratify Plot Builder

A chart builder for creating embeddable data visualisations from CSV/TSV data, powered by [Observable Plot](https://observablehq.com/plot/).

## Features

- **Chart types**: Line, Scatterplot, Area, Column, Stacked Columns, Grouped Columns, Bar, Stacked Bars, Grouped Bars, Waterfall, Horizontal Waterfall, Map (lat/lng point map)
- **Guided workflow**: Five focused steps take beginners from pasted data to a published or exported chart
- **Public documentation**: `/stratify/docs` explains every chart type and common configuration task without requiring sign-in
- **Reusable examples**: Every chart type has a versioned example with working data, a live preview and a signed-in “Use this example” hand-off
- **Per-series chart type**: Override the chart type for individual series (e.g. one series as a line, another as a bar)
- **Data input**: Paste CSV or tab-separated data (e.g. from Google Sheets)
- **Auto-detection**: Automatically detects dates vs categories, delimiter type
- **Themes**: Sans (DM Sans) and Mono (DM Mono) — control typography only
- **Colour palettes**: 30+ palettes — qualitative (OE Energy, Tableau 10, Set1–3, etc.), sequential (Blues, Greens, etc.), diverging (RdBu, Spectral, etc.)
- **Series config**: Customise colours, labels, visibility, chart type, line style, Y-axis assignment, and order per series
- **Line styles**: Per-series line style for line charts — solid, dashed, dotted, dash-dot, long-dash
- **Dual Y-axis**: Assign series to left or right Y-axis with independent scales and labels
- **Drag-to-reorder**: Reorder series via drag-and-drop (affects stacking order and legend)
- **Annotations**: End-labels, vertical rules, bar labels, point annotations
- **Axis controls**: Y/Y2 tick counts, min/max tick marks, X tick count/rotation/height
- **Legend toggle**: Show or hide the colour legend per chart (Series (Legend) & Tooltip panel → "Show legend")
- **Small multiples**: Split any chart type into panels by a CSV column (Plot `fx` faceting) — Chart panel → "Partition by"
- **Animate as one chart**: Toggle to render a single chart that morphs through partitions instead of small multiples (play/pause + drag scrubber, auto-play and auto-loop options, stable Y axis across frames)
- **Tooltip columns**: Select which columns appear in the tooltip, with formatted date display
- **Plot overrides**: Power-user JSON config for arbitrary Observable Plot customisation
- **Article embeds**: Native inline rendering (`strataEmbed`) and generic iframe (`embed`) in editorial articles
- **Multi-user**: Clerk JWT authentication, per-user chart ownership, superadmin controls
- **Community gallery**: Public gallery of published charts at `/strata-community`
- **Forking**: Fork published charts to create your own copy
- **Publishing**: Save to Sanity CMS, publish with shareable URL, iframe embed code
- **Export**: SVG, PNG, and JSON config export

## Architecture

### Route Structure

```
src/routes/(micro)/stratify/           # Builder UI (micro layout — no nav/footer)
├── +page.svelte                       # Chart list (card grid, thumbnails, per-section pagination)
├── +layout.svelte                     # Micro layout wrapper
├── new/                               # New chart builder (blank)
├── [id]/                              # Edit existing chart
├── docs/                              # Public examples and plain-language guides
├── _state/
│   ├── StratifyPlotProject.svelte.js  # Central state class (runes)
│   └── context.js                     # setContext/getContext helpers
├── _utils/
│   ├── api.js                         # Sanity CMS CRUD client (list, get, create, update, delete, fork)
│   ├── storage.js                     # localStorage + JSON file export/import
│   ├── export.js                      # SVG/PNG capture
│   ├── format.js                      # Date formatting (timeAgo)
│   └── examples.js                    # Built-in example datasets
└── _components/
    ├── BuilderPage.svelte             # Main layout; coordinates all panels, auto-save
    ├── ChartPreview.svelte            # Live chart preview
    ├── ChartTypeSelector.svelte       # Chart family/variant toggle
    ├── SeriesConfig.svelte            # Per-series colour, label, type, Y-axis, visibility
    ├── ColourPicker.svelte            # Shared colour picker: theme swatches + native + hex + reset (Series panel + map controls)
    ├── DataInput.svelte               # CSV/TSV textarea + data preview
    ├── ExamplePicker.svelte           # Example dataset buttons
    ├── ChartManager.svelte            # Full chart management modal
    ├── ChartCard.svelte               # List card: thumbnail + title/status/meta + actions
    ├── ChartThumbnail.svelte          # Scaled-down live chart preview (500×400 → card width); map placeholder
    ├── SectionPagination.svelte       # Prev/next pagination for one list section
    ├── StylePresetPicker.svelte       # Theme selector (sans/mono)
    ├── ColourPalettePicker.svelte     # Colour palette selector
    └── panels/
        ├── DataPanel.svelte           # Data input + examples
        ├── ChartPanel.svelte          # Chart type, style, axis controls, tooltip, advanced overrides
        ├── SeriesPanel.svelte         # Series customisation + drag-to-reorder
        ├── AnnotatePanel.svelte       # Annotation settings
        └── PublishPanel.svelte        # Save, publish/unpublish, share URL, embed code, export

src/routes/(main)/strata/[id]/         # Public chart detail page
├── +page.server.js                    # Loads published chart from Sanity
└── +page.svelte                       # Full chart view with header, metadata, source/notes

src/routes/(main)/strata-community/    # Community gallery
├── +page.server.js                    # Loads latest published charts
└── +page.svelte                       # Grid of chart cards

src/routes/(micro)/strata-embed/[id]/  # Bare embed route (iframe-friendly)
├── +page.server.js                    # Loads published chart from Sanity
└── +page.svelte                       # Minimal chart render (no nav/footer)

src/lib/stratify/                      # Stratify library
├── StrataChartView.svelte             # Unified chart view (used by preview, embed, strata page); forks Plot vs map
├── StrataChartCard.svelte             # Card component for published charts (header, chart, menu)
├── StratifyPlotChart.svelte           # Plot chart component (dual Y-axis, tooltips, annotations)
├── StratifyMapChart.svelte            # Map chart wrapper — CSV → PointMap points, size/colour scales
├── chart-data.js                      # safeParseJSON, normaliseChart, uniqueColumnValues (shared server-side)
├── chart-types.js                     # Chart type definitions and type constants (incl. MAP_TYPES)
├── chart-styles.js                    # Themes — sans (DM Sans) and mono (DM Mono)
├── colour-palette.js                  # Default colour assignment for series
├── colour-palettes.js                 # 30+ palettes (qualitative, sequential, diverging)
├── csv-parser.js                      # CSV/TSV parser with date/category detection
├── map-detection.js                   # Auto-detect lat/lng/label columns from headers + value ranges
├── plot-annotations.js                # Annotation processing + formatCompact
├── plot-overrides.js                  # PlotOverrides merge system
└── *.test.js                          # Co-located tests

src/lib/components/map/                # Generic point-map components (MapLibre)
├── PointMap.svelte                    # Lat/lng marker map with popup-on-click, theme + fit-bounds
├── collapse-attribution.js            # Collapse MapLibre's compact attribution control on load
└── types.js                           # Shared MapPoint typedef

src/lib/components/charts/plot/        # Shared Observable Plot utilities (used by Stratify + facility-plot)
├── PlotChart.svelte                   # Low-level Plot wrapper
├── plot-action.js                     # Svelte action for Observable Plot
├── plot-configs.js                    # Chart config factories (area, line, bar, dot, mixed)
├── plot-gridlines.js                  # Gridline computation
├── plot-overlays.js                   # Night shading overlays
└── Plot*.svelte.js                    # Options, theme, interaction, sync state

src/lib/components/text-components/    # Article content rendering
├── RichText.svelte                    # Portable Text renderer (strataEmbed + embed blocks)
├── StrataEmbed.svelte                 # Native Stratify chart embed for articles
└── Image.svelte                       # Image block handler
```

## Public documentation and templates

The public learning site lives at `/stratify/docs`. Its catalogue is generated
from `src/lib/stratify/example-catalogue.js`, which is the single source of
truth for built-in example data, chart configuration and learning copy. The
catalogue includes at least one complete example for every supported top-level
chart type. A small curated list of published `/strata/[id]` charts supplements
those examples; failed or unpublished community examples are omitted without
preventing the rest of the docs from loading.

Each example page includes a live preview, guidance on when to use the chart,
the source CSV and a five-step configuration walkthrough. **Use this example**
opens `/stratify/new?template=<slug>`. After authentication, the builder loads
the configuration as a new unsaved draft and never edits or republishes the
source chart. Built-in templates load locally; community templates are fetched
through the authenticated chart API.

The editor follows the same five-part structure as the documentation:

1. **Add data** — paste CSV or TSV data and check the parsed table.
2. **Choose a chart** — select a chart type using visual cards and suitability guidance.
3. **Make it clear** — configure axes, number formats, colours and series.
4. **Add context** — add sources, notes and data-driven annotations.
5. **Share** — save, publish, embed or export the finished chart.

## Chart Types

| Value                  | Family    | Description                            |
| ---------------------- | --------- | -------------------------------------- |
| `line`                 | Line      | Multi-series line chart                |
| `scatter`              | Scatter   | Multi-series fixed or bubble points    |
| `area`                 | Area      | Stacked area (time-series)             |
| `column`               | Column    | Vertical bars                          |
| `column-stacked`       | Column    | Stacked vertical bars                  |
| `column-grouped`       | Column    | Grouped vertical bars                  |
| `bar`                  | Bar       | Horizontal bars                        |
| `bar-stacked`          | Bar       | Stacked horizontal bars                |
| `bar-grouped`          | Bar       | Grouped horizontal bars                |
| `waterfall`            | Waterfall | Running-cumulative vertical bars       |
| `waterfall-horizontal` | Waterfall | Running-cumulative horizontal bars     |
| `map`                  | Map       | Lat/lng point map (MapLibre, not Plot) |

Time-series types (`area`, `line`, `scatter`) auto-detect dates from the first column. Column and bar charts support both time-series and category modes. Horizontal bar types use `barX` in Observable Plot; column types use `barY`/`rectY`. The `map` type takes a different render path entirely — see [Map Chart Type](#map-chart-type) below.

## Line Min/Max Range Bands

Line charts can render one shaded envelope behind the visible lines. In **Data
Encoding**, choose numeric **Range minimum** and **Range maximum** columns, then
set the **Range opacity**. The bound columns are excluded from the rendered
Y-series list but remain available in the nearest-X tooltip. The band follows
the selected line curve, facets and data transform, and inherits the first
visible line's colour. Clearing either mapping disables it.

The range fields persist in previews, published Strata pages and embeds as
`lineRangeMinColumn`, `lineRangeMaxColumn` and `lineRangeOpacity`. Missing or
non-numeric mappings are cleared when CSV columns change.

## Scatterplot Chart Type

`scatter` uses the same X/Y mappings, multi-series colours and labels, linear,
temporal and ordinal X modes, axes, dual axes, facets, annotations and layout
controls as a line chart. Its Data Encoding controls replace curve styling with
a fixed point radius and opacity. Choosing a numeric **Size by** column enables
bubbles, square-root scaled from `scatterMinRadius` to `scatterMaxRadius`; the
size column is excluded from the Y-series list. Invalid size values use the
minimum radius, while a constant size column uses `scatterPointRadius`.

The built-in **Temperature and electricity demand (bubble scatter)** example is
synthetic illustrative data. It plots mean temperature as linear X, NSW and
Victorian demand as the two Y series, and total NEM demand as shared bubble size:

```csv
Mean temperature (°C),NSW demand (MW),VIC demand (MW),NEM demand (MW)
14,6900,4700,21100
16,7100,4900,21800
18,7350,5100,22600
20,7600,5350,23400
22,7900,5600,24300
24,8350,5900,25500
26,8900,6300,27000
28,9600,6900,29100
30,10400,7600,31600
32,11300,8400,34400
34,12100,9200,37100
```

The nearest-point tooltip reports the series, X, Y and selected size value. A
compact size legend is shown alongside the series legend when legends are on.
Legacy saved charts with the old top-level `dot` value still migrate to `line`;
only the new canonical `scatter` value enables this chart type.

## Data-driven Annotations

The **Annotations** panel accepts a second CSV/TSV dataset for coloured event
rules and point callouts. The dataset uses X/date and label columns, with an
optional type and Y value, which are mapped independently of the main chart
data. Common header names are detected automatically.

```csv
type,date,label,y
rule,2026-07-01T21:20:00+10:00,Generation high: 9:20pm 1 Jul,
rule,2026-07-02T05:20:00+10:00,Availability high: 5:20am 2 Jul,
point,2026-07-02T00:00:00+10:00,Explicit value,10500
```

Rule labels are automatically staggered into non-overlapping lanes above the
plot. Point rows default to the Y value mapped from the annotation CSV. Their
**Position by** option can instead resolve a selected chart series at the
nearest temporal/linear X value. The per-row **Annotation options** controls set
each colour, position mode, series and left/right axis. The colour applies to
the rule/marker, connector and label.

Appearance controls set the fallback colour, line style and width, label size
and weight, and point radius. Data annotations support Plot charts with a
horizontal X axis and replicate across facets and animation frames. Maps and
horizontal bar/waterfall charts do not render data annotations. The existing
legacy `annotations` array remains supported for old saved charts.

## Map Chart Type

The `map` chart type renders each CSV row as a marker on a MapLibre basemap (powered by `svelte-maplibre-gl` and the same `/map-styles/{positron,dark-matter,satellite}.json` styles used by the Facilities page). It runs through a parallel render path — `StrataChartView` forks on `MAP_TYPES.has(chartType)` to `StratifyMapChart.svelte` → `PointMap.svelte` instead of the Observable Plot pipeline.

### CSV format

No new schema — the user picks which CSV columns are latitude, longitude, label, size, and colour-group via dropdowns in the Chart panel.

```csv
name,lat,lng,capacity_mw,fueltech
Bayswater,-32.394,150.949,2640,coal
Liddell,-32.378,150.978,2000,coal
Hornsdale,-33.105,138.310,150,battery
```

### Auto-detection

When the user switches the chart type to `map`, an `$effect` in `StratifyPlotProject` runs once and seeds `latColumn`, `lngColumn`, `labelColumn` if they're still `null`. Detection rules (see `map-detection.js`):

- **Latitude**: header matches `/^(lat|latitude|y)$/i` AND values fall in `[-90, 90]`
- **Longitude**: header matches `/^(lng|lon|long|longitude|x)$/i` AND values fall in `[-180, 180]`
- **Label**: first non-numeric column

Already-set values are not overwritten on CSV edit — manual choices stick.

### Column-to-role mapping

| Field            | Type             | Purpose                                                       |
| ---------------- | ---------------- | ------------------------------------------------------------- |
| `latColumn`      | `string \| null` | Marker latitude (numeric column)                              |
| `lngColumn`      | `string \| null` | Marker longitude (numeric column)                             |
| `labelColumn`    | `string \| null` | Popup title                                                   |
| `sizeColumn`     | `string \| null` | Numeric column driving marker radius (sqrt scale)             |
| `colourColumn`   | `string \| null` | Colour column — categorical (`category`) or numeric (`range`) |
| `tooltipColumns` | `string[]`       | Columns rendered as key/value rows in the popup               |

### Marker sizing

When `sizeColumn` is set, marker radius interpolates via `d3-scale.scaleSqrt()` from `[min, max]` of the column to `[mapMinRadius, mapMaxRadius]` (defaults 4–24px). When unset, every marker uses the midpoint.

### Marker colour

| `mapColourMode` | Behaviour                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'single'`      | Every marker uses `singleMarkerColour` (single colour-picker UI)                                                                                                                |
| `'category'`    | Group by unique values of `colourColumn`; assign palette colours; per-group overrides via `userSeriesColours` (reuses the same per-series swatch UI from `SeriesConfig.svelte`) |
| `'range'`       | Interpolate colour across the numeric `colourColumn` via `d3-scale.scaleLinear` + `interpolateLab`, from `mapRangeMinColour` (lowest value) to `mapRangeMaxColour` (highest)    |

### First-column popup quirk

The CSV parser stores the first column under a synthetic key (`category` / `linear` / `_dateStr`) instead of the column's display key. `StratifyMapChart` aliases the synthetic value back onto the display key on every row (`rowsWithFirstColAliased`) so picking the first column for lat / lng / label / size / colour / popup all works uniformly.

### Sanity persistence

The 12 map fields (`latColumn`, `lngColumn`, `labelColumn`, `sizeColumn`, `mapColourMode`, `colourColumn`, `singleMarkerColour`, `mapRangeMinColour`, `mapRangeMaxColour`, `mapMinRadius`, `mapMaxRadius`, `mapTheme`) round-trip through Sanity via `POST /api/stratify/charts`, `PATCH /api/stratify/charts/:id`, and `normaliseChart()` in `chart-data.js`. They're also covered by `StratifyPlotProject.toJSON()` / `loadFromSnapshot()` and the `reset()` defaults.

## Waterfall Chart Type

`waterfall` (vertical) and `waterfall-horizontal` (horizontal) draw running-cumulative
bars: each bar is offset by the prior total, so sequential contributions build to a final
value. `createWaterfallOptions` in `plot-configs.js` precomputes each bar's `start`/`end`
and draws an interval mark (`barY` with `y1/y2`, or `barX` with `x1/x2`) — it does not use
Plot's stack transform. Connector lines and a per-bar change label are drawn automatically
(value labels go above starting/increase/total bars, below decrease bars).

### Aggregation (`waterfallMode`)

| Value     | Behaviour                                                           |
| --------- | ------------------------------------------------------------------- |
| `single`  | First (or chosen) series only — one bar per row                     |
| `sum`     | Sum of all series per row — one bar per row                         |
| `stacked` | Every series stacked within each step (per-column, series-coloured) |

A full-height **Total** bar (anchored at 0) is appended when `waterfallShowTotal` is on.
In `sum`/`stacked` modes the single-series Y-axis selector is hidden (all series consumed).

### Colouring (`waterfallColourMode`, single/sum only)

- `semantic` (default) — bars coloured by role: **starting**, **increase**, **decrease**,
  **total**. Starting & total share a colour; the first three theme colours are the
  defaults. The Series panel shows four editable role swatches.
- `series` — each CSV row is its own legend entry, colourable individually (defaults to one
  base colour). Row colours/labels persist in `userSeriesColours`/`userSeriesLabels` keyed by
  category. `stacked` always colours per-column regardless of this setting.

Both the per-row and semantic colour/label derivations exist in `StratifyPlotProject`
(builder state, feeds `SeriesConfig` swatches) and in `StrataChartView` (snapshot render,
passes `waterfallRowColours` / `waterfallSemanticColours` etc. as props) — the same
snapshot-boundary split used by the colour-series logic.

### Displayed-value format (`valueFormat`)

`valueFormat` (Data panel → "Number format") controls how numeric values render in
**all** chart tooltips, in waterfall labels, and in the map legend's range min/max: `auto`
(Plot default), `0`–`3` fixed decimals, or `compact` (reuses `formatCompact`). Default `1`.
Implemented by `makeValueFormatter` in `plot-configs.js`, threaded through `buildTooltipChannels`
and (for maps) `StratifyMapChart`'s legend descriptor.

### Sanity persistence

`waterfallMode`, `waterfallShowTotal`, `waterfallColourMode`, and `valueFormat` round-trip
through `POST` / `PATCH /api/stratify/charts`, `StratifyPlotProject.toJSON()` /
`loadFromSnapshot()`, the `reset()` defaults, **and `normaliseChart()` in `chart-data.js`**
(the published `/strata/{id}` + embed render path — missing fields there fall back to single
colour) — same pattern as the other scalar fields.

## Per-Series Chart Type Override

Each series can use a different chart type. The global `chartType` acts as the default; individual series override via `seriesChartTypes`.

### Supported Series Mark Types

| Value    | Mark         | Behaviour                        |
| -------- | ------------ | -------------------------------- |
| `'area'` | Stacked area | Stacked with other area series   |
| `'line'` | Line         | Overlaid on top                  |
| `'bar'`  | Bar          | Grouped when multiple bar series |
| `'dot'`  | Dot/scatter  | Overlaid on top                  |

### Usage

```svelte
<StratifyPlotChart
	data={parsed.data}
	seriesNames={['solar', 'wind', 'demand']}
	seriesColours={colours}
	seriesLabels={labels}
	chartType="line"
	seriesChartTypes={{ demand: 'bar', solar: 'dot' }}
/>
```

### How Mixing Works

When `seriesChartTypes` has entries, the renderer calls `createMixedMarkOptions()` which:

1. Partitions series by their effective mark type (per-series override or global default)
2. Creates Observable Plot marks for each group:
   - Area series are stacked together via `stackY()`
   - Bar series use stacked bars (category) or simple bars (time-series)
   - Line and dot series are overlaid
3. Stacked marks render first, then line/dot overlay on top
4. All series share the same colour scale

### Builder UI

In the Series panel, each series row has a dropdown to set its chart type:

- **Default** — inherits from the global chart type selector
- **Line**, **Area**, **Bar**, **Dot** — overrides this specific series

## Per-Series Line Styles

Line chart series can use different stroke styles to improve readability (especially for print or greyscale).

### Available Styles

| Value       | Label     | SVG `stroke-dasharray` |
| ----------- | --------- | ---------------------- |
| `solid`     | Solid     | _(none)_               |
| `dashed`    | Dashed    | `8,4`                  |
| `dotted`    | Dotted    | `2,2`                  |
| `dash-dot`  | Dash-Dot  | `8,4,2,4`              |
| `long-dash` | Long Dash | `12,6`                 |

### Data Model

- `seriesLineStyles: Record<string, string>` — per-series line style override (default: `{}`, all solid)
- Only applies to series that render as lines (global `chartType` is `line`, or series has `seriesChartTypes[key] === 'line'`)

### How It Works

When any series has a non-solid style, the renderer groups series by their dasharray value and creates separate `lineY()` marks per group. When all series are solid (the common case), the existing single-mark path is used with zero overhead.

### Builder UI

In the Series panel, each series row shows a line style dropdown when the series will render as a line. The dropdown hides when the chart type changes to a non-line type, but the style data persists for round-trip fidelity.

## Dual Y-Axis

Series can be assigned to the left or right Y-axis. When any series is on the right axis, the chart renders two independent Y scales.

### How It Works

1. Right-axis series data is rescaled to fit the left-axis domain using `d3.scaleLinear`
2. A right-side `axisY` mark renders tick labels showing the original (unscaled) values via `y2Scale.invert()`
3. The default left axis is suppressed and re-added explicitly so both axes render
4. Right axis margin (40px) is added automatically

### Data Model

- `seriesYAxis: Record<string, 'left' | 'right'>` — per-series axis assignment (default: all left, stored as empty `{}`)
- `y2Label: string` — right Y-axis label

### Axis Controls

| Setting          | Description                                       |
| ---------------- | ------------------------------------------------- |
| Y-axis ticks     | Number of left Y-axis ticks (0 = auto)            |
| Y min/max ticks  | Show only min and max tick marks on left axis     |
| Y2-axis label    | Right Y-axis label (shown when right axis exists) |
| Y2-axis ticks    | Number of right Y-axis ticks (0 = auto)           |
| Y2 min/max ticks | Show only min and max tick marks on right axis    |

### Builder UI

In the Series panel, each series row has an L/R dropdown to set its Y-axis. The Chart panel shows Y2-axis label and tick controls when any series is assigned to the right.

## Tooltip Columns and Date/Time Formatting

The Series panel includes a Tooltip section with checkboxes for each data column. Unchecking a column removes it from the tooltip.

- Empty selection (all checked) = show all columns (default)
- Time-series charts can format the X value as **Date** (`1 January 2025`), **Time (24-hour)** (`18:00`), or **Date + time (24-hour)** (`1 January 2025, 18:00`)
- ISO-like timezone-qualified input preserves the wall-clock value written in the CSV; `2026-07-01T18:00:00+10:00` therefore displays `18:00` in Time mode
- The tooltip uses Observable Plot's channel system with `pointerX` for x-snapping

All temporal chart axes use an explicit `en-AU` formatter rather than
Observable Plot's U.S. English default. The formatter adapts to the data span:
short charts use 24-hour time, multi-day charts use date + time, then wider
ranges use day/month, month/year or year labels. Timezone-qualified CSV input
is shifted back to its written wall-clock value for axis labels as well as
tooltips. Default temporal ticks are selected from source timestamps, avoiding
UTC-aligned drift such as `01:00, 04:00…` for `+10:00` hourly data.

## Small Multiples (Faceting)

Use **Chart panel → Data Encoding → Partition by** to split the chart into one panel per unique value of a CSV column. This uses Observable Plot's `fx` faceting and works for every chart type (line, area, column, bar, mixed, dot).

### Data shape

The CSV needs one row per (X position × facet value), with the numeric series in the remaining columns. The facet column is automatically excluded from the Y-series picker.

Sample stacked-area dataset (4 regions × 6 months × 3 fuel techs):

```csv
Region,Date,Solar,Wind,Coal
NSW,2024-01-01,180,320,720
NSW,2024-02-01,195,305,710
NSW,2024-03-01,210,290,700
NSW,2024-04-01,225,275,690
NSW,2024-05-01,240,260,680
NSW,2024-06-01,255,245,670
VIC,2024-01-01,140,380,520
VIC,2024-02-01,150,365,510
VIC,2024-03-01,160,350,500
VIC,2024-04-01,170,335,490
VIC,2024-05-01,180,320,480
VIC,2024-06-01,190,305,470
QLD,2024-01-01,260,180,840
QLD,2024-02-01,275,170,830
QLD,2024-03-01,290,160,820
QLD,2024-04-01,305,150,810
QLD,2024-05-01,320,140,800
QLD,2024-06-01,335,130,790
SA,2024-01-01,220,420,180
SA,2024-02-01,230,410,175
SA,2024-03-01,240,400,170
SA,2024-04-01,250,390,165
SA,2024-05-01,260,380,160
SA,2024-06-01,270,370,155
```

### Builder workflow with this CSV

1. Paste the CSV into the Data panel.
2. In the Chart panel: set X Axis = `Date` (Temporal), Y Axis = `All`, **Partition by** = `Region`.
3. Pick chart type = Area (stacked).
4. Result: four stacked-area panels (NSW / VIC / QLD / SA) wrapping horizontally with a shared colour legend and shared axes.

### Partition by vs Z Colour

Both pickers consume a column. They're mutually exclusive in the picker — selecting a column for one removes it from the other's options.

| Picker       | What it does                                                               |
| ------------ | -------------------------------------------------------------------------- |
| Z Colour     | Splits one value column by the picked column, colouring each group         |
| Partition by | Splits the whole chart by the picked column, rendering one panel per group |

### Limitations

- **Annotations** replicate across panels — per-panel annotation editing isn't supported yet.
- **Dual Y-axis** is single-panel only — combining it with Partition by is not recommended.
- **Grouped column / bar** charts (`column-grouped`, `bar-grouped`) already use one of Plot's facet axes for their own grouping. When you also pick a Partition by column, the chart becomes a 2-D grid (facet on one axis, category grouping on the other). This can feel tight at narrow widths.

## Article Embeds

Stratify charts can be embedded in editorial articles via two Sanity content block types:

### `strataEmbed` (native rendering)

Renders the chart inline using `StrataEmbed.svelte`. Chart data is preloaded server-side in the article page load function.

- Sanity fields: `chartId` (required), `caption` (optional)
- Chart data fetched via `normaliseChart()` from `$lib/stratify/chart-data.js`
- Full interactivity, shared theme with article page

### `embed` (iframe)

Renders an `<iframe>` for any URL, including `/strata/{id}` URLs.

- Sanity fields: `url` (required), `height` (optional, default 520px)
- Works with any external URL

### Rendering

Both block types are handled in `RichText.svelte` with full-width (`max-w-full`) containers and `border border-mid-warm-grey rounded-lg` styling.

## Series Reordering

Series can be reordered by dragging in the Series panel. The order affects:

- **Stacking order** — for stacked area and stacked bar charts, the bottom-to-top order follows the series list
- **Legend order** — the colour legend respects the series order
- **Tooltip order** — series values in tooltips follow the same order

### Data Model

The `seriesOrder` field is an array of series name strings. When empty (default), the CSV column order is used. When set, it overrides the display order while gracefully handling CSV changes:

- Series removed from the CSV are dropped from the order
- New series added to the CSV are appended at the end

### Persistence

`seriesOrder` is included in the snapshot and persisted to Sanity CMS.

---

## Extended Plot Configuration (plotOverrides)

Power users can pass raw Observable Plot configuration via the `plotOverrides` field. This is a JSON object that gets deep-merged into the factory output.

### Scale Overrides

Override any scale property (x, y, color, r, opacity, fx, fy):

```json
{
	"x": { "type": "log", "label": "Population", "nice": true },
	"y": { "type": "sqrt", "grid": true, "tickFormat": ".0f" },
	"color": { "scheme": "blues" },
	"fx": { "label": null, "padding": 0.2 }
}
```

Supported scale properties: `type`, `domain`, `range`, `label`, `grid`, `nice`, `zero`, `reverse`, `tickFormat`, `ticks`, `tickRotate`.

### Layout

```json
{
	"layout": {
		"title": "Chart Title",
		"subtitle": "A subtitle",
		"caption": "Source: data.gov.au",
		"marginTop": 20,
		"marginRight": 40,
		"marginBottom": 30,
		"marginLeft": 60,
		"insetTop": 5,
		"insetRight": 10
	}
}
```

### Extra Marks (Declarative)

Add arbitrary Observable Plot marks via `extraMarks`. Each mark is a serialisable spec:

```json
{
	"extraMarks": [
		{
			"markType": "rule-y",
			"data": [100],
			"options": { "stroke": "red", "strokeDasharray": "4,3" }
		},
		{
			"markType": "text",
			"data": [{ "x": "2024-06-01", "y": 5000 }],
			"channels": { "x": "x", "y": "y" },
			"options": { "text": "Peak", "fill": "red", "dy": -10 }
		}
	]
}
```

### Supported Mark Types

| Category | Mark Types                                                          |
| -------- | ------------------------------------------------------------------- |
| Dot      | `dot`, `dot-x`, `dot-y`                                             |
| Line     | `line`, `line-x`, `line-y`                                          |
| Area     | `area`, `area-x`, `area-y`                                          |
| Bar      | `bar-x`, `bar-y`                                                    |
| Rect     | `rect`, `rect-x`, `rect-y`                                          |
| Cell     | `cell`, `cell-x`                                                    |
| Text     | `text`, `text-x`, `text-y`                                          |
| Rule     | `rule-x`, `rule-y`                                                  |
| Tick     | `tick-x`, `tick-y`                                                  |
| Other    | `frame`, `arrow`, `vector`, `link`, `image`, `waffle-x`, `waffle-y` |

### PlotMarkSpec Format

```typescript
{
  markType: string       // See table above
  data?: any[]           // Data array (omit for standalone marks like frame)
  channels?: object      // Channel mappings (x, y, fill, stroke, r, text, etc.)
  options?: object       // Additional options (strokeWidth, dx, dy, etc.)
}
```

### Builder UI

In the Chart panel, expand the **Advanced** section to edit `plotOverrides` as raw JSON. The chart updates live as you type. Invalid JSON is highlighted with an error message.

## Snapshot Schema (v2)

The JSON format used for persistence (localStorage, file export, Sanity CMS):

```json
{
	"version": 2,
	"csvText": "Date,Solar,Wind\n2024-01-01,150,200\n...",
	"annotationCsvText": "type,date,label,y\nrule,2024-01-01,Start,",
	"annotationMappings": {
		"typeColumn": "type",
		"xColumn": "date",
		"labelColumn": "label",
		"yColumn": "y",
		"defaultType": "rule"
	},
	"annotationRowOptions": {
		"2": { "colour": "#5b9f7b", "positionBy": "y", "axis": "left" }
	},
	"annotationStyle": {
		"defaultColour": "#666666",
		"lineStyle": "dashed",
		"lineWidth": 1,
		"fontSize": 11,
		"fontWeight": "normal",
		"pointRadius": 4
	},
	"title": "AU Electricity Generation",
	"description": "Monthly generation mix.",
	"dataSource": "Open Electricity",
	"notes": "Values in GWh.",
	"chartType": "area",
	"displayMode": "auto",
	"stylePreset": "sans",
	"colourPalette": "oe-energy",
	"hiddenSeries": [],
	"userSeriesColours": { "solar": "#f28e2b" },
	"userSeriesLabels": { "solar": "Solar PV" },
	"seriesChartTypes": { "demand": "bar" },
	"seriesLineStyles": { "wind": "dashed" },
	"plotOverrides": { "y": { "type": "log" } },
	"seriesOrder": ["wind", "solar", "demand"],
	"chartHeight": 400,
	"xTicks": 0,
	"xTickRotate": 0,
	"marginBottom": 0,
	"yTicks": 0,
	"yMinMax": false,
	"y2Ticks": 0,
	"y2MinMax": false,
	"colourSeries": null,
	"xLabel": "",
	"yLabel": "",
	"seriesYAxis": { "demand": "right" },
	"y2Label": "Demand (MW)",
	"tooltipColumns": ["solar", "wind"],
	"tooltipDateFormat": "date",
	"showLegend": true,
	"facetColumn": null,
	"animateAsOneChart": false,
	"lineRangeMinColumn": null,
	"lineRangeMaxColumn": null,
	"lineRangeOpacity": 0.2,
	"scatterSizeColumn": null,
	"scatterPointRadius": 4,
	"scatterMinRadius": 3,
	"scatterMaxRadius": 18,
	"scatterPointOpacity": 0.7,
	"latColumn": null,
	"lngColumn": null,
	"labelColumn": null,
	"sizeColumn": null,
	"mapColourMode": "single",
	"colourColumn": null,
	"singleMarkerColour": "#3b82f6",
	"mapMinRadius": 4,
	"mapMaxRadius": 24,
	"mapTheme": "light"
}
```

### Migration from v1

v1 snapshots are fully backward compatible. Missing fields get defaults:

- `seriesChartTypes` defaults to `{}` (all series use global type)
- `seriesLineStyles` defaults to `{}` (all series solid)
- `plotOverrides` defaults to `null` (no overrides applied)
- `seriesOrder` defaults to `[]` (use CSV column order)
- `seriesYAxis` defaults to `{}` (all series on left axis)
- `y2Label` defaults to `''`
- `yTicks`, `y2Ticks` default to `0` (auto)
- `yMinMax`, `y2MinMax` default to `false`
- `tooltipColumns` defaults to `[]` (show all)
- `tooltipDateFormat` defaults to `'date'`; supported values are `'date'`, `'time'`, and `'date-time'`
- `showLegend` defaults to `true` (legend visible — preserves prior behaviour)
- `facetColumn` defaults to `null` (no faceting — single-panel render as before)
- `animateAsOneChart` defaults to `false` (small multiples instead of animated single chart)
- `animationAutoPlay` defaults to `false` (animation does not start until the user clicks play)
- `animationTween` defaults to `true` (chart smoothly interpolates between facet frames; set `false` to jump directly between frames)
- `facetPanelsPerRow` defaults to `0` (auto-fit columns based on container width and `MIN_PANEL_WIDTH`)
- `chartBorderWidth` defaults to `0.5` (faint stroke around bar/column/area marks; `0` = none, accepts fractional values)
- `chartBorderColour` defaults to `#000000` (stroke colour applied when `chartBorderWidth > 0`)
- `lineRangeMinColumn` and `lineRangeMaxColumn` default to `null`; `lineRangeOpacity` defaults to `0.2`
- `scatterSizeColumn` defaults to `null`; point radius defaults to `4`, bubble radii to `3`–`18`, and point opacity to `0.7`
- `latColumn`, `lngColumn`, `labelColumn`, `sizeColumn`, `colourColumn` default to `null` (map chart type only)
- `mapColourMode` defaults to `'single'` (one colour for every marker)
- `singleMarkerColour` defaults to `'#3b82f6'`
- `mapMinRadius` / `mapMaxRadius` default to `4` / `24` (px range when `sizeColumn` is set)
- `mapTheme` defaults to `'light'` (basemap style — `'dark'` and `'satellite'` also supported)

## Data Format

The CSV parser expects:

- **First row**: Column headers
- **First column**: Dates (ISO 8601, `DD/MM/YYYY`, `d MMM yyyy`, `YYYY`, etc.) or text categories
- **Remaining columns**: Numeric series values
- **Quoted fields**: Surrounding double or single quotes are stripped automatically

```
Date,Solar,Wind,Coal
2024-01-01,150,200,300
2024-01-02,160,180,290
```

Tab-separated data (pasted from spreadsheets) is also supported.

## Themes & Colour Palettes

### Themes (`stylePreset`)

| ID     | Name | Font    | Description              |
| ------ | ---- | ------- | ------------------------ |
| `sans` | Sans | DM Sans | Clean sans-serif default |
| `mono` | Mono | DM Mono | Technical monospace      |

Themes control typography and gridline styling only. Data colours are handled separately by the palette system.

### Colour Palettes (`colourPalette`)

**Qualitative** (fixed colour arrays): `oe-energy`, `oe-secondary`, `tableau10`, `set1`, `set2`, `set3`, `paired`, `dark2`, `pastel1`, `pastel2`, `accent`

**Sequential** (interpolated for any N): `blues`, `greens`, `oranges`, `purples`, `reds`, `greys`, `ylgn`, `ylorrd`, `bugn`, `pubu`

**Diverging**: `rdbu`, `rdylgn`, `brbg`, `piyg`, `prgn`, `rdylbu`, `spectral`

The `oe-energy` palette is the default, with 12 hand-picked colours inspired by fuel technology colours.

## Multi-User & Permissions

All API requests require **Clerk JWT** authentication. Charts are owned by the creating user.

| Action                 | Owner | Other Users | Superadmin |
| ---------------------- | ----- | ----------- | ---------- |
| Create chart           | Yes   | Yes         | Yes        |
| Read own charts        | Yes   | —           | Yes (all)  |
| Read others' published | Yes   | Yes         | Yes        |
| Read others' drafts    | No    | No          | Yes        |
| Edit own chart         | Yes   | —           | —          |
| Delete own chart       | Yes   | —           | Yes (any)  |
| Fork published chart   | Yes   | Yes         | Yes        |
| Fork others' draft     | No    | No          | Yes        |

### Chart Listings

- **My Charts**: User's own drafts + published charts
- **Community Charts**: Published charts from all other users (superadmins see all statuses)
- Each section is paginated independently (12 per page) with state in URL query
  params (`?myPage=2&communityPage=3`); search (`q`) and status filters are applied
  server-side via GROQ and span all pages
- Cards show a scaled-down live thumbnail of the chart (map charts show a static
  placeholder to avoid spinning up a WebGL context per card)

## Publishing Workflow

1. Build chart in the builder at `/stratify/new` or `/stratify/{id}` (CSV data, chart config, metadata)
2. Auto-save (debounced 3s) persists to Sanity CMS as a draft
3. Publish — sets status to `published`, generates shareable URLs
4. **Share URL**: `/strata/{chartId}` — full chart detail page with header, metadata
5. **Embed URL**: `/strata-embed/{chartId}` — bare iframe-friendly page
6. **Embed code**: `<iframe src="/strata-embed/{chartId}" width="100%" height="520" frameborder="0" style="border:0;max-width:1024px"></iframe>`
7. Published charts appear in the community gallery at `/strata-community`

## Community Gallery

The `/strata-community` page displays the 10 most recently published charts in a grid layout. Each chart card shows the title, description, author, and publish date, linking through to the full `/strata/{id}` detail page.

## API Endpoints

| Method | Path                            | Description                                                                                                                                              |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/stratify/charts`          | List user's + community charts (paginated per section via `scope`, `myPage`, `communityPage`, `pageSize`, `q`, `status`; items are full normalised docs) |
| POST   | `/api/stratify/charts`          | Create new chart                                                                                                                                         |
| GET    | `/api/stratify/charts/:id`      | Get single chart                                                                                                                                         |
| PATCH  | `/api/stratify/charts/:id`      | Update chart fields                                                                                                                                      |
| DELETE | `/api/stratify/charts/:id`      | Delete chart                                                                                                                                             |
| POST   | `/api/stratify/charts/:id/fork` | Fork chart to current user                                                                                                                               |

All endpoints require Clerk JWT authentication.

## Sanity Storage

`stratifyChart` documents are stored in the same Sanity dataset as the rest of the
CMS content (`PUBLIC_SANITY_DATASET`), but they are **schemaless** — there is no
`stratifyChart` type registered in the deployed Sanity schema, and no Sanity Studio
editor UI for them. The Stratify builder is the only editor; documents are created
and patched directly via the API endpoints above. Adding a new field requires no
schema change — extend the snapshot in `StratifyPlotProject.toJSON()` /
`loadFromSnapshot()`, the normaliser in `chart-data.js`, and the POST/PATCH
endpoints; the new field round-trips through Sanity automatically.
