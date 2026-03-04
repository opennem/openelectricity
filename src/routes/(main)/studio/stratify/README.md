# Stratify

A Datawrapper-inspired chart builder for creating embeddable data charts from CSV/TSV data.

## Features

- **Chart types**: Stacked Area, Area (non-stacked), Line
- **Data input**: Paste CSV or tab-separated data (e.g. from Google Sheets)
- **Examples**: Built-in example datasets for each chart type
- **Annotations**: Title, description, data source, notes
- **Series config**: Customise colours, labels, and visibility per series
- **Persistence**: Save/load charts in browser localStorage
- **Export**: SVG, PNG, and JSON config export
- **Import**: Load chart configs from JSON files (for cross-browser transfer or Sanity CMS integration)

## Architecture

### Two-layer split

Stratify is split across two locations:

| Location | Purpose |
|----------|---------|
| `$lib/stratify/` | **Shared core** — state class, CSV parser, colour palette, chart renderer. Importable from anywhere (builder, articles, embeds). |
| `src/routes/(main)/studio/stratify/` | **Builder UI** — page layout, tabs, panels, context, storage, examples. Route-specific. |

### State management

All builder state is centralised in `StratifyProject` (a Svelte 5 runes class in `$lib/stratify/`):

- Owns all authoring state (`csvText`, `title`, `chartType`, series overrides, etc.)
- Derives parsed data from CSV via `$derived`
- Composes a `ChartStore` instance for rendering, synced via `$effect`
- Serialisable: `toJSON()` / `fromJSON()` for persistence and export

The builder page creates a `StratifyProject` instance and shares it via Svelte context (`setStratifyContext` / `getStratifyContext`). All child components pull state from context — no prop drilling.

### Shared renderer

`$lib/stratify/StratifyChart.svelte` is the single chart rendering component used by both:
- The builder preview (`ChartPreview.svelte` wraps it)
- Future article/embed contexts (create `StratifyProject.fromJSON(snapshot)` and pass it)

It renders via `StratumChart` with header (title, description) and footer (notes, source).

### Persistence & export

- **Browser storage**: localStorage save/load via `_utils/storage.js`
- **JSON export**: Download chart config as `.json` file
- **JSON import**: Load config from `.json` file (for moving between browsers or into Sanity CMS)
- **Image export**: SVG and PNG download via `_utils/export.js`

## File Structure

```
$lib/stratify/                        # Shared core (importable from anywhere)
├── StratifyProject.svelte.js         # Central state class (runes)
├── StratifyChart.svelte              # Shared chart renderer
├── csv-parser.js                     # CSV/TSV → StratumChart data format
└── colour-palette.js                 # Tableau 10 default palette

src/routes/(main)/studio/stratify/    # Builder UI (route-specific)
├── +page.svelte                      # Layout, tabs, context setup
├── _state/
│   └── context.js                    # setContext/getContext helpers
├── _utils/
│   ├── examples.js                   # Built-in example datasets
│   ├── storage.js                    # localStorage save/load + JSON file export/import
│   └── export.js                     # SVG/PNG capture and download
├── _components/
│   ├── TabBar.svelte                 # Tab navigation
│   ├── ChartPreview.svelte           # Wraps StratifyChart for builder
│   ├── ExamplePicker.svelte          # Example dataset buttons
│   ├── DataInput.svelte              # CSV/TSV textarea + data preview
│   ├── ChartTypeSelector.svelte      # Chart type toggle
│   ├── ChartConfig.svelte            # Title, description, source, notes fields
│   ├── SeriesConfig.svelte           # Per-series colour, label, visibility
│   └── panels/
│       ├── DataPanel.svelte          # Tab: Data input + examples
│       ├── ChartPanel.svelte         # Tab: Chart type selector
│       ├── AnnotatePanel.svelte      # Tab: Metadata fields
│       ├── SeriesPanel.svelte        # Tab: Series customisation
│       └── PublishPanel.svelte       # Tab: Export, save, import
```

## Builder UI

The builder is a single-page split-pane layout:
- **Left panel** (380px): 5 tabs — Data, Chart, Annotate, Series, Publish
- **Right panel**: Live chart preview (or example picker when no data loaded)

Tabs give organisation without enforcing a linear workflow — users can jump between data and styling freely.

## Data Format

The CSV parser expects:
- **First row**: Column headers
- **First column**: Dates (ISO 8601, `DD/MM/YYYY`, `YYYY`, etc.)
- **Remaining columns**: Numeric series values

```
Date,Solar,Wind,Coal
2024-01-01,150,200,300
2024-01-02,160,180,290
```

Tab-separated data (pasted from spreadsheets) is also supported.

## Snapshot format (JSON export)

```json
{
  "version": 1,
  "csvText": "Date,Solar,Wind\n2024-01-01,150,200\n...",
  "title": "AU Electricity Generation",
  "description": "Monthly generation mix.",
  "dataSource": "Open Electricity",
  "notes": "Values in GWh.",
  "chartType": "stacked-area",
  "hiddenSeries": [],
  "userSeriesColours": { "solar": "#f28e2b" },
  "userSeriesLabels": { "solar": "Solar PV" }
}
```

This is the format used for localStorage persistence, JSON file export/import, and future Sanity CMS integration.

## Chart Library Extensions

Stratify adds an `area` chart type (non-stacked) to the Stratum Chart library:

- **`Area.svelte`** (`$lib/components/charts/v2/elements/`) — Non-stacked area where each series fills from zero baseline with semi-transparency
- **`ChartOptions.svelte.js`** — `ChartType` union: `'stacked-area' | 'area' | 'line'`
- **`StackedAreaChart.svelte`** — Renders `Area` element when chart type is `'area'`

## Future

- **Sanity CMS integration**: `stratifyChart` document type, Portable Text block renderer using `StratifyChart.svelte`
- **Chart type extensibility**: Registry pattern for adding new chart types (bar, scatter, etc.)
- **Cloud storage**: Cloudflare KV for shareable URLs and embeds (deferred)
