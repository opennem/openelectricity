# Stratify Plot Builder

A chart builder for creating embeddable data visualisations from CSV/TSV data, powered by [Observable Plot](https://observablehq.com/plot/).

## Features

- **Chart types**: Line, Area, Column, Stacked Columns, Grouped Columns, Bar, Stacked Bars, Grouped Bars
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
├── +page.svelte                       # Chart list + new chart entry point
├── +layout.svelte                     # Micro layout wrapper
├── new/                               # New chart builder (blank)
├── [id]/                              # Edit existing chart
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
    ├── DataInput.svelte               # CSV/TSV textarea + data preview
    ├── ExamplePicker.svelte           # Example dataset buttons
    ├── ChartManager.svelte            # Full chart management modal
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
├── StrataChartView.svelte             # Unified chart view (used by preview, embed, strata page)
├── StrataChartCard.svelte             # Card component for published charts (header, chart, menu)
├── StratifyPlotChart.svelte           # Chart component (dual Y-axis, tooltips, annotations)
├── chart-data.js                      # safeParseJSON, normaliseChart (shared server-side)
├── chart-types.js                     # Chart type definitions and type constants
├── chart-styles.js                    # Themes — sans (DM Sans) and mono (DM Mono)
├── colour-palette.js                  # Default colour assignment for series
├── colour-palettes.js                 # 30+ palettes (qualitative, sequential, diverging)
├── csv-parser.js                      # CSV/TSV parser with date/category detection
├── plot-annotations.js                # Annotation processing + formatCompact
├── plot-overrides.js                  # PlotOverrides merge system
└── *.test.js                          # Co-located tests

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

## Chart Types

| Value              | Family | Description                              |
| ------------------ | ------ | ---------------------------------------- |
| `line`             | Line   | Multi-series line chart                  |
| `area`             | Area   | Stacked area (time-series)               |
| `column`           | Column | Vertical bars                            |
| `column-stacked`   | Column | Stacked vertical bars                    |
| `column-grouped`   | Column | Grouped vertical bars                    |
| `bar`              | Bar    | Horizontal bars                          |
| `bar-stacked`      | Bar    | Stacked horizontal bars                  |
| `bar-grouped`      | Bar    | Grouped horizontal bars                  |

Time-series types (`area`, `line`) auto-detect dates from the first column. Column and bar charts support both time-series and category modes. Horizontal bar types use `barX` in Observable Plot; column types use `barY`/`rectY`.

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

## Tooltip Columns

The Chart panel includes a "Tooltip columns" section with checkboxes for each data column. Unchecking a column removes it from the tooltip.

- Empty selection (all checked) = show all columns (default)
- Date columns display as "Date" in the picker and show formatted dates (`1 Jan 2025`) in the tooltip
- The tooltip uses Observable Plot's channel system with `pointerX` for x-snapping

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

| Picker         | What it does                                                              |
| -------------- | ------------------------------------------------------------------------- |
| Z Colour       | Splits one value column by the picked column, colouring each group        |
| Partition by   | Splits the whole chart by the picked column, rendering one panel per group |

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
	"showLegend": true,
	"facetColumn": null,
	"animateAsOneChart": false
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
- `showLegend` defaults to `true` (legend visible — preserves prior behaviour)
- `facetColumn` defaults to `null` (no faceting — single-panel render as before)
- `animateAsOneChart` defaults to `false` (small multiples instead of animated single chart)
- `animationAutoPlay` defaults to `false` (animation does not start until the user clicks play)
- `facetPanelsPerRow` defaults to `0` (auto-fit columns based on container width and `MIN_PANEL_WIDTH`)
- `chartBorderWidth` defaults to `0.5` (faint stroke around bar/column/area marks; `0` = none, accepts fractional values)
- `chartBorderColour` defaults to `#000000` (stroke colour applied when `chartBorderWidth > 0`)

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

| Action                  | Owner | Other Users | Superadmin |
| ----------------------- | ----- | ----------- | ---------- |
| Create chart            | Yes   | Yes         | Yes        |
| Read own charts         | Yes   | —           | Yes (all)  |
| Read others' published  | Yes   | Yes         | Yes        |
| Read others' drafts     | No    | No          | Yes        |
| Edit own chart          | Yes   | —           | —          |
| Delete own chart        | Yes   | —           | Yes (any)  |
| Fork published chart    | Yes   | Yes         | Yes        |
| Fork others' draft      | No    | No          | Yes        |

### Chart Listings

- **My Charts**: User's own drafts + published charts
- **Community Charts**: Published charts from all other users (superadmins see all statuses)

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

| Method | Path                            | Description                  |
| ------ | ------------------------------- | ---------------------------- |
| GET    | `/api/stratify/charts`          | List user's + community charts |
| POST   | `/api/stratify/charts`          | Create new chart             |
| GET    | `/api/stratify/charts/:id`      | Get single chart             |
| PATCH  | `/api/stratify/charts/:id`      | Update chart fields          |
| DELETE | `/api/stratify/charts/:id`      | Delete chart                 |
| POST   | `/api/stratify/charts/:id/fork` | Fork chart to current user   |

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
