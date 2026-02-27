# Stratify

A Datawrapper-inspired chart builder for creating data charts from CSV/TSV data.

## Features

- **Chart types**: Stacked Area, Area (non-stacked), Line
- **Data input**: Paste CSV or tab-separated data (e.g. from Google Sheets)
- **Examples**: Built-in example datasets for each chart type to get started quickly
- **Annotations**: Title, description, data source, notes
- **Series config**: Customise colours, labels, and visibility per series

## Routes

| Route | Purpose |
|-------|---------|
| `/studio/stratify` | Builder page (split-pane: options left, chart right) |

## File Structure

```
_components/
  DataInput.svelte          CSV/TSV paste textarea + data preview table
  ChartTypeSelector.svelte  Stacked Area / Area / Line toggle (uses Switch)
  ChartConfig.svelte        Title, description, source, notes fields
  SeriesConfig.svelte       Per-series colour, label, visibility controls
  ChartPreview.svelte       Live StratumChart with custom header/footer snippets

_utils/
  csv-parser.js             Parses CSV/TSV → StratumChart data format
  colour-palette.js         Tableau 10 default colour palette
  examples.js               Built-in example datasets (one per chart type)
```

## Data Format

The CSV parser expects:
- **First row**: Column headers
- **First column**: Dates (ISO 8601, `DD/MM/YYYY`, `YYYY`, etc.)
- **Remaining columns**: Numeric series values

Example:
```
Date,Solar,Wind,Coal
2024-01-01,150,200,300
2024-01-02,160,180,290
2024-01-03,170,210,280
```

Tab-separated data (pasted from spreadsheets) is also supported.

## Chart Library Extensions

Stratify adds a new `area` chart type (non-stacked) to the Stratum Chart library:

- **`Area.svelte`** (`src/lib/components/charts/v2/elements/`) — Non-stacked area element where each series fills independently from the zero baseline with semi-transparency (opacity 0.6)
- **`ChartOptions.svelte.js`** — `ChartType` is `'stacked-area' | 'area' | 'line'`
- **`StackedAreaChart.svelte`** — Renders `Area` element when chart type is `'area'`
