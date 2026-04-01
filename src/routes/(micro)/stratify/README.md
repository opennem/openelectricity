# Stratify Plot Builder

A chart builder for creating embeddable data visualisations from CSV/TSV data, powered by [Observable Plot](https://observablehq.com/plot/).

## Features

- **Chart types**: Stacked Area, Overlay Area, Line, Stacked Bar, Grouped Bar, Dot (scatter)
- **Per-series chart type**: Override the chart type for individual series (e.g. one series as a line, another as a bar)
- **Data input**: Paste CSV or tab-separated data (e.g. from Google Sheets)
- **Auto-detection**: Automatically detects dates vs categories, delimiter type
- **Style presets**: Open Electricity, Default (Tableau 10), Warm Earth, Cool Slate, Vibrant, Muted Pastel
- **Series config**: Customise colours, labels, visibility, chart type, Y-axis assignment, and order per series
- **Dual Y-axis**: Assign series to left or right Y-axis with independent scales and labels
- **Drag-to-reorder**: Reorder series via drag-and-drop (affects stacking order and legend)
- **Annotations**: End-labels, vertical rules, bar labels, point annotations
- **Axis controls**: Y/Y2 tick counts, min/max tick marks, X tick count/rotation/height
- **Tooltip columns**: Select which columns appear in the tooltip, with formatted date display
- **Plot overrides**: Power-user JSON config for arbitrary Observable Plot customisation
- **Article embeds**: Native inline rendering (`strataEmbed`) and generic iframe (`embed`) in editorial articles
- **Publishing**: Save to Sanity CMS, publish with shareable URL, iframe embed code
- **Export**: SVG, PNG, and JSON config export

## Architecture

### Route Structure

```
src/routes/(micro)/stratify/           # Builder UI
├── +page.svelte                       # Main builder page
├── +layout.svelte                     # Micro layout (no nav/footer)
├── charts/+page.svelte                # Charts list page
├── _state/
│   ├── StratifyPlotProject.svelte.js  # Central state class (runes)
│   └── context.js                     # setContext/getContext helpers
├── _utils/
│   ├── api.js                         # Sanity CMS CRUD client
│   ├── storage.js                     # localStorage + JSON file export/import
│   ├── export.js                      # SVG/PNG capture
│   └── examples.js                    # Built-in example datasets
└── _components/
    ├── ChartPreview.svelte            # Live chart preview
    ├── ChartTypeSelector.svelte       # Chart family/variant toggle
    ├── SeriesConfig.svelte            # Per-series colour, label, type, Y-axis, visibility
    ├── DataInput.svelte               # CSV/TSV textarea + data preview
    ├── ExamplePicker.svelte           # Example dataset buttons
    ├── ChartManager.svelte            # Full chart management modal
    ├── SavedChartsPopover.svelte      # Quick chart list dropdown
    ├── StylePresetPicker.svelte       # Style preset selector
    └── panels/
        ├── DataPanel.svelte           # Data input + examples
        ├── ChartPanel.svelte          # Chart type, style, axis controls, tooltip, advanced overrides
        ├── SeriesPanel.svelte         # Series customisation
        ├── AnnotatePanel.svelte       # Annotation settings
        └── PublishPanel.svelte        # Save, publish, export, embed

src/routes/(micro)/strata/[id]/        # Embed route (public)
├── +page.server.js                    # Loads published chart from Sanity
└── +page.svelte                       # Renders chart with style preset

src/lib/stratify/                      # Shared Stratify utilities
├── chart-data.js                      # safeParseJSON, normaliseChart (shared server-side)
├── chart-styles.js                    # Style presets (colours, typography)
├── csv-parser.js                      # CSV/TSV parser with date/category detection
└── colour-palette.js                  # Default colour assignment

src/lib/components/charts/plot/        # Shared Plot rendering library
├── StratifyPlotChart.svelte           # High-level chart component (dual Y-axis, tooltips)
├── PlotChart.svelte                   # Low-level Plot wrapper
├── plot-action.js                     # Svelte action for Observable Plot
├── plot-configs.js                    # Chart config factories (area, line, bar, dot, mixed)
├── plot-overrides.js                  # PlotOverrides merge system
├── plot-annotations.js                # Annotation processing + formatCompact
└── *.test.js                          # Co-located tests

src/lib/components/text-components/    # Article content rendering
├── RichText.svelte                    # Portable Text renderer (strataEmbed + embed blocks)
├── StrataEmbed.svelte                 # Native Stratify chart embed for articles
└── Image.svelte                       # Image block handler
```

## Chart Types

| Value          | Family | Description                           |
| -------------- | ------ | ------------------------------------- |
| `stacked-area` | Area   | Time-series stacked area              |
| `area`         | Area   | Time-series overlay area              |
| `line`         | Line   | Multi-series line chart               |
| `bar-stacked`  | Bar    | Stacked bar (category or time-series) |
| `grouped-bar`  | Bar    | Category grouped bar                  |
| `dot`          | Dot    | Scatter / dot plot                    |

Category data mode only supports Bar charts. When switching to category mode, the chart type auto-switches to `grouped-bar` if needed.

Time-series bar charts use `rectY` with auto-detected intervals (day/week/month/year) and centred bars on each data point. Category bar charts use `barY` with a band scale.

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
	"chartType": "stacked-area",
	"displayMode": "auto",
	"stylePreset": "oe",
	"hiddenSeries": [],
	"userSeriesColours": { "solar": "#f28e2b" },
	"userSeriesLabels": { "solar": "Solar PV" },
	"seriesChartTypes": { "demand": "bar" },
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
	"tooltipColumns": ["solar", "wind"]
}
```

### Migration from v1

v1 snapshots are fully backward compatible. Missing fields get defaults:

- `seriesChartTypes` defaults to `{}` (all series use global type)
- `plotOverrides` defaults to `null` (no overrides applied)
- `seriesOrder` defaults to `[]` (use CSV column order)
- `seriesYAxis` defaults to `{}` (all series on left axis)
- `y2Label` defaults to `''`
- `yTicks`, `y2Ticks` default to `0` (auto)
- `yMinMax`, `y2MinMax` default to `false`
- `tooltipColumns` defaults to `[]` (show all)

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

## Publishing Workflow

1. Build chart in the builder (CSV data, chart config, metadata)
2. Save to Sanity CMS (creates draft)
3. Publish — sets status to `published`, generates shareable URL
4. Published charts viewable at `/strata/{chartId}`
5. Embed via iframe: `<iframe src="/strata/{chartId}" width="800" height="500"></iframe>`

## API Endpoints

| Method | Path                       | Description         |
| ------ | -------------------------- | ------------------- |
| GET    | `/api/stratify/charts`     | List user's charts  |
| POST   | `/api/stratify/charts`     | Create new chart    |
| GET    | `/api/stratify/charts/:id` | Get single chart    |
| PATCH  | `/api/stratify/charts/:id` | Update chart fields |
| DELETE | `/api/stratify/charts/:id` | Delete chart        |

All endpoints require Clerk JWT authentication.
